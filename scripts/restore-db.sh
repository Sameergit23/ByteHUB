#!/usr/bin/env bash
# ==============================================================================
# ByteHUB Database Restore Drill Script
# Decrypts and restores an encrypted snapshot into a target database for recovery
# ==============================================================================
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path_to_encrypted_backup_or_s3_uri> [TARGET_DATABASE_URL]"
  exit 1
fi

ENCRYPTED_SRC="$1"
RESTORE_DB_URL="${2:-${TARGET_DATABASE_URL:-}}"
WORKDIR="/tmp/bytehub_restore_drill"
DECRYPTED_DUMP="${WORKDIR}/decrypted_restore.dump"

mkdir -p "${WORKDIR}"

if [[ -z "${RESTORE_DB_URL}" ]]; then
  echo "Error: Target database URL must be provided as second argument or TARGET_DATABASE_URL env." >&2
  exit 1
fi

if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "Error: BACKUP_ENCRYPTION_KEY environment variable is required." >&2
  exit 1
fi

echo "=== Starting ByteHUB Database Restore Drill ==="

# 1. Download if S3 URI
if [[ "${ENCRYPTED_SRC}" =~ ^s3:// ]]; then
  echo "Step 1: Downloading snapshot from ${ENCRYPTED_SRC}..."
  aws s3 cp "${ENCRYPTED_SRC}" "${WORKDIR}/downloaded_backup.dump.enc"
  LOCAL_ENCRYPTED="${WORKDIR}/downloaded_backup.dump.enc"
else
  LOCAL_ENCRYPTED="${ENCRYPTED_SRC}"
fi

# 2. Decrypt with OpenSSL
echo "Step 2: Decrypting snapshot using AES-256-CBC..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "${LOCAL_ENCRYPTED}" \
  -out "${DECRYPTED_DUMP}" \
  -k "${BACKUP_ENCRYPTION_KEY}"

# 3. Restore to target database using pg_restore
echo "Step 3: Restoring into target database..."
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --dbname="${RESTORE_DB_URL}" \
  "${DECRYPTED_DUMP}"

# 4. Clean up temporary decrypted file
rm -f "${DECRYPTED_DUMP}"

echo "=== Restore Drill Completed. Database is restored and ready for integrity assertion. ==="
