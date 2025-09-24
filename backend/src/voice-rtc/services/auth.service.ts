import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "./supabase.service";

export interface UserSession {
  email: string;
  startTime: number;
  lastActivity: number;
  messageCount: number;
  isActive: boolean;
  conversationActive?: boolean;
  conversationStartTime?: number;
}

export interface UserCredentials {
  id?: number;
  email: string;
  password: string;
  isActive: boolean;
  sessionLimit: number;
  sessionsUsed: number;
  lastUsed?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlockedUser {
  email: string;
  blockedUntil: number;
  reason: string;
}

export interface MonthlyUsage {
  email: string;
  month: string; // Format: YYYY-MM
  sessionCount: number;
  totalMessages: number;
  lastUsed: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger("AuthService");
  private readonly SESSION_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly MAX_MESSAGES = 20; // Max messages per session
  private readonly ADMIN_EMAIL = "sarwjeetfreelancer@gmail.com"; // No restrictions for this email

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService
  ) {
    // Clean up expired sessions every minute
    setInterval(() => this.cleanupExpiredSessions(), 60000);
    this.logger.log("✅ AuthService initialized with credential-based authentication");
  }

  // Credential Management
  async validateCredentials(email: string, password: string): Promise<{ valid: boolean; reason?: string; isAdmin?: boolean }> {
    try {
      // Admin authentication
      if (email === this.ADMIN_EMAIL) {
        if (password === "P@ssw0rd") {
          return { valid: true, isAdmin: true };
        } else {
          return { valid: false, reason: "Invalid admin password" };
        }
      }

      const credentials = await this.supabaseService.getCredentials(email);
      if (!credentials) {
        return { valid: false, reason: "Invalid credentials" };
      }

      if (!credentials.isActive) {
        return { valid: false, reason: "Account is disabled" };
      }

      if (credentials.password !== password) {
        return { valid: false, reason: "Invalid password" };
      }

      if (credentials.sessionsUsed >= credentials.sessionLimit) {
        return { valid: false, reason: "Session limit reached. Please contact admin for new credentials." };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error("Error validating credentials:", error);
      return { valid: false, reason: "Authentication error" };
    }
  }

  async createSession(email: string): Promise<{ sessionId?: string; expiresAt?: number; success: boolean; reason?: string }> {
    try {
      // Admin bypass
      if (email === this.ADMIN_EMAIL) {
        const sessionId = `${email}_${Date.now()}_admin`;
        const startTime = Date.now();
        const expiresAt = startTime + this.SESSION_DURATION;

        await this.supabaseService.createSession({
          email,
          startTime,
          lastActivity: startTime,
          messageCount: 0,
          isActive: true,
        });

        this.logger.log(`Admin user ${email} created session with no restrictions`);
        return { sessionId, expiresAt, success: true };
      }

      // Validate credentials first
      const credentials = await this.supabaseService.getCredentials(email);
      if (!credentials || !credentials.isActive) {
        return { success: false, reason: "Invalid credentials" };
      }

      if (credentials.sessionsUsed >= credentials.sessionLimit) {
        return { success: false, reason: "Session limit reached. Please contact admin for new credentials." };
      }

      // Check if user already has an active session
      const existingSession = await this.supabaseService.getActiveSession(email);
      if (existingSession) {
        return { success: false, reason: "You already have an active session" };
      }

      // Create new session
      const sessionId = `${email}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();
      const expiresAt = startTime + this.SESSION_DURATION;

      await this.supabaseService.createSession({
        email,
        startTime,
        lastActivity: startTime,
        messageCount: 0,
        isActive: true,
      });

      this.logger.log(`Session created for ${email} - expires at ${new Date(expiresAt).toISOString()}`);
      return { sessionId, expiresAt, success: true };
    } catch (error) {
      this.logger.error("Error creating session:", error);
      return { success: false, reason: "Failed to create session" };
    }
  }

  async validateSession(email: string): Promise<{ valid: boolean; sessionId?: string; expiresAt?: number; timeRemaining?: number; reason?: string }> {
    try {
      const session = await this.supabaseService.getActiveSession(email);
      if (!session) {
        return { valid: false, reason: "No active session found" };
      }

      const now = Date.now();
      const timeRemaining = session.startTime + this.SESSION_DURATION - now;

      if (timeRemaining <= 0) {
        // Session expired
        await this.supabaseService.updateSession(email, { isActive: false });
        return { valid: false, reason: "Session expired" };
      }

      // Update last activity
      await this.supabaseService.updateSession(email, { lastActivity: now });

      const sessionId = `${email}_${session.startTime}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        valid: true,
        sessionId,
        expiresAt: session.startTime + this.SESSION_DURATION,
        timeRemaining,
      };
    } catch (error) {
      this.logger.error("Error validating session:", error);
      return { valid: false, reason: "Session validation error" };
    }
  }

  async incrementMessageCount(email: string): Promise<{ success: boolean; messageCount?: number; reason?: string }> {
    try {
      const session = await this.supabaseService.getActiveSession(email);
      if (!session) {
        return { success: false, reason: "No active session" };
      }

      if (session.messageCount >= this.MAX_MESSAGES) {
        return { success: false, reason: "Message limit reached" };
      }

      const newCount = session.messageCount + 1;
      await this.supabaseService.updateSession(email, { messageCount: newCount });

      return { success: true, messageCount: newCount };
    } catch (error) {
      this.logger.error("Error incrementing message count:", error);
      return { success: false, reason: "Failed to increment message count" };
    }
  }

  async startConversation(email: string): Promise<{ success: boolean; reason?: string; sessionId?: string; messageCount?: number; timeRemaining?: number }> {
    try {
      // Check if user has an active session
      const session = await this.supabaseService.getActiveSession(email);
      if (!session) {
        return { success: false, reason: "No active session found" };
      }

      // Check if conversation is already active
      if (session.conversationActive) {
        return { success: false, reason: "Conversation is already active" };
      }

      // Start conversation timer - set conversation start time
      const conversationStartTime = Date.now();
      await this.supabaseService.updateSession(email, { 
        conversationStartTime,
        conversationActive: true 
      });

      // Increment sessions used only when starting conversation
      await this.supabaseService.incrementSessionsUsed(email);

      return {
        success: true,
        sessionId: `${email}_${session.startTime}_${Math.random().toString(36).substr(2, 9)}`,
        messageCount: session.messageCount,
        timeRemaining: this.SESSION_DURATION, // Full 5 minutes when starting
      };
    } catch (error) {
      this.logger.error("Error starting conversation:", error);
      return { success: false, reason: "Failed to start conversation" };
    }
  }

  async stopConversation(email: string): Promise<{ success: boolean; reason?: string }> {
    try {
      // Check if user has an active session
      const session = await this.supabaseService.getActiveSession(email);
      if (!session) {
        return { success: false, reason: "No active session found" };
      }

      // Stop conversation timer
      await this.supabaseService.updateSession(email, { 
        conversationActive: false 
      });

      return { success: true };
    } catch (error) {
      this.logger.error("Error stopping conversation:", error);
      return { success: false, reason: "Failed to stop conversation" };
    }
  }

  async getConversationTimeRemaining(email: string): Promise<{ timeRemaining: number; isActive: boolean }> {
    try {
      const session = await this.supabaseService.getActiveSession(email);
      if (!session) {
        return { timeRemaining: 0, isActive: false };
      }

      if (!session.conversationActive || !session.conversationStartTime) {
        return { timeRemaining: this.SESSION_DURATION, isActive: false };
      }

      const now = Date.now();
      const elapsed = now - session.conversationStartTime;
      const timeRemaining = Math.max(0, this.SESSION_DURATION - elapsed);

      return { timeRemaining, isActive: true };
    } catch (error) {
      this.logger.error("Error getting conversation time remaining:", error);
      return { timeRemaining: 0, isActive: false };
    }
  }

  async getSessionInfo(email: string): Promise<{ sessionId?: string; messageCount?: number; timeRemaining?: number; reason?: string }> {
    try {
      const session = await this.supabaseService.getActiveSession(email);
      if (!session) {
        return { reason: "No active session" };
      }

      const now = Date.now();
      const timeRemaining = Math.max(0, session.startTime + this.SESSION_DURATION - now);

      return {
        sessionId: `${email}_${session.startTime}_${Math.random().toString(36).substr(2, 9)}`,
        messageCount: session.messageCount,
        timeRemaining,
      };
    } catch (error) {
      this.logger.error("Error getting session info:", error);
      return { reason: "Failed to get session info" };
    }
  }

  async endSession(email: string): Promise<void> {
    try {
      await this.supabaseService.updateSession(email, { isActive: false });
      this.logger.log(`Session ended for ${email}`);
    } catch (error) {
      this.logger.error("Error ending session:", error);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.supabaseService.cleanupExpiredSessions();
    } catch (error) {
      this.logger.error("Error cleaning up expired sessions:", error);
    }
  }

  // Admin methods for credential management
  async getAllCredentials(): Promise<UserCredentials[]> {
    return await this.supabaseService.getAllCredentials();
  }

  async createCredentials(credentials: Omit<UserCredentials, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    return await this.supabaseService.createCredentials(credentials);
  }

  async updateCredentials(email: string, updates: Partial<UserCredentials>): Promise<boolean> {
    return await this.supabaseService.updateCredentials(email, updates);
  }

  async deleteCredentials(email: string): Promise<boolean> {
    return await this.supabaseService.deleteCredentials(email);
  }

  async resetSessionsUsed(email: string): Promise<boolean> {
    // Reset the user's sessions used count and also deactivate any active session
    const resetOk = await this.supabaseService.resetSessionsUsed(email);
    if (!resetOk) return false;
    try {
      await this.supabaseService.deleteSession(email);
    } catch (error) {
      this.logger.error("Error deactivating active session during reset:", error);
      // Even if deactivation fails, surface failure so admin can retry
      return false;
    }
    return true;
  }

  // Admin methods for session management
  async getAllSessions(): Promise<UserSession[]> {
    return await this.supabaseService.getAllSessions();
  }

  async updateSessionStatus(email: string, isActive: boolean): Promise<boolean> {
    try {
      await this.supabaseService.updateSession(email, { isActive });
      return true;
    } catch (error) {
      this.logger.error("Error updating session status:", error);
      return false;
    }
  }

  async deleteSession(email: string): Promise<boolean> {
    try {
      await this.supabaseService.deleteSession(email);
      return true;
    } catch (error) {
      this.logger.error("Error deleting session:", error);
      return false;
    }
  }
}