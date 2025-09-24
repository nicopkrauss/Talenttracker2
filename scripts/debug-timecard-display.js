const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://phksmrvgqqjfxgxztvgc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoa3NtcnZncXFqZnhneHp0dmdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQyNjA0NiwiZXhwIjoyMDcyMDAyMDQ2fQ.oNTcoB4HfFPEMEl0KdfiuC-09NQnATKPZIn3xP4U1mY'
);

async function debugTimecardDisplay() {
  try {
    console.log('🔍 Debugging timecard display issues...');
    
    // Check timecard headers with relations
    console.log('\n1. Checking timecard headers with relations...');
    const { data: headers, error: headersError } = await supabase
      .from('timecard_headers')
      .select(`
        id,
        user_id,
        project_id,
        status,
        period_start_date,
        period_end_date,
        total_hours,
        total_pay,
        user:profiles!timecard_headers_user_id_fkey(full_name, email),
        project:projects!timecard_headers_project_id_fkey(name)
      `)
      .limit(3);

    if (headersError) {
      console.error('❌ Headers error:', headersError);
      
      // Try without relations to see if data exists
      console.log('\n2. Trying without relations...');
      const { data: simpleHeaders, error: simpleError } = await supabase
        .from('timecard_headers')
        .select('id, user_id, project_id, status, period_start_date, period_end_date')
        .limit(3);
        
      if (simpleError) {
        console.error('❌ Simple headers error:', simpleError);
      } else {
        console.log('✅ Simple headers:', JSON.stringify(simpleHeaders, null, 2));
      }
      
      return;
    }

    console.log('✅ Headers with relations:', JSON.stringify(headers, null, 2));

    // Check daily entries for first timecard
    if (headers && headers.length > 0) {
      console.log('\n3. Checking daily entries...');
      const { data: entries, error: entriesError } = await supabase
        .from('timecard_daily_entries')
        .select('*')
        .eq('timecard_header_id', headers[0].id);

      if (entriesError) {
        console.error('❌ Entries error:', entriesError);
      } else {
        console.log('✅ Daily entries:', JSON.stringify(entries, null, 2));
      }
    }

    // Check if users and projects exist
    console.log('\n4. Checking users and projects separately...');
    
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(3);
      
    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log('✅ Users:', JSON.stringify(users, null, 2));
    }

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(3);
      
    if (projectsError) {
      console.error('❌ Projects error:', projectsError);
    } else {
      console.log('✅ Projects:', JSON.stringify(projects, null, 2));
    }

    // Test the API endpoint directly
    console.log('\n5. Testing API endpoint...');
    try {
      const response = await fetch('http://localhost:3000/api/timecards-v2');
      if (response.ok) {
        const apiData = await response.json();
        console.log('✅ API Response:', JSON.stringify(apiData, null, 2));
      } else {
        console.error('❌ API Error:', response.status, response.statusText);
      }
    } catch (fetchError) {
      console.error('❌ Fetch Error:', fetchError.message);
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

debugTimecardDisplay();