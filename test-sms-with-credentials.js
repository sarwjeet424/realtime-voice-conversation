const axios = require('axios');

// Test with real Exotel credentials
async function testSmsWithCredentials() {
  console.log('🧪 Testing SMS API with Real Credentials\n');
  
  // You need to set these environment variables with your real Exotel credentials
  const exotelApiKey = process.env.EXOTEL_API_KEY;
  const exotelApiToken = process.env.EXOTEL_API_TOKEN;
  const exotelSid = process.env.EXOTEL_SID;
  
  if (!exotelApiKey || !exotelApiToken || !exotelSid) {
    console.log('❌ Missing Exotel credentials!');
    console.log('Please set these environment variables:');
    console.log('- EXOTEL_API_KEY=your_api_key');
    console.log('- EXOTEL_API_TOKEN=your_api_token');
    console.log('- EXOTEL_SID=your_sid');
    console.log('\nYou can set them by running:');
    console.log('$env:EXOTEL_API_KEY="your_api_key"');
    console.log('$env:EXOTEL_API_TOKEN="your_api_token"');
    console.log('$env:EXOTEL_SID="your_sid"');
    return;
  }
  
  const testData = {
    to: "+917651985130",
    message: "hello from exotel",
    from: "+912248932924",
    shortenUrl: true
  };
  
  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n🔑 Using credentials:');
  console.log(`API Key: ${exotelApiKey.substring(0, 10)}...`);
  console.log(`SID: ${exotelSid}`);
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const response = await axios.post(
      `https://api.exotel.com/v1/Accounts/${exotelSid}/Sms/send.json`,
      {
        To: testData.to,
        From: testData.from,
        Body: testData.message,
        ShortenUrl: testData.shortenUrl
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${exotelApiKey}:${exotelApiToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    console.log('✅ SMS sent successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ SMS send failed!');
    console.log('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 401 Unauthorized - Check your credentials');
    } else if (error.response?.status === 400) {
      console.log('\n💡 400 Bad Request - Check phone number format or message content');
    }
  }
}

// Test the backend API endpoint
async function testBackendApi() {
  console.log('\n🌐 Testing Backend API Endpoint\n');
  
  try {
    // First check if server is running
    const healthCheck = await axios.get('http://localhost:4000/health');
    console.log('✅ Backend server is running');
    
    // Test SMS connection endpoint
    const connectionTest = await axios.get('http://localhost:4000/test/sms-connection');
    console.log('📡 SMS Connection Test:', connectionTest.data);
    
    // Test SMS send endpoint
    const smsData = {
      to: "+917651985130",
      message: "hello from exotel",
      from: "+912248932924",
      shortenUrl: true
    };
    
    console.log('\n📱 Sending SMS via backend API...');
    const smsResponse = await axios.post('http://localhost:4000/test/send-sms', smsData);
    console.log('✅ SMS Response:', smsResponse.data);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend server is not running');
      console.log('💡 Start the server with: cd backend && npm run start:dev');
    } else {
      console.log('❌ Backend API test failed:', error.response?.data || error.message);
    }
  }
}

// Run both tests
async function runAllTests() {
  await testSmsWithCredentials();
  await testBackendApi();
}

runAllTests();
