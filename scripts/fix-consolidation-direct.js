#!/usr/bin/env node

/**
 * Direct fix for consolidation - handles the remaining record
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixConsolidation() {
  console.log('🔧 Fixing remaining consolidation issues...\n')

  try {
    // Find records that still need consolidation
    console.log('1. Finding records that need consolidation...')
    const { data: needsConsolidation, error: findError } = await supabase
      .from('timecards')
      .select('id, admin_edit_reason, edit_comments')
      .not('admin_edit_reason', 'is', null)
      .or('edit_comments.is.null,edit_comments.eq.')

    if (findError) {
      throw new Error(`Error finding records: ${findError.message}`)
    }

    console.log(`   Found ${needsConsolidation.length} records needing consolidation`)

    if (needsConsolidation.length === 0) {
      console.log('✅ No records need consolidation')
      return
    }

    // Show what we're about to fix
    needsConsolidation.forEach((record, i) => {
      console.log(`   ${i + 1}. ID: ${record.id}`)
      console.log(`      admin_edit_reason: "${record.admin_edit_reason}"`)
      console.log(`      edit_comments: "${record.edit_comments}"`)
    })

    console.log('\n2. Fixing each record individually...')

    // Fix each record individually
    for (const record of needsConsolidation) {
      console.log(`   Fixing record ${record.id}...`)
      
      const { error: updateError } = await supabase
        .from('timecards')
        .update({ 
          edit_comments: record.admin_edit_reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id)

      if (updateError) {
        console.error(`   ❌ Failed to update record ${record.id}: ${updateError.message}`)
      } else {
        console.log(`   ✅ Updated record ${record.id}`)
      }
    }

    console.log('\n3. Verifying the fix...')
    
    // Verify all records are now consolidated
    const { data: afterFix, error: verifyError } = await supabase
      .from('timecards')
      .select('id, admin_edit_reason, edit_comments')
      .not('admin_edit_reason', 'is', null)
      .or('edit_comments.is.null,edit_comments.eq.')

    if (verifyError) {
      throw new Error(`Error verifying fix: ${verifyError.message}`)
    }

    if (afterFix.length === 0) {
      console.log('✅ All records successfully consolidated!')
    } else {
      console.log(`❌ Still ${afterFix.length} records need consolidation:`)
      afterFix.forEach((record, i) => {
        console.log(`   ${i + 1}. ID: ${record.id}, admin_edit_reason: "${record.admin_edit_reason}", edit_comments: "${record.edit_comments}"`)
      })
    }

    console.log('\n4. Final verification - checking all admin_edit_reason records...')
    
    const { data: allAdminEdits, error: allError } = await supabase
      .from('timecards')
      .select('id, admin_edit_reason, edit_comments, admin_edited')
      .not('admin_edit_reason', 'is', null)

    if (allError) {
      throw new Error(`Error in final verification: ${allError.message}`)
    }

    console.log(`   Total records with admin_edit_reason: ${allAdminEdits.length}`)
    
    const consolidated = allAdminEdits.filter(r => r.edit_comments && r.edit_comments !== '')
    const notConsolidated = allAdminEdits.filter(r => !r.edit_comments || r.edit_comments === '')
    
    console.log(`   Records with edit_comments populated: ${consolidated.length}`)
    console.log(`   Records still missing edit_comments: ${notConsolidated.length}`)

    if (notConsolidated.length === 0) {
      console.log('\n🎉 Consolidation completed successfully!')
      console.log('\n📋 Summary:')
      console.log(`   • All ${allAdminEdits.length} admin edit records now have edit_comments`)
      console.log('   • Ready to deploy the updated code')
      console.log('   • You can now manually delete the admin_edit_reason column when ready')
    } else {
      console.log('\n⚠️  Some records still need attention')
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message)
    process.exit(1)
  }
}

// Run the fix
fixConsolidation()