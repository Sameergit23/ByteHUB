import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { env } from "./env.js";
import { prisma } from "../lib/prisma.js";
import { logger } from "../utils/logger.js";
import { verifyPassword } from "../utils/password.js";
import { getResumeVaultDir } from "../utils/resumeStorage.js";
import {
  DEMO_ACCOUNT_EMAILS,
  DEMO_ACCOUNT_PASSWORD,
  DEMO_INTERNSHIP_SLUGS,
} from "./demoData.js";

export interface PreflightResult {
  /** Problems that must stop the server from starting. */
  fatal: string[];
  /** Problems worth fixing that do not block start-up. */
  warnings: string[];
}

/**
 * Production start-up checks that need the file system or the database.
 * (Settings-only checks run earlier, in config/env.ts.)
 */
export async function runProductionPreflight(): Promise<PreflightResult> {
  const result: PreflightResult = { fatal: [], warnings: [] };
  if (env.NODE_ENV !== "production") return result;

  // 1. Resume uploads need a writable directory (a mounted volume in containers).
  const vaultDir = getResumeVaultDir();
  try {
    await fs.mkdir(vaultDir, { recursive: true });
    await fs.access(vaultDir, fsConstants.W_OK);
  } catch {
    result.fatal.push(
      `Resume storage directory "${vaultDir}" is not writable. Mount a persistent volume there ` +
        "or set RESUME_STORAGE_DIR to a writable path."
    );
  }
  if (!env.RESUME_STORAGE_DIR) {
    result.warnings.push(
      "RESUME_STORAGE_DIR is not set; resumes are stored inside the app folder and may be lost on redeploy."
    );
  }

  // 2. Demo data from prisma/seed.ts must not be live.
  try {
    const demoUsers = await prisma.user.findMany({
      where: { email: { in: [...DEMO_ACCOUNT_EMAILS] }, deletedAt: null },
      select: { email: true, passwordHash: true },
    });

    const withKnownPassword: string[] = [];
    for (const user of demoUsers) {
      if (await verifyPassword(DEMO_ACCOUNT_PASSWORD, user.passwordHash)) {
        withKnownPassword.push(user.email);
      }
    }

    if (withKnownPassword.length > 0) {
      const message =
        `Demo accounts with the published seed password still exist: ${withKnownPassword.join(", ")}. ` +
        "Run `pnpm --filter @bytehub/api run demo:retire -- --confirm` or change their passwords.";
      if (env.ALLOW_DEMO_ACCOUNTS === "true") {
        result.warnings.push(`${message} (allowed because ALLOW_DEMO_ACCOUNTS=true)`);
      } else {
        result.fatal.push(message);
      }
    }

    const demoListings = await prisma.internship.count({
      where: {
        slug: { in: [...DEMO_INTERNSHIP_SLUGS] },
        status: "PUBLISHED",
        deletedAt: null,
      },
    });
    if (demoListings > 0) {
      result.warnings.push(
        `${demoListings} sample internship listing(s) from the seed script are published. ` +
          "They use real company names; close them before launch (demo:retire does this)."
      );
    }
  } catch (err) {
    // A database outage at boot is reported by /api/health; do not crash-loop on it.
    result.warnings.push(
      `Could not run the demo-data check (database unreachable?): ${
        err instanceof Error ? err.message.split("\n")[0] : String(err)
      }`
    );
  }

  return result;
}

/** Logs the outcome; returns false when the server must not start. */
export function reportPreflight(result: PreflightResult): boolean {
  result.warnings.forEach((w) => logger.warn(`[Preflight] ${w}`));

  if (result.fatal.length > 0) {
    console.error(
      [
        "",
        "================================================================================",
        "  FATAL: ByteHUB API refuses to start in production:",
        ...result.fatal.map((p) => `  ✕ ${p}`),
        "================================================================================",
        "",
      ].join("\n")
    );
    return false;
  }
  return true;
}
