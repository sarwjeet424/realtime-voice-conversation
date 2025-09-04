import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService {
  private prisma: PrismaClient;
  private readonly logger = new Logger('DatabaseService');

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createUser(email: string, name?: string) {
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          preferences: {
            create: {
              voiceId: 'OYTbf65OHHFELVut7v2H', // Default Adam voice
              language: 'en-US',
              model: 'gpt-3.5-turbo',
              temperature: 0.7,
              maxTokens: 100,
              streaming: true,
            },
          },
        },
        include: {
          preferences: true,
        },
      });
      this.logger.log(`✅ Created user: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          preferences: true,
          conversations: {
            orderBy: { updatedAt: 'desc' },
            take: 10,
          },
        },
      });
      return user;
    } catch (error) {
      this.logger.error('Failed to get user:', error);
      throw error;
    }
  }

  async createConversation(userId: string, title?: string) {
    try {
      const conversation = await this.prisma.conversation.create({
        data: {
          userId,
          title: title || 'New Conversation',
        },
      });
      this.logger.log(`✅ Created conversation: ${conversation.id}`);
      return conversation;
    } catch (error) {
      this.logger.error('Failed to create conversation:', error);
      throw error;
    }
  }

  async addMessage(conversationId: string, role: string, content: string, metadata?: any) {
    try {
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          role,
          content,
          metadata,
        },
      });
      this.logger.debug(`✅ Added message to conversation: ${conversationId}`);
      return message;
    } catch (error) {
      this.logger.error('Failed to add message:', error);
      throw error;
    }
  }

  async getConversationHistory(conversationId: string, limit: number = 50) {
    try {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
      return messages;
    } catch (error) {
      this.logger.error('Failed to get conversation history:', error);
      throw error;
    }
  }

  async updateConversationSummary(conversationId: string, summary: string) {
    try {
      const conversation = await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { summary },
      });
      this.logger.log(`✅ Updated conversation summary: ${conversationId}`);
      return conversation;
    } catch (error) {
      this.logger.error('Failed to update conversation summary:', error);
      throw error;
    }
  }

  async getUserConversations(userId: string, limit: number = 20) {
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      return conversations;
    } catch (error) {
      this.logger.error('Failed to get user conversations:', error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferences: any) {
    try {
      const updated = await this.prisma.userPreferences.upsert({
        where: { userId },
        update: preferences,
        create: {
          userId,
          ...preferences,
        },
      });
      this.logger.log(`✅ Updated user preferences: ${userId}`);
      return updated;
    } catch (error) {
      this.logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  async logAnalytics(sessionId: string, eventType: string, eventData?: any, responseTime?: number, userId?: string) {
    try {
      const analytics = await this.prisma.analytics.create({
        data: {
          sessionId,
          eventType,
          eventData,
          responseTime,
          userId,
        },
      });
      this.logger.debug(`📊 Logged analytics: ${eventType}`);
      return analytics;
    } catch (error) {
      this.logger.error('Failed to log analytics:', error);
      // Don't throw error for analytics failures
    }
  }

  async getAnalytics(userId?: string, days: number = 7) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const analytics = await this.prisma.analytics.findMany({
        where: {
          userId: userId || undefined,
          createdAt: {
            gte: since,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return analytics;
    } catch (error) {
      this.logger.error('Failed to get analytics:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
    this.logger.log('🔌 Database disconnected');
  }
}
