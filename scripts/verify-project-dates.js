const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyProjectDates() {
  console.log('📅 Verifying project dates...');

  try {
    // Get the project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', 'The Timecard Test');

    if (projectError) {
      console.error('❌ Error getting project:', projectError);
      return;
    }

    console.log(`📋 Found ${projects.length} "The Timecard Test" project(s)`);

    projects.forEach((project, index) => {
      console.log(`\n🏗️  Project ${index + 1}:`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Name: ${project.name}`);
      console.log(`   Start Date: ${project.start_date}`);
      console.log(`   End Date: ${project.end_date}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Description: ${project.description}`);
      console.log(`   Created: ${new Date(project.created_at).toLocaleString()}`);
    });

    // Verify timecard period alignment
    if (projects.length > 0) {
      const project = projects[0];
      const projectStart = new Date(project.start_date);
      const projectEnd = new Date(project.end_date);
      const timecardStart = new Date('2024-09-16');
      const timecardEnd = new Date('2024-09-20');

      console.log(`\n📊 Date Alignment Check:`);
      console.log(`   Project Period: ${project.start_date} to ${project.end_date}`);
      console.log(`   Timecard Period: 2024-09-16 to 2024-09-20`);
      
      const isAligned = timecardStart >= projectStart && timecardEnd <= projectEnd;
      console.log(`   ✅ Timecard period fits within project: ${isAligned ? 'YES' : 'NO'}`);
      
      const projectDays = Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`   📈 Project duration: ${projectDays} days (${Math.ceil(projectDays / 7)} weeks)`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyProjectDates();