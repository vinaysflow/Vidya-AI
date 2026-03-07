# Vidya API - Production Dockerfile
# Multi-stage build for minimal image size

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Install pnpm and dependencies
RUN npm install -g pnpm@8.15.1
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Generate Prisma client using local CLI (v5)
RUN pnpm exec prisma generate --schema prisma/schema.prisma

# Copy source — ARG busts Docker cache so src changes are always recompiled
ARG CACHEBUST=1
COPY tsconfig.json ./
COPY src ./src/

# Build TypeScript
RUN pnpm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-slim AS production

WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files and install production deps only
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@8.15.1
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

# Copy Prisma schema and generate client in production stage
COPY prisma ./prisma/
RUN pnpm dlx prisma@5.22.0 generate --schema prisma/schema.prisma

# Copy built JS
COPY --from=builder /app/dist ./dist/

# Copy OpenAPI spec
COPY openapi.yaml ./openapi.yaml

# Startup script
COPY scripts/railway-start.sh ./scripts/railway-start.sh

# Environment
ENV NODE_ENV=production

EXPOSE 4000 8080

# Health check uses $PORT so it works regardless of what Railway assigns
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const p=process.env.PORT||4000;fetch('http://localhost:'+p+'/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Start server
CMD ["sh", "scripts/railway-start.sh"]
