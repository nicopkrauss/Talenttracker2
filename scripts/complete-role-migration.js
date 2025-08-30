#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function completeRoleMigration() {
  console.log('🔧 Running complete role migration...\n')
  
  try {
    // First, let's see what's in project_roles table
    console.log('0. Checking project_roles table...')
    const projectRoles = await prisma.$queryRaw`SELECT * FROM project_roles LIMIT 5`
    console.log('   Current project_roles data:', projectRoles)
    
    console.log('1. Adding role_new column to project_roles with new project_role enum...')
    await prisma.$executeRawUnsafe(`ALTER TABLE project_roles ADD COLUMN role_new project_role_new`)
    
    console.log('2. Migrating project_roles data...')
    await prisma.$executeRawUnsafe(`
      UPDATE project_roles 
      SET role_new = CASE 
          WHEN role = 'supervisor' THEN 'supervisor'::project_role_new
          WHEN role = 'talent_logistics_coordinator' THEN 'talent_logistics_coordinator'::project_role_new
          WHEN role = 'talent_escort' THEN 'talent_escort'::project_role_new
          ELSE NULL
      END
    `)
    
    console.log('3. Dropping old role column from project_roles...')
    await prisma.$executeRawUnsafe(`ALTER TABLE project_roles DROP COLUMN role`)
    
    console.log('4. Renaming role_new to role in project_roles...')
    await prisma.$executeRawUnsafe(`ALTER TABLE project_roles RENAME COLUMN role_new TO role`)
    
    console.log('5. Now dropping old project_role enum...')
    await prisma.$executeRawUnsafe(`DROP TYPE project_role`)
    
    console.log('6. Renaming new enum to project_role...')
    await prisma.$executeRawUnsafe(`ALTER TYPE project_role_new RENAME TO project_role`)
    
    console.log('✅ Complete role migration finished successfully!')
    
    // Verify the final state
    console.log('\n🔍 Verifying final state...')
    const finalEnums = await prisma.$queryRaw`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname IN ('system_role', 'project_role')
      ORDER BY t.typname, e.enumsortorder;
    `
    
    const groupedEnums = {}
    finalEnums.forEach(row => {
      if (!groupedEnums[row.enum_name]) {
        groupedEnums[row.enum_name] = []
      }
      groupedEnums[row.enum_name].push(row.enum_value)
    })
    
    console.log('Final enum state:')
    Object.keys(groupedEnums).forEach(enumName => {
      console.log(`  ${enumName}: [${groupedEnums[enumName].join(', ')}]`)
    })
    
  } catch (err) {
    console.error('❌ Error during migration:', err.message)
    console.error('Full error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

completeRoleMigration()