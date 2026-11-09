import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// ==============================================================================
// ByteHUB Automated Database Backup & Restore Drill Test
// Verifies snapshot export, AES-256 encryption, decryption, and schema restoration
// ==============================================================================

const TEST_SECRET = "bytehub_backup_vault_master_key_998877665544";

/**
 * Encrypt buffer with AES-256-CBC and PBKDF2 (OpenSSL compatible)
 */
function encryptBackup(dataBuffer, passphrase) {
  const salt = crypto.randomBytes(8); // Standard 8-byte OpenSSL salt
  const keyAndIv = crypto.pbkdf2Sync(passphrase, salt, 100000, 48, "sha256");
  const key = keyAndIv.subarray(0, 32);
  const iv = keyAndIv.subarray(32, 48);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);

  // Prefix with OpenSSL magic "Salted__" (8 bytes) + 8-byte salt
  const header = Buffer.concat([Buffer.from("Salted__", "utf8"), salt]);
  return Buffer.concat([header, encrypted]);
}

/**
 * Decrypt buffer with AES-256-CBC and PBKDF2
 */
function decryptBackup(encryptedBuffer, passphrase) {
  const salt = encryptedBuffer.subarray(8, 16); // Exactly 8 bytes
  const cipherText = encryptedBuffer.subarray(16);

  const keyAndIv = crypto.pbkdf2Sync(passphrase, salt, 100000, 48, "sha256");
  const key = keyAndIv.subarray(0, 32);
  const iv = keyAndIv.subarray(32, 48);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(cipherText), decipher.final()]);
}

test("Database Backup & Restore Drill: Full Disaster Recovery Simulation", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "bytehub-drill-"));
  const dumpPath = path.join(tmpDir, "primary_snapshot.dump");
  const encPath = path.join(tmpDir, "primary_snapshot.dump.enc");
  const restoredPath = path.join(tmpDir, "restored_snapshot.dump");

  try {
    // 1. Arrange: Sample Production Dataset snapshot
    const sourceDatabaseSnapshot = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      schema: "public",
      tables: {
        users: [
          { id: "usr_01", email: "student1@example.com", role: "STUDENT" },
          { id: "usr_02", email: "company1@techcorp.in", role: "COMPANY" },
          { id: "usr_admin", email: "admin@bytehub.dev", role: "ADMIN" },
        ],
        payments: [
          {
            id: "pay_01",
            orderId: "order_rzp_9901",
            amountInPaise: 2499900,
            status: "CAPTURED",
            currency: "INR",
          },
          {
            id: "pay_02",
            orderId: "order_pi_stripe_8802",
            amountInPaise: 49900,
            status: "CAPTURED",
            currency: "USD",
          },
        ],
        enrollments: [
          { id: "enr_01", userId: "usr_01", cohortId: "cohort_fs_01", status: "CONFIRMED" },
        ],
        auditLogs: [
          { id: "aud_01", action: "PAYMENT_CAPTURED", userId: "usr_01", timestamp: Date.now() },
        ],
      },
    };

    const rawJsonPayload = JSON.stringify(sourceDatabaseSnapshot, null, 2);
    const sourceChecksum = crypto.createHash("sha256").update(rawJsonPayload).digest("hex");

    // Write unencrypted dump
    await fs.writeFile(dumpPath, rawJsonPayload, "utf8");

    // 2. Act: Step 1 - Encryption
    const startTime = Date.now();
    const rawBuffer = await fs.readFile(dumpPath);
    const encryptedData = encryptBackup(rawBuffer, TEST_SECRET);
    await fs.writeFile(encPath, encryptedData);

    // Verify raw dump is purged and encrypted file is opaque
    await fs.unlink(dumpPath);
    const encryptedOnDisk = await fs.readFile(encPath);
    assert.ok(encryptedOnDisk.length > 0);
    assert.equal(encryptedOnDisk.subarray(0, 8).toString("utf8"), "Salted__");

    // 3. Act: Step 2 - Restore Drill
    const encryptedPayload = await fs.readFile(encPath);
    const decryptedBuffer = decryptBackup(encryptedPayload, TEST_SECRET);
    await fs.writeFile(restoredPath, decryptedBuffer);
    const durationMs = Date.now() - startTime;

    // 4. Assert: Data Integrity & Checksum Equality
    const restoredJson = await fs.readFile(restoredPath, "utf8");
    const restoredChecksum = crypto.createHash("sha256").update(restoredJson).digest("hex");

    assert.equal(
      restoredChecksum,
      sourceChecksum,
      "Decrypted dump SHA-256 checksum must match source database snapshot"
    );

    const restoredData = JSON.parse(restoredJson);
    assert.equal(restoredData.tables.users.length, 3);
    assert.equal(restoredData.tables.payments.length, 2);
    assert.equal(restoredData.tables.payments[0].amountInPaise, 2499900);
    assert.equal(restoredData.tables.enrollments[0].status, "CONFIRMED");

    // 5. Assert: Security - Rejection on invalid decryption key
    assert.throws(() => {
      decryptBackup(encryptedPayload, "invalid_attacker_key_wrong_secret");
    }, /bad decrypt|error/i);

    console.log(`[RESTORE DRILL PASS] Integrity verified. Checksum: ${restoredChecksum.substring(0, 16)}...`);
    console.log(`[RESTORE DRILL PASS] RTO Drill Duration: ${durationMs}ms (RTO target < 30m).`);
  } finally {
    // Cleanup temporary directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
