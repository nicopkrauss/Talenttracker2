// Simple test to check if the API is working after fixing table references

async function testAPI() {
  console.log('🔍 Testing Timecards API after table fixes')
  
  try {
    const response = await fetch('http://localhost:3000/api/timecards', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log('Response status:', response.status)
    
    if (response.status === 500) {
      const errorData = await response.json()
      console.log('❌ Still getting 500 error:', errorData)
    } else if (response.status === 401) {
      console.log('✅ Good! Getting 401 (authentication required) instead of 500')
      console.log('   This means the API routes are working, just need authentication')
    } else {
      const data = await response.json()
      console.log('✅ API working! Response:', data)
    }
    
  } catch (error) {
    console.error('💥 Error testing API:', error.message)
  }
}

testAPI().catch(console.error)