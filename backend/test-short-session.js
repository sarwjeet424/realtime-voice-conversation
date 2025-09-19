#!/usr/bin/env node

/**
 * Quick test script with 30-second session limit
 * This modifies the session duration for faster testing
 */

const fs = require('fs');
const path = require('path');

const AUTH_SERVICE_PATH = path.join(__dirname, 'src', 'voice-rtc', 'services', 'auth.service.ts');

console.log('🔧 Setting up 30-second session limit for testing...');

try {
  // Read the auth service file
  let content = fs.readFileSync(AUTH_SERVICE_PATH, 'utf8');
  
  // Replace the 5-minute duration with 30 seconds
  const originalDuration = '5 * 60 * 1000'; // 5 minutes
  const testDuration = '30 * 1000'; // 30 seconds
  
  if (content.includes(originalDuration)) {
    content = content.replace(originalDuration, testDuration);
    
    // Write the modified content back
    fs.writeFileSync(AUTH_SERVICE_PATH, content);
    
    console.log('✅ Modified session duration to 30 seconds');
    console.log('🔄 Please restart your backend server for changes to take effect');
    console.log('');
    console.log('🧪 Now you can test the session limit quickly:');
    console.log('   1. Restart backend: npm run start:dev');
    console.log('   2. Open frontend and authenticate');
    console.log('   3. Wait 30 seconds to see session expiration');
    console.log('   4. Run: node test-session-limits.js');
    console.log('');
    console.log('⚠️  Remember to change it back to 5 minutes before production!');
    
  } else {
    console.log('❌ Could not find session duration to modify');
    console.log('   Please check the auth.service.ts file manually');
  }
  
} catch (error) {
  console.error('❌ Error modifying session duration:', error.message);
  console.log('');
  console.log('🔧 Manual setup:');
  console.log('   1. Open backend/src/voice-rtc/services/auth.service.ts');
  console.log('   2. Change line with SESSION_DURATION from:');
  console.log('      private readonly SESSION_DURATION = 5 * 60 * 1000;');
  console.log('   3. To:');
  console.log('      private readonly SESSION_DURATION = 30 * 1000;');
  console.log('   4. Restart your backend server');
}

