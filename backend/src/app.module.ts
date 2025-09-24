import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceRtcModule } from './voice-rtc/voice-rtc.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';
import { AuthService } from './voice-rtc/services/auth.service';
import { SupabaseService } from './voice-rtc/services/supabase.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { TokenService } from './auth/token.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({}),
    VoiceRtcModule,
    AdminModule,
  ],
  controllers: [HealthController, AuthController],
  providers: [AuthService, SupabaseService, TokenService],
})
export class AppModule {}
