import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function probeDatabase(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  if (!process.env.DATABASE_URL) {
    return { configured: false, connected: false, error: "DATABASE_URL missing" };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { configured: true, connected: true };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
