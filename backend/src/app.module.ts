import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceRtcModule } from './voice-rtc/voice-rtc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VoiceRtcModule,
  ],
})
export class AppModule {}
