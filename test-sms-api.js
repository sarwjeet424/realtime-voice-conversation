const axios = require('axios');

async function testSmsApi() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing SMS API...\n');
  
  try {
    // Test 1: Check SMS connection
    console.log('1. Testing SMS connection...');
    const connectionResponse = await axios.get(`${baseUrl}/test/sms-connection`);
    console.log('Connection test result:', connectionResponse.data);
    console.log('');
    
    // Test 2: Send SMS with provided data
    console.log('2. Sending SMS with provided data...');
    const smsData = {
      "to": "+917651985130",
      "message": "hello from exotel",
      "from": "+912248932924",
      "shortenUrl": true
    };
    
    console.log('SMS data:', smsData);
    const smsResponse = await axios.post(`${baseUrl}/test/send-sms`, smsData);
    console.log('SMS send result:', smsResponse.data);
    
  } catch (error) {
    console.error('❌ Error testing SMS API:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 3000');
    }
  }
}

// Wait a bit for server to start, then test
setTimeout(() => {
  testSmsApi();
}, 3000);


