import { Module } from "@nestjs/common";
import { VoiceRtcGateway } from "./gateways/voice-rtc.gateway";
import { OpenAiService } from "./services/openai.service";
import { ElevenlabsService } from "./services/elevenlabs.service";
import { CacheService } from "./services/cache.service";
import { DatabaseService } from "./services/database.service";
import { AdvancedAiService } from "./services/advanced-ai.service";
import { EmotionAnalysisService } from "./services/emotion-analysis.service";
import { AudioProcessorService } from "./services/audio-processor.service";

@Module({
  providers: [
    VoiceRtcGateway, 
    OpenAiService, 
    ElevenlabsService, 
    CacheService, 
    DatabaseService,
    AdvancedAiService,
    EmotionAnalysisService,
    AudioProcessorService
  ],
})
export class VoiceRtcModule {}
