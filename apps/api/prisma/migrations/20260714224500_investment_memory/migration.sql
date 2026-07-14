-- CreateEnum
CREATE TYPE "ThesisStatus" AS ENUM ('active', 'challenged', 'invalidated', 'confirmed');

-- CreateEnum
CREATE TYPE "DecisionActionType" AS ENUM ('hold', 'ssi_allocate', 'sodex_trade', 'wait');

-- CreateEnum
CREATE TYPE "DecisionChoice" AS ENUM ('approved', 'rejected', 'deferred');

-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('HIT', 'STOP', 'DRIFT', 'PENDING');

-- CreateTable
CREATE TABLE "investment_theses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "status" "ThesisStatus" NOT NULL DEFAULT 'active',
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "evidence_json" JSONB,
    "invalidated_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_theses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_decisions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thesis_id" TEXT,
    "action_type" "DecisionActionType" NOT NULL,
    "proposal_json" JSONB NOT NULL,
    "user_choice" "DecisionChoice",
    "outcome" "DecisionOutcome" DEFAULT 'PENDING',
    "living_loop_hash" TEXT,
    "citations_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_theses_user_id_status_created_at_idx" ON "investment_theses"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "investment_decisions_user_id_created_at_idx" ON "investment_decisions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_snapshots_wallet_address_day_key" ON "market_snapshots"("wallet_address", "day");

-- AddForeignKey
ALTER TABLE "investment_theses" ADD CONSTRAINT "investment_theses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_decisions" ADD CONSTRAINT "investment_decisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_decisions" ADD CONSTRAINT "investment_decisions_thesis_id_fkey" FOREIGN KEY ("thesis_id") REFERENCES "investment_theses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

