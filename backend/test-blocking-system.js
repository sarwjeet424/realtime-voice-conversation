#!/usr/bin/env node

/**
 * Test script for the blocking system
 * This script tests the 24-hour blocking functionality after session expires
 */

const io = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.TEST_EMAIL || `blocking-test-${Date.now()}@example.com`;

console.log('🧪 Starting Blocking System Test');
console.log(`📧 Test Email: ${TEST_EMAIL}`);
console.log(`🌐 Backend URL: ${BACKEND_URL}`);
console.log('');

// Test 1: Create a session and let it expire
async function testSessionExpirationAndBlocking() {
  console.log('📝 Test 1: Creating session and testing blocking after expiration...');
  
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      socket.emit('authenticate', { email: TEST_EMAIL });
    });
    
    socket.on('auth_success', ({ sessionId, timeRemaining }) => {
      console.log('✅ First authentication successful');
      console.log(`🆔 Session ID: ${sessionId}`);
      console.log(`⏰ Time Remaining: ${Math.round(timeRemaining / 1000)} seconds`);
      console.log('');
      console.log('💡 Session will expire in 3 minutes and user will be blocked for 24 hours');
      console.log('   For testing, you can:');
      console.log('   1. Wait 3 minutes for natural expiration, or');
      console.log('   2. Modify SESSION_DURATION to 30 seconds for faster testing');
      console.log('');
      
      // Send a test message
      console.log('📤 Sending test message...');
      socket.emit('text_message', { text: 'Hello, this is a test message' });
    });
    
    socket.on('ai_response', ({ text }) => {
      console.log(`🤖 AI Response: "${text}"`);
    });
    
    socket.on('session_expired', ({ message }) => {
      console.log(`⏰ Session expired: ${message}`);
      console.log('🔒 User should now be blocked for 24 hours');
      socket.disconnect();
      
      // Test if user is blocked
      setTimeout(() => testUserBlocking(), 2000);
    });
    
    socket.on('auth_error', (error) => {
      console.log('❌ Authentication failed:', error.message);
      socket.disconnect();
      resolve();
    });
  });
}

// Test 2: Try to authenticate with the same email (should be blocked)
async function testUserBlocking() {
  console.log('\n📝 Test 2: Testing if user is blocked...');
  
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      console.log('🔒 Attempting to authenticate with blocked email...');
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

// Test 3: Check blocked users via API
async function testBlockedUsersAPI() {
  console.log('\n📝 Test 3: Checking blocked users via API...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/blocked-users`);
    const data = await response.json();
    
    console.log('📊 Blocked Users:');
    if (data.blockedUsers.length === 0) {
      console.log('  No blocked users found');
    } else {
      data.blockedUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. Email: ${user.email}`);
        console.log(`     Reason: ${user.reason}`);
        console.log(`     Blocked Until: ${new Date(user.blockedUntil).toLocaleString()}`);
        console.log(`     Time Remaining: ${Math.round(user.timeRemaining / 1000 / 60)} minutes`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Failed to fetch blocked users:', error.message);
  }
}

// Test 4: Check specific user status
async function testUserStatusAPI() {
  console.log('\n📝 Test 4: Checking specific user status...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/check-user/${encodeURIComponent(TEST_EMAIL)}`);
    const data = await response.json();
    
    console.log('📊 User Status:');
    console.log(`  Email: ${data.email}`);
    console.log(`  Blocked: ${data.blocked ? 'Yes' : 'No'}`);
    if (data.blocked) {
      console.log(`  Reason: ${data.reason}`);
      console.log(`  Blocked Until: ${data.blockedUntil}`);
    }
    console.log(`  Has Active Session: ${data.hasActiveSession ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('❌ Failed to check user status:', error.message);
  }
}

// Test 5: Test with different email (should work)
async function testDifferentEmail() {
  console.log('\n📝 Test 5: Testing with different email (should work)...');
  
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

// Test 6: Create a quick test session with 30-second limit
async function createQuickTestSession() {
  console.log('\n📝 Test 6: Creating quick test session (30 seconds)...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/test-session`);
    const data = await response.json();
    
    if (data.error) {
      console.log('❌ Test session creation failed:', data.message);
    } else {
      console.log('✅ Quick test session created:');
      console.log(`📧 Email: ${data.testEmail}`);
      console.log(`⏰ Time Remaining: ${Math.round(data.timeRemaining / 1000)} seconds`);
      console.log('');
      console.log('💡 Use this email to test the blocking system quickly');
    }
  } catch (error) {
    console.log('❌ Failed to create test session:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Blocking System Tests\n');
  
  try {
    // Test 1: Session Creation and Expiration
    await testSessionExpirationAndBlocking();
    
    // Test 2: User Blocking
    await testUserBlocking();
    
    // Test 3: Blocked Users API
    await testBlockedUsersAPI();
    
    // Test 4: User Status API
    await testUserStatusAPI();
    
    // Test 5: Different Email
    await testDifferentEmail();
    
    // Test 6: Quick Test Session
    await createQuickTestSession();
    
    console.log('\n✅ All blocking tests completed!');
    console.log('\n💡 Summary:');
    console.log('   - Each email gets ONE 3-minute session per day');
    console.log('   - After session expires, user is blocked for 24 hours');
    console.log('   - Different emails can still access the system');
    console.log('   - Use /blocked-users endpoint to monitor blocked users');
    console.log('   - Use /check-user/:email to check specific user status');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testSessionExpirationAndBlocking,
  testUserBlocking,
  testBlockedUsersAPI,
  testUserStatusAPI,
  testDifferentEmail,
  createQuickTestSession
};

