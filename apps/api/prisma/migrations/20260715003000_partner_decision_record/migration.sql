-- Partner decision record: full debate, policy, fill proof linkage
ALTER TABLE "investment_decisions" ADD COLUMN IF NOT EXISTS "debate_json" JSONB;
ALTER TABLE "investment_decisions" ADD COLUMN IF NOT EXISTS "policy_json" JSONB;
ALTER TABLE "investment_decisions" ADD COLUMN IF NOT EXISTS "fill_proof_json" JSONB;
ALTER TABLE "investment_decisions" ADD COLUMN IF NOT EXISTS "signed_order_id" TEXT;
