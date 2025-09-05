// src/voice-rtc/services/openai.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

interface ChatMessage {
  role: "system" | "user" | "assistant"; // <-- Use literal types
  content: string;
}

interface IncompleteResponse {
  content: string;
  timestamp: number;
}

@Injectable()
export class OpenAiService {
  private openai: OpenAI;
  private readonly logger = new Logger("OpenAiService");
  private incompleteResponses = new Map<string, IncompleteResponse>();

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    this.openai = new OpenAI({ apiKey });
  }

  async generateChatResponse(
    userMessage: string,
    history: ChatMessage[] = [],
    sessionId?: string
  ): Promise<string> {
    this.logger.log(
      `📡 Sending chat completion with ${history.length + 1} messages`
    );

    // Check if there's an incomplete response to continue
    let continuationPrompt = "";
    if (sessionId && this.incompleteResponses.has(sessionId)) {
      const incomplete = this.incompleteResponses.get(sessionId)!;
      continuationPrompt = `Continue from where you left off: "${incomplete.content}"`;
      this.logger.log(`🔄 Continuing incomplete response for session ${sessionId}`);
    }

    const messages: ChatMessage[] = [
      {
        role: "system" as const,
        content: "You are a helpful voice assistant. Always complete your thoughts and provide complete answers. If you were cut off in a previous response, continue from where you left off.",
      },
      ...history,
      { role: "user" as const, content: continuationPrompt + userMessage },
    ];

    const start = Date.now();

    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages:
        messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.7,
      max_tokens: 150, // Increased to allow for longer responses
    });

    const duration = Date.now() - start;
    const reply =
      completion.choices[0]?.message?.content?.trim() || "No response";

    // Check if response is incomplete
    const isIncomplete = this.isResponseIncomplete(reply);
    
    if (isIncomplete && sessionId) {
      this.logger.log(`⚠️ Response appears incomplete, storing for continuation: "${reply}"`);
      this.incompleteResponses.set(sessionId, {
        content: reply,
        timestamp: Date.now()
      });
    } else if (sessionId) {
      // Response is complete, clear any stored incomplete response
      this.incompleteResponses.delete(sessionId);
      this.logger.log(`✅ Response complete, cleared incomplete response for session ${sessionId}`);
    }

    this.logger.log(`✅ Chat response (${duration}ms): "${reply}"`);
    return reply;
  }

  private isResponseIncomplete(response: string): boolean {
    if (!response || response.length === 0) return true;
    
    // Check if response ends with proper punctuation
    const endsWithPunctuation = /[.!?]$/.test(response.trim());
    
    // Check if response seems cut off (common patterns)
    const cutOffPatterns = [
      /,\s*$/,  // Ends with comma
      /and\s+$/,  // Ends with "and"
      /but\s+$/,  // Ends with "but"
      /so\s+$/,   // Ends with "so"
      /because\s+$/,  // Ends with "because"
      /however\s+$/,  // Ends with "however"
      /therefore\s+$/,  // Ends with "therefore"
      /in\s+addition\s+$/,  // Ends with "in addition"
      /for\s+example\s+$/,  // Ends with "for example"
      /first\s+$/,  // Ends with "first"
      /second\s+$/,  // Ends with "second"
      /finally\s+$/,  // Ends with "finally"
    ];
    
    const hasCutOffPattern = cutOffPatterns.some(pattern => pattern.test(response.trim()));
    
    // Check if response is too short for a complete thought (less than 20 characters)
    const isTooShort = response.trim().length < 20;
    
    // Check if response doesn't end with proper punctuation and has cut-off patterns
    const isIncomplete = (!endsWithPunctuation && hasCutOffPattern) || isTooShort;
    
    this.logger.log(`🔍 Response analysis: "${response}" - Incomplete: ${isIncomplete}`);
    return isIncomplete;
  }

  // Clean up old incomplete responses (older than 5 minutes)
  cleanupOldIncompleteResponses(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    for (const [sessionId, incomplete] of this.incompleteResponses.entries()) {
      if (incomplete.timestamp < fiveMinutesAgo) {
        this.incompleteResponses.delete(sessionId);
        this.logger.log(`🧹 Cleaned up old incomplete response for session ${sessionId}`);
      }
    }
  }

  // Get incomplete response for a session (for debugging)
  getIncompleteResponse(sessionId: string): IncompleteResponse | undefined {
    return this.incompleteResponses.get(sessionId);
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    this.logger.log(
      `🎤 Starting audio transcription, buffer size: ${audioBuffer.length} bytes`
    );

    try {
      const uint8Array = new Uint8Array(audioBuffer);
      const file = new File([uint8Array], "audio.wav", { type: "audio/wav" });

      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        response_format: "json",
        language: "en",
      });

      const transcript = response.text?.trim() || "";
      this.logger.log(`📝 Transcription result: "${transcript}"`);

      return transcript;
    } catch (error) {
      this.logger.error(
        "💥 OpenAI Whisper transcription error:",
        error.message
      );
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }
}
