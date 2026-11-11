-- Internship registration fees, paid online by students when they apply.
--   * Internship.registrationFeeAmount: the fee in paise (0 = free to apply)
--   * Payment can belong to an application instead of a training cohort
--   * ApplicationStatus PENDING_PAYMENT: saved, but the fee is not paid yet
-- The new enum value is not used anywhere in this transaction, so it can be added here.

BEGIN;

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "Internship" ADD COLUMN "registrationFeeAmount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "applicationId" TEXT,
ALTER COLUMN "cohortId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Payment_applicationId_idx" ON "Payment"("applicationId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
