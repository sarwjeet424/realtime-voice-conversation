#!/usr/bin/env node

/**
 * Test script for session limits
 * This script helps you test the 5-minute session limit functionality
 */

const io = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.TEST_EMAIL || `test-${Date.now()}@example.com`;

console.log('🧪 Starting Session Limit Test');
console.log(`📧 Test Email: ${TEST_EMAIL}`);
console.log(`🌐 Backend URL: ${BACKEND_URL}`);
console.log('');

// Test 1: Create a session and check initial state
async function testSessionCreation() {
  console.log('📝 Test 1: Creating a new session...');
  
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      
      // Authenticate
      socket.emit('authenticate', { email: TEST_EMAIL });
    });
    
    socket.on('auth_success', ({ sessionId, expiresAt, timeRemaining }) => {
      console.log('✅ Authentication successful');
      console.log(`🆔 Session ID: ${sessionId}`);
      console.log(`⏰ Time Remaining: ${Math.round(timeRemaining / 1000)} seconds`);
      console.log(`📅 Expires At: ${new Date(expiresAt).toISOString()}`);
      
      socket.disconnect();
      resolve({ sessionId, expiresAt, timeRemaining });
    });
    
    socket.on('auth_error', (error) => {
      console.log('❌ Authentication failed:', error.message);
      socket.disconnect();
      resolve(null);
    });
  });
}

// Test 2: Send messages and track usage
async function testMessageSending() {
  console.log('\n📝 Test 2: Sending messages to test limits...');
  
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    let messageCount = 0;
    const maxMessages = 10; // Send 10 test messages
    
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      socket.emit('authenticate', { email: TEST_EMAIL });
    });
    
    socket.on('auth_success', ({ timeRemaining }) => {
      console.log(`✅ Authenticated! Starting message test with ${Math.round(timeRemaining / 1000)}s remaining`);
      
      // Send messages every 2 seconds
      const interval = setInterval(() => {
        if (messageCount >= maxMessages) {
          clearInterval(interval);
          socket.disconnect();
          resolve();
          return;
        }
        
        messageCount++;
        const testMessage = `Test message ${messageCount}`;
        console.log(`📤 Sending: "${testMessage}"`);
        socket.emit('text_message', { text: testMessage });
      }, 2000);
    });
    
    socket.on('ai_response', ({ text, timeRemaining }) => {
      console.log(`🤖 AI Response: "${text}"`);
      if (timeRemaining !== undefined) {
        console.log(`⏰ Time Remaining: ${Math.round(timeRemaining / 1000)}s`);
      }
    });
    
    socket.on('session_expired', ({ message }) => {
      console.log(`⏰ Session expired: ${message}`);
      clearInterval(interval);
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

// Test 3: Test session info endpoint
async function testSessionInfoEndpoint() {
  console.log('\n📝 Test 3: Testing session info endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/sessions`);
    const data = await response.json();
    
    console.log('📊 Active Sessions:');
    data.activeSessions.forEach((session, index) => {
      console.log(`  ${index + 1}. Email: ${session.email}`);
      console.log(`     Time Remaining: ${Math.round(session.timeRemaining / 1000)}s`);
      console.log(`     Messages: ${session.messageCount}/50`);
      console.log('');
    });
  } catch (error) {
    console.log('❌ Failed to fetch session info:', error.message);
  }
}

// Test 4: Create a test session via API
async function testCreateSessionAPI() {
  console.log('\n📝 Test 4: Creating test session via API...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/test-session`);
    const data = await response.json();
    
    console.log('✅ Test session created via API:');
    console.log(`📧 Email: ${data.testEmail}`);
    console.log(`🆔 Session ID: ${data.sessionId}`);
    console.log(`⏰ Time Remaining: ${Math.round(data.timeRemaining / 1000)}s`);
    console.log(`📅 Expires At: ${new Date(data.expiresAt).toISOString()}`);
  } catch (error) {
    console.log('❌ Failed to create test session:', error.message);
  }
}

// Test 5: Simulate time expiration (for testing)
async function testTimeExpiration() {
  console.log('\n📝 Test 5: Testing time expiration...');
  console.log('⚠️  This test will create a session and wait for it to expire');
  console.log('   (In production, this would take 5 minutes)');
  console.log('   For testing, you can manually check the session status');
  
  const socket = io(BACKEND_URL);
  
  return new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      socket.emit('authenticate', { email: `expiry-test-${Date.now()}@example.com` });
    });
    
    socket.on('auth_success', ({ timeRemaining }) => {
      console.log(`✅ Session created with ${Math.round(timeRemaining / 1000)}s remaining`);
      console.log('💡 To test expiration:');
      console.log('   1. Wait 5 minutes, or');
      console.log('   2. Modify the SESSION_DURATION in auth.service.ts to a shorter time');
      console.log('   3. Restart the server and try again');
      
      // Check session info every 30 seconds
      const checkInterval = setInterval(() => {
        socket.emit('get_session_info');
      }, 30000);
      
      socket.on('session_info', (info) => {
        if (info.error) {
          console.log(`❌ Session error: ${info.error}`);
          clearInterval(checkInterval);
          socket.disconnect();
          resolve();
        } else {
          console.log(`📊 Session Status: ${Math.round(info.timeRemaining / 1000)}s remaining, ${info.messageCount} messages`);
        }
      });
      
      socket.on('session_expired', ({ message }) => {
        console.log(`⏰ Session expired: ${message}`);
        clearInterval(checkInterval);
        socket.disconnect();
        resolve();
      });
    });
  });
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Session Limit Tests\n');
  
  try {
    // Test 1: Session Creation
    await testSessionCreation();
    
    // Test 2: Message Sending
    await testMessageSending();
    
    // Test 3: Session Info Endpoint
    await testSessionInfoEndpoint();
    
    // Test 4: Create Test Session API
    await testCreateSessionAPI();
    
    // Test 5: Time Expiration
    await testTimeExpiration();
    
    console.log('\n✅ All tests completed!');
    console.log('\n💡 Tips for testing:');
    console.log('   - Use different email addresses to test multiple sessions');
    console.log('   - Check /sessions endpoint to see all active sessions');
    console.log('   - Modify SESSION_DURATION in auth.service.ts for faster testing');
    console.log('   - Use /test-session endpoint to create test sessions quickly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testSessionCreation,
  testMessageSending,
  testSessionInfoEndpoint,
  testCreateSessionAPI,
  testTimeExpiration
};

