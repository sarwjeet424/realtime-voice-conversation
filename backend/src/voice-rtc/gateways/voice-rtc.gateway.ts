// src/voice-rtc/gateways/voice-rtc.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";
import { OpenAiService } from "../services/openai.service";
import { ElevenlabsService } from "../services/elevenlabs.service";
import { DidService } from "../services/did.service";

interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

interface SessionData {
  history: ChatHistoryEntry[];
  conversationType: 'audio' | 'video';
  streamSessionId?: string;
}

@Injectable()
@WebSocketGateway({ cors: { origin: "*" } })
export class VoiceRtcGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger("VoiceRtcGateway");

  // Map client.id -> session data
  private sessions = new Map<string, SessionData>();

  constructor(
    private openAi: OpenAiService,
    private tts: ElevenlabsService,
    private did: DidService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
    this.sessions.set(client.id, { 
      history: [], 
      conversationType: 'audio' // default to audio
    });
  }

  async handleDisconnect(client: Socket) {
    const sessionId = client.id;
    this.logger.log(`📴 Client disconnected: ${sessionId}`);
    
    // Clean up streaming session
    const session = this.sessions.get(sessionId);
    if (session && session.streamSessionId) {
      try {
        await this.did.destroyStreamSession(sessionId);
        this.logger.log(`🔒 Cleaned up streaming session for ${sessionId}`);
      } catch (error) {
        this.logger.error(`💥 Failed to cleanup streaming session: ${error.message}`);
      }
    }
    
    this.sessions.delete(sessionId); // clean up
    
    // Clean up any incomplete responses for this session
    this.openAi.cleanupOldIncompleteResponses();
  }

  @SubscribeMessage("set_conversation_type")
  async handleSetConversationType(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { type: 'audio' | 'video' }
  ) {
    const sessionId = client.id;
    const session = this.sessions.get(sessionId);
    
    this.logger.log(`🎯 Received set_conversation_type request: ${data.type} for ${sessionId}`);
    
    if (session) {
      const oldType = session.conversationType;
      session.conversationType = data.type;
      
      // If switching to video mode, create a streaming session
      if (data.type === 'video' && !session.streamSessionId) {
        try {
          this.logger.log(`🎬 Creating streaming session for ${sessionId}`);
          const streamSession = await this.did.setupStreamSession(sessionId);
          session.streamSessionId = streamSession.streamId;
          this.logger.log(`✅ Streaming session created: ${streamSession.streamId}`);
          
          // Send stream setup data to frontend
          client.emit("stream_setup", { 
            streamId: streamSession.streamId,
            sourceUrl: streamSession.sourceUrl 
          });
        } catch (error) {
          this.logger.error(`💥 Failed to create streaming session: ${error.message}`);
          client.emit("stream_error", { message: "Failed to create video stream" });
        }
      }
      
      // If switching to audio mode, cleanup streaming session
      if (data.type === 'audio' && session.streamSessionId) {
        try {
          await this.did.destroyStreamSession(sessionId);
          session.streamSessionId = undefined;
          this.logger.log(`🔒 Closed streaming session for ${sessionId}`);
        } catch (error) {
          this.logger.error(`💥 Failed to close streaming session: ${error.message}`);
        }
      }
      
      this.sessions.set(sessionId, session);
      this.logger.log(`✅ Conversation type changed from ${oldType} to ${data.type} for ${sessionId}`);
      client.emit("conversation_type_set", { type: data.type });
    } else {
      this.logger.error(`❌ Session not found for ${sessionId}`);
      client.emit("error", { message: "Session not found" });
    }
  }

  @SubscribeMessage("stream_connection_status")
  async handleStreamConnectionStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      connectionStatus: 'connected' | 'failed' | 'closed' | 'completed';
      streamId: string;
      sessionId: string;
    }
  ) {
    const sessionId = client.id;
    const session = this.sessions.get(sessionId);
    
    this.logger.log(`🎬 Stream connection status: ${data.connectionStatus} for ${sessionId}`);
    
    if (session && data.connectionStatus === 'connected' || data.connectionStatus === 'completed') {
      // Update the stream session with session ID and mark as active
      this.did.updateStreamSession(sessionId, data.sessionId, true);
      this.logger.log(`✅ WebRTC connection established for ${sessionId}`);
      client.emit("stream_ready", { 
        streamId: data.streamId,
        sessionId: data.sessionId 
      });
    } else if (data.connectionStatus === 'failed' || data.connectionStatus === 'closed') {
      this.logger.error(`❌ WebRTC connection failed for ${sessionId}`);
      client.emit("stream_error", { message: "WebRTC connection failed" });
    }
  }

  @SubscribeMessage("text_message")
  async handleTextMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string }
  ) {
    const sessionId = client.id;
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      client.emit("error", { message: "Session not found" });
      return;
    }

    const { history, conversationType } = session;

    this.logger.log(`📝 Received: "${data.text}" from ${sessionId} (${conversationType} mode)`);

    try {
      // 1. Generate AI response with history and session ID
      const aiResponse = await this.openAi.generateChatResponse(
        data.text,
        history,
        sessionId
      );

      // 2. Append user + assistant to history
      history.push({ role: "user", content: data.text });
      history.push({ role: "assistant", content: aiResponse });
      session.history = history;
      this.sessions.set(sessionId, session);

      // 3. Send text response
      client.emit("ai_response", { text: aiResponse });

      // 4. Handle response based on conversation type
      if (conversationType === 'audio') {
        // Generate and send TTS
        const audioBuffer = await this.tts.textToSpeech(aiResponse);
        client.emit("ai_audio", { audio: audioBuffer.toString("base64") });
      } else if (conversationType === 'video') {
        // Send text to streaming session
        this.logger.log(`🎬 Sending text to stream: "${aiResponse}"`);
        
        if (session.streamSessionId) {
          try {
            await this.did.sendTextToStream(sessionId, aiResponse);
            this.logger.log(`✅ Text sent to stream successfully`);
            // The video will be streamed directly to the frontend via WebRTC
          } catch (streamError) {
            this.logger.error(`💥 Stream text failed: ${streamError.message}`);
            // Fallback to audio if stream fails
            this.logger.log(`🔄 Falling back to audio mode...`);
            const audioBuffer = await this.tts.textToSpeech(aiResponse);
            client.emit("ai_audio", { audio: audioBuffer.toString("base64") });
            client.emit("stream_fallback", { message: "Video stream failed, using audio instead" });
          }
        } else {
          this.logger.error(`❌ No active stream for session ${sessionId}`);
          // Fallback to audio
          const audioBuffer = await this.tts.textToSpeech(aiResponse);
          client.emit("ai_audio", { audio: audioBuffer.toString("base64") });
          client.emit("stream_fallback", { message: "No video stream available, using audio instead" });
        }
      } else {
        this.logger.warn(`⚠️ Unknown conversation type: ${conversationType}`);
      }

      this.logger.log(`✅ Completed exchange for ${sessionId}`);
    } catch (err) {
      this.logger.error(`💥 Error for ${sessionId}: ${err.message}`);
      client.emit("error", { message: err.message });
    }
  }
}
