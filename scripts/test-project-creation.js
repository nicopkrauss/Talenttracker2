const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProjectCreation() {
  console.log('🧪 Testing project creation...');
  
  try {
    const testProject = await prisma.projects.create({
      data: {
        name: 'Test Project',
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-02'),
        status: 'prep'
      }
    });
    
    console.log('✅ Project created successfully:', testProject.id);
    
    // Clean up
    await prisma.projects.delete({
      where: { id: testProject.id }
    });
    
    console.log('✅ Test project cleaned up');
    console.log('🎉 Project creation is working!');
    
  } catch (error) {
    console.error('❌ Error creating project:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProjectCreation();