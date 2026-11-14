import crypto from "node:crypto";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/apiError.js";
import { generateBase32Secret, matchTOTPStep } from "../utils/totp.js";
import { openSecret, sealSecret } from "../utils/secretBox.js";
import { hashToken } from "../utils/password.js";

const ISSUER = "ByteHUB";
const BACKUP_CODE_COUNT = 10;

/** "k3f9-x2m7": easy to type, ~41 bits each, lowercase letters and digits without look-alikes. */
function newBackupCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = () => alphabet[crypto.randomInt(alphabet.length)];
  const part = () => Array.from({ length: 4 }, pick).join("");
  return `${part()}-${part()}`;
}

const normaliseBackupCode = (code: string) =>
  code.trim().toLowerCase().replace(/[\s-]/g, "");

/**
 * Two-factor sign-in with an authenticator app (TOTP, RFC 6238), required for every staff
 * account. Secrets are stored encrypted; each 30-second code works once; ten one-time backup
 * codes cover a lost phone.
 */
export const twoFactorService = {
  /** Starts setup: a new secret (not active until confirmed with a code). */
  async beginSetup(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabledAt: true },
    });
    if (!user) throw AppError.notFound("Account not found.");
    if (user.twoFactorEnabledAt) {
      throw AppError.conflict("Two-factor sign-in is already set up for this account.");
    }

    const secret = generateBase32Secret(32); // 160 bits
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: sealSecret(secret), twoFactorLastStep: null },
    });

    const label = encodeURIComponent(`${ISSUER}:${user.email}`);
    const otpauthUri = `otpauth://totp/${label}?secret=${secret}&issuer=${ISSUER}&algorithm=SHA1&digits=6&period=30`;
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 240 });
    return {
      otpauthUri,
      qrDataUrl,
      // Shown in groups of four for typing into the app by hand.
      manualKey: secret.replace(/(.{4})/g, "$1 ").trim(),
    };
  },

  /** Confirms setup with a code from the app; returns the backup codes (shown once). */
  async confirmSetup(userId: string, code: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabledAt: true },
    });
    if (!user) throw AppError.notFound("Account not found.");
    if (user.twoFactorEnabledAt) {
      throw AppError.conflict("Two-factor sign-in is already set up for this account.");
    }
    const secret = openSecret(user.twoFactorSecret);
    if (!secret)
      throw AppError.badRequest("Start the setup again: no pending secret was found.");

    const step = matchTOTPStep(code, secret);
    if (step === null) {
      throw AppError.badRequest(
        "That code didn't match. Check the time on your phone is set automatically, then try the newest code."
      );
    }

    const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, newBackupCode);
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabledAt: new Date(),
        twoFactorLastStep: step,
        twoFactorBackupCodes: backupCodes.map((c) => hashToken(normaliseBackupCode(c))),
      },
    });
    return backupCodes;
  },

  /**
   * Checks a sign-in code: a 6-digit app code (each usable once) or a backup code (removed
   * once used). Returns how the user signed in, or null when the code is wrong.
   */
  async verify(userId: string, rawCode: string): Promise<"app" | "backup" | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabledAt: true,
        twoFactorLastStep: true,
        twoFactorBackupCodes: true,
      },
    });
    if (!user?.twoFactorEnabledAt) return null;
    const code = rawCode.trim().replace(/\s/g, "");

    if (/^\d{6}$/.test(code)) {
      const secret = openSecret(user.twoFactorSecret);
      if (!secret) return null;
      const step = matchTOTPStep(code, secret);
      if (step === null) return null;
      if (user.twoFactorLastStep !== null && step <= user.twoFactorLastStep) return null; // replay
      // Conditional update so two simultaneous requests can't both use the same code.
      const updated = await prisma.user.updateMany({
        where: {
          id: userId,
          OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }],
        },
        data: { twoFactorLastStep: step },
      });
      return updated.count === 1 ? "app" : null;
    }

    const hashed = hashToken(normaliseBackupCode(code));
    if (!user.twoFactorBackupCodes.includes(hashed)) return null;
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: user.twoFactorBackupCodes.filter((c) => c !== hashed),
      },
    });
    return "backup";
  },

  /** Turns two-factor off (a Super Admin helping someone who lost their phone). */
  async reset(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
        twoFactorLastStep: null,
        twoFactorBackupCodes: [],
      },
    });
  },
};
