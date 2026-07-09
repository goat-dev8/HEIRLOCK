import OpenAI from "openai";
import type { Env } from "@heirlock/config";
import { buildProviderChain } from "./chain.js";
import type {
  ChatRequest,
  ChatResponse,
  ModelCapability,
  ProviderEndpoint,
  ProviderHealth,
  ProviderId,
  ProviderLogEntry,
} from "./types.js";

type CircuitState = {
  consecutiveFailures: number;
  openUntil: number;
  totalRequests: number;
  totalFailures: number;
  totalLatencyMs: number;
  estimatedCostUsd: number;
  lastError?: string;
  lastSuccessAt?: number;
  lastFailureAt?: number;
};

function endpointKey(ep: ProviderEndpoint): string {
  return `${ep.id}::${ep.model}`;
}

export class AIProviderManager {
  private readonly endpoints: ProviderEndpoint[];
  private readonly circuits = new Map<string, CircuitState>();
  private readonly logs: ProviderLogEntry[] = [];
  private readonly maxRetries: number;
  private readonly breakerThreshold: number;
  private readonly breakerCooldownMs: number;
  private readonly clients = new Map<string, OpenAI>();

  constructor(env: Env, endpoints?: ProviderEndpoint[]) {
    this.endpoints = endpoints ?? buildProviderChain(env);
    this.maxRetries = env.AI_MAX_RETRIES;
    this.breakerThreshold = env.AI_CIRCUIT_BREAKER_THRESHOLD;
    this.breakerCooldownMs = env.AI_CIRCUIT_BREAKER_COOLDOWN_MS;

    for (const ep of this.endpoints) {
      this.circuits.set(endpointKey(ep), {
        consecutiveFailures: 0,
        openUntil: 0,
        totalRequests: 0,
        totalFailures: 0,
        totalLatencyMs: 0,
        estimatedCostUsd: 0,
      });
      this.clients.set(
        endpointKey(ep),
        new OpenAI({
          apiKey: ep.apiKey,
          baseURL: ep.baseURL,
          timeout: ep.timeoutMs,
          maxRetries: 0,
        }),
      );
    }
  }

  listEndpoints(): ProviderEndpoint[] {
    return [...this.endpoints];
  }

  getCapabilities(provider: ProviderId, model?: string): ModelCapability[] {
    const ep = this.endpoints.find(
      (e) => e.id === provider && (!model || e.model === model),
    );
    return ep?.capabilities ?? [];
  }

  getHealth(): ProviderHealth[] {
    return this.endpoints.map((ep) => {
      const c = this.circuits.get(endpointKey(ep))!;
      const now = Date.now();
      return {
        id: ep.id,
        model: ep.model,
        healthy: c.consecutiveFailures === 0 && c.openUntil <= now,
        circuitOpen: c.openUntil > now,
        consecutiveFailures: c.consecutiveFailures,
        lastError: c.lastError,
        lastSuccessAt: c.lastSuccessAt,
        lastFailureAt: c.lastFailureAt,
        totalRequests: c.totalRequests,
        totalFailures: c.totalFailures,
        totalLatencyMs: c.totalLatencyMs,
        estimatedCostUsd: c.estimatedCostUsd,
      };
    });
  }

  getLogs(limit = 100): ProviderLogEntry[] {
    return this.logs.slice(-limit);
  }

  getMetrics() {
    const health = this.getHealth();
    return {
      endpoints: health,
      totalRequests: health.reduce((a, h) => a + h.totalRequests, 0),
      totalFailures: health.reduce((a, h) => a + h.totalFailures, 0),
      estimatedCostUsd: health.reduce((a, h) => a + h.estimatedCostUsd, 0),
    };
  }

  async healthCheck(ep?: ProviderEndpoint): Promise<ProviderHealth[]> {
    const targets = ep ? [ep] : this.endpoints.filter((e, i, arr) => {
      // one check per provider id (first model)
      return arr.findIndex((x) => x.id === e.id) === i;
    });

    for (const target of targets) {
      try {
        await this.chatOnce(target, {
          messages: [{ role: "user", content: "Reply with exactly: OK" }],
          maxTokens: 16,
          temperature: 0,
          thinking: false,
        });
      } catch {
        // recorded in chatOnce
      }
    }
    return this.getHealth();
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const ordered = this.orderEndpoints(req);
    if (ordered.length === 0) {
      throw new Error("No AI providers configured (need NVIDIA_API_KEY at minimum)");
    }

    let lastError: unknown;
    for (const ep of ordered) {
      if (this.isCircuitOpen(ep)) {
        this.log("warn", ep, "circuit_skip", "circuit open");
        continue;
      }
      if (req.jsonMode && !ep.capabilities.includes("json_mode")) continue;
      if (req.tools?.length && !ep.capabilities.includes("tool_calling")) continue;
      if (req.stream) {
        throw new Error("Use chatStream() for streaming requests");
      }

      const attempts = 1 + this.maxRetries;
      for (let attempt = 0; attempt < attempts; attempt++) {
        try {
          return await this.chatOnce(ep, req);
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          this.log("warn", ep, "attempt_failed", `${msg} (attempt ${attempt + 1}/${attempts})`);
          if (!this.isRetryable(err) || attempt === attempts - 1) break;
          await sleep(250 * (attempt + 1));
        }
      }
    }

    throw new Error(
      `All AI providers failed. Last error: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  async *chatStream(req: ChatRequest): AsyncGenerator<string, ChatResponse, void> {
    const ordered = this.orderEndpoints({ ...req, stream: true });
    let lastError: unknown;

    for (const ep of ordered) {
      if (this.isCircuitOpen(ep)) continue;
      if (!ep.capabilities.includes("streaming")) continue;

      const client = this.clients.get(endpointKey(ep))!;
      const started = Date.now();
      const circuit = this.circuits.get(endpointKey(ep))!;
      circuit.totalRequests += 1;

      try {
        const body = this.buildBody(ep, { ...req, stream: true });
        const stream = await client.chat.completions.create({
          ...body,
          stream: true,
        });

        let content = "";
        let reasoning = "";
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta as
            | { content?: string | null; reasoning?: string; reasoning_content?: string }
            | undefined;
          const piece = delta?.content ?? "";
          const r = delta?.reasoning ?? delta?.reasoning_content ?? "";
          if (r) reasoning += r;
          if (piece) {
            content += piece;
            yield piece;
          }
        }

        const latencyMs = Date.now() - started;
        this.recordSuccess(ep, latencyMs, undefined);
        return {
          content,
          reasoning: reasoning || undefined,
          provider: ep.id,
          model: ep.model,
          latencyMs,
        };
      } catch (err) {
        lastError = err;
        this.recordFailure(ep, err);
      }
    }

    throw new Error(
      `Streaming failed on all providers: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  private orderEndpoints(req: ChatRequest): ProviderEndpoint[] {
    let list = [...this.endpoints];
    if (req.preferProvider) {
      list = [
        ...list.filter((e) => e.id === req.preferProvider && (!req.preferModel || e.model === req.preferModel)),
        ...list.filter((e) => !(e.id === req.preferProvider && (!req.preferModel || e.model === req.preferModel))),
      ];
    } else if (req.preferModel) {
      list = [
        ...list.filter((e) => e.model === req.preferModel),
        ...list.filter((e) => e.model !== req.preferModel),
      ];
    }
    return list;
  }

  private buildBody(ep: ProviderEndpoint, req: ChatRequest) {
    const thinking =
      req.thinking !== false &&
      ep.capabilities.includes("reasoning") &&
      ep.extraBody;

    const body: Record<string, unknown> = {
      model: ep.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.2,
      top_p: req.topP ?? 0.95,
      max_tokens: req.maxTokens ?? 2048,
      stream: Boolean(req.stream),
    };

    if (req.jsonMode) {
      body.response_format = { type: "json_object" };
    }
    if (req.tools?.length) {
      body.tools = req.tools;
    }
    if (thinking) {
      Object.assign(body, ep.extraBody);
    }
    return body as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming &
      Record<string, unknown>;
  }

  private async chatOnce(ep: ProviderEndpoint, req: ChatRequest): Promise<ChatResponse> {
    const client = this.clients.get(endpointKey(ep))!;
    const circuit = this.circuits.get(endpointKey(ep))!;
    circuit.totalRequests += 1;
    const started = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ep.timeoutMs);

    try {
      const body = this.buildBody(ep, { ...req, stream: false });
      const completion = await client.chat.completions.create(
        {
          ...(body as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming),
          stream: false,
        },
        { signal: controller.signal },
      );

      const msg = completion.choices[0]?.message as
        | {
            content?: string | null;
            reasoning?: string;
            reasoning_content?: string;
            tool_calls?: ChatResponse["toolCalls"];
          }
        | undefined;

      const latencyMs = Date.now() - started;
      const usage = completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined;

      this.recordSuccess(ep, latencyMs, usage);

      return {
        content: msg?.content ?? "",
        reasoning: msg?.reasoning ?? msg?.reasoning_content,
        provider: ep.id,
        model: ep.model,
        latencyMs,
        usage,
        toolCalls: msg?.tool_calls,
        raw: completion,
      };
    } catch (err) {
      this.recordFailure(ep, err);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private isCircuitOpen(ep: ProviderEndpoint): boolean {
    const c = this.circuits.get(endpointKey(ep))!;
    return c.openUntil > Date.now();
  }

  private recordSuccess(
    ep: ProviderEndpoint,
    latencyMs: number,
    usage?: ChatResponse["usage"],
  ) {
    const c = this.circuits.get(endpointKey(ep))!;
    c.consecutiveFailures = 0;
    c.openUntil = 0;
    c.lastSuccessAt = Date.now();
    c.totalLatencyMs += latencyMs;
    if (usage?.totalTokens) {
      const inCost = ((usage.promptTokens ?? 0) / 1_000_000) * (ep.costPer1MInput ?? 0);
      const outCost =
        ((usage.completionTokens ?? 0) / 1_000_000) * (ep.costPer1MOutput ?? 0);
      c.estimatedCostUsd += inCost + outCost;
    }
    this.log("info", ep, "success", undefined, latencyMs);
  }

  private recordFailure(ep: ProviderEndpoint, err: unknown) {
    const c = this.circuits.get(endpointKey(ep))!;
    c.consecutiveFailures += 1;
    c.totalFailures += 1;
    c.lastFailureAt = Date.now();
    c.lastError = err instanceof Error ? err.message : String(err);
    if (c.consecutiveFailures >= this.breakerThreshold) {
      c.openUntil = Date.now() + this.breakerCooldownMs;
      this.log("error", ep, "circuit_open", c.lastError);
    } else {
      this.log("error", ep, "failure", c.lastError);
    }
  }

  private isRetryable(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    if (/abort|timeout|ECONNRESET|ETIMEDOUT|429|500|502|503|504/i.test(msg)) return true;
    if (err && typeof err === "object" && "status" in err) {
      const status = Number((err as { status: number }).status);
      return status === 429 || status >= 500;
    }
    return false;
  }

  private log(
    level: ProviderLogEntry["level"],
    ep: ProviderEndpoint,
    event: string,
    detail?: string,
    latencyMs?: number,
  ) {
    this.logs.push({
      ts: Date.now(),
      level,
      provider: ep.id,
      model: ep.model,
      event,
      detail,
      latencyMs,
    });
    if (this.logs.length > 2000) this.logs.splice(0, this.logs.length - 2000);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function createAIProviderManager(env: Env) {
  return new AIProviderManager(env);
}
