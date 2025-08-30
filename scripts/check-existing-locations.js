#!/usr/bin/env node

/**
 * Check existing talent_locations data
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

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkExistingLocations() {
  console.log('🔍 Checking existing talent_locations data...\n')
  
  try {
    // Get all talent_locations data
    const { data: locations, error } = await supabase
      .from('talent_locations')
      .select('*')
      .order('project_id, name')
    
    if (error) {
      console.error('❌ Error:', error.message)
      return
    }
    
    console.log('📋 EXISTING TALENT_LOCATIONS:')
    console.log('=============================')
    
    if (locations.length === 0) {
      console.log('❌ No locations found')
    } else {
      locations.forEach(location => {
        console.log(`• Project: ${location.project_id}`)
        console.log(`  Location: ${location.name}`)
        console.log(`  Created: ${new Date(location.created_at).toLocaleDateString()}`)
        console.log('')
      })
    }
    
    // Get project info to understand context
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
    
    if (!projectError && projects) {
      console.log('📋 EXISTING PROJECTS:')
      console.log('====================')
      projects.forEach(project => {
        const projectLocations = locations.filter(l => l.project_id === project.id)
        console.log(`• ${project.name} (${project.id}):`)
        if (projectLocations.length > 0) {
          projectLocations.forEach(loc => {
            console.log(`  - ${loc.name}`)
          })
        } else {
          console.log('  - No locations defined')
        }
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkExistingLocations()