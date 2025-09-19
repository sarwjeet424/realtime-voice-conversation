import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceRtcModule } from './voice-rtc/voice-rtc.module';
import { HealthController } from './health.controller';
import { AuthService } from './voice-rtc/services/auth.service';
import { SupabaseService } from './voice-rtc/services/supabase.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VoiceRtcModule,
  ],
  controllers: [HealthController],
  providers: [AuthService, SupabaseService],
})
export class AppModule {}
