#!/usr/bin/env sh
set -e

echo "[Railway] Applying Prisma schema..."
pnpm dlx prisma@5.22.0 db push --accept-data-loss --schema prisma/schema.prisma

echo "[Railway] Starting API server..."
exec node dist/index.js
