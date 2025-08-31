const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReferences() {
  console.log('🔍 Checking for references to talent_locations...');
  
  try {
    // Check for foreign key constraints
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name = 'talent_locations' OR tc.table_name = 'talent_locations')
    `;
    console.log('Foreign key constraints referencing talent_locations:', constraints);
    
    // Check for any views that might reference the old table
    const views = await prisma.$queryRaw`
      SELECT viewname, definition 
      FROM pg_views 
      WHERE definition LIKE '%talent_locations%'
    `;
    console.log('Views referencing talent_locations:', views);
    
    // Check for any functions that might reference the old table
    const functions = await prisma.$queryRaw`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE prosrc LIKE '%talent_locations%'
    `;
    console.log('Functions referencing talent_locations:', functions);
    
    // Check for any triggers that might reference the old table
    const allTriggers = await prisma.$queryRaw`
      SELECT 
        t.tgname,
        c.relname,
        p.proname,
        p.prosrc
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE p.prosrc LIKE '%talent_locations%'
    `;
    console.log('Triggers with functions referencing talent_locations:', allTriggers);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReferences();