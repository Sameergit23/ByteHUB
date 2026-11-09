import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(length = 20) {
  const randomBytes = crypto.randomBytes(length);
  let secret = "";
  for (let i = 0; i < randomBytes.length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

export function base32ToBuffer(base32) {
  const cleanBase32 = base32.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (let i = 0; i < cleanBase32.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleanBase32[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Computes RFC 6238 TOTP code for a given secret at timestamp
 */
export function generateTOTPCode(secretBase32, timeSeconds = Math.floor(Date.now() / 1000), step = 30) {
  const key = base32ToBuffer(secretBase32);
  const timeStep = Math.floor(timeSeconds / step);

  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verifies a 6-digit TOTP code with time drift window of +/- 1 step
 */
export function verifyTOTPCode(token, secretBase32, window = 1, step = 30) {
  if (!token || !secretBase32 || token.length !== 6) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  for (let i = -window; i <= window; i++) {
    const calculated = generateTOTPCode(secretBase32, nowSeconds + i * step, step);
    if (crypto.timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(calculated, "utf8"))) {
      return true;
    }
  }

  return false;
}

