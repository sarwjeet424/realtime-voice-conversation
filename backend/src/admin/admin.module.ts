import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { VoiceRtcModule } from '../voice-rtc/voice-rtc.module';

@Module({
  imports: [VoiceRtcModule],
  controllers: [AdminController],
})
export class AdminModule {}
