import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Logger, Req } from '@nestjs/common';
import { AuthService } from '../voice-rtc/services/auth.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { TokenService } from '../auth/token.service';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger('AdminController');

  constructor(private authService: AuthService, private tokens: TokenService) {}

  // Admin login moved to AuthController

  // User Credentials Management
  @UseGuards(AdminAuthGuard)
  @Get('credentials')
  async getAllCredentials() {
    try {
      const credentials = await this.authService.getAllCredentials();
      return {
        success: true,
        data: credentials
      };
    } catch (error) {
      this.logger.error('Error getting credentials:', error);
      return {
        success: false,
        message: 'Failed to get credentials'
      };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Post('credentials')
  async createCredentials(@Body() credentials: any) {
    try {
      const success = await this.authService.createCredentials(credentials);
      if (success) {
        this.logger.log(`Credentials created for ${credentials.email}`);
        return {
          success: true,
          message: 'Credentials created successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to create credentials'
        };
      }
    } catch (error) {
      this.logger.error('Error creating credentials:', error);
      return {
        success: false,
        message: 'Failed to create credentials'
      };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Put('credentials/:email')
  async updateCredentials(
    @Param('email') email: string,
    @Body() updates: any
  ) {
    try {
      const success = await this.authService.updateCredentials(email, updates);
      if (success) {
        this.logger.log(`Credentials updated for ${email}`);
        return {
          success: true,
          message: 'Credentials updated successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to update credentials'
        };
      }
    } catch (error) {
      this.logger.error('Error updating credentials:', error);
      return {
        success: false,
        message: 'Failed to update credentials'
      };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Delete('credentials/:email')
  async deleteCredentials(@Param('email') email: string) {
    try {
      const success = await this.authService.deleteCredentials(email);
      if (success) {
        this.logger.log(`Credentials deleted for ${email}`);
        return {
          success: true,
          message: 'Credentials deleted successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to delete credentials'
        };
      }
    } catch (error) {
      this.logger.error('Error deleting credentials:', error);
      return {
        success: false,
        message: 'Failed to delete credentials'
      };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Post('credentials/:email/reset-sessions')
  async resetSessionsUsed(@Param('email') email: string) {
    try {
      const success = await this.authService.resetSessionsUsed(email);
      if (success) {
        this.logger.log(`Sessions reset for ${email}`);
        return {
          success: true,
          message: 'Sessions reset successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to reset sessions'
        };
      }
    } catch (error) {
      this.logger.error('Error resetting sessions:', error);
      return {
        success: false,
        message: 'Failed to reset sessions'
      };
    }
  }

  // Session Management
  @UseGuards(AdminAuthGuard)
  @Get('sessions')
  async getAllSessions() {
    try {
      const sessions = await this.authService.getAllSessions();
      return {
        success: true,
        data: sessions
      };
    } catch (error) {
      this.logger.error('Error getting sessions:', error);
      return {
        success: false,
        message: 'Failed to get sessions'
      };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Put('sessions/:email/status')
  async updateSessionStatus(
    @Param('email') email: string,
    @Body() body: { isActive: boolean }
  ) {
    try {
      const success = await this.authService.updateSessionStatus(email, body.isActive);
      if (success) {
        this.logger.log(`Session status updated for ${email}: ${body.isActive}`);
        return {
          success: true,
          message: 'Session status updated successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to update session status'
        };
      }
    } catch (error) {
      this.logger.error('Error updating session status:', error);
      return {
        success: false,
        message: 'Failed to update session status'
      };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Delete('sessions/:email')
  async deleteSession(@Param('email') email: string) {
    try {
      const success = await this.authService.deleteSession(email);
      if (success) {
        this.logger.log(`Session deleted for ${email}`);
        return {
          success: true,
          message: 'Session deleted successfully'
        };
      } else {
        return {
          success: false,
          message: 'Failed to delete session'
        };
      }
    } catch (error) {
      this.logger.error('Error deleting session:', error);
      return {
        success: false,
        message: 'Failed to delete session'
      };
    }
  }
}
