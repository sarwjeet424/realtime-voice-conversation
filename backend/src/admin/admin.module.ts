import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { VoiceRtcModule } from '../voice-rtc/voice-rtc.module';
import { TokenService } from '../auth/token.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@Module({
  imports: [VoiceRtcModule, JwtModule.register({})],
  controllers: [AdminController],
  providers: [TokenService, AdminAuthGuard],
})
export class AdminModule {}
