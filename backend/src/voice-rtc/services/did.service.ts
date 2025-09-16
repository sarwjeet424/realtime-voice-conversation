import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as WebSocket from 'ws';

interface DIDStreamRequest {
  source_url?: string;
  presenter_id?: string;
  config: {
    fluent: boolean;
    pad_audio: number;
  };
}

interface DIDStreamResponse {
  id: string;
  object: string;
  created_at: number;
  status: 'created' | 'started' | 'done' | 'error';
  stream_url?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface StreamSession {
  botId: string;
  streamId: string;
  sessionId: string;
  sourceUrl: string;
  isActive: boolean;
  created_at: number;
}

@Injectable()
export class DidService {
  private readonly logger = new Logger('DidService');
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.d-id.com';
  
  // Session management for streaming
  private streamSessions = new Map<string, StreamSession>();
  private videoStreamWebsockets = new Map<string, WebSocket>();
  
  // Default presenter IDs
  private readonly defaultPresenterId = 'v2_public_Alyssa_NoHands_BlackShirt_Home@Mvn6Nalx90';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DID_API_KEY');
    if (!this.apiKey) {
      this.logger.error('❌ DID_API_KEY not found in environment variables');
      this.logger.error('Please set DID_API_KEY in your .env file');
    } else {
      this.logger.log(`✅ D-ID API key loaded: ${this.apiKey.substring(0, 10)}...`);
    }
  }

  async createStream(
    presenterId: string = this.defaultPresenterId
  ): Promise<DIDStreamResponse> {
    this.logger.log(`🎬 Creating D-ID streaming session`);
    this.logger.log(`👤 Using presenter: ${presenterId}`);

    try {
      const requestData: DIDStreamRequest = {
        presenter_id: presenterId,
        config: {
          fluent: true,
          pad_audio: 0.0,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/talks/streams`,
        requestData,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`✅ D-ID stream created with ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('💥 D-ID stream creation error:', error.response?.data || error.message);
      throw new Error(`Failed to create D-ID stream: ${error.response?.data?.message || error.message}`);
    }
  }

  async setupStreamSession(
    botId: string,
    presenterId: string = this.defaultPresenterId
  ): Promise<StreamSession> {
    this.logger.log(`🎬 Setting up streaming session for bot: ${botId}`);
    
    try {
      const streamResponse = await this.createStream(presenterId);
      
      const session: StreamSession = {
        botId,
        streamId: streamResponse.id,
        sessionId: '', // Will be set when WebRTC connection is established
        sourceUrl: presenterId,
        isActive: false,
        created_at: Date.now(),
      };
      
      this.streamSessions.set(botId, session);
      this.logger.log(`✅ Streaming session created: ${session.streamId}`);
      return session;
    } catch (error) {
      this.logger.error('💥 Failed to create streaming session:', error.message);
      throw error;
    }
  }

  async sendTextToStream(botId: string, text: string): Promise<void> {
    const session = this.streamSessions.get(botId);
    if (!session || !session.isActive) {
      throw new Error(`Stream session ${botId} not found or inactive`);
    }

    this.logger.log(`📝 Sending text to stream ${botId}: "${text}"`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/talks/streams/${session.streamId}`,
        {
          text: text,
          voice: {
            provider: 'microsoft',
            voice_id: 'en-US-AriaNeural',
          },
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`✅ Text sent to stream successfully`);
    } catch (error) {
      this.logger.error('💥 D-ID stream text error:', error.response?.data || error.message);
      throw new Error(`Failed to send text to stream: ${error.response?.data?.message || error.message}`);
    }
  }

  async sendAudioToStream(botId: string, audio: Buffer): Promise<void> {
    const session = this.streamSessions.get(botId);
    if (!session || !session.isActive) {
      throw new Error(`Stream session ${botId} not found or inactive`);
    }

    this.logger.log(`🎵 Sending audio to stream ${botId}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/talks/streams/${session.streamId}`,
        {
          audio: audio.toString('base64'),
        },
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`✅ Audio sent to stream successfully`);
    } catch (error) {
      this.logger.error('💥 D-ID stream audio error:', error.response?.data || error.message);
      throw new Error(`Failed to send audio to stream: ${error.response?.data?.message || error.message}`);
    }
  }

  updateStreamSession(botId: string, sessionId: string, isActive: boolean = true): void {
    const session = this.streamSessions.get(botId);
    if (session) {
      session.sessionId = sessionId;
      session.isActive = isActive;
      this.streamSessions.set(botId, session);
      this.logger.log(`✅ Stream session updated: ${botId} - Active: ${isActive}`);
    }
  }

  getStreamSession(botId: string): StreamSession | undefined {
    return this.streamSessions.get(botId);
  }

  async destroyStreamSession(botId: string): Promise<void> {
    const session = this.streamSessions.get(botId);
    if (session) {
      try {
        await axios.delete(
          `${this.baseUrl}/talks/streams/${session.streamId}`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
            data: { session_id: session.sessionId },
          }
        );
        this.logger.log(`✅ Stream session destroyed: ${botId}`);
      } catch (error) {
        this.logger.error(`💥 Failed to destroy stream session: ${error.message}`);
      }
    }
    
    this.streamSessions.delete(botId);
    this.videoStreamWebsockets.delete(botId);
  }

  cleanup(botId: string): void {
    this.streamSessions.delete(botId);
    this.videoStreamWebsockets.delete(botId);
    this.logger.log(`🧹 Cleaned up session: ${botId}`);
  }

  // Test method to verify API key works
  async testConnection(): Promise<boolean> {
    this.logger.log('🧪 Testing D-ID API connection...');

    try {
      const response = await axios.get(
        `${this.baseUrl}/talks/streams`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
          },
        }
      );
      
      this.logger.log('✅ D-ID connection test successful');
      return true;
    } catch (error) {
      this.logger.error('❌ D-ID connection test failed:', error.response?.data || error.message);
      return false;
    }
  }
}
