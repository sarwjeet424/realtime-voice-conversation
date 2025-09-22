import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { AuthService, UserCredentials, UserSession } from '../voice-rtc/services/auth.service';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger('AdminController');

  constructor(private authService: AuthService) {}

  // Admin authentication
  @Post('login')
  async adminLogin(@Body() credentials: { email: string; password: string }) {
    try {
      const result = await this.authService.validateCredentials(credentials.email, credentials.password);
      
      if (result.valid && result.isAdmin) {
        this.logger.log(`Admin login successful: ${credentials.email}`);
        return {
          success: true,
          message: 'Admin login successful',
          isAdmin: true
        };
      } else {
        this.logger.log(`Admin login failed: ${credentials.email} - ${result.reason}`);
        return {
          success: false,
          message: result.reason || 'Invalid admin credentials'
        };
      }
    } catch (error) {
      this.logger.error('Admin login error:', error);
      return {
        success: false,
        message: 'Admin login failed'
      };
    }
  }

  // User Credentials Management
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

  @Post('credentials')
  async createCredentials(@Body() credentials: Omit<UserCredentials, 'id' | 'createdAt' | 'updatedAt'>) {
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

  @Put('credentials/:email')
  async updateCredentials(
    @Param('email') email: string,
    @Body() updates: Partial<UserCredentials>
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
