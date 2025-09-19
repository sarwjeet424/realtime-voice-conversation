import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { AuthService, MonthlyUsage, UserCredentials } from './voice-rtc/services/auth.service';

@Controller()
export class HealthController {
  constructor(private authService: AuthService) {}
  
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'WebRTC Voice Chat Server is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  getHealthCheck() {
    return {
      status: 'healthy',
      service: 'WebRTC Voice Chat Backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('sessions')
  async getActiveSessions() {
    return {
      activeSessions: await this.authService.getAllCredentials(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test-session')
  async createTestSession() {
    const testEmail = "test1@example.com";
    const testPassword = "password123";
    
    // First validate credentials
    const credentialCheck = await this.authService.validateCredentials(testEmail, testPassword);
    if (!credentialCheck.valid) {
      return {
        error: "Test credentials not found. Please add test credentials first.",
        message: "Use POST /credentials to add test credentials",
        timestamp: new Date().toISOString(),
      };
    }
    
    const sessionResult = await this.authService.createSession(testEmail);
    
    return {
      testEmail,
      sessionId: sessionResult.sessionId,
      expiresAt: sessionResult.expiresAt,
      timeRemaining: sessionResult.expiresAt - Date.now(),
      success: sessionResult.success,
      message: sessionResult.success ? 'Test session created' : sessionResult.reason,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin-status')
  getAdminStatus() {
    return {
      adminEmail: "sarwjeetfreelancer@gmail.com",
      restrictions: "No restrictions - unlimited usage",
      timestamp: new Date().toISOString(),
    };
  }

  // Credential Management Endpoints
  @Get('credentials')
  async getAllCredentials() {
    return {
      credentials: await this.authService.getAllCredentials(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('credentials')
  async createCredentials(@Body() credentials: Omit<UserCredentials, 'id' | 'createdAt' | 'updatedAt'>) {
    const success = await this.authService.createCredentials(credentials);
    return {
      success,
      message: success ? 'Credentials created successfully' : 'Failed to create credentials',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('credentials/:email')
  async updateCredentials(
    @Param('email') email: string,
    @Body() updates: Partial<UserCredentials>
  ) {
    const success = await this.authService.updateCredentials(email, updates);
    return {
      success,
      message: success ? 'Credentials updated successfully' : 'Failed to update credentials',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('credentials/:email')
  async deleteCredentials(@Param('email') email: string) {
    const success = await this.authService.deleteCredentials(email);
    return {
      success,
      message: success ? 'Credentials deleted successfully' : 'Failed to delete credentials',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('credentials/:email/reset-sessions')
  async resetSessionsUsed(@Param('email') email: string) {
    const success = await this.authService.resetSessionsUsed(email);
    return {
      success,
      message: success ? 'Sessions reset successfully' : 'Failed to reset sessions',
      timestamp: new Date().toISOString(),
    };
  }
}