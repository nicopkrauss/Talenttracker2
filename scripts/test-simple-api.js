// Test the simple API route to see if it works

async function testSimpleAPI() {
  console.log('🔍 Testing Simple API Route')
  
  try {
    const response = await fetch('http://localhost:3000/api/test-timecards', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('Response status:', response.status)
    
    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Simple API route works!')
    } else {
      console.log('❌ Simple API route failed')
    }
    
  } catch (error) {
    console.error('💥 Error testing simple API:', error.message)
  }
}

testSimpleAPI().catch(console.error)