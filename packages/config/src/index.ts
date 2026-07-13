import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { resolve } from "node:path";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv({ path: resolve(process.cwd(), ".env") });
loadDotenv();

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().url().optional(),
);

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(10000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  HEIRLOCK_DEFAULT_PROFILE: z
    .enum(["mainnet-limited", "mainnet", "mainnet-readonly", "testnet"])
    .default("mainnet-limited"),
  HEIRLOCK_ALLOW_TESTNET: z
    .preprocess((v) => v === "true" || v === true, z.boolean())
    .default(true),

  FRONTEND_URL: z.string().default("http://localhost:5173"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  API_PUBLIC_URL: z.string().default("http://localhost:10000"),

  DATABASE_URL: optionalString,
  DIRECT_DATABASE_URL: optionalString,
  REDIS_URL: optionalString,
  UPSTASH_REDIS_REST_URL: optionalString,
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  SIWE_DOMAIN: z.string().default("localhost"),
  SIWE_URI: z.string().default("http://localhost:5173"),
  CRON_SECRET: optionalString,
  WALLET_ENCRYPT_KEY: optionalString,

  SOSO_BASE_URL: z.string().url().default("https://openapi.sosovalue.com/openapi/v1"),
  SOSO_API_KEY: optionalString,
  SOSO_API_KEY_2: optionalString,
  SOSO_RATE_LIMIT_RPM: z.coerce.number().int().positive().default(20),
  SOSO_MONTHLY_QUOTA: z.coerce.number().int().positive().default(100000),

  VALUECHAIN_MAINNET_CHAIN_ID: z.coerce.number().int().default(286623),
  VALUECHAIN_MAINNET_RPC: z.string().url().default("https://mainnet.valuechain.xyz"),
  VALUECHAIN_MAINNET_WS: z.string().default("wss://mainnet-ws.valuechain.xyz"),
  VALUECHAIN_MAINNET_EXPLORER: z.string().url().default("https://main-scan.valuechain.xyz"),
  VALUECHAIN_NATIVE_SYMBOL: z.string().default("SOSO"),
  VALUECHAIN_NATIVE_DECIMALS: z.coerce.number().int().default(18),

  VALUECHAIN_TESTNET_CHAIN_ID: z.coerce.number().int().default(138565),
  VALUECHAIN_TESTNET_RPC: z.string().url().default("https://testnet-v2.valuechain.xyz"),
  VALUECHAIN_TESTNET_WS: z.string().default("wss://testnet-v2-ws.valuechain.xyz"),
  VALUECHAIN_TESTNET_EXPLORER: z.string().url().default("https://test-scan.valuechain.xyz"),

  WSOSO_ADDRESS: z.string().default("0x5050505050505050505050505050505050505050"),

  SODEX_MAINNET_SPOT_REST: z.string().url().default("https://mainnet-gw.sodex.dev/api/v1/spot"),
  SODEX_MAINNET_PERPS_REST: z.string().url().default("https://mainnet-gw.sodex.dev/api/v1/perps"),
  SODEX_MAINNET_SPOT_WS: z.string().default("wss://mainnet-gw.sodex.dev/ws/spot"),
  SODEX_MAINNET_PERPS_WS: z.string().default("wss://mainnet-gw.sodex.dev/ws/perps"),
  SODEX_MAINNET_APP_URL: z.string().url().default("https://sodex.com"),
  SODEX_MAINNET_CHAIN_ID: z.coerce.number().int().default(286623),

  SODEX_TESTNET_SPOT_REST: z.string().url().default("https://testnet-gw.sodex.dev/api/v1/spot"),
  SODEX_TESTNET_PERPS_REST: z.string().url().default("https://testnet-gw.sodex.dev/api/v1/perps"),
  SODEX_TESTNET_SPOT_WS: z.string().default("wss://testnet-gw.sodex.dev/ws/spot"),
  SODEX_TESTNET_PERPS_WS: z.string().default("wss://testnet-gw.sodex.dev/ws/perps"),
  SODEX_TESTNET_APP_URL: z.string().url().default("https://testnet.sodex.com"),
  SODEX_TESTNET_CHAIN_ID: z.coerce.number().int().default(138565),

  SODEX_EIP712_VERSION: z.string().default("1"),
  SODEX_EIP712_VERIFYING_CONTRACT: z
    .string()
    .default("0x0000000000000000000000000000000000000000"),
  SODEX_EIP712_SPOT_NAME: z.string().default("spot"),
  SODEX_EIP712_PERPS_NAME: z.string().default("futures"),

  TRADING_ENABLED: z.preprocess((v) => v === "true" || v === true || v === undefined, z.boolean()).default(true),
  /** Global default cap; mainnet tests hard-capped by MAINNET_TEST_MAX_NOTIONAL_USD */
  TRADING_MAX_NOTIONAL_USD: z.coerce.number().positive().default(1),
  /** Hard ceiling for any mainnet trade/test — never exceed 1 USDC */
  MAINNET_TEST_MAX_NOTIONAL_USD: z.coerce.number().positive().max(1).default(1),
  /** Testnet may use larger notionals for integration tests */
  TESTNET_TEST_MAX_NOTIONAL_USD: z.coerce.number().positive().default(100000),
  KILL_SWITCH_TRADING: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false),
  TRADING_ALLOWLIST: z.string().default(""),

  /**
   * LOCAL TEST WALLET ONLY — never the multi-user production identity.
   * Accepts SODEX_* aliases for convenience in local .env.
   */
  SODEX_LOCAL_TEST_WALLET_ONLY: z
    .preprocess((v) => v === "true" || v === true || v === undefined, z.boolean())
    .default(true),
  SODEX_TEST_PRIVATE_KEY: optionalString,
  SODEX_TEST_ADDRESS: optionalString,
  SODEX_TEST_ACCOUNT_ID: optionalString,
  /** Legacy local aliases — treated as test-only, never house account */
  SODEX_PRIVATE_KEY: optionalString,
  SODEX_ADDRESS: optionalString,
  SODEX_ACCOUNT_ID: optionalString,
  SODEX_TESTNET_ACCOUNT_ID: optionalString,
  SODEX_MAINNET_ACCOUNT_ID: optionalString,

  // Optional guardian only — never user trading identity
  SODEX_GUARDIAN_API_KEY_NAME: optionalString,
  SODEX_GUARDIAN_API_KEY_PRIVATE_KEY: optionalString,
  SODEX_GUARDIAN_MASTER_ADDRESS: optionalString,

  BASE_CHAIN_ID: z.coerce.number().int().default(8453),
  BASE_RPC_URL: z.string().url().default("https://mainnet.base.org"),
  BASE_EXPLORER: z.string().url().default("https://basescan.org"),
  SOSO_TOKEN_ETHEREUM: z.string().default("0x76a0e27618462bdac7a29104bdcfff4e6bfcea2d"),
  SOSO_TOKEN_BASE: z.string().default("0x624e2e7fdc8903165f64891672267ab0fcb98831"),
  SSI_APP_URL: z.string().url().default("https://ssi.sosovalue.com"),

  // ValueChain HEIRLOCK contracts (filled after Foundry deploy)
  WEALTH_POLICY_ADDRESS: optionalString,
  MODE_CONTROLLER_ADDRESS: optionalString,
  ACTION_LOG_ADDRESS: optionalString,
  ATTESTATION_REGISTRY_ADDRESS: optionalString,
  CONTINUITY_NFT_ADDRESS: optionalString,
  FEE_COLLECTOR_ADDRESS: optionalString,
  /** Operational signer for ActionLog.record / AttestationRegistry.attest (gas only; not user trading key) */
  VALUECHAIN_ANCHOR_PRIVATE_KEY: optionalString,
  /** Dedicated ModeController guardian signer — never the end-user trading key */
  VALUECHAIN_GUARDIAN_PRIVATE_KEY: optionalString,

  NVIDIA_API_KEY: optionalString,
  NVIDIA_BASE_URL: z.string().url().default("https://integrate.api.nvidia.com/v1"),
  NVIDIA_MODEL_PRIMARY: z.string().default("deepseek-ai/deepseek-v4-flash"),
  NVIDIA_MODEL_SECONDARY: z.string().default("meta/llama-3.1-70b-instruct"),
  NVIDIA_MODEL_TERTIARY: z.string().default("nvidia/llama-3.1-nemotron-70b-instruct"),
  NVIDIA_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  NVIDIA_THINKING_ENABLED: z.preprocess((v) => v !== "false" && v !== false, z.boolean()).default(true),
  NVIDIA_REASONING_EFFORT: z.enum(["low", "medium", "high"]).default("high"),

  CEREBRAS_API_KEY: optionalString,
  CEREBRAS_BASE_URL: z.string().url().default("https://api.cerebras.ai/v1"),
  CEREBRAS_MODEL: z.string().default("llama-3.3-70b"),

  SAMBANOVA_API_KEY: optionalString,
  SAMBANOVA_BASE_URL: z.string().url().default("https://api.sambanova.ai/v1"),
  SAMBANOVA_MODEL: z.string().default("Meta-Llama-3.3-70B-Instruct"),

  GROQ_API_KEY: optionalString,
  GROQ_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),

  AI_PRIMARY_PROVIDER: z.string().default("nvidia"),
  AI_FALLBACK_PROVIDERS: z.string().default("cerebras,sambanova,groq"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  AI_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
  AI_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().positive().default(5),
  AI_CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().int().positive().default(60000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(overrides?: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.JWT_SECRET.length < 48) {
    throw new Error("JWT_SECRET too weak for production (need ≥48 chars)");
  }
  cached = parsed.data;
  return cached;
}

export function getEnv(): Env {
  if (!cached) return loadEnv();
  return cached;
}

export function publicRuntimeConfig(env: Env = getEnv()) {
  return {
    profile: env.HEIRLOCK_DEFAULT_PROFILE,
    allowTestnet: env.HEIRLOCK_ALLOW_TESTNET,
    valuechain: {
      mainnet: {
        chainId: env.VALUECHAIN_MAINNET_CHAIN_ID,
        rpc: env.VALUECHAIN_MAINNET_RPC,
        explorer: env.VALUECHAIN_MAINNET_EXPLORER,
        nativeSymbol: env.VALUECHAIN_NATIVE_SYMBOL,
      },
      testnet: {
        chainId: env.VALUECHAIN_TESTNET_CHAIN_ID,
        rpc: env.VALUECHAIN_TESTNET_RPC,
        explorer: env.VALUECHAIN_TESTNET_EXPLORER,
      },
    },
    sodex: {
      mainnetAppUrl: env.SODEX_MAINNET_APP_URL,
      testnetAppUrl: env.SODEX_TESTNET_APP_URL,
      tradingEnabled: env.TRADING_ENABLED && !env.KILL_SWITCH_TRADING,
      maxNotionalUsd: env.TRADING_MAX_NOTIONAL_USD,
      mainnetTestMaxNotionalUsd: env.MAINNET_TEST_MAX_NOTIONAL_USD,
      architecture: "per-user-non-custodial-relay",
      localTestWalletOnly: env.SODEX_LOCAL_TEST_WALLET_ONLY,
    },
    ssi: {
      appUrl: env.SSI_APP_URL,
      baseChainId: env.BASE_CHAIN_ID,
    },
    ai: {
      primaryProvider: env.AI_PRIMARY_PROVIDER,
      nvidiaModels: [
        env.NVIDIA_MODEL_PRIMARY,
        env.NVIDIA_MODEL_SECONDARY,
        env.NVIDIA_MODEL_TERTIARY,
      ],
    },
  };
}
