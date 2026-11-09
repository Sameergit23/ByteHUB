# ==============================================================================
# ByteHUB API - Production Multi-Stage Dockerfile
# Security: Non-root user, dumb-init PID 1 signal forwarding, minimal attack surface
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base image with corepack and pnpm
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# ------------------------------------------------------------------------------
# Stage 2: Install dependencies
# ------------------------------------------------------------------------------
FROM base AS dependencies
WORKDIR /app

# Copy root monorepo files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------------
# Stage 3: Build shared packages and API application
# ------------------------------------------------------------------------------
FROM dependencies AS builder
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate Prisma Client
RUN pnpm --filter @bytehub/api prisma generate

# Build shared library and API bundle
RUN pnpm --filter @bytehub/shared build
RUN pnpm --filter @bytehub/api build

# Prune dev dependencies for production runtime
RUN pnpm prune --prod --no-optional

# ------------------------------------------------------------------------------
# Stage 4: Production Runner (Non-root, minimal image)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for clean process reaping and signal handling
RUN apk add --no-cache dumb-init wget

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Create unprivileged system group and user
RUN addgroup --system --gid 10001 nodejs && \
    adduser --system --uid 10001 express -G nodejs

# Copy pruned workspace node_modules
COPY --from=builder --chown=express:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=express:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=express:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=express:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=express:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=express:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=express:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Switch to non-root user
USER express

# Expose API port
EXPOSE 5000

# Container healthcheck against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

WORKDIR /app/apps/api

# Run application using dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]
