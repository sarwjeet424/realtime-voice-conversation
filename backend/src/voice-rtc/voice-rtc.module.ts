import { Module } from "@nestjs/common";
import { VoiceRtcGateway } from "./gateways/voice-rtc.gateway";
import { OpenAiService } from "./services/openai.service";
import { ElevenlabsService } from "./services/elevenlabs.service";
import { AuthService } from "./services/auth.service";
import { SupabaseService } from "./services/supabase.service";

@Module({
  providers: [VoiceRtcGateway, OpenAiService, ElevenlabsService, AuthService, SupabaseService],
  exports: [AuthService, SupabaseService],
})
export class VoiceRtcModule {}
