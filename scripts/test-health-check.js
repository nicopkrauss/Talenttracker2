// Test if the server is actually running

async function testHealthCheck() {
  console.log('🔍 Testing Server Health Check')
  
  try {
    const response = await fetch('http://localhost:3000/api/health-check', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('Response status:', response.status)
    
    const data = await response.json()
    console.log('Response data:', data)
    
    if (response.ok) {
      console.log('✅ Server is running and responding')
      
      // Now test the timecards API
      console.log('\n🔍 Testing timecards API...')
      const timecardsResponse = await fetch('http://localhost:3000/api/timecards', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Timecards API status:', timecardsResponse.status)
      
      const timecardsData = await timecardsResponse.json()
      console.log('Timecards API response:', timecardsData)
      
    } else {
      console.log('❌ Server health check failed')
    }
    
  } catch (error) {
    console.error('💥 Error testing health check:', error.message)
    console.log('Server is likely not running on port 3000')
  }
}

testHealthCheck().catch(console.error)