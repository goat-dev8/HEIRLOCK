export type ProviderId = "nvidia" | "cerebras" | "sambanova" | "groq";

export type ModelCapability =
  | "chat"
  | "streaming"
  | "json_mode"
  | "tool_calling"
  | "reasoning";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  tools?: ToolDefinition[];
  stream?: boolean;
  /** Prefer reasoning/thinking when the model supports it (NVIDIA DeepSeek). */
  thinking?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
  /** Force a specific provider/model slot; normally leave unset for failover. */
  preferProvider?: ProviderId;
  preferModel?: string;
}

export interface ChatResponse {
  content: string;
  reasoning?: string;
  provider: ProviderId;
  model: string;
  latencyMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface ProviderEndpoint {
  id: ProviderId;
  label: string;
  baseURL: string;
  apiKey: string;
  model: string;
  capabilities: ModelCapability[];
  /** Estimated USD per 1M tokens (rough; for tracking only). */
  costPer1MInput?: number;
  costPer1MOutput?: number;
  /** Extra body fields for this model (e.g. NVIDIA thinking). */
  extraBody?: Record<string, unknown>;
  timeoutMs: number;
}

export interface ProviderHealth {
  id: ProviderId;
  model: string;
  healthy: boolean;
  circuitOpen: boolean;
  consecutiveFailures: number;
  lastError?: string;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  totalRequests: number;
  totalFailures: number;
  totalLatencyMs: number;
  estimatedCostUsd: number;
}

export interface ProviderLogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  provider: ProviderId;
  model: string;
  event: string;
  detail?: string;
  latencyMs?: number;
}
