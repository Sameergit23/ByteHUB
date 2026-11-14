import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(length = 20): string {
  const randomBytes = crypto.randomBytes(length);
  let secret = "";
  for (let i = 0; i < randomBytes.length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i]! % 32];
  }
  return secret;
}

export function base32ToBuffer(base32: string): Buffer {
  const cleanBase32 = base32.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (let i = 0; i < cleanBase32.length; i++) {
    const char = cleanBase32[i];
    if (!char) continue;
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTOTPCode(
  secretBase32: string,
  timeSeconds: number = Math.floor(Date.now() / 1000),
  step = 30
): string {
  const key = base32ToBuffer(secretBase32);
  const timeStep = Math.floor(timeSeconds / step);

  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binary =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

export function verifyTOTPCode(
  token: string,
  secretBase32: string,
  window = 1,
  step = 30
): boolean {
  if (!token || !secretBase32 || token.length !== 6) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  for (let i = -window; i <= window; i++) {
    const calculated = generateTOTPCode(secretBase32, nowSeconds + i * step, step);
    if (
      crypto.timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(calculated, "utf8"))
    ) {
      return true;
    }
  }

  return false;
}
