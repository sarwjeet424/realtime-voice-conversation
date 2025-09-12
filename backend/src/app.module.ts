import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceRtcModule } from './voice-rtc/voice-rtc.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VoiceRtcModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
