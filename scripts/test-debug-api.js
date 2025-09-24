// Test the debug API route to see the exact error

async function testDebugAPI() {
  console.log('🔍 Testing Debug API Route')
  
  try {
    const response = await fetch('http://localhost:3000/api/timecards-debug', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2))
    
    if (!response.ok) {
      console.log('❌ Debug API failed with status:', response.status)
    } else {
      console.log('✅ Debug API succeeded')
    }
    
  } catch (error) {
    console.error('💥 Error testing debug API:', error.message)
    console.log('This suggests the server is not running or there\'s a connection issue')
  }
}

testDebugAPI().catch(console.error)