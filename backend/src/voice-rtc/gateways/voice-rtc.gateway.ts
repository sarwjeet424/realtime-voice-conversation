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
import { AuthService } from "../services/auth.service";

interface ChatHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

@Injectable()
@WebSocketGateway({ cors: { origin: "*" } })
export class VoiceRtcGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger("VoiceRtcGateway");

  // Map client.id -> conversation history
  private sessions = new Map<string, ChatHistoryEntry[]>();

  constructor(
    private openAi: OpenAiService,
    private tts: ElevenlabsService,
    private authService: AuthService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
    this.sessions.set(client.id, []); // initialize history
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`📴 Client disconnected: ${client.id}`);
    this.sessions.delete(client.id); // clean up
    
    // Clean up any incomplete responses for this session
    this.openAi.cleanupOldIncompleteResponses();
  }

  @SubscribeMessage("authenticate")
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { email: string; password: string }
  ) {
    this.logger.log(`🔐 Authentication request from ${client.id} for email: ${data.email}`);

    try {
      if (!data.email || !this.isValidEmail(data.email)) {
        client.emit("auth_error", { message: "Invalid email address" });
        return;
      }

      if (!data.password) {
        client.emit("auth_error", { message: "Password is required" });
        return;
      }

      // Validate credentials
      const credentialCheck = await this.authService.validateCredentials(data.email, data.password);
      if (!credentialCheck.valid) {
        client.emit("auth_error", { 
          message: credentialCheck.reason || "Invalid credentials"
        });
        this.logger.log(`❌ User ${data.email} authentication failed: ${credentialCheck.reason}`);
        return;
      }

      // Create session
      const sessionResult = await this.authService.createSession(data.email);
      if (!sessionResult.success) {
        client.emit("auth_error", { 
          message: sessionResult.reason || "Session creation failed"
        });
        this.logger.log(`❌ User ${data.email} session creation failed: ${sessionResult.reason}`);
        return;
      }
      
      // Store session ID in client data
      (client as any).sessionId = sessionResult.sessionId;
      (client as any).email = data.email;

      client.emit("auth_success", {
        sessionId: sessionResult.sessionId,
        expiresAt: sessionResult.expiresAt,
        timeRemaining: (sessionResult.expiresAt || 0) - Date.now()
      });

      this.logger.log(`✅ User ${data.email} authenticated with session ${sessionResult.sessionId}`);
    } catch (err) {
      this.logger.error(`💥 Auth error for ${client.id}: ${err.message}`);
      client.emit("auth_error", { message: err.message });
    }
  }

  @SubscribeMessage("text_message")
  async handleTextMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string }
  ) {
    const sessionId = (client as any).sessionId;
    const email = (client as any).email;

    // Check authentication
    if (!sessionId || !email) {
      client.emit("auth_error", { message: "Please authenticate first" });
      return;
    }

    // Validate session
    const sessionValidation = await this.authService.validateSession(email);
    this.logger.log(`🔍 Session validation for ${email}:`, sessionValidation);
    if (!sessionValidation.valid) {
      this.logger.log(`❌ Session validation failed for ${email}: ${sessionValidation.reason}`);
      client.emit("session_expired", { 
        message: sessionValidation.reason,
        timeRemaining: 0
      });
      return;
    }

    // Increment message count
    const messageResult = await this.authService.incrementMessageCount(email);
    this.logger.log(`🔍 Message count increment for ${email}:`, messageResult);
    if (!messageResult.success) {
      this.logger.log(`❌ Message count increment failed for ${email}: ${messageResult.reason}`);
      client.emit("session_expired", { 
        message: messageResult.reason || "Session expired or message limit exceeded",
        timeRemaining: 0
      });
      return;
    }

    const history = this.sessions.get(sessionId) || [];

    this.logger.log(`📝 Received: "${data.text}" from ${email} (${sessionValidation.timeRemaining}ms remaining)`);

    try {
      // 1. Generate AI response with history and session ID
      this.logger.log(`🤖 Generating AI response for: "${data.text}"`);
      const aiResponse = await this.openAi.generateChatResponse(
        data.text,
        history,
        sessionId
      );
      this.logger.log(`🤖 AI response generated: "${aiResponse}"`);

      // 2. Append user + assistant to history
      history.push({ role: "user", content: data.text });
      history.push({ role: "assistant", content: aiResponse });
      this.sessions.set(sessionId, history);

      // 3. Send text response with session info
      client.emit("ai_response", { 
        text: aiResponse,
        timeRemaining: sessionValidation.timeRemaining
      });

      // 4. Generate and send TTS
      const audioBuffer = await this.tts.textToSpeech(aiResponse);
      client.emit("ai_audio", { audio: audioBuffer.toString("base64") });

      this.logger.log(`✅ Completed exchange for ${email}`);
    } catch (err) {
      this.logger.error(`💥 Error for ${email}: ${err.message}`);
      client.emit("error", { message: err.message });
    }
  }

  @SubscribeMessage("get_session_info")
  async handleGetSessionInfo(@ConnectedSocket() client: Socket) {
    const sessionId = (client as any).sessionId;
    const email = (client as any).email;
    
    if (!sessionId || !email) {
      client.emit("session_info", { error: "No active session" });
      return;
    }

    const sessionInfo = await this.authService.getSessionInfo(email);
    if (sessionInfo) {
      client.emit("session_info", sessionInfo);
    } else {
      client.emit("session_info", { error: "Session not found" });
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
