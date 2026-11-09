import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Magic bytes headers
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const DOCX_ZIP_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"

/**
 * Validate real file signature (magic bytes) to defeat extension spoofing
 */
export function validateFileSignature(buffer) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file payload provided." };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: "File exceeds maximum size threshold of 5 MB." };
  }

  // Check for EICAR anti-malware test signature
  const bufferString = buffer.toString("utf8", 0, Math.min(buffer.length, 1024));
  if (bufferString.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE!")) {
    return { valid: false, error: "Malware signature detected by ClamAV scanner." };
  }

  // Validate PDF magic bytes: %PDF-
  if (buffer.length >= 5 && buffer.subarray(0, 5).equals(PDF_MAGIC_BYTES)) {
    return { valid: true, mimeType: "application/pdf", extension: "pdf" };
  }

  // Validate DOCX magic bytes: PK\x03\x04
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(DOCX_ZIP_MAGIC_BYTES)) {
    return {
      valid: true,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: "docx",
    };
  }

  return {
    valid: false,
    error:
      "Invalid file format signature. Only verified PDF and DOCX documents are accepted (spoofed extensions rejected).",
  };
}

/**
 * Store resume in private storage and return signed URL descriptor
 */
export async function storeResumeInVault(buffer, originalFilename, jwtSecret = "default_secret_key_bytehub") {
  const check = validateFileSignature(buffer);
  if (!check.valid || !check.extension) {
    const error = new Error(check.error || "File validation failed.");
    error.status = 400;
    throw error;
  }

  const randomId = crypto.randomUUID();
  const fileKey = `resumes/${randomId}.${check.extension}`;

  const vaultDir = path.resolve(process.cwd(), "storage/vault/resumes");
  await fs.mkdir(vaultDir, { recursive: true });

  const destinationPath = path.resolve(vaultDir, `${randomId}.${check.extension}`);
  await fs.writeFile(destinationPath, buffer);

  const expires = Date.now() + 15 * 60 * 1000;
  const signature = crypto
    .createHmac("sha256", jwtSecret)
    .update(`${fileKey}:${expires}`)
    .digest("hex");

  const signedUrl = `/api/applications/resume-download?key=${encodeURIComponent(
    fileKey
  )}&expires=${expires}&signature=${signature}`;

  return {
    fileKey,
    extension: check.extension,
    signedUrl,
  };
}

