// Simple test to verify video mode is working
// Run with: node test-video-mode.js

const axios = require('axios');

const BACKEND_URL = 'http://localhost:4000';

async function testVideoMode() {
  console.log('🧪 Testing Video Mode Integration...\n');
  
  try {
    // Test 1: Check if backend is running
    console.log('1️⃣ Testing backend connection...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend is running');
    
    // Test 2: Test D-ID connection
    console.log('\n2️⃣ Testing D-ID connection...');
    const didResponse = await axios.get(`${BACKEND_URL}/test/did-connection`);
    console.log('📊 D-ID Response:', didResponse.data);
    
    if (didResponse.data.success) {
      console.log('✅ D-ID connection successful');
    } else {
      console.log('❌ D-ID connection failed:', didResponse.data.message);
      return;
    }
    
    // Test 3: Test video creation
    console.log('\n3️⃣ Testing video creation...');
    const videoResponse = await axios.post(`${BACKEND_URL}/test/did-video`, {
      text: 'Hello, this is a test video for the video bot feature!'
    });
    
    console.log('📊 Video Response:', videoResponse.data);
    
    if (videoResponse.data.success) {
      console.log('✅ Video created successfully!');
      console.log('🎥 Video URL:', videoResponse.data.videoUrl);
    } else {
      console.log('❌ Video creation failed:', videoResponse.data.message);
    }
    
    console.log('\n🎉 Video mode test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the frontend: cd frontend && npm start');
    console.log('2. Open http://localhost:3000');
    console.log('3. Click "Video Bot" button');
    console.log('4. Click "Start Conversation"');
    console.log('5. Speak or click "Test Video Mode" button');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend is running:');
      console.log('   cd backend && npm run start:dev');
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 Make sure you have set DID_API_KEY in backend/.env');
    }
  }
}

testVideoMode();

