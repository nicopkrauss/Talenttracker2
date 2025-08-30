#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkEnums() {
  console.log('🔍 Checking database enum types...\n')
  
  try {
    // Check what enum types exist
    const enumTypes = await prisma.$queryRaw`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname IN ('system_role', 'project_role')
      ORDER BY t.typname, e.enumsortorder;
    `
    
    console.log('📋 Current enum types and values:')
    console.log('================================')
    
    const groupedEnums = {}
    enumTypes.forEach(row => {
      if (!groupedEnums[row.enum_name]) {
        groupedEnums[row.enum_name] = []
      }
      groupedEnums[row.enum_name].push(row.enum_value)
    })
    
    Object.keys(groupedEnums).forEach(enumName => {
      console.log(`${enumName}: [${groupedEnums[enumName].join(', ')}]`)
    })
    
    // Check profiles table structure
    console.log('\n📋 Profiles table role column:')
    console.log('==============================')
    
    const profilesInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'role';
    `
    
    console.log(profilesInfo)
    
    // Check team_assignments table structure  
    console.log('\n📋 Team assignments table role column:')
    console.log('=====================================')
    
    const teamAssignmentsInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'team_assignments' AND column_name = 'role';
    `
    
    console.log(teamAssignmentsInfo)
    
  } catch (err) {
    console.error('❌ Error checking enums:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkEnums()