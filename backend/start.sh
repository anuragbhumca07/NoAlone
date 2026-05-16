#!/bin/sh
set -e

echo "=== noAlone Backend Starting ==="
echo "Waiting for database connection..."

# Retry migration up to 10 times
MAX_RETRIES=10
RETRY=0
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
