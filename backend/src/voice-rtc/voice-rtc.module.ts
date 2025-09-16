import { Module } from "@nestjs/common";
import { VoiceRtcGateway } from "./gateways/voice-rtc.gateway";
import { OpenAiService } from "./services/openai.service";
import { ElevenlabsService } from "./services/elevenlabs.service";
import { DidService } from "./services/did.service";
import { SmsService } from "./services/sms.service";
import { TestController } from "./controllers/test.controller";

@Module({
  providers: [VoiceRtcGateway, OpenAiService, ElevenlabsService, DidService, SmsService],
  controllers: [TestController],
})
export class VoiceRtcModule {}
