#!/usr/bin/env node

/**
 * Prisma Schema Update Script
 * 
 * This script updates the Prisma schema to:
 * 1. Add 'edited_draft' to the timecard_status enum
 * 2. Remove approved_by and approved_at columns from timecard_headers
 * 3. Remove the approved_by_profile relationship
 */

const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')

function updatePrismaSchema() {
  console.log('🔧 Updating Prisma schema...\n')
  
  try {
    // Read the current schema
    let schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('📝 Current schema loaded')
    
    // 1. Update timecard_status enum to include edited_draft
    console.log('   Adding edited_draft to timecard_status enum...')
    
    const oldEnumPattern = /enum timecard_status \{[\s\S]*?\}/
    const newEnum = `enum timecard_status {
  draft
  edited_draft
  submitted
  approved
  rejected

  @@schema("public")
}`
    
    if (schemaContent.match(oldEnumPattern)) {
      schemaContent = schemaContent.replace(oldEnumPattern, newEnum)
      console.log('   ✅ Updated timecard_status enum')
    } else {
      console.log('   ⚠️  Could not find timecard_status enum pattern')
    }
    
    // 2. Remove approved_by and approved_at columns from timecard_headers model
    console.log('   Removing approved_by and approved_at columns...')
    
    // Remove the approved_at line
    schemaContent = schemaContent.replace(/\s*approved_at\s+DateTime\?\s+@db\.Timestamptz\(6\)\n/, '')
    
    // Remove the approved_by line
    schemaContent = schemaContent.replace(/\s*approved_by\s+String\?\s+@db\.Uuid\n/, '')
    
    // Remove the approved_by_profile relationship
    schemaContent = schemaContent.replace(/\s*approved_by_profile\s+profiles\?\s+@relation\("timecard_headers_approved_by"[^}]+\}\n/, '')
    
    console.log('   ✅ Removed approved_by and approved_at columns')
    
    // 3. Remove the approved_by relationship from profiles model
    console.log('   Removing approved_by relationship from profiles model...')
    
    schemaContent = schemaContent.replace(/\s*timecard_headers_approved_by\s+timecard_headers\[\]\s+@relation\("timecard_headers_approved_by"\)\n/, '')
    
    console.log('   ✅ Removed approved_by relationship from profiles')
    
    // 4. Write the updated schema
    fs.writeFileSync(schemaPath, schemaContent)
    
    console.log('\n✅ Prisma schema updated successfully!')
    console.log('\n📝 Changes made:')
    console.log('   • Added edited_draft to timecard_status enum')
    console.log('   • Removed approved_by column from timecard_headers')
    console.log('   • Removed approved_at column from timecard_headers')
    console.log('   • Removed approved_by_profile relationship')
    console.log('   • Removed timecard_headers_approved_by relationship from profiles')
    
    console.log('\n🔄 Next steps:')
    console.log('   1. Run: npx prisma generate')
    console.log('   2. Verify the schema changes are correct')
    console.log('   3. Test the application with the updated schema')
    
  } catch (error) {
    console.error('\n❌ Failed to update Prisma schema:', error.message)
    process.exit(1)
  }
}

updatePrismaSchema()