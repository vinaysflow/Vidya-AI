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
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Generate Prisma client
RUN npx prisma generate

# Copy source
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
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

# Copy Prisma schema and generated client
COPY prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built JS
COPY --from=builder /app/dist ./dist/

# Copy OpenAPI spec
COPY openapi.yaml ./openapi.yaml

# Environment
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start server
CMD ["node", "dist/index.js"]
