#!/usr/bin/env node

/**
 * Test script to verify the talent schedule assignment fix
 */

require('dotenv').config({ path: '.env.local' });

async function testTalentScheduleAssignment() {
  console.log('🧪 Testing talent schedule assignment...\n');

  // Test data - you'll need to replace these with actual IDs from your database
  const projectId = '08aaad7f-dc7d-47a4-8d48-c1297ea3bdc1'; // Replace with actual project ID
  const talentId = '5fa40595-d614-4da9-908e-729e7d3f7aa4';   // Replace with actual talent ID
  
  const testDates = ['2024-12-15', '2024-12-16']; // Test dates

  try {
    const response = await fetch(`http://localhost:3000/api/projects/${projectId}/talent-roster/${talentId}/schedule`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        // You might need to add authentication headers here
      },
      body: JSON.stringify({
        scheduledDates: testDates
      })
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', errorData);
      return;
    }

    const result = await response.json();
    console.log('✅ Success! Response:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Note: This test requires the development server to be running
console.log('⚠️  Make sure your development server is running (npm run dev)');
console.log('⚠️  Update the projectId and talentId with actual values from your database\n');

testTalentScheduleAssignment();