#!/usr/bin/env node

/**
 * Script to consolidate edit comments fields
 * Moves admin_edit_reason data to edit_comments
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function consolidateEditComments() {
  console.log('🔄 Consolidating edit comments fields...\n')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '039_consolidate_edit_comments.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('1. Checking current data state...')
    
    // Check current state
    const { data: beforeStats, error: beforeError } = await supabase
      .from('timecards')
      .select('admin_edit_reason, edit_comments')
      .not('admin_edit_reason', 'is', null)

    if (beforeError) {
      throw new Error(`Error checking current state: ${beforeError.message}`)
    }

    console.log(`   Found ${beforeStats.length} timecards with admin_edit_reason`)
    
    const needsConsolidation = beforeStats.filter(tc => 
      tc.admin_edit_reason && (!tc.edit_comments || tc.edit_comments === '')
    )
    
    console.log(`   ${needsConsolidation.length} records need consolidation`)

    if (needsConsolidation.length === 0) {
      console.log('✅ No consolidation needed - all data already consolidated')
      return
    }

    console.log('\n2. Running consolidation migration...')
    
    // Execute the migration
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (migrationError) {
      // Try direct execution if RPC doesn't work
      console.log('   RPC failed, trying direct execution...')
      
      // Split migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'))

      for (const statement of statements) {
        if (statement.toUpperCase().startsWith('UPDATE')) {
          // Execute UPDATE statement
          const updateQuery = statement.replace('timecards', 'timecards')
          console.log('   Executing consolidation update...')
          
          // Manual consolidation
          const { error: updateError } = await supabase
            .from('timecards')
            .update({ 
              edit_comments: supabase.raw('admin_edit_reason'),
              updated_at: new Date().toISOString()
            })
            .not('admin_edit_reason', 'is', null)
            .or('edit_comments.is.null,edit_comments.eq.')

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`)
          }
        }
      }
    }

    console.log('✅ Migration executed successfully')

    console.log('\n3. Verifying consolidation...')
    
    // Verify the consolidation
    const { data: afterStats, error: afterError } = await supabase
      .from('timecards')
      .select('admin_edit_reason, edit_comments')
      .not('admin_edit_reason', 'is', null)

    if (afterError) {
      throw new Error(`Error verifying consolidation: ${afterError.message}`)
    }

    const stillNeedsConsolidation = afterStats.filter(tc => 
      tc.admin_edit_reason && (!tc.edit_comments || tc.edit_comments === '')
    )

    if (stillNeedsConsolidation.length > 0) {
      console.log(`❌ Consolidation incomplete: ${stillNeedsConsolidation.length} records still need consolidation`)
      console.log('Sample records that need consolidation:')
      stillNeedsConsolidation.slice(0, 3).forEach((tc, i) => {
        console.log(`   ${i + 1}. admin_edit_reason: "${tc.admin_edit_reason}", edit_comments: "${tc.edit_comments}"`)
      })
    } else {
      console.log('✅ All records successfully consolidated')
    }

    console.log('\n4. Summary:')
    console.log(`   Records with admin_edit_reason: ${afterStats.length}`)
    console.log(`   Records with edit_comments: ${afterStats.filter(tc => tc.edit_comments).length}`)
    console.log(`   Records still needing consolidation: ${stillNeedsConsolidation.length}`)

    if (stillNeedsConsolidation.length === 0) {
      console.log('\n🎉 Edit comments consolidation completed successfully!')
      console.log('\n📋 Next steps:')
      console.log('   1. Test the application to ensure edit comments display correctly')
      console.log('   2. Verify that new edits use only edit_comments field')
      console.log('   3. When ready, run the cleanup migration to drop admin_edit_reason column')
    }

  } catch (error) {
    console.error('❌ Consolidation failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

// Run the consolidation
consolidateEditComments()