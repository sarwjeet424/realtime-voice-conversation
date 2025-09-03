import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ElevenLabsClient } from "elevenlabs";

@Injectable()
export class ElevenlabsService {
  private elevenlabs: ElevenLabsClient;
  private readonly logger = new Logger("ElevenlabsService");

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("ELEVENLABS_API_KEY");
    this.logger.log(
      `🔑 Initializing ElevenLabs with API key: ${apiKey ? apiKey.substring(0, 10) + "..." : "NOT SET"}`
    );

    this.elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    });

    this.logger.log("✅ ElevenLabs service initialized successfully");
  }

  async textToSpeech(text: string): Promise<Buffer> {
    this.logger.log(
      `🔊 Starting text-to-speech for text: "${text}" (${text.length} characters)`
    );

    try {
      const voiceId = "OYTbf65OHHFELVut7v2H"; // Adam voice
      const modelId = "eleven_flash_v2_5";

      this.logger.log(`🎯 Using voice: ${voiceId}, model: ${modelId}`);
      this.logger.log("📡 Sending TTS request to ElevenLabs...");

      const startTime = Date.now();

      const audioStream = await this.elevenlabs.textToSpeech.convert(voiceId, {
        text: text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
        output_format: "mp3_22050_32",
      });

      this.logger.log("📦 Collecting audio stream chunks...");
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        let chunkCount = 0;

        audioStream.on("data", (chunk) => {
          chunks.push(chunk);
          chunkCount++;

          if (chunkCount % 10 === 0) {
            this.logger.debug(
              `📊 Received ${chunkCount} chunks, total size: ${Buffer.concat(chunks).length} bytes`
            );
          }
        });

        audioStream.on("end", () => {
          const duration = Date.now() - startTime;
          const finalBuffer = Buffer.concat(chunks);

          this.logger.log(`✅ ElevenLabs TTS completed in ${duration}ms`);
          this.logger.log(
            `📊 Final audio: ${chunkCount} chunks, ${finalBuffer.length} bytes total`
          );

          resolve(finalBuffer);
        });

        audioStream.on("error", (error) => {
          this.logger.error("💥 ElevenLabs stream error:", error.message);
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error("💥 ElevenLabs TTS error:", error.message);
      this.logger.error("📊 Error details:", {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
      });

      if (error.response) {
        this.logger.error("🔍 API Response error:", error.response.data);
      }

      throw new Error(`Failed to generate speech: ${error.message}`);
    }
  }

  async getVoices() {
    this.logger.log("🎭 Fetching available voices from ElevenLabs...");

    try {
      const startTime = Date.now();
      const voices = await this.elevenlabs.voices.getAll();
      const duration = Date.now() - startTime;

      this.logger.log(
        `✅ Retrieved ${voices.voices.length} voices in ${duration}ms`
      );

      // Log voice details
      voices.voices.forEach((voice, index) => {
        this.logger.log(
          `🎤 Voice ${index + 1}: ${voice.name} (${voice.voice_id}) - ${voice.category}`
        );
      });

      return voices.voices;
    } catch (error) {
      this.logger.error("💥 ElevenLabs voices error:", error.message);
      this.logger.error("📊 Error details:", {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
      });

      throw new Error(`Failed to fetch voices: ${error.message}`);
    }
  }

  // Test method to verify API key works
  async testConnection(): Promise<boolean> {
    this.logger.log("🧪 Testing ElevenLabs API connection...");

    try {
      const voices = await this.elevenlabs.voices.getAll();
      this.logger.log(
        `✅ ElevenLabs connection test successful, found ${voices.voices.length} voices`
      );
      return true;
    } catch (error) {
      this.logger.error("❌ ElevenLabs connection test failed:", error.message);
      return false;
    }
  }
}
