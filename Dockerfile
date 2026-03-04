# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.mjs file.
# Optimized for pnpm + SQLite on Fly.io with persistent volumes

FROM node:22.17.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy pnpm lockfile and package.json
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Need a dummy DATABASE_URL and PAYLOAD_SECRET for the build step
ENV DATABASE_URL="file:./payload-build.db"
ENV PAYLOAD_SECRET="build-time-secret-not-used-at-runtime"

RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# Create the data directory for SQLite (will be a mount point for the Fly volume)
RUN mkdir -p /data && chown nextjs:nodejs /data

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy node_modules for serverExternalPackages (native modules like libsql)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# SQLite database lives on the persistent volume at /data
ENV DATABASE_URL="file:/data/payload.db"

CMD ["node", "server.js"]
