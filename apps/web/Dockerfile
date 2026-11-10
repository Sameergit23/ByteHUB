# ==============================================================================
# ByteHUB Web (Next.js) - Production Multi-Stage Dockerfile
# Security: Non-root user (nextjs:nodejs), dumb-init PID 1, standalone bundle
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base image
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# ------------------------------------------------------------------------------
# Stage 2: Dependencies
# ------------------------------------------------------------------------------
FROM base AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------------
# Stage 3: Builder
# ------------------------------------------------------------------------------
FROM dependencies AS builder
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# The browser only ever calls same-origin "/api/*"; Next.js proxies those requests to the API.
# The proxy target is fixed when the image is built, so pass the address the web container
# uses to reach the API (e.g. --build-arg API_INTERNAL_URL=http://api:5000/api).
ARG API_INTERNAL_URL=http://api:5000/api
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

# The runner stage copies .next/standalone, which next.config.mjs only emits with this flag.
ENV BUILD_STANDALONE=1

# Build shared package first
RUN pnpm --filter @bytehub/shared build

# Build Next.js application
RUN pnpm --filter @bytehub/web build

# ------------------------------------------------------------------------------
# Stage 4: Production Runner (Non-root user)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged system user
RUN addgroup --system --gid 10001 nodejs && \
    adduser --system --uid 10001 nextjs -G nodejs

# Set correct permissions for cache & public
RUN mkdir -p /app/apps/web/.next && \
    chown -R nextjs:nodejs /app/apps/web/.next

# Copy public directory and standalone artifacts
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
