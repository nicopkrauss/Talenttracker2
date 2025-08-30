#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixRoleMigration() {
  console.log('🔧 Fixing role migration...\n')
  
  try {
    console.log('1. Adding role_new column to profiles with system_role type...')
    await prisma.$executeRawUnsafe(`ALTER TABLE profiles ADD COLUMN role_new system_role`)
    
    console.log('2. Migrating existing profile role data...')
    await prisma.$executeRawUnsafe(`
      UPDATE profiles 
      SET role_new = CASE 
          WHEN role = 'admin' THEN 'admin'::system_role
          WHEN role = 'in_house' THEN 'in_house'::system_role
          ELSE NULL
      END
    `)
    
    console.log('3. Dropping old role column from profiles...')
    await prisma.$executeRawUnsafe(`ALTER TABLE profiles DROP COLUMN role`)
    
    console.log('4. Renaming role_new to role in profiles...')
    await prisma.$executeRawUnsafe(`ALTER TABLE profiles RENAME COLUMN role_new TO role`)
    
    console.log('5. Creating new project_role enum...')
    await prisma.$executeRawUnsafe(`CREATE TYPE project_role_new AS ENUM ('supervisor', 'talent_logistics_coordinator', 'talent_escort')`)
    
    console.log('6. Adding role_new column to team_assignments...')
    await prisma.$executeRawUnsafe(`ALTER TABLE team_assignments ADD COLUMN role_new project_role_new`)
    
    console.log('7. Migrating team_assignments role data...')
    await prisma.$executeRawUnsafe(`
      UPDATE team_assignments 
      SET role_new = CASE 
          WHEN role = 'supervisor' THEN 'supervisor'::project_role_new
          WHEN role = 'talent_logistics_coordinator' THEN 'talent_logistics_coordinator'::project_role_new
          WHEN role = 'talent_escort' THEN 'talent_escort'::project_role_new
          ELSE NULL
      END
    `)
    
    console.log('8. Dropping old role column from team_assignments...')
    await prisma.$executeRawUnsafe(`ALTER TABLE team_assignments DROP COLUMN role`)
    
    console.log('9. Renaming role_new to role in team_assignments...')
    await prisma.$executeRawUnsafe(`ALTER TABLE team_assignments RENAME COLUMN role_new TO role`)
    
    console.log('10. Dropping old project_role enum...')
    await prisma.$executeRawUnsafe(`DROP TYPE project_role`)
    
    console.log('11. Renaming new enum to project_role...')
    await prisma.$executeRawUnsafe(`ALTER TYPE project_role_new RENAME TO project_role`)
    
    console.log('✅ Role migration completed successfully!')
    
  } catch (err) {
    console.error('❌ Error during migration:', err.message)
    console.error('Full error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

fixRoleMigration()