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
import { AdvancedAiService } from "../services/advanced-ai.service";
import { EmotionAnalysisService } from "../services/emotion-analysis.service";

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
    private advancedAi: AdvancedAiService,
    private emotionAnalysis: EmotionAnalysisService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
    this.sessions.set(client.id, []); // initialize history
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`📴 Client disconnected: ${client.id}`);
    this.sessions.delete(client.id); // clean up
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
      // 1. Generate AI response with history
      const aiResponse = await this.openAi.generateChatResponse(
        data.text,
        history
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

  @SubscribeMessage("streaming_chat")
  async handleStreamingChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string }
  ) {
    const sessionId = client.id;
    const history = this.sessions.get(sessionId) || [];

    this.logger.log(`📝 Received streaming request: "${data.text}" from ${sessionId}`);

    try {
      // Start streaming response
      client.emit("streaming_start", { messageId: Date.now().toString() });

      const stream = await this.openAi.generateStreamingResponse(data.text, history);
      
      let fullResponse = "";
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          client.emit("streaming_chunk", { 
            content,
            fullContent: fullResponse 
          });
        }
      }

      // Complete the streaming
      client.emit("streaming_complete", { 
        fullContent: fullResponse,
        messageId: Date.now().toString()
      });

      // Update history
      history.push({ role: "user", content: data.text });
      history.push({ role: "assistant", content: fullResponse });
      this.sessions.set(sessionId, history);

      // Generate and send TTS
      const audioBuffer = await this.tts.textToSpeech(fullResponse);
      client.emit("ai_audio", { audio: audioBuffer.toString("base64") });

      this.logger.log(`✅ Completed streaming exchange for ${sessionId}`);
    } catch (err) {
      this.logger.error(`💥 Streaming error for ${sessionId}: ${err.message}`);
      client.emit("streaming_error", { message: err.message });
    }
  }

  @SubscribeMessage("advanced_chat")
  async handleAdvancedChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; audioLevel?: number }
  ) {
    const sessionId = client.id;
    const history = this.sessions.get(sessionId) || [];

    this.logger.log(`🧠 Advanced chat request: "${data.text}" from ${sessionId}`);

    try {
      // 1. Analyze emotion from text
      const emotionAnalysis = await this.emotionAnalysis.analyzeTextEmotion(data.text);
      
      // 2. Create conversation context
      const context = {
        userId: sessionId,
        sessionId: sessionId,
        messageType: this.determineMessageType(data.text),
        userEmotion: emotionAnalysis.emotion,
        conversationLength: history.length,
        timeOfDay: this.getTimeOfDay()
      };

      // 3. Generate intelligent response
      const aiResponse = await this.advancedAi.generateIntelligentResponse(
        data.text,
        context,
        history
      );

      // 4. Update history
      history.push({ role: "user", content: data.text });
      history.push({ role: "assistant", content: aiResponse.response });
      this.sessions.set(sessionId, history);

      // 5. Send response with metadata
      client.emit("advanced_response", {
        text: aiResponse.response,
        emotion: emotionAnalysis,
        model: aiResponse.model,
        confidence: aiResponse.confidence,
        metadata: aiResponse.metadata
      });

      // 6. Generate TTS with emotion-aware voice
      const audioBuffer = await this.tts.textToSpeech(aiResponse.response);
      client.emit("ai_audio", { 
        audio: audioBuffer.toString("base64"),
        emotion: emotionAnalysis.emotion
      });

      this.logger.log(`✅ Advanced exchange completed for ${sessionId} using ${aiResponse.model}`);
    } catch (err) {
      this.logger.error(`💥 Advanced chat error for ${sessionId}: ${err.message}`);
      client.emit("error", { message: err.message });
    }
  }

  private determineMessageType(text: string): 'question' | 'creative' | 'code' | 'analysis' | 'casual' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('code') || lowerText.includes('function') || lowerText.includes('programming')) {
      return 'code';
    } else if (lowerText.includes('story') || lowerText.includes('creative') || lowerText.includes('imagine')) {
      return 'creative';
    } else if (lowerText.includes('analyze') || lowerText.includes('explain') || lowerText.includes('why')) {
      return 'analysis';
    } else if (lowerText.includes('?') || lowerText.includes('what') || lowerText.includes('how')) {
      return 'question';
    } else {
      return 'casual';
    }
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }
}
