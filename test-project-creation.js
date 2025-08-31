// Simple test script to debug project creation
// Run this in the browser console on the project creation page

async function testProjectCreation() {
  const testData = {
    name: "Test Project",
    description: "Test description",
    production_company: "Test Company",
    hiring_contact: "Test Contact",
    project_location: "Test Location",
    start_date: "2024-01-01",
    end_date: "2024-12-31"
  };

  console.log('Testing project creation with data:', testData);

  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log('Response data:', responseData);

    if (!response.ok) {
      console.error('Request failed:', responseData);
    } else {
      console.log('Request succeeded:', responseData);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

// Also test user authentication
async function testUserAuth() {
  try {
    const response = await fetch('/api/auth/profile');
    const data = await response.json();
    console.log('Current user profile:', data);
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}

console.log('Run testUserAuth() to check current user');
console.log('Run testProjectCreation() to test project creation');