#!/usr/bin/env node

/**
 * Database Schema Inspector
 * This script connects to your Supabase database and shows the actual schema
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

// Parse environment variables
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectDatabase() {
  console.log('🔍 Inspecting database schema...\n')
  
  const schemaInfo = {
    tables: {},
    views: [],
    migrations: [],
    errors: [],
    timestamp: new Date().toISOString()
  }
  
  // List of known tables to check based on your codebase
  const knownTables = [
    'profiles', 'projects', 'talent', 'talent_project_assignments', 
    'team_assignments', 'timecards', 'notifications', 'schema_migrations',
    'talent_status', 'project_locations', 'user_favorites'
  ]
  
  console.log('📋 CHECKING KNOWN TABLES:')
  console.log('=========================')
  
  for (const tableName of knownTables) {
    try {
      // Try to query the table to see if it exists and get some info
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1)
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`)
        schemaInfo.errors.push({ table: tableName, error: error.message })
      } else {
        console.log(`✅ ${tableName}: exists (${count || 0} rows)`)
        schemaInfo.tables[tableName] = { exists: true, rowCount: count || 0 }
        
        // Try to get a sample row to understand structure
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (!sampleError && sampleData && sampleData.length > 0) {
          const columns = Object.keys(sampleData[0])
          schemaInfo.tables[tableName].columns = columns
          console.log(`   Columns: ${columns.join(', ')}`)
        }
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`)
      schemaInfo.errors.push({ table: tableName, error: err.message })
    }
  }
  
  // Check migration history
  try {
    const { data: migrations, error: migrationsError } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('applied_at')

    if (!migrationsError && migrations) {
      console.log('\n\n📜 MIGRATION HISTORY:')
      console.log('=====================')
      migrations.forEach(migration => {
        const date = new Date(migration.applied_at).toLocaleDateString()
        console.log(`• ${migration.migration_name} (${date})`)
        if (migration.notes) {
          console.log(`  └─ ${migration.notes}`)
        }
      })
      schemaInfo.migrations = migrations
    }
  } catch (err) {
    console.log('\n❌ Could not fetch migration history:', err.message)
  }
  
  // Check for some common views
  const knownViews = ['timecard_summary']
  console.log('\n\n👁️  CHECKING VIEWS:')
  console.log('==================')
  
  for (const viewName of knownViews) {
    try {
      const { data, error } = await supabase
        .from(viewName)
        .select('*', { head: true })
        .limit(1)
      
      if (error) {
        console.log(`❌ ${viewName}: ${error.message}`)
      } else {
        console.log(`✅ ${viewName}: exists`)
        schemaInfo.views.push(viewName)
      }
    } catch (err) {
      console.log(`❌ ${viewName}: ${err.message}`)
    }
  }
  
  // Save schema to file for reference
  const schemaPath = path.join(__dirname, '..', 'database-schema.json')
  fs.writeFileSync(schemaPath, JSON.stringify(schemaInfo, null, 2))
  console.log(`\n💾 Schema saved to: database-schema.json`)
  
  // Summary
  const existingTables = Object.keys(schemaInfo.tables).filter(t => schemaInfo.tables[t].exists)
  const missingTables = knownTables.filter(t => !schemaInfo.tables[t] || !schemaInfo.tables[t].exists)
  
  console.log('\n📊 SUMMARY:')
  console.log('===========')
  console.log(`✅ Existing tables: ${existingTables.length}`)
  console.log(`❌ Missing tables: ${missingTables.length}`)
  
  if (missingTables.length > 0) {
    console.log(`\nMissing tables: ${missingTables.join(', ')}`)
  }
}

inspectDatabase()