-- AlterEnum
-- Adds the Cashfree gateway to the PaymentProvider enum.
-- IF NOT EXISTS keeps this safe on databases where the value was already
-- added out-of-band (e.g. via `prisma db push`).
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'CASHFREE';
