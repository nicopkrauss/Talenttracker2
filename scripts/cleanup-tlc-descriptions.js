/**
 * Clean up TLC references in project_role_templates descriptions
 * This script updates the description fields to use "Coordinator" instead of "TLC"
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findTLCDescriptions() {
  console.log('\n🔍 Finding TLC references in project_role_templates descriptions...');
  
  try {
    const { data: templates, error } = await supabase
      .from('project_role_templates')
      .select('*');
    
    if (error) throw error;
    
    // Find templates with TLC in description
    const templatesWithTLC = templates.filter(template => 
      template.description && (
        template.description.toLowerCase().includes('tlc') ||
        template.description.toLowerCase().includes('talent logistics coordinator') ||
        template.description.toLowerCase().includes('talent_logistics_coordinator')
      )
    );
    
    console.log(`📊 Found ${templatesWithTLC.length} templates with TLC references:`);
    
    templatesWithTLC.forEach(template => {
      console.log(`   - ID: ${template.id}`);
      console.log(`     Display Name: ${template.display_name}`);
      console.log(`     Current Description: "${template.description}"`);
      console.log(`     Role: ${template.role}`);
      console.log('');
    });
    
    return templatesWithTLC;
    
  } catch (error) {
    console.error('❌ Error finding TLC descriptions:', error.message);
    throw error;
  }
}

async function updateTLCDescriptions(templates) {
  console.log('\n🔄 Updating TLC descriptions to use "Coordinator"...');
  
  const updates = [];
  
  for (const template of templates) {
    let newDescription = template.description;
    
    // Replace various forms of TLC with Coordinator
    newDescription = newDescription.replace(/\bTLC\b/g, 'Coordinator');
    newDescription = newDescription.replace(/\btlc\b/g, 'coordinator');
    newDescription = newDescription.replace(/talent logistics coordinator/gi, 'coordinator');
    newDescription = newDescription.replace(/talent_logistics_coordinator/gi, 'coordinator');
    
    console.log(`📝 Updating template ${template.id}:`);
    console.log(`   From: "${template.description}"`);
    console.log(`   To:   "${newDescription}"`);
    
    try {
      const { data, error } = await supabase
        .from('project_role_templates')
        .update({ description: newDescription })
        .eq('id', template.id)
        .select();
      
      if (error) throw error;
      
      console.log(`   ✅ Updated successfully`);
      updates.push({
        id: template.id,
        oldDescription: template.description,
        newDescription: newDescription,
        success: true
      });
      
    } catch (error) {
      console.log(`   ❌ Update failed: ${error.message}`);
      updates.push({
        id: template.id,
        oldDescription: template.description,
        newDescription: newDescription,
        success: false,
        error: error.message
      });
    }
  }
  
  return updates;
}

async function verifyCleanup() {
  console.log('\n🔍 Verifying TLC cleanup...');
  
  try {
    const { data: templates, error } = await supabase
      .from('project_role_templates')
      .select('id, display_name, description, role');
    
    if (error) throw error;
    
    // Check for any remaining TLC references
    const remainingTLC = templates.filter(template => 
      template.description && (
        template.description.toLowerCase().includes('tlc') ||
        template.description.toLowerCase().includes('talent logistics coordinator') ||
        template.description.toLowerCase().includes('talent_logistics_coordinator')
      )
    );
    
    if (remainingTLC.length > 0) {
      console.log(`❌ Still found ${remainingTLC.length} templates with TLC references:`);
      remainingTLC.forEach(template => {
        console.log(`   - ID: ${template.id}, Description: "${template.description}"`);
      });
      return false;
    } else {
      console.log('✅ No TLC references found in descriptions');
      
      // Show all current descriptions for coordinator role templates
      const coordinatorTemplates = templates.filter(t => t.role === 'coordinator');
      console.log(`\n📋 Current coordinator template descriptions (${coordinatorTemplates.length} templates):`);
      coordinatorTemplates.forEach(template => {
        console.log(`   - ${template.display_name}: "${template.description}"`);
      });
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error.message);
    return false;
  }
}

async function cleanupTLCDescriptions() {
  console.log('🧹 Cleanup TLC References in Descriptions');
  console.log('=========================================');
  
  try {
    // Step 1: Find templates with TLC references
    const templatesWithTLC = await findTLCDescriptions();
    
    if (templatesWithTLC.length === 0) {
      console.log('✅ No TLC references found in descriptions');
      return true;
    }
    
    // Step 2: Update the descriptions
    const updates = await updateTLCDescriptions(templatesWithTLC);
    
    // Step 3: Report results
    const successful = updates.filter(u => u.success);
    const failed = updates.filter(u => !u.success);
    
    console.log(`\n📊 Update Results:`);
    console.log(`   - Successful updates: ${successful.length}`);
    console.log(`   - Failed updates: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed updates:');
      failed.forEach(f => {
        console.log(`   - ${f.id}: ${f.error}`);
      });
    }
    
    // Step 4: Verify cleanup
    const cleanupSuccess = await verifyCleanup();
    
    if (cleanupSuccess) {
      console.log('\n🎉 TLC DESCRIPTION CLEANUP SUCCESSFUL!');
      console.log('✅ All TLC references have been replaced with "Coordinator"');
      return true;
    } else {
      console.log('\n❌ TLC description cleanup incomplete');
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 TLC description cleanup failed:', error.message);
    return false;
  }
}

// Run the cleanup
cleanupTLCDescriptions()
  .then(success => {
    if (success) {
      console.log('\n✅ TLC description cleanup completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ TLC description cleanup failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Cleanup script failed:', error.message);
    process.exit(1);
  });