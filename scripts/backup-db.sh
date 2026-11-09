#!/usr/bin/env bash
# ==============================================================================
# ByteHUB Database Backup Script
# Automated daily backup of managed PostgreSQL with AES-256 encryption & S3 upload
# ==============================================================================
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/tmp/bytehub_backups}"
BACKUP_FILE="${BACKUP_DIR}/bytehub_prod_${TIMESTAMP}.dump"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

mkdir -p "${BACKUP_DIR}"

echo "=== [${TIMESTAMP}] Starting ByteHUB PostgreSQL Backup ==="

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL environment variable is required." >&2
  exit 1
fi

if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "Error: BACKUP_ENCRYPTION_KEY is required for AES-256 encryption." >&2
  exit 1
fi

# 1. Execute pg_dump with custom format (-Fc) for atomic compression & flexible restore
echo "Step 1: Running pg_dump with compression..."
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --dbname="${DATABASE_URL}" \
  --file="${BACKUP_FILE}"

echo "Database dump complete. Size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# 2. Encrypt dump using OpenSSL AES-256-CBC
echo "Step 2: Encrypting backup with AES-256-CBC..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "${BACKUP_FILE}" \
  -out "${ENCRYPTED_FILE}" \
  -k "${BACKUP_ENCRYPTION_KEY}"

# Securely remove unencrypted raw dump
rm -f "${BACKUP_FILE}"

# 3. Upload encrypted snapshot to private S3 cold storage bucket
if [[ -n "${S3_BACKUP_BUCKET:-}" ]]; then
  echo "Step 3: Uploading encrypted backup to s3://${S3_BACKUP_BUCKET}/daily/..."
  aws s3 cp "${ENCRYPTED_FILE}" "s3://${S3_BACKUP_BUCKET}/daily/bytehub_prod_${TIMESTAMP}.dump.enc" \
    --storage-class STANDARD_IA \
    --sse aws:kms
  echo "Backup successfully uploaded to remote cold storage."
else
  echo "Step 3: S3_BACKUP_BUCKET not set. Retaining encrypted backup locally at ${ENCRYPTED_FILE}."
fi

echo "=== ByteHUB PostgreSQL Backup Completed Successfully ==="
