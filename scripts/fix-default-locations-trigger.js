const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDefaultLocationsTrigger() {
  console.log('🔧 Fixing default locations trigger...');
  
  try {
    // Update the function to reference project_locations instead of talent_locations
    console.log('1. Updating create_default_talent_locations function...');
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION create_default_talent_locations()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Insert default locations into project_locations table
        INSERT INTO public.project_locations (project_id, name, is_default, sort_order)
        VALUES 
          (NEW.id, 'House', true, 1),
          (NEW.id, 'Holding', true, 2),
          (NEW.id, 'Stage', true, 3);
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('✅ Function updated');
    
    // Verify the trigger is still attached
    console.log('2. Checking trigger attachment...');
    const triggers = await prisma.$queryRaw`
      SELECT 
        t.tgname,
        c.relname,
        p.proname
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE c.relname = 'projects' AND t.tgname = 'create_default_locations_on_project_creation'
    `;
    console.log('Trigger found:', triggers);
    
    console.log('🎉 Default locations trigger fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDefaultLocationsTrigger();