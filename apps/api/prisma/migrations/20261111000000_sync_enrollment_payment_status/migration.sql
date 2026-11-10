-- Brings databases built from the earlier migrations in line with schema.prisma:
--   * PaymentStatus gains CREATED, PAID and PARTIALLY_REFUNDED (the old SUCCESS value becomes PAID)
--   * EnrollmentStatus gains PENDING and EXPIRED (seat reservations that wait for payment)
--   * Enrollment gains reservedUntil, priceAmount and currency
--
-- Both enums are rebuilt instead of using ALTER TYPE ... ADD VALUE, because Postgres does not
-- allow a newly added enum value to be used (here: as a column default) in the same transaction.
-- Everything runs in one transaction, so a failure leaves the database unchanged.

BEGIN;

-- AlterEnum: PaymentStatus
CREATE TYPE "PaymentStatus_new" AS ENUM ('CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new"
  USING (CASE WHEN "status"::text = 'SUCCESS' THEN 'PAID' ELSE "status"::text END)::"PaymentStatus_new";
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'CREATED';

-- AlterEnum: EnrollmentStatus
CREATE TYPE "EnrollmentStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');
ALTER TABLE "Enrollment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Enrollment" ALTER COLUMN "status" TYPE "EnrollmentStatus_new"
  USING ("status"::text::"EnrollmentStatus_new");
ALTER TYPE "EnrollmentStatus" RENAME TO "EnrollmentStatus_old";
ALTER TYPE "EnrollmentStatus_new" RENAME TO "EnrollmentStatus";
DROP TYPE "EnrollmentStatus_old";
ALTER TABLE "Enrollment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable: Enrollment
ALTER TABLE "Enrollment" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN "priceAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reservedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Enrollment_reservedUntil_idx" ON "Enrollment"("reservedUntil");

COMMIT;
