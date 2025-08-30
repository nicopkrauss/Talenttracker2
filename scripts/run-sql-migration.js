#!/usr/bin/env node

/**
 * SQL Migration Runner using Prisma
 * This script runs SQL migrations using Prisma's raw SQL execution
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function runSqlMigration(migrationFile) {
  console.log(`🚀 Running SQL migration: ${migrationFile}`)
  
  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile)
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  try {
    // Split the SQL into individual statements (rough approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
        await prisma.$executeRawUnsafe(statement)
      }
    }
    
    console.log('✅ Migration completed successfully')
    
    // Record the migration
    const migrationName = path.basename(migrationFile, '.sql')
    await prisma.$executeRawUnsafe(`
      INSERT INTO schema_migrations (migration_name, applied_at, notes)
      VALUES ($1, NOW(), $2)
    `, migrationName, `Applied via run-sql-migration.js`)
    
    console.log('📝 Migration recorded in schema_migrations table')
    
  } catch (err) {
    console.error('❌ Error running migration:', err.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('❌ Please provide a migration file name')
  console.error('Usage: node scripts/run-sql-migration.js <migration-file.sql>')
  process.exit(1)
}

runSqlMigration(migrationFile)