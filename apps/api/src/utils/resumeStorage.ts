import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "./apiError.js";
import { env } from "../config/env.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Magic bytes headers
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
const DOCX_ZIP_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"

export interface FileValidationResult {
  valid: boolean;
  mimeType?: string;
  extension?: "pdf" | "docx";
  error?: string;
}

/**
 * Validate real file signature (magic bytes) to defeat extension spoofing
 */
export function validateFileSignature(buffer: Buffer): FileValidationResult {
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
export async function storeResumeInVault(
  buffer: Buffer,
  originalFilename: string
): Promise<{ fileKey: string; extension: string; signedUrl: string }> {
  const check = validateFileSignature(buffer);
  if (!check.valid || !check.extension) {
    throw AppError.badRequest(check.error || "File validation failed.");
  }

  // Random cryptographically secure filename
  const randomId = crypto.randomUUID();
  const fileKey = `resumes/${randomId}.${check.extension}`;

  // Ensure storage vault folder exists
  const vaultDir = path.resolve(process.cwd(), "storage/vault/resumes");
  await fs.mkdir(vaultDir, { recursive: true });

  const destinationPath = path.resolve(vaultDir, `${randomId}.${check.extension}`);
  await fs.writeFile(destinationPath, buffer);

  // Generate 15-minute signed token URL
  const expires = Date.now() + 15 * 60 * 1000;
  const signature = crypto
    .createHmac("sha256", env.JWT_SECRET)
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

/**
 * Verify HMAC signature for short-lived signed resume download
 */
export function verifySignedResumeUrl(
  fileKey: string,
  expiresStr: string,
  signature: string
): boolean {
  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires) || Date.now() > expires) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`${fileKey}:${expires}`)
    .digest("hex");

  const bufA = Buffer.from(signature);
  const bufB = Buffer.from(expectedSignature);

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
