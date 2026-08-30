# Tutor Court on Fly.io — custom Node server (Next.js + Payload + Socket.IO).
# NOT a Next standalone build: the app is served by server.ts (run via tsx), which
# also hosts the live-classroom Socket.IO realtime plane, so we ship the whole app
# + node_modules and run `pnpm start`.

FROM node:22.17.0-alpine AS base
RUN apk add --no-cache libc6-compat
# Pin pnpm to the version that generated pnpm-lock.yaml (engines requires ^9||^10);
# `corepack enable` alone would fetch the latest (v11) and fail --frozen-lockfile.
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

# ---- build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `next build` loads the Payload config, which needs these present. It does not
# connect to the DB for dynamic (auth-gated) pages. If a statically-rendered page
# needs the DB at build, pass the real URL: `fly deploy --build-arg DATABASE_URL=...`.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL=$DATABASE_URL
ENV PAYLOAD_SECRET="build-time-secret-not-used-at-runtime"
RUN pnpm run build:next

# ---- runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# tsx runs server.ts at runtime and resolves its TS imports (@/lib/...,
# @payload-config), so the runner needs the full app source + build + modules.
COPY --from=builder --chown=nextjs:nodejs /app ./

USER nextjs
EXPOSE 3000

# DATABASE_URL + PAYLOAD_SECRET + CLOUDFLARE_TURN_* are provided at runtime via
# `fly secrets`. Migrations run via the fly.toml [deploy] release_command.
CMD ["pnpm", "start"]
