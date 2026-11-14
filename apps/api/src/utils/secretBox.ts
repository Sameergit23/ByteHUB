import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * Small authenticated encryption helper (AES-256-GCM) for secrets kept in the database, such as
 * staff members' authenticator-app keys. The key is derived from JWT_SECRET, so a copy of the
 * database alone is not enough to generate sign-in codes.
 *
 * Changing JWT_SECRET makes stored secrets unreadable: staff then set up two-factor again.
 */
const KEY = crypto
  .createHash("sha256")
  .update(`bytehub:secret-box:v1:${env.JWT_SECRET}`)
  .digest();

export function sealSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${data.toString("base64url")}`;
}

export function openSecret(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const [version, ivB64, tagB64, dataB64] = sealed.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KEY,
      Buffer.from(ivB64, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
