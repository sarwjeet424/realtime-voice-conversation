// Simple test script to verify D-ID integration
// Run with: node test-did.js

const axios = require('axios');

const DID_API_KEY = process.env.DID_API_KEY || 'your_did_api_key_here';
const baseUrl = 'https://api.d-id.com';

async function testDidConnection() {
  console.log('🧪 Testing D-ID API connection...');
  console.log(`🔑 API Key: ${DID_API_KEY.substring(0, 10)}...`);
  
  try {
    const response = await axios.get(`${baseUrl}/talks`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${DID_API_KEY}:`).toString('base64')}`,
      },
    });
    
    console.log('✅ D-ID connection successful!');
    console.log('📊 Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ D-ID connection failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    return false;
  }
}

async function testVideoCreation() {
  console.log('\n🎬 Testing video creation...');
  
  const requestData = {
    script: {
      type: 'text',
      input: 'Hello, this is a test video from D-ID!',
      provider: {
        type: 'microsoft',
        voice_id: 'en-US-AriaNeural',
      },
    },
    config: {
      fluent: true,
      pad_audio: 0.0,
    },
    presenter_id: 'v2_public_Alyssa_NoHands_BlackShirt_Home@Mvn6Nalx90',
  };

  try {
    const response = await axios.post(`${baseUrl}/talks`, requestData, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${DID_API_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Video creation request successful!');
    console.log('📊 Video ID:', response.data.id);
    console.log('📊 Status:', response.data.status);
    console.log('📊 Full response:', response.data);
    
    return response.data.id;
  } catch (error) {
    console.error('❌ Video creation failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    return null;
  }
}

async function checkVideoStatus(videoId) {
  console.log(`\n🔍 Checking video status for ID: ${videoId}`);
  
  try {
    const response = await axios.get(`${baseUrl}/talks/${videoId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${DID_API_KEY}:`).toString('base64')}`,
      },
    });

    console.log('📊 Video status:', response.data.status);
    if (response.data.result_url) {
      console.log('🎥 Video URL:', response.data.result_url);
    }
    if (response.data.error) {
      console.log('❌ Video error:', response.data.error);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Status check failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting D-ID integration test...\n');
  
  if (DID_API_KEY === 'your_did_api_key_here') {
    console.error('❌ Please set your DID_API_KEY environment variable');
    console.error('Example: DID_API_KEY=your_actual_key node test-did.js');
    process.exit(1);
  }
  
  // Test connection
  const connectionOk = await testDidConnection();
  if (!connectionOk) {
    console.error('❌ Connection test failed. Please check your API key.');
    process.exit(1);
  }
  
  // Test video creation
  const videoId = await testVideoCreation();
  if (!videoId) {
    console.error('❌ Video creation test failed.');
    process.exit(1);
  }
  
  // Check video status
  await checkVideoStatus(videoId);
  
  console.log('\n✅ D-ID integration test completed!');
  console.log('💡 If all tests passed, your D-ID integration should work in the app.');
}

main().catch(console.error);

