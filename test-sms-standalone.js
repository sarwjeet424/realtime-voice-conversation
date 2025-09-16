const axios = require('axios');

// Mock SMS service for testing
class MockSmsService {
  constructor() {
    this.exotelApiKey = process.env.EXOTEL_API_KEY || 'test_api_key';
    this.exotelApiToken = process.env.EXOTEL_API_TOKEN || 'test_api_token';
    this.exotelSid = process.env.EXOTEL_SID || 'test_sid';
    this.baseUrl = 'https://api.exotel.com/v1/Accounts';
  }

  async sendSms(to, message, from, shortenUrl = true) {
    console.log(`📱 Sending SMS to ${to} from ${from}: "${message}"`);
    console.log(`🔑 Using API Key: ${this.exotelApiKey.substring(0, 10)}...`);
    console.log(`🔑 Using SID: ${this.exotelSid}`);
    
    // Simulate the API call structure
    const requestData = {
      To: to,
      From: from,
      Body: message,
      ShortenUrl: shortenUrl
    };
    
    const authHeader = `Basic ${Buffer.from(`${this.exotelApiKey}:${this.exotelApiToken}`).toString('base64')}`;
    
    console.log('\n📋 Request Details:');
    console.log(`URL: ${this.baseUrl}/${this.exotelSid}/Sms/send.json`);
    console.log(`Method: POST`);
    console.log(`Headers: Authorization: ${authHeader.substring(0, 20)}...`);
    console.log(`Body:`, requestData);
    
    try {
      // This would be the actual API call
      const response = await axios.post(
        `${this.baseUrl}/${this.exotelSid}/Sms/send.json`,
        requestData,
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      console.log('\n✅ SMS sent successfully!');
      console.log('Response:', response.data);
      return {
        success: true,
        data: response.data,
        message: 'SMS sent successfully'
      };
    } catch (error) {
      console.log('\n❌ SMS send failed!');
      console.log('Error:', error.response?.data || error.message);
      throw new Error(`Failed to send SMS: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function testSmsService() {
  console.log('🧪 Testing SMS Service Implementation\n');
  
  const smsService = new MockSmsService();
  
  const testData = {
    to: "+917651985130",
    message: "hello from exotel",
    from: "+912248932924",
    shortenUrl: true
  };
  
  console.log('📋 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const result = await smsService.sendSms(
      testData.to,
      testData.message,
      testData.from,
      testData.shortenUrl
    );
    
    console.log('\n🎉 Test completed successfully!');
    console.log('Result:', result);
    
  } catch (error) {
    console.log('\n💥 Test failed!');
    console.log('Error:', error.message);
    
    console.log('\n💡 To make this work:');
    console.log('1. Set environment variables:');
    console.log('   - EXOTEL_API_KEY=your_api_key');
    console.log('   - EXOTEL_API_TOKEN=your_api_token');
    console.log('   - EXOTEL_SID=your_sid');
    console.log('2. Make sure you have valid Exotel credentials');
    console.log('3. Ensure the phone numbers are valid');
  }
}

// Run the test
testSmsService();


