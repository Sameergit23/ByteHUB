/* eslint-disable no-console -- command-line script: console output is its interface */
/**
 * Retires the demo data created by prisma/seed.ts so it cannot be used in production.
 *
 *   pnpm --filter @bytehub/api run demo:retire              # dry run: shows what would change
 *   pnpm --filter @bytehub/api run demo:retire -- --confirm # applies the changes
 *
 * What it does (nothing is hard-deleted; payment and audit history stays intact):
 *   - Demo accounts: password replaced with an unusable random value, all sessions revoked,
 *     account marked deleted so it can no longer sign in.
 *   - Sample internship listings: status set to CLOSED so they disappear from the site.
 */
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { DEMO_ACCOUNT_EMAILS, DEMO_INTERNSHIP_SLUGS } from "../src/config/demoData";

const prisma = new PrismaClient();
const confirm = process.argv.includes("--confirm");

async function main() {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL || "").host || "(unknown host)";
    } catch {
      return "(unparseable DATABASE_URL)";
    }
  })();
  console.log(`[demo:retire] Database: ${host}`);
  console.log(
    confirm
      ? "[demo:retire] Applying changes."
      : "[demo:retire] Dry run (add --confirm to apply)."
  );

  const users = await prisma.user.findMany({
    where: { email: { in: [...DEMO_ACCOUNT_EMAILS] }, deletedAt: null },
    select: { id: true, email: true, role: true },
  });

  const listings = await prisma.internship.findMany({
    where: {
      slug: { in: [...DEMO_INTERNSHIP_SLUGS] },
      status: { not: "CLOSED" },
      deletedAt: null,
    },
    select: { id: true, slug: true, companyName: true, status: true },
  });

  console.log(`\nDemo accounts to retire (${users.length}):`);
  users.forEach((u) => console.log(`  - ${u.email} (${u.role})`));
  console.log(`\nSample listings to close (${listings.length}):`);
  listings.forEach((l) =>
    console.log(`  - ${l.slug} [${l.companyName}] currently ${l.status}`)
  );

  if (!confirm || (users.length === 0 && listings.length === 0)) {
    if (users.length === 0 && listings.length === 0) console.log("\nNothing to do.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const u of users) {
      await tx.refreshToken.updateMany({
        where: { userId: u.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.user.update({
        where: { id: u.id },
        data: {
          // Not a valid hash format, so no password can ever match it.
          passwordHash: `RETIRED_DEMO_ACCOUNT_${crypto.randomBytes(24).toString("hex")}`,
          deletedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: "DEMO_ACCOUNT_RETIRED",
          entityType: "USER",
          entityId: u.id,
          details: { email: u.email },
        },
      });
    }

    if (listings.length > 0) {
      await tx.internship.updateMany({
        where: { id: { in: listings.map((l) => l.id) } },
        data: { status: "CLOSED" },
      });
    }
  });

  console.log(
    `\n[demo:retire] Done: ${users.length} account(s) retired, ${listings.length} listing(s) closed.`
  );
}

main()
  .catch((err) => {
    console.error("[demo:retire] Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
