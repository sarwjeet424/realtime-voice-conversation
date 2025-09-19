#!/usr/bin/env node

/**
 * Test script for the monthly usage system
 * This script tests the 1-session-per-month limit with admin exception
 */

const io = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.TEST_EMAIL || `monthly-test-${Date.now()}@example.com`;
const ADMIN_EMAIL = 'sarwjeetfreelancer@gmail.com';

console.log('🧪 Starting Monthly Usage System Test');
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
      console.log('📊 User should now be tracked for monthly usage');
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
    
    console.log('📊 Monthly Usage:');
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
    
    console.log('📊 User Status:');
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

// Main test runner
async function runTests() {
  console.log('🚀 Starting Monthly Usage System Tests\n');
  
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
    
    console.log('\n✅ All monthly usage tests completed!');
    console.log('\n💡 Summary:');
    console.log('   - Regular users: 1 session per month');
    console.log('   - Admin user (sarwjeetfreelancer@gmail.com): Unlimited access');
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
  testDifferentEmail
};

