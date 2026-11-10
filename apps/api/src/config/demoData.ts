/**
 * Identifiers of the demo records created by prisma/seed.ts.
 * Used to keep demo data out of production (start-up check and the retire script).
 */

/** Every seeded account uses this password. */
export const DEMO_ACCOUNT_PASSWORD = "Password123!";

export const DEMO_ACCOUNT_EMAILS = [
  "admin@bytehub.io",
  "recruiting@hypergrid.io",
  "talent@acme.com",
  "student@bytehub.io",
] as const;

/** Sample internship listings (fictional roles under real company names). */
export const DEMO_INTERNSHIP_SLUGS = [
  "frontend-developer-intern",
  "mobile-app-intern",
  "data-analyst-intern",
  "ui-ux-design-intern",
  "backend-developer-intern",
] as const;
