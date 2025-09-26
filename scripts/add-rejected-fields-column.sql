-- Add rejected_fields column to timecard_headers table
ALTER TABLE "public"."timecard_headers" 
ADD COLUMN IF NOT EXISTS "rejected_fields" TEXT[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN "public"."timecard_headers"."rejected_fields" IS 'Array of field names that were flagged as problematic during rejection';