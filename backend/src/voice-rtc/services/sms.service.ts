import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger('SmsService');
  private readonly exotelApiKey: string;
  private readonly exotelApiToken: string;
  private readonly exotelSid: string;
  private readonly baseUrl = 'https://api.exotel.com/v1/Accounts';

  constructor(private configService: ConfigService) {
    this.exotelApiKey = this.configService.get<string>('EXOTEL_API_KEY');
    this.exotelApiToken = this.configService.get<string>('EXOTEL_API_TOKEN');
    this.exotelSid = this.configService.get<string>('EXOTEL_SID');
    
    this.logger.log(
      `🔑 Initializing Exotel SMS with API Key: ${this.exotelApiKey ? this.exotelApiKey.substring(0, 10) + "..." : "NOT SET"}`
    );
  }

  async sendSms(to: string, message: string, from: string, shortenUrl: boolean = true): Promise<any> {
    this.logger.log(`📱 Sending SMS to ${to} from ${from}: "${message}"`);

    if (!this.exotelApiKey || !this.exotelApiToken || !this.exotelSid) {
      throw new Error('Exotel credentials not configured. Please set EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_SID');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.exotelSid}/Sms/send.json`,
        {
          To: to,
          From: from,
          Body: message,
          ShortenUrl: shortenUrl
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.exotelApiKey}:${this.exotelApiToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.logger.log(`✅ SMS sent successfully: ${JSON.stringify(response.data)}`);
      return {
        success: true,
        data: response.data,
        message: 'SMS sent successfully'
      };
    } catch (error) {
      this.logger.error('💥 Exotel SMS error:', error.response?.data || error.message);
      throw new Error(`Failed to send SMS: ${error.response?.data?.message || error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test connection by making a simple API call
      const response = await axios.get(
        `${this.baseUrl}/${this.exotelSid}.json`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.exotelApiKey}:${this.exotelApiToken}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      this.logger.log(`✅ Exotel connection test successful`);
      return true;
    } catch (error) {
      this.logger.error('💥 Exotel connection test failed:', error.response?.data || error.message);
      return false;
    }
  }
}


