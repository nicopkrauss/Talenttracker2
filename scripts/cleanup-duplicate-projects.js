const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDuplicateProjects() {
  console.log('🧹 Cleaning up duplicate "The Timecard Test" projects...');

  try {
    // Get all "The Timecard Test" projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', 'The Timecard Test')
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('❌ Error getting projects:', projectsError);
      return;
    }

    console.log(`📋 Found ${projects.length} "The Timecard Test" projects`);

    if (projects.length <= 1) {
      console.log('✅ No duplicates to remove');
      return;
    }

    // Keep the newest one (first in the list due to desc order)
    const keepProject = projects[0];
    const duplicateProjects = projects.slice(1);

    console.log(`✅ Keeping project: ${keepProject.id} (created: ${new Date(keepProject.created_at).toLocaleString()})`);
    console.log(`🗑️  Removing ${duplicateProjects.length} duplicate projects:`);

    // Delete duplicate projects (this will cascade delete related data)
    for (const project of duplicateProjects) {
      console.log(`   - Deleting ${project.id} (created: ${new Date(project.created_at).toLocaleString()})`);
      
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (deleteError) {
        console.error(`   ❌ Error deleting project ${project.id}:`, deleteError);
      } else {
        console.log(`   ✅ Deleted project ${project.id}`);
      }
    }

    // Update the remaining project with a realistic date range
    console.log('\n📅 Updating project date range...');
    
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        start_date: '2024-09-16', // Monday - matches timecard period start
        end_date: '2024-09-27',   // Friday of next week - 2 week project
        description: 'Test project for timecard functionality validation (2-week production)'
      })
      .eq('id', keepProject.id);

    if (updateError) {
      console.error('❌ Error updating project dates:', updateError);
    } else {
      console.log('✅ Updated project dates to Sep 16-27, 2024 (2-week production)');
    }

    console.log('\n🎉 Cleanup complete!');
    console.log(`📊 Final result: 1 "The Timecard Test" project (${keepProject.id})`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDuplicateProjects();