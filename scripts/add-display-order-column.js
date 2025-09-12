#!/usr/bin/env node

console.log('🔧 Adding display_order column to talent_groups table...\n')

console.log('Please run the following SQL commands in your Supabase SQL Editor:')
console.log('(Go to: Supabase Dashboard → SQL Editor → New Query)\n')

console.log('-- Step 1: Add the display_order column')
console.log('ALTER TABLE talent_groups ADD COLUMN display_order INT DEFAULT 0;\n')

console.log('-- Step 2: Create index for performance')
console.log('CREATE INDEX idx_talent_groups_display_order ON talent_groups(project_id, display_order);\n')

console.log('-- Step 3: Initialize display_order for existing groups')
console.log(`UPDATE talent_groups 
SET display_order = (
  SELECT COALESCE(MAX(tpa.display_order), 0) + 1000 + ROW_NUMBER() OVER (ORDER BY tg.created_at)
  FROM talent_project_assignments tpa 
  WHERE tpa.project_id = talent_groups.project_id
) 
WHERE display_order = 0;\n`)

console.log('After running these commands, the unified drag-and-drop will work!')
console.log('Groups will appear after individual talent in the roster.')

console.log('\n📋 Copy and paste each command one by one into the Supabase SQL Editor.')
console.log('✅ Click "Run" after pasting each command.')
console.log('🔄 Refresh your application after all commands complete.')

console.log('\n🎯 Expected result:')
console.log('- Individual talent: display_order 1, 2, 3, 4...')
console.log('- Groups: display_order 1001, 1002, 1003...')
console.log('- You can then drag them to any order you want!')