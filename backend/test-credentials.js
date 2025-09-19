const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jbmgssngyldvqjflqepk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibWdzc25neWxkdnFqZmxxZXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNzIwMzcsImV4cCI6MjA3Mzc0ODAzN30.AIsc9voquCUQll_wUEeY5LMyqdraTK11Xu5OZ7eRRkY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestCredentials() {
  console.log('🔧 Adding test credentials...');

  const testCredentials = [
    {
      email: 'test1@example.com',
      password: 'password123',
      is_active: true,
      session_limit: 1,
      sessions_used: 0
    },
    {
      email: 'test2@example.com',
      password: 'password456',
      is_active: true,
      session_limit: 2,
      sessions_used: 0
    },
    {
      email: 'demo@example.com',
      password: 'demo123',
      is_active: true,
      session_limit: 1,
      sessions_used: 0
    }
  ];

  for (const cred of testCredentials) {
    try {
      const { data, error } = await supabase
        .from('user_credentials')
        .upsert(cred);

      if (error) {
        console.error(`❌ Error adding ${cred.email}:`, error);
      } else {
        console.log(`✅ Added credentials for ${cred.email}`);
      }
    } catch (err) {
      console.error(`❌ Error adding ${cred.email}:`, err);
    }
  }

  console.log('\n📋 Test credentials added:');
  console.log('Email: test1@example.com, Password: password123');
  console.log('Email: test2@example.com, Password: password456');
  console.log('Email: demo@example.com, Password: demo123');
  console.log('\n🔑 Admin email: sarwjeetfreelancer@gmail.com (no password required)');
}

addTestCredentials().catch(console.error);
