const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProjectWorkflow() {
  console.log('🧪 Testing complete project workflow...');
  
  try {
    // 1. Create a test project
    console.log('1. Creating test project...');
    const testProject = await prisma.projects.create({
      data: {
        name: 'Test Workflow Project',
        start_date: new Date('2025-02-01'),
        end_date: new Date('2025-02-28'),
        status: 'prep',
        description: 'Testing project workflow',
        production_company: 'Test Company',
        hiring_contact: 'Test Contact',
        location: 'Test Location'
      }
    });
    
    console.log('✅ Project created:', testProject.id);
    
    // 2. Check if default locations were created
    console.log('2. Checking default locations...');
    const locations = await prisma.project_locations.findMany({
      where: { project_id: testProject.id }
    });
    
    console.log('✅ Default locations created:', locations.length);
    locations.forEach(loc => {
      console.log(`   - ${loc.name} (default: ${loc.is_default}, order: ${loc.sort_order})`);
    });
    
    // 3. Check if setup checklist was created
    console.log('3. Checking setup checklist...');
    const checklist = await prisma.project_setup_checklist.findUnique({
      where: { project_id: testProject.id }
    });
    
    if (checklist) {
      console.log('✅ Setup checklist created');
      console.log(`   - Roles & Pay: ${checklist.roles_and_pay_completed}`);
      console.log(`   - Talent Roster: ${checklist.talent_roster_completed}`);
      console.log(`   - Team Assignments: ${checklist.team_assignments_completed}`);
      console.log(`   - Locations: ${checklist.locations_completed}`);
    } else {
      console.log('⚠️  Setup checklist not found');
    }
    
    // 4. Test project update
    console.log('4. Testing project update...');
    const updatedProject = await prisma.projects.update({
      where: { id: testProject.id },
      data: {
        description: 'Updated description for testing'
      }
    });
    
    console.log('✅ Project updated successfully');
    
    // 5. Clean up
    console.log('5. Cleaning up test data...');
    await prisma.project_locations.deleteMany({
      where: { project_id: testProject.id }
    });
    
    if (checklist) {
      await prisma.project_setup_checklist.delete({
        where: { project_id: testProject.id }
      });
    }
    
    await prisma.projects.delete({
      where: { id: testProject.id }
    });
    
    console.log('✅ Test data cleaned up');
    console.log('🎉 Project workflow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in project workflow test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProjectWorkflow();