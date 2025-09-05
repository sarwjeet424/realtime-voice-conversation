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
    private tts: ElevenlabsService
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

  @SubscribeMessage("text_message")
  async handleTextMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string }
  ) {
    const sessionId = client.id;
    const history = this.sessions.get(sessionId) || [];

    this.logger.log(`📝 Received: "${data.text}" from ${sessionId}`);

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
      this.sessions.set(sessionId, history);

      // 3. Send text response
      client.emit("ai_response", { text: aiResponse });

      // 4. Generate and send TTS
      const audioBuffer = await this.tts.textToSpeech(aiResponse);
      client.emit("ai_audio", { audio: audioBuffer.toString("base64") });

      this.logger.log(`✅ Completed exchange for ${sessionId}`);
    } catch (err) {
      this.logger.error(`💥 Error for ${sessionId}: ${err.message}`);
      client.emit("error", { message: err.message });
    }
  }
}
