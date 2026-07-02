-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SodexEnvironment" AS ENUM ('mainnet', 'testnet');

-- CreateEnum
CREATE TYPE "WealthMode" AS ENUM ('alive', 'guardian', 'heir');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_policies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mode" "WealthMode" NOT NULL DEFAULT 'alive',
    "max_notional_usd" DECIMAL(18,2) NOT NULL DEFAULT 100,
    "allowlist_json" JSONB,
    "kill_switch" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wealth_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sodex_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "environment" "SodexEnvironment" NOT NULL,
    "account_id" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL,
    "raw_state_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sodex_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "skill_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "symbol" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signed_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "environment" "SodexEnvironment" NOT NULL,
    "account_id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "order_type" TEXT NOT NULL,
    "notional_usd" DECIMAL(18,6),
    "payload_json" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sodex_order_id" TEXT,
    "proof_url" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signed_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signed_order_id" TEXT,
    "environment" "SodexEnvironment" NOT NULL,
    "market" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "price" TEXT,
    "fee" TEXT,
    "sodex_trade_id" TEXT,
    "raw_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "detail" TEXT,
    "latency_ms" INTEGER,
    "cost_usd" DECIMAL(18,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_meta" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attestations" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_log_refs" (
    "id" TEXT NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "ipfs_cid" TEXT,
    "tx_hash" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_log_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_provider_metrics" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "total_latency_ms" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "day" DATE NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_wallet_address_key" ON "user_profiles"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_policies_user_id_key" ON "wealth_policies"("user_id");

-- CreateIndex
CREATE INDEX "sodex_accounts_account_id_idx" ON "sodex_accounts"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sodex_accounts_wallet_address_environment_key" ON "sodex_accounts"("wallet_address", "environment");

-- CreateIndex
CREATE INDEX "skill_events_skill_id_created_at_idx" ON "skill_events"("skill_id", "created_at");

-- CreateIndex
CREATE INDEX "signals_source_created_at_idx" ON "signals"("source", "created_at");

-- CreateIndex
CREATE INDEX "signed_orders_wallet_address_environment_created_at_idx" ON "signed_orders"("wallet_address", "environment", "created_at");

-- CreateIndex
CREATE INDEX "trades_user_id_created_at_idx" ON "trades"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_logs_provider_created_at_idx" ON "agent_logs"("provider", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "agent_meta_key_key" ON "agent_meta"("key");

-- CreateIndex
CREATE INDEX "attestations_subject_kind_idx" ON "attestations"("subject", "kind");

-- CreateIndex
CREATE INDEX "action_log_refs_ref_type_ref_id_idx" ON "action_log_refs"("ref_type", "ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_provider_metrics_provider_model_day_key" ON "ai_provider_metrics"("provider", "model", "day");

-- AddForeignKey
ALTER TABLE "wealth_policies" ADD CONSTRAINT "wealth_policies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sodex_accounts" ADD CONSTRAINT "sodex_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_events" ADD CONSTRAINT "skill_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_orders" ADD CONSTRAINT "signed_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_signed_order_id_fkey" FOREIGN KEY ("signed_order_id") REFERENCES "signed_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

