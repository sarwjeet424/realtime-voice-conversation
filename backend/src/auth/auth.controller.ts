import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../voice-rtc/services/auth.service';
import { TokenService } from './token.service';

@Controller()
export class AuthController {
  constructor(private auth: AuthService, private tokens: TokenService) {}

  // User login -> long-lived access token, no refresh
  @Post('login')
  async userLogin(@Body() body: { email: string; password: string }) {
    const result = await this.auth.validateCredentials(body.email, body.password);
    if (result.valid && !result.isAdmin) {
      const accessToken = this.tokens.signUserToken(body.email);
      return { success: true, accessToken };
    }
    return { success: false, message: result.reason || 'Invalid credentials' };
  }

  // Admin login -> access + refresh
  @Post('admin/login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    const result = await this.auth.validateCredentials(body.email, body.password);
    if (result.valid && result.isAdmin) {
      const accessToken = this.tokens.signAdminAccessToken(body.email);
      const refreshToken = this.tokens.signAdminRefreshToken(body.email);
      return { success: true, isAdmin: true, accessToken, refreshToken };
    }
    return { success: false, message: result.reason || 'Invalid admin credentials' };
  }

  @Post('admin/refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    try {
      const payload = this.tokens.verifyRefreshToken(body.refreshToken);
      if (payload.role !== 'admin') {
        return { success: false, message: 'Invalid token role' };
      }
      const accessToken = this.tokens.signAdminAccessToken(payload.sub);
      const refreshToken = this.tokens.signAdminRefreshToken(payload.sub);
      return { success: true, accessToken, refreshToken };
    } catch (_e) {
      return { success: false, message: 'Invalid refresh token' };
    }
  }
}


