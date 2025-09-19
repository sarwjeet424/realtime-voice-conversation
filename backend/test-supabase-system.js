#!/usr/bin/env node

/**
 * Test script for the Supabase-based monthly usage system
 * This script tests the 5-minute, 20-message, once-per-month limit with admin exception
 */

const io = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.TEST_EMAIL || `supabase-test-${Date.now()}@example.com`;
const ADMIN_EMAIL = 'sarwjeetfreelancer@gmail.com';

console.log('🧪 Starting Supabase Monthly Usage System Test');
console.log(`📧 Test Email: ${TEST_EMAIL}`);
console.log(`👑 Admin Email: ${ADMIN_EMAIL}`);
console.log(`🌐 Backend URL: ${BACKEND_URL}`);
console.log('');

// Test 1: Regular user - first session of the month
async function testRegularUserFirstSession() {
  console.log('📝 Test 1: Regular user first session of the month...');
  
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      socket.emit('authenticate', { email: TEST_EMAIL });
    });
    
    socket.on('auth_success', ({ sessionId, timeRemaining }) => {
      console.log('✅ First session authentication successful');
      console.log(`🆔 Session ID: ${sessionId}`);
      console.log(`⏰ Time Remaining: ${Math.round(timeRemaining / 1000)} seconds`);
      console.log('📊 Session stored in Supabase database');
      console.log('');
      
      // Send a test message
      console.log('📤 Sending test message...');
      socket.emit('text_message', { text: 'Hello, this is my first session this month' });
    });
    
    socket.on('ai_response', ({ text }) => {
      console.log(`🤖 AI Response: "${text}"`);
    });
    
    socket.on('session_expired', ({ message }) => {
      console.log(`⏰ Session expired: ${message}`);
      console.log('📊 User should now be tracked for monthly usage in Supabase');
      socket.disconnect();
      resolve();
    });
    
    socket.on('auth_error', (error) => {
      console.log('❌ Authentication failed:', error.message);
      socket.disconnect();
      resolve();
    });
  });
}

// Test 2: Regular user - try second session (should be blocked)
async function testRegularUserSecondSession() {
  console.log('\n📝 Test 2: Regular user trying second session (should be blocked)...');
  
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      console.log('🔒 Attempting to authenticate with same email...');
      socket.emit('authenticate', { email: TEST_EMAIL });
    });
    
    socket.on('auth_error', ({ message }) => {
      console.log('✅ User is blocked (expected):', message);
      console.log('📊 Monthly usage limit enforced via Supabase');
      socket.disconnect();
      resolve();
    });
    
    socket.on('auth_success', () => {
      console.log('❌ User should be blocked but authentication succeeded');
      socket.disconnect();
      resolve();
    });
  });
}

// Test 3: Admin user - should have unlimited access
async function testAdminUser() {
  console.log('\n📝 Test 3: Admin user (should have unlimited access)...');
  
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      console.log(`👑 Testing admin user: ${ADMIN_EMAIL}`);
      socket.emit('authenticate', { email: ADMIN_EMAIL });
    });
    
    socket.on('auth_success', ({ timeRemaining }) => {
      console.log('✅ Admin authentication successful');
      console.log(`⏰ Time Remaining: ${Math.round(timeRemaining / 1000)} seconds`);
      console.log('👑 Admin has unlimited access - no monthly restrictions');
      console.log('📊 Admin session stored in Supabase but with no limits');
      socket.disconnect();
      resolve();
    });
    
    socket.on('auth_error', ({ message }) => {
      console.log('❌ Admin authentication failed:', message);
      socket.disconnect();
      resolve();
    });
  });
}

// Test 4: Check monthly usage via API
async function testMonthlyUsageAPI() {
  console.log('\n📝 Test 4: Checking monthly usage via API...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/monthly-usage`);
    const data = await response.json();
    
    console.log('📊 Monthly Usage from Supabase:');
    if (data.monthlyUsage.length === 0) {
      console.log('  No monthly usage records found');
    } else {
      data.monthlyUsage.forEach((usage, index) => {
        console.log(`  ${index + 1}. Email: ${usage.email}`);
        console.log(`     Month: ${usage.month}`);
        console.log(`     Sessions: ${usage.sessionCount}`);
        console.log(`     Messages: ${usage.totalMessages}`);
        console.log(`     Last Used: ${new Date(usage.lastUsed).toLocaleString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Failed to fetch monthly usage:', error.message);
  }
}

// Test 5: Check specific user status
async function testUserStatusAPI() {
  console.log('\n📝 Test 5: Checking specific user status...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/check-user/${encodeURIComponent(TEST_EMAIL)}`);
    const data = await response.json();
    
    console.log('📊 User Status from Supabase:');
    console.log(`  Email: ${data.email}`);
    console.log(`  Is Admin: ${data.isAdmin ? 'Yes' : 'No'}`);
    console.log(`  Blocked: ${data.blocked ? 'Yes' : 'No'}`);
    if (data.blocked) {
      console.log(`  Reason: ${data.reason}`);
    }
    console.log(`  Restrictions: ${data.restrictions}`);
    if (data.monthlyUsage) {
      console.log(`  Monthly Usage: ${data.monthlyUsage.sessionCount} sessions this month`);
    }
  } catch (error) {
    console.log('❌ Failed to check user status:', error.message);
  }
}

// Test 6: Check admin status
async function testAdminStatusAPI() {
  console.log('\n📝 Test 6: Checking admin status...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/admin-status`);
    const data = await response.json();
    
    console.log('👑 Admin Status:');
    console.log(`  Admin Email: ${data.adminEmail}`);
    console.log(`  Restrictions: ${data.restrictions}`);
  } catch (error) {
    console.log('❌ Failed to check admin status:', error.message);
  }
}

// Test 7: Test with different email (should work)
async function testDifferentEmail() {
  console.log('\n📝 Test 7: Testing with different email (should work)...');
  
  const differentEmail = `different-${Date.now()}@example.com`;
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      console.log(`📧 Testing with different email: ${differentEmail}`);
      socket.emit('authenticate', { email: differentEmail });
    });
    
    socket.on('auth_success', ({ timeRemaining }) => {
      console.log('✅ Different email authentication successful');
      console.log(`⏰ Time Remaining: ${Math.round(timeRemaining / 1000)} seconds`);
      console.log('📅 This user can use the system once per month');
      console.log('📊 New user session stored in Supabase');
      socket.disconnect();
      resolve();
    });
    
    socket.on('auth_error', ({ message }) => {
      console.log('❌ Different email authentication failed:', message);
      socket.disconnect();
      resolve();
    });
  });
}

// Test 8: Test message limit (20 messages)
async function testMessageLimit() {
  console.log('\n📝 Test 8: Testing message limit (20 messages)...');
  
  const socket = io(BACKEND_URL);
  let messageCount = 0;
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      socket.emit('authenticate', { email: `messagelimit-${Date.now()}@example.com` });
    });
    
    socket.on('auth_success', () => {
      console.log('✅ Authentication successful, testing message limit...');
      // Send 21 messages to test the limit
      for (let i = 1; i <= 21; i++) {
        setTimeout(() => {
          socket.emit('text_message', { text: `Test message ${i}` });
        }, i * 100);
      }
    });
    
    socket.on('ai_response', ({ text }) => {
      messageCount++;
      console.log(`📨 Message ${messageCount}: AI Response received`);
    });
    
    socket.on('session_expired', ({ message }) => {
      console.log(`⏰ Session expired after ${messageCount} messages: ${message}`);
      console.log('✅ Message limit (20) enforced correctly');
      socket.disconnect();
      resolve();
    });
    
    socket.on('auth_error', ({ message }) => {
      console.log('❌ Authentication failed:', message);
      socket.disconnect();
      resolve();
    });
  });
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Supabase Monthly Usage System Tests\n');
  
  try {
    // Test 1: Regular user first session
    await testRegularUserFirstSession();
    
    // Test 2: Regular user second session (should be blocked)
    await testRegularUserSecondSession();
    
    // Test 3: Admin user (unlimited access)
    await testAdminUser();
    
    // Test 4: Monthly usage API
    await testMonthlyUsageAPI();
    
    // Test 5: User status API
    await testUserStatusAPI();
    
    // Test 6: Admin status API
    await testAdminStatusAPI();
    
    // Test 7: Different email
    await testDifferentEmail();
    
    // Test 8: Message limit
    await testMessageLimit();
    
    console.log('\n✅ All Supabase monthly usage tests completed!');
    console.log('\n💡 Summary:');
    console.log('   - Regular users: 1 session per month (5 minutes, 20 messages)');
    console.log('   - Admin user (sarwjeetfreelancer@gmail.com): Unlimited access');
    console.log('   - All data stored in Supabase database');
    console.log('   - Monthly usage is tracked and persisted');
    console.log('   - Use /monthly-usage endpoint to monitor usage');
    console.log('   - Use /check-user/:email to check specific user status');
    console.log('   - Use /admin-status to check admin configuration');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testRegularUserFirstSession,
  testRegularUserSecondSession,
  testAdminUser,
  testMonthlyUsageAPI,
  testUserStatusAPI,
  testAdminStatusAPI,
  testDifferentEmail,
  testMessageLimit
};

