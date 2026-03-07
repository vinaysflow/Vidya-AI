#!/usr/bin/env sh
set -e

echo "[Railway] Applying Prisma schema..."
npx prisma db push --accept-data-loss --schema prisma/schema.prisma 2>&1 || true

echo "[Railway] Starting API server..."
exec node dist/index.js
