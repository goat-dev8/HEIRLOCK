import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const required = [
  "debate_json",
  "policy_json",
  "fill_proof_json",
  "signed_order_id",
  "living_loop_hash",
  "citations_json",
];

const cols = await p.$queryRawUnsafe(
  `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='investment_decisions'`,
);
const names = new Set(cols.map((c) => c.column_name));
const missing = required.filter((c) => !names.has(c));
console.log(JSON.stringify({ ok: missing.length === 0, columns: [...names].sort(), missing }, null, 2));
await p.$disconnect();
if (missing.length) process.exit(1);
