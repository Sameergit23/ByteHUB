#!/usr/bin/env node
/**
 * Generates the Prisma client only when it is missing or out of date with the schema.
 *
 * Why: `prisma generate` replaces the query-engine file, which Windows keeps locked while the
 * API dev server is running. Skipping an unnecessary regeneration keeps `pnpm typecheck`
 * (and the pre-commit hook) working with the server running. Fresh installs, such as CI,
 * always generate because no client exists yet.
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const apiDir = path.join(repoRoot, "apps", "api");
const schemaPath = path.join(apiDir, "prisma", "schema.prisma");

function generatedSchemaPath() {
  try {
    const require = createRequire(path.join(apiDir, "package.json"));
    const clientPkg = require.resolve("@prisma/client/package.json");
    // The generated client lives next to @prisma/client: <node_modules>/.prisma/client
    return path.join(path.dirname(clientPkg), "..", "..", ".prisma", "client", "schema.prisma");
  } catch {
    return null;
  }
}

const generated = generatedSchemaPath();
// Compare ignoring whitespace: Prisma stores a re-aligned copy, and git on Windows checks
// files out with CRLF line endings.
const normalize = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
const upToDate =
  generated &&
  fs.existsSync(generated) &&
  normalize(fs.readFileSync(generated, "utf8")) === normalize(fs.readFileSync(schemaPath, "utf8"));

if (upToDate) {
  console.log("[prisma] Client is up to date with schema.prisma; skipping generate.");
  process.exit(0);
}

console.log("[prisma] Generating client from apps/api/prisma/schema.prisma ...");
const result = spawnSync("pnpm", ["--filter", "@bytehub/api", "prisma:generate"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
