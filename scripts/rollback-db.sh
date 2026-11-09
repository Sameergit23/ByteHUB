#!/usr/bin/env bash
# ==============================================================================
# ByteHUB Database Rollback & Schema Migration Recovery
# Safely handles emergency rollback of applied schema migrations
# ==============================================================================
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL environment variable must be set." >&2
  exit 1
fi

echo "=== ByteHUB Zero-Downtime Migration Rollback Assistant ==="
echo "Note: Under the Expand & Contract pattern, running application code is backwards-compatible."
echo "Only execute schema reversal if a Phase 1 addition causes locking or performance degradation."

# 1. Resolve migration state
echo "Step 1: Inspecting current Prisma migration status..."
pnpm --filter @bytehub/api prisma migrate status

# 2. Mark rolled-back migration in _prisma_migrations ledger if manually resolved
if [[ $# -ge 1 ]]; then
  MIGRATION_NAME="$1"
  echo "Step 2: Marking migration ${MIGRATION_NAME} as rolled back..."
  pnpm --filter @bytehub/api prisma migrate resolve --rolled-back "${MIGRATION_NAME}"
  echo "Migration ${MIGRATION_NAME} marked as rolled back."
else
  echo "To resolve a specific failed migration, run: $0 <migration_name>"
fi

echo "=== Rollback Assistant Finished ==="
