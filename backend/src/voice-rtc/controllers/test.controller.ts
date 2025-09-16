import { Controller, Get, Post, Body } from '@nestjs/common';
import { DidService } from '../services/did.service';
import { SmsService } from '../services/sms.service';

@Controller('test')
export class TestController {
  constructor(
    private didService: DidService,
    private smsService: SmsService
  ) {}

  @Get('did-connection')
  async testDidConnection() {
    try {
      const result = await this.didService.testConnection();
      return { success: result, message: result ? 'D-ID connection successful' : 'D-ID connection failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('did-stream')
  async testDidStream(@Body() body: { text: string }) {
    try {
      console.log(`🧪 Testing D-ID stream creation`);
      const streamSession = await this.didService.setupStreamSession('test-bot');
      console.log(`✅ D-ID stream created successfully: ${streamSession.streamId}`);
      
      if (body.text) {
        // Note: This will fail because the stream isn't active yet
        // In real implementation, you'd wait for WebRTC connection first
        try {
          await this.didService.sendTextToStream('test-bot', body.text);
          console.log(`✅ Text sent to stream: "${body.text}"`);
        } catch (textError) {
          console.log(`⚠️ Text send failed (expected): ${textError.message}`);
        }
      }
      
      return { 
        success: true, 
        streamId: streamSession.streamId,
        sourceUrl: streamSession.sourceUrl 
      };
    } catch (error) {
      console.error(`❌ D-ID stream creation failed:`, error);
      return { success: false, message: error.message, error: error };
    }
  }

  @Get('session-info')
  async getSessionInfo() {
    // This would need access to the gateway sessions, but for now just return basic info
    return { 
      message: 'Session info endpoint - check backend logs for session details',
      timestamp: new Date().toISOString()
    };
  }

  @Get('sms-connection')
  async testSmsConnection() {
    try {
      const result = await this.smsService.testConnection();
      return { success: result, message: result ? 'Exotel SMS connection successful' : 'Exotel SMS connection failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('send-sms')
  async sendSms(@Body() body: { to: string; message: string; from: string; shortenUrl?: boolean }) {
    try {
      console.log(`🧪 Testing SMS send with data:`, body);
      const result = await this.smsService.sendSms(
        body.to,
        body.message,
        body.from,
        body.shortenUrl ?? true
      );
      console.log(`✅ SMS sent successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ SMS send failed:`, error);
      return { success: false, message: error.message, error: error };
    }
  }
}
