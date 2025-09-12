#!/usr/bin/env node

console.log('🧪 Testing API without display_order column...\n')

async function testAPI() {
  try {
    // Test the API endpoint
    const response = await fetch('http://localhost:3001/api/projects/fc928ecf-153f-4544-9878-4bc7e85f2949/talent-roster')
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API request failed: ${response.status}`)
      console.error('Error:', errorText)
      return
    }

    const data = await response.json()
    console.log('✅ API request successful!')
    
    if (data.data && data.data.talent && data.data.groups) {
      console.log(`📊 Found ${data.data.talent.length} talent assignments`)
      console.log(`📊 Found ${data.data.groups.length} talent groups`)
      
      // Show sample data
      if (data.data.talent.length > 0) {
        const sampleTalent = data.data.talent[0]
        console.log(`   Sample talent: ${sampleTalent.first_name} ${sampleTalent.last_name} (order: ${sampleTalent.assignment?.display_order})`)
      }
      
      if (data.data.groups.length > 0) {
        const sampleGroup = data.data.groups[0]
        console.log(`   Sample group: ${sampleGroup.groupName} (order: ${sampleGroup.displayOrder})`)
      }
      
      console.log('\n🎉 The API is now working! You should see talent in the frontend.')
      console.log('💡 Add the display_order column when ready for full drag-and-drop functionality.')
    } else {
      console.log('⚠️  Unexpected response format:', data)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAPI()