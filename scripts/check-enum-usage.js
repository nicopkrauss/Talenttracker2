#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkEnumUsage() {
  console.log('🔍 Checking which tables use project_role enum...\n')
  
  try {
    const enumUsage = await prisma.$queryRaw`
      SELECT 
        t.table_name,
        c.column_name,
        c.udt_name as enum_type
      FROM information_schema.columns c
      JOIN information_schema.tables t ON c.table_name = t.table_name
      WHERE c.udt_name = 'project_role'
      AND t.table_schema = 'public'
      ORDER BY t.table_name, c.column_name;
    `
    
    console.log('📋 Tables using project_role enum:')
    console.log('==================================')
    
    enumUsage.forEach(row => {
      console.log(`${row.table_name}.${row.column_name} (${row.enum_type})`)
    })
    
  } catch (err) {
    console.error('❌ Error checking enum usage:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkEnumUsage()