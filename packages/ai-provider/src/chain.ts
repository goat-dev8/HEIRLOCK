import type { Env } from "@heirlock/config";
import type { ModelCapability, ProviderEndpoint, ProviderId } from "./types.js";

const NVIDIA_CAPS: ModelCapability[] = [
  "chat",
  "streaming",
  "json_mode",
  "tool_calling",
  "reasoning",
];

const OPENAI_COMPAT_CAPS: ModelCapability[] = [
  "chat",
  "streaming",
  "json_mode",
  "tool_calling",
];

export function buildProviderChain(env: Env): ProviderEndpoint[] {
  const chain: ProviderEndpoint[] = [];
  const timeout = env.AI_REQUEST_TIMEOUT_MS;

  if (env.NVIDIA_API_KEY) {
    const thinkingBody =
      env.NVIDIA_THINKING_ENABLED
        ? {
            chat_template_kwargs: {
              thinking: true,
              reasoning_effort: env.NVIDIA_REASONING_EFFORT,
            },
          }
        : undefined;

    const nvidiaModels = [
      env.NVIDIA_MODEL_PRIMARY,
      env.NVIDIA_MODEL_SECONDARY,
      env.NVIDIA_MODEL_TERTIARY,
    ];

    for (const model of nvidiaModels) {
      chain.push({
        id: "nvidia",
        label: `NVIDIA:${model}`,
        baseURL: env.NVIDIA_BASE_URL,
        apiKey: env.NVIDIA_API_KEY,
        model,
        capabilities: NVIDIA_CAPS,
        timeoutMs: env.NVIDIA_TIMEOUT_MS || timeout,
        extraBody: thinkingBody,
        costPer1MInput: 0,
        costPer1MOutput: 0,
      });
    }
  }

  const fallbacks = env.AI_FALLBACK_PROVIDERS.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as ProviderId[];

  for (const fb of fallbacks) {
    if (fb === "cerebras" && env.CEREBRAS_API_KEY) {
      chain.push({
        id: "cerebras",
        label: `Cerebras:${env.CEREBRAS_MODEL}`,
        baseURL: env.CEREBRAS_BASE_URL,
        apiKey: env.CEREBRAS_API_KEY,
        model: env.CEREBRAS_MODEL,
        capabilities: OPENAI_COMPAT_CAPS,
        timeoutMs: timeout,
      });
    }
    if (fb === "sambanova" && env.SAMBANOVA_API_KEY) {
      chain.push({
        id: "sambanova",
        label: `SambaNova:${env.SAMBANOVA_MODEL}`,
        baseURL: env.SAMBANOVA_BASE_URL,
        apiKey: env.SAMBANOVA_API_KEY,
        model: env.SAMBANOVA_MODEL,
        capabilities: OPENAI_COMPAT_CAPS,
        timeoutMs: timeout,
      });
    }
    if (fb === "groq" && env.GROQ_API_KEY) {
      chain.push({
        id: "groq",
        label: `Groq:${env.GROQ_MODEL}`,
        baseURL: env.GROQ_BASE_URL,
        apiKey: env.GROQ_API_KEY,
        model: env.GROQ_MODEL,
        capabilities: OPENAI_COMPAT_CAPS,
        timeoutMs: timeout,
      });
    }
  }

  return chain;
}
