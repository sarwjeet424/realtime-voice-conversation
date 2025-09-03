import { Module } from "@nestjs/common";
import { VoiceRtcGateway } from "./gateways/voice-rtc.gateway";
import { OpenAiService } from "./services/openai.service";
import { ElevenlabsService } from "./services/elevenlabs.service";

@Module({
  providers: [VoiceRtcGateway, OpenAiService, ElevenlabsService],
})
export class VoiceRtcModule {}
