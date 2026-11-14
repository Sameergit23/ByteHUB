-- Staff roles & permissions, two-factor sign-in and blocked accounts.
--   * StaffRole: named permission sets; five built-in roles are created below
--   * User: staffRoleId, two-factor fields (secret is stored encrypted), blockedAt/blockedReason
--   * RefreshToken.mfaVerified: whether the session passed two-factor sign-in
--   * Every existing admin becomes a Super Admin (they set up two-factor at next sign-in)
-- Only adds tables and nullable/defaulted columns, so running code keeps working.

BEGIN;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "blockedAt" TIMESTAMP(3),
ADD COLUMN "blockedReason" TEXT,
ADD COLUMN "staffRoleId" TEXT,
ADD COLUMN "twoFactorBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "twoFactorEnabledAt" TIMESTAMP(3),
ADD COLUMN "twoFactorLastStep" INTEGER,
ADD COLUMN "twoFactorSecret" TEXT;

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN "mfaVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "StaffRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffRole_name_key" ON "StaffRole"("name");

-- CreateIndex
CREATE INDEX "User_staffRoleId_idx" ON "User"("staffRoleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES "StaffRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Built-in roles
INSERT INTO "StaffRole" ("id", "name", "description", "permissions", "isSystem", "createdAt", "updatedAt") VALUES
  ('role_super_admin', 'Super Admin', 'Full access, including staff, roles and settings.', ARRAY['*']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_admin', 'Admin', 'Runs day-to-day operations. Can''t manage staff or settings.', ARRAY['dashboard.view', 'internships.manage', 'applications.view', 'applications.manage', 'training.manage', 'enrolments.manage', 'payments.view', 'payments.refund', 'users.view', 'users.manage', 'messages.manage', 'notifications.send', 'reports.view', 'reports.export', 'audit.view', 'system.view']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_manager', 'Manager', 'Internships, applications, training and reports.', ARRAY['dashboard.view', 'internships.manage', 'applications.view', 'applications.manage', 'training.manage', 'enrolments.manage', 'payments.view', 'users.view', 'messages.manage', 'reports.view', 'reports.export']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_moderator', 'Moderator', 'Reviews applications and answers messages.', ARRAY['dashboard.view', 'applications.view', 'applications.manage', 'users.view', 'messages.manage']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_staff', 'Staff', 'Sees applications and answers messages.', ARRAY['dashboard.view', 'applications.view', 'messages.manage']::TEXT[], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Existing admins keep full access
UPDATE "User" SET "staffRoleId" = 'role_super_admin' WHERE "role" = 'ADMIN' AND "staffRoleId" IS NULL;

COMMIT;
