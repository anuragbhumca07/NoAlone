#!/bin/sh
set -e

echo "=== noAlone Backend Starting ==="
echo "Waiting for database connection..."

MAX_RETRIES=10
RETRY=0

# If a previous deployment left a failed migration in the DB (Prisma P3009),
# migrate deploy refuses to run at all. Detect and recover by doing a full
# schema reset so deploy can apply all migrations cleanly from scratch.
MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1) || true
if echo "$MIGRATE_OUTPUT" | grep -q "P3009"; then
  echo "Detected failed migration (P3009) — resetting schema for clean apply..."
  npx prisma migrate reset --force --skip-seed
  echo "Schema reset complete."
fi

until npx prisma migrate deploy; do
  RETRY=$((RETRY+1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "ERROR: Migration failed after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Migration failed (attempt $RETRY/$MAX_RETRIES), retrying in 5s..."
  sleep 5
done

echo "=== Database migrations complete ==="
echo "Starting NestJS server on port ${PORT:-3000}..."
exec node dist/main
