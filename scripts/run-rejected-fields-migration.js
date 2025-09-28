/**
 * Run the rejected_fields column migration
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Checking if rejected_fields column exists...')
    
    // Check if the column already exists by trying to select it
    const { data, error } = await supabase
      .from('timecard_headers')
      .select('rejected_fields')
      .limit(1)
    
    if (error) {
      if (error.message.includes('column "rejected_fields" does not exist')) {
        console.log('❌ Column does not exist. Please run the migration manually in Supabase SQL editor:')
        console.log('ALTER TABLE "public"."timecard_headers" ADD COLUMN "rejected_fields" TEXT[] DEFAULT \'{}\';')
        console.log('COMMENT ON COLUMN "public"."timecard_headers"."rejected_fields" IS \'Array of field names that were flagged as problematic during rejection\';')
      } else {
        console.error('❌ Error checking column:', error)
      }
    } else {
      console.log('✅ Column already exists!')
    }
    
    console.log('\n🎉 Check completed!')
    
  } catch (error) {
    console.error('Check failed:', error)
    process.exit(1)
  }
}

runMigration()