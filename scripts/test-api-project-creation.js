const { default: fetch } = require('node-fetch');

async function testAPIProjectCreation() {
  console.log('🧪 Testing API project creation...');
  
  const projectData = {
    name: "Test API Project",
    start_date: "2025-01-01",
    end_date: "2025-01-02",
    description: "Test project creation via API",
    production_company: "Test Company",
    hiring_contact: "Test Contact",
    project_location: "Test Location"
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
    if (response.ok) {
      console.log('✅ Project created successfully!');
    } else {
      console.log('❌ Project creation failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testAPIProjectCreation();