-- Add new roles to system_role enum
ALTER TYPE "public"."system_role" ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE "public"."system_role" ADD VALUE IF NOT EXISTS 'talent_logistics_coordinator';
ALTER TYPE "public"."system_role" ADD VALUE IF NOT EXISTS 'talent_escort';

-- Add new columns to profiles table
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "nearest_major_city" TEXT;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "willing_to_fly" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_profiles_nearest_major_city" ON "public"."profiles"("nearest_major_city");
CREATE INDEX IF NOT EXISTS "idx_profiles_willing_to_fly" ON "public"."profiles"("willing_to_fly") WHERE "willing_to_fly" = true;

-- Add comments for documentation
COMMENT ON COLUMN "public"."profiles"."nearest_major_city" IS 'Nearest major city selected from predefined list during registration';
COMMENT ON COLUMN "public"."profiles"."willing_to_fly" IS 'Whether user is willing to fly for projects (only relevant for covered roles)';