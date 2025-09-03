// src/voice-rtc/services/openai.service.ts

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

interface ChatMessage {
  role: "system" | "user" | "assistant"; // <-- Use literal types
  content: string;
}

@Injectable()
export class OpenAiService {
  private openai: OpenAI;
  private readonly logger = new Logger("OpenAiService");

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    this.openai = new OpenAI({ apiKey });
  }

  async generateChatResponse(
    userMessage: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    this.logger.log(
      `📡 Sending chat completion with ${history.length + 1} messages`
    );

    const messages: ChatMessage[] = [
      {
        role: "system" as const,
        content: "You are a helpful voice assistant.",
      },
      ...history,
      { role: "user" as const, content: userMessage },
    ];

    const start = Date.now();

    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages:
        messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[], // <-- Type assertion
      temperature: 0.7,
      max_tokens: 100,
    });

    const duration = Date.now() - start;
    const reply =
      completion.choices[0]?.message?.content?.trim() || "No response";

    this.logger.log(`✅ Chat response (${duration}ms): "${reply}"`);
    return reply;
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
