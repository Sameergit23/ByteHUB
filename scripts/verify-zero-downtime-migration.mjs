import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

// ==============================================================================
// ByteHUB Zero-Downtime Migration Rule Checker
// Ensures no destructive DDL statements occur in Phase 1 (Expand) migrations
// ==============================================================================

const FORBIDDEN_ZERO_DOWNTIME_PATTERNS = [
  { pattern: /\bDROP\s+COLUMN\b/i, name: "DROP COLUMN (Breaks running code reading the column)" },
  { pattern: /\bDROP\s+TABLE\b/i, name: "DROP TABLE (Breaks running services referencing the table)" },
  { pattern: /\bALTER\s+TABLE\s+.*\s+RENAME\s+COLUMN\b/i, name: "RENAME COLUMN (Breaks in-flight queries)" },
  { pattern: /\bALTER\s+TABLE\s+.*\s+SET\s+NOT\s+NULL\b/i, name: "SET NOT NULL without DEFAULT (Locks writes from older app replicas)" },
];

test("Zero-Downtime Migration Linter: verifies Expand-and-Contract compliance", async () => {
  const migrationsDir = path.resolve("apps/api/prisma/migrations");

  try {
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
    const migrationDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    for (const dir of migrationDirs) {
      const sqlFile = path.join(migrationsDir, dir, "migration.sql");
      try {
        const sqlContent = await fs.readFile(sqlFile, "utf8");

        for (const rule of FORBIDDEN_ZERO_DOWNTIME_PATTERNS) {
          const hasViolation = rule.pattern.test(sqlContent);
          assert.equal(
            hasViolation,
            false,
            `Migration '${dir}' violates Zero-Downtime rule: ${rule.name}`
          );
        }
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
    }

    console.log(`[ZERO-DOWNTIME LINT PASS] All Prisma migrations adhere to Expand-and-Contract guidelines.`);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log(`[ZERO-DOWNTIME LINT SKIP] No local migrations directory found.`);
    } else {
      throw err;
    }
  }
});
