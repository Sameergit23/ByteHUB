-- Application form updates:
--   * GitHub, LinkedIn and the three written statements become optional
--   * Address fields: country, PIN code, street address, locality, city, state
-- Only adds nullable columns and relaxes NOT NULL, so running code keeps working.

BEGIN;

ALTER TABLE "Application" ADD COLUMN "addressLine" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "locality" TEXT,
ADD COLUMN "pincode" TEXT,
ADD COLUMN "state" TEXT,
ALTER COLUMN "githubUrl" DROP NOT NULL,
ALTER COLUMN "linkedinUrl" DROP NOT NULL,
ALTER COLUMN "bioSummary" DROP NOT NULL,
ALTER COLUMN "whyInterested" DROP NOT NULL,
ALTER COLUMN "relevantProjectDescription" DROP NOT NULL;

COMMIT;
