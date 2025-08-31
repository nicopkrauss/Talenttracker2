const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTrigger() {
  console.log('🔧 Fixing project_locations trigger...');
  
  try {
    // First, let's check what functions exist
    console.log('1. Checking existing functions...');
    const functions = await prisma.$queryRaw`
      SELECT proname 
      FROM pg_proc 
      WHERE proname LIKE '%location%updated%'
    `;
    console.log('Functions found:', functions);
    
    // Check triggers on project_locations
    console.log('2. Checking existing triggers...');
    const triggers = await prisma.$queryRaw`
      SELECT t.tgname, c.relname 
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      WHERE c.relname = 'project_locations'
    `;
    console.log('Triggers on project_locations:', triggers);
    
    // Create the function if it doesn't exist
    console.log('3. Creating/updating function...');
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION update_project_locations_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('✅ Function created/updated');
    
    // Drop any existing trigger
    console.log('4. Dropping existing triggers...');
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS trigger_talent_locations_updated_at ON project_locations;
    `;
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS trigger_project_locations_updated_at ON project_locations;
    `;
    console.log('✅ Old triggers dropped');
    
    // Create the new trigger
    console.log('5. Creating new trigger...');
    await prisma.$executeRaw`
      CREATE TRIGGER trigger_project_locations_updated_at
        BEFORE UPDATE ON project_locations
        FOR EACH ROW
        EXECUTE FUNCTION update_project_locations_updated_at();
    `;
    console.log('✅ New trigger created');
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTrigger();