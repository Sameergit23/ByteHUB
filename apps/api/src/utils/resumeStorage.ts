import crypto from "node:crypto";
import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { AppError } from "./apiError.js";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/** Directory that holds uploaded resumes (RESUME_STORAGE_DIR, or ./storage/vault/resumes). */
export function getResumeVaultDir(): string {
  return path.resolve(
    env.RESUME_STORAGE_DIR || path.join(process.cwd(), "storage/vault/resumes")
  );
}

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
  _originalFilename: string
): Promise<{ fileKey: string; extension: string; signedUrl: string }> {
  const check = validateFileSignature(buffer);
  if (!check.valid || !check.extension) {
    throw AppError.badRequest(check.error || "File validation failed.");
  }

  // Random cryptographically secure filename
  const randomId = crypto.randomUUID();
  const fileKey = `resumes/${randomId}.${check.extension}`;

  await resumeStore().save(fileKey, buffer, check.mimeType || "application/octet-stream");

  return {
    fileKey,
    extension: check.extension,
    signedUrl: signResumeUrl(fileKey),
  };
}

const RESUME_KEY_PATTERN =
  /^resumes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|docx)$/i;

/** True for keys this server issued itself ("resumes/<uuid>.pdf|docx"). */
export function isValidResumeKey(value: unknown): value is string {
  return typeof value === "string" && RESUME_KEY_PATTERN.test(value);
}

/**
 * Accepts either a bare vault key or one of our signed download URLs and returns the key.
 * Returns null for anything that did not come from the resume vault.
 */
export function extractResumeKey(value: string): string | null {
  if (isValidResumeKey(value)) return value;

  const match = /[?&]key=([^&]+)/.exec(value || "");
  if (match?.[1]) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (isValidResumeKey(decoded)) return decoded;
    } catch {
      return null;
    }
  }
  return null;
}

/** Does the uploaded file for this key still exist in storage? */
export async function resumeExists(fileKey: string): Promise<boolean> {
  if (!isValidResumeKey(fileKey)) return false;
  return resumeStore().exists(fileKey);
}

/** The stored file's bytes, or null when it does not exist. */
export async function readResumeFile(fileKey: string): Promise<Buffer | null> {
  if (!isValidResumeKey(fileKey)) return null;
  return resumeStore().read(fileKey);
}

/**
 * Start-up check that resumes can actually be stored (used by the production preflight).
 * Returns a problem description, or null when storage is ready.
 */
export async function checkResumeStorage(): Promise<string | null> {
  return resumeStore().check();
}

// ---------------------------------------------------------------------------
// Storage backends
// ---------------------------------------------------------------------------

interface ResumeStore {
  save(fileKey: string, data: Buffer, contentType: string): Promise<void>;
  exists(fileKey: string): Promise<boolean>;
  read(fileKey: string): Promise<Buffer | null>;
  check(): Promise<string | null>;
}

function resumeStore(): ResumeStore {
  return env.STORAGE_DRIVER === "supabase" ? supabaseStore : localStore;
}

/** Files on this server's disk (development, or a mounted persistent disk). */
const localStore: ResumeStore = {
  async save(fileKey, data) {
    const vaultDir = getResumeVaultDir();
    await fs.mkdir(vaultDir, { recursive: true });
    await fs.writeFile(path.resolve(vaultDir, path.basename(fileKey)), data);
  },
  async exists(fileKey) {
    try {
      await fs.access(path.resolve(getResumeVaultDir(), path.basename(fileKey)));
      return true;
    } catch {
      return false;
    }
  },
  async read(fileKey) {
    try {
      return await fs.readFile(path.resolve(getResumeVaultDir(), path.basename(fileKey)));
    } catch {
      return null;
    }
  },
  async check() {
    const vaultDir = getResumeVaultDir();
    try {
      await fs.mkdir(vaultDir, { recursive: true });
      await fs.access(vaultDir, fsConstants.W_OK);
      return null;
    } catch {
      return (
        `Resume storage directory "${vaultDir}" is not writable. Mount a persistent disk there, ` +
        "set RESUME_STORAGE_DIR to a writable path, or use STORAGE_DRIVER=supabase."
      );
    }
  },
};

/**
 * Private Supabase Storage bucket, used through its REST API (no SDK needed).
 * Downloads still go through this API's own signed links, so access control is unchanged.
 */
function supabaseConfig() {
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw AppError.internal("Resume storage is not configured.", "INTERNAL_SERVER_ERROR");
  }
  return { url, key, bucket: env.SUPABASE_STORAGE_BUCKET };
}

function supabaseHeaders(
  key: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  // Legacy service_role keys are JWTs and go in both headers; the newer "sb_secret_" keys
  // are only accepted in the apikey header.
  return key.startsWith("sb_")
    ? { apikey: key, ...extra }
    : { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

function supabaseObjectUrl(
  cfg: { url: string; bucket: string },
  fileKey: string
): string {
  const objectPath = fileKey.split("/").map(encodeURIComponent).join("/");
  return `${cfg.url}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${objectPath}`;
}

async function describeFailure(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`;
}

const supabaseStore: ResumeStore = {
  async save(fileKey, data, contentType) {
    const cfg = supabaseConfig();
    const res = await fetch(supabaseObjectUrl(cfg, fileKey), {
      method: "POST",
      headers: supabaseHeaders(cfg.key, {
        "Content-Type": contentType,
        "x-upsert": "false",
        "cache-control": "no-store",
      }),
      body: new Uint8Array(data),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      logger.error(
        { fileKey, failure: await describeFailure(res) },
        "Supabase Storage upload failed"
      );
      throw AppError.internal("The resume could not be stored. Please try again.");
    }
  },

  async exists(fileKey) {
    const cfg = supabaseConfig();
    const folder = path.posix.dirname(fileKey);
    const name = path.posix.basename(fileKey);
    const res = await fetch(
      `${cfg.url}/storage/v1/object/list/${encodeURIComponent(cfg.bucket)}`,
      {
        method: "POST",
        headers: supabaseHeaders(cfg.key, { "Content-Type": "application/json" }),
        body: JSON.stringify({ prefix: folder, search: name, limit: 5 }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) {
      logger.error(
        { fileKey, failure: await describeFailure(res) },
        "Supabase Storage lookup failed"
      );
      throw AppError.internal(
        "Resume storage is temporarily unavailable. Please try again."
      );
    }
    const items = (await res.json()) as Array<{ name?: string }>;
    return Array.isArray(items) && items.some((item) => item.name === name);
  },

  async read(fileKey) {
    const cfg = supabaseConfig();
    const res = await fetch(supabaseObjectUrl(cfg, fileKey), {
      headers: supabaseHeaders(cfg.key),
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 400 || res.status === 404) return null; // object not found
    if (!res.ok) {
      logger.error(
        { fileKey, failure: await describeFailure(res) },
        "Supabase Storage download failed"
      );
      throw AppError.internal(
        "Resume storage is temporarily unavailable. Please try again."
      );
    }
    return Buffer.from(await res.arrayBuffer());
  },

  async check() {
    let cfg;
    try {
      cfg = supabaseConfig();
    } catch {
      return "STORAGE_DRIVER=supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    }

    try {
      const bucketUrl = `${cfg.url}/storage/v1/bucket`;
      const existing = await fetch(`${bucketUrl}/${encodeURIComponent(cfg.bucket)}`, {
        headers: supabaseHeaders(cfg.key),
        signal: AbortSignal.timeout(15000),
      });

      if (existing.ok) {
        const bucket = (await existing.json()) as { public?: boolean };
        if (bucket.public) {
          return (
            `Supabase Storage bucket "${cfg.bucket}" is PUBLIC, which would expose resumes. ` +
            "Make it private in Supabase → Storage → bucket settings."
          );
        }
        return null;
      }

      if (existing.status === 401 || existing.status === 403) {
        return `Supabase rejected the storage key (${await describeFailure(existing)}). Check SUPABASE_SERVICE_ROLE_KEY.`;
      }

      // Bucket missing: create it as private, limited to 5 MB PDF/DOCX files.
      const created = await fetch(bucketUrl, {
        method: "POST",
        headers: supabaseHeaders(cfg.key, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: cfg.bucket,
          name: cfg.bucket,
          public: false,
          file_size_limit: MAX_FILE_SIZE,
          allowed_mime_types: [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!created.ok) {
        return `Could not create the Supabase Storage bucket "${cfg.bucket}" (${await describeFailure(created)}).`;
      }
      logger.info(
        { bucket: cfg.bucket },
        "Created private Supabase Storage bucket for resumes"
      );
      return null;
    } catch (err) {
      return `Supabase Storage is unreachable at ${cfg.url} (${err instanceof Error ? err.message : String(err)}).`;
    }
  },
};

/**
 * Short-lived (15 minute) signed download URL for a vault key.
 * Links are minted on demand, so a stored application never holds an expiring URL.
 */
export function signResumeUrl(fileKey: string): string {
  const expires = Date.now() + 15 * 60 * 1000;
  const signature = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`${fileKey}:${expires}`)
    .digest("hex");

  return `/api/applications/resume-download?key=${encodeURIComponent(
    fileKey
  )}&expires=${expires}&signature=${signature}`;
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
