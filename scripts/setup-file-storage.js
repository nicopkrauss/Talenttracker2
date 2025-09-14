#!/usr/bin/env node

/**
 * Supabase Storage Setup Script
 * This script sets up the storage bucket and policies for file uploads
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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage for file uploads...')
  
  try {
    // Check if bucket exists
    console.log('Checking if project-attachments bucket exists...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      return
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'project-attachments')
    
    if (!bucketExists) {
      console.log('Creating project-attachments bucket...')
      const { data: bucket, error: createError } = await supabase.storage.createBucket('project-attachments', {
        public: false,
        allowedMimeTypes: [
          'image/jpeg',
          'image/png', 
          'image/gif',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        fileSizeLimit: 10485760 // 10MB
      })

      if (createError) {
        console.error('❌ Error creating bucket:', createError)
        return
      }

      console.log('✅ Bucket created successfully')
    } else {
      console.log('✅ Bucket already exists')
    }

    // Test upload permissions
    console.log('Testing upload permissions...')
    const testFile = new Blob(['test content'], { type: 'text/plain' })
    const testFileName = `test-${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-attachments')
      .upload(testFileName, testFile)

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError)
      console.log('You may need to set up storage policies manually in the Supabase dashboard')
    } else {
      console.log('✅ Upload test successful')
      
      // Clean up test file
      await supabase.storage
        .from('project-attachments')
        .remove([testFileName])
    }

    console.log('\n🎉 Storage setup completed!')
    console.log('\nNext steps:')
    console.log('1. Make sure you ran the database migration for the settings tables')
    console.log('2. The file upload feature should now work in the Settings tab')
    console.log('3. Users can upload images, PDFs, and documents up to 10MB')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setupStorage()