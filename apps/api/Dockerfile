# Render / container entry for HEIRLOCK API
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/ai-provider/package.json packages/ai-provider/
COPY packages/sodex-signing/package.json packages/sodex-signing/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @heirlock/config build \
 && pnpm --filter @heirlock/ai-provider build \
 && pnpm --filter @heirlock/sodex-signing build \
 && pnpm --filter @heirlock/api exec prisma generate \
 && pnpm --filter @heirlock/api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "start"]
