import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { UserSession, BlockedUser, MonthlyUsage, UserCredentials } from "./auth.service";

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger("SupabaseService");
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = "https://jbmgssngyldvqjflqepk.supabase.co";
    const supabaseKey = this.configService.get<string>("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibWdzc25neWxkdnFqZmxxZXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNzIwMzcsImV4cCI6MjA3Mzc0ODAzN30.AIsc9voquCUQll_wUEeY5LMyqdraTK11Xu5OZ7eRRkY";

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log("✅ Supabase service initialized with database storage");
  }

  // User Credentials
  async getCredentials(email: string): Promise<UserCredentials | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from("user_credentials")
        .select("*")
        .eq("email", email)
        .single();

      if (error) return null;

      return {
        id: data.id,
        email: data.email,
        password: data.password,
        isActive: data.is_active,
        sessionLimit: data.session_limit,
        sessionsUsed: data.sessions_used,
        lastUsed: data.last_used ? new Date(data.last_used) : undefined,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      };
    } catch (error) {
      this.logger.error("Error getting credentials:", error);
      return null;
    }
  }

  async getAllCredentials(): Promise<UserCredentials[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from("user_credentials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return [];

      return data.map(cred => ({
        id: cred.id,
        email: cred.email,
        password: cred.password,
        isActive: cred.is_active,
        sessionLimit: cred.session_limit,
        sessionsUsed: cred.sessions_used,
        lastUsed: cred.last_used ? new Date(cred.last_used) : undefined,
        createdAt: cred.created_at ? new Date(cred.created_at) : undefined,
        updatedAt: cred.updated_at ? new Date(cred.updated_at) : undefined,
      }));
    } catch (error) {
      this.logger.error("Error getting all credentials:", error);
      return [];
    }
  }

  async createCredentials(credentials: Omit<UserCredentials, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from("user_credentials")
        .insert({
          email: credentials.email,
          password: credentials.password,
          is_active: credentials.isActive,
          session_limit: credentials.sessionLimit,
          sessions_used: credentials.sessionsUsed,
        });

      if (error) throw error;
      this.logger.log(`Credentials created for ${credentials.email}`);
      return true;
    } catch (error) {
      this.logger.error("Error creating credentials:", error);
      return false;
    }
  }

  async updateCredentials(email: string, updates: Partial<UserCredentials>): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const updateData: any = {};
      if (updates.password !== undefined) updateData.password = updates.password;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.sessionLimit !== undefined) updateData.session_limit = updates.sessionLimit;
      if (updates.sessionsUsed !== undefined) updateData.sessions_used = updates.sessionsUsed;
      updateData.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from("user_credentials")
        .update(updateData)
        .eq("email", email);

      if (error) throw error;
      this.logger.log(`Credentials updated for ${email}`);
      return true;
    } catch (error) {
      this.logger.error("Error updating credentials:", error);
      return false;
    }
  }

  async deleteCredentials(email: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from("user_credentials")
        .delete()
        .eq("email", email);

      if (error) throw error;
      this.logger.log(`Credentials deleted for ${email}`);
      return true;
    } catch (error) {
      this.logger.error("Error deleting credentials:", error);
      return false;
    }
  }

  async incrementSessionsUsed(email: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      // First get current sessions_used
      const { data: currentData, error: fetchError } = await this.supabase
        .from("user_credentials")
        .select("sessions_used")
        .eq("email", email)
        .single();

      if (fetchError) throw fetchError;

      const newSessionsUsed = (currentData?.sessions_used || 0) + 1;

      const { error } = await this.supabase
        .from("user_credentials")
        .update({
          sessions_used: newSessionsUsed,
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("email", email);

      if (error) throw error;
      return true;
    } catch (error) {
      this.logger.error("Error incrementing sessions used:", error);
      return false;
    }
  }

  async resetSessionsUsed(email: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from("user_credentials")
        .update({
          sessions_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("email", email);

      if (error) throw error;
      this.logger.log(`Sessions reset for ${email}`);
      return true;
    } catch (error) {
      this.logger.error("Error resetting sessions used:", error);
      return false;
    }
  }

  // User Sessions
  async createSession(session: UserSession): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from("user_sessions")
        .insert({
          email: session.email,
          start_time: session.startTime,
          last_activity: session.lastActivity,
          message_count: session.messageCount,
          is_active: session.isActive,
        });

      if (error) throw error;
      this.logger.log(`Session created for ${session.email}`);
    } catch (error) {
      this.logger.error("Error creating session:", error);
    }
  }

  async updateSession(email: string, updates: Partial<UserSession>): Promise<void> {
    if (!this.supabase) return;

    try {
      const updateData: any = {};
      if (updates.lastActivity) updateData.last_activity = updates.lastActivity;
      if (updates.messageCount !== undefined) updateData.message_count = updates.messageCount;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await this.supabase
        .from("user_sessions")
        .update(updateData)
        .eq("email", email)
        .eq("is_active", true);

      if (error) throw error;
    } catch (error) {
      this.logger.error("Error updating session:", error);
    }
  }

  async getActiveSession(email: string): Promise<UserSession | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from("user_sessions")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single();

      if (error) return null;

      return {
        email: data.email,
        startTime: data.start_time,
        lastActivity: data.last_activity,
        messageCount: data.message_count,
        isActive: data.is_active,
      };
    } catch (error) {
      this.logger.error("Error getting active session:", error);
      return null;
    }
  }

  async getAllSessions(): Promise<UserSession[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from("user_sessions")
        .select("*")
        .order("start_time", { ascending: false });

      if (error) return [];

      return data.map(session => ({
        email: session.email,
        startTime: session.start_time,
        lastActivity: session.last_activity,
        messageCount: session.message_count,
        isActive: session.is_active,
      }));
    } catch (error) {
      this.logger.error("Error getting all sessions:", error);
      return [];
    }
  }

  async deleteSession(email: string): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("email", email)
        .eq("is_active", true);

      if (error) throw error;
    } catch (error) {
      this.logger.error("Error deleting session:", error);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from("user_sessions")
        .update({ is_active: false })
        .lt("start_time", Date.now() - 5 * 60 * 1000); // 5 minutes ago

      if (error) throw error;
    } catch (error) {
      this.logger.error("Error cleaning up expired sessions:", error);
    }
  }

  // Blocked Users (keeping for compatibility)
  async isUserBlocked(email: string): Promise<BlockedUser | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from("blocked_users")
        .select("*")
        .eq("email", email)
        .gt("blocked_until", Date.now())
        .single();

      if (error) return null;

      return {
        email: data.email,
        blockedUntil: data.blocked_until,
        reason: data.reason,
      };
    } catch (error) {
      this.logger.error("Error checking if user is blocked:", error);
      return null;
    }
  }

  async blockUser(blockedUser: BlockedUser): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from("blocked_users")
        .upsert({
          email: blockedUser.email,
          blocked_until: blockedUser.blockedUntil,
          reason: blockedUser.reason,
        });

      if (error) throw error;
      this.logger.log(`User ${blockedUser.email} blocked until ${new Date(blockedUser.blockedUntil).toISOString()}`);
    } catch (error) {
      this.logger.error("Error blocking user:", error);
    }
  }

  async getBlockedUsers(): Promise<BlockedUser[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from("blocked_users")
        .select("*")
        .gt("blocked_until", Date.now())
        .order("blocked_until", { ascending: false });

      if (error) return [];

      return data.map(user => ({
        email: user.email,
        blockedUntil: user.blocked_until,
        reason: user.reason,
      }));
    } catch (error) {
      this.logger.error("Error getting blocked users:", error);
      return [];
    }
  }

  async unblockUser(email: string): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from("blocked_users")
        .delete()
        .eq("email", email);

      if (error) throw error;
    } catch (error) {
      this.logger.error("Error unblocking user:", error);
    }
  }

  async cleanupExpiredBlocks(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from("blocked_users")
        .delete()
        .lt("blocked_until", Date.now());

      if (error) throw error;
    } catch (error) {
      this.logger.error("Error cleaning up expired blocks:", error);
    }
  }

  // Monthly Usage (keeping for compatibility)
  async getMonthlyUsage(email: string, month: string): Promise<MonthlyUsage | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from("monthly_usage")
        .select("*")
        .eq("email", email)
        .eq("month", month)
        .single();

      if (error) return null;

      return {
        email: data.email,
        month: data.month,
        sessionCount: data.session_count,
        totalMessages: data.total_messages,
        lastUsed: data.last_used,
      };
    } catch (error) {
      this.logger.error("Error getting monthly usage:", error);
      return null;
    }
  }

  async updateMonthlyUsage(monthlyUsage: MonthlyUsage): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from("monthly_usage")
        .upsert({
          email: monthlyUsage.email,
          month: monthlyUsage.month,
          session_count: monthlyUsage.sessionCount,
          total_messages: monthlyUsage.totalMessages,
          last_used: monthlyUsage.lastUsed,
        });

      if (error) throw error;
    } catch (error) {
      this.logger.error("Error updating monthly usage:", error);
    }
  }

  async getUserMonthlyUsage(email: string): Promise<MonthlyUsage[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from("monthly_usage")
        .select("*")
        .eq("email", email)
        .order("month", { ascending: false });

      if (error) return [];

      return data.map(usage => ({
        email: usage.email,
        month: usage.month,
        sessionCount: usage.session_count,
        totalMessages: usage.total_messages,
        lastUsed: usage.last_used,
      }));
    } catch (error) {
      this.logger.error("Error getting user monthly usage:", error);
      return [];
    }
  }

  async getAllMonthlyUsage(): Promise<MonthlyUsage[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from("monthly_usage")
        .select("*")
        .order("month", { ascending: false });

      if (error) return [];

      return data.map(usage => ({
        email: usage.email,
        month: usage.month,
        sessionCount: usage.session_count,
        totalMessages: usage.total_messages,
        lastUsed: usage.last_used,
      }));
    } catch (error) {
      this.logger.error("Error getting all monthly usage:", error);
      return [];
    }
  }
}