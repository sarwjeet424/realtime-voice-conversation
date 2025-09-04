import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService {
  private redis: RedisClientType;
  private readonly logger = new Logger('CacheService');

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redis = createClient({
        url: this.configService.get('REDIS_URL', 'redis://localhost:6379'),
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis connected successfully');
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
    }
  }

  async cacheResponse(query: string, response: string, ttl: number = 3600): Promise<void> {
    try {
      const key = `response:${this.hashQuery(query)}`;
      await this.redis.setEx(key, ttl, response);
      this.logger.debug(`📦 Cached response for query: ${query.substring(0, 50)}...`);
    } catch (error) {
      this.logger.error('Failed to cache response:', error);
    }
  }

  async getCachedResponse(query: string): Promise<string | null> {
    try {
      const key = `response:${this.hashQuery(query)}`;
      const cached = await this.redis.get(key);
      if (cached) {
        this.logger.debug(`🎯 Cache hit for query: ${query.substring(0, 50)}...`);
        return cached;
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get cached response:', error);
      return null;
    }
  }

  async cacheAudio(text: string, audio: Buffer, ttl: number = 7200): Promise<void> {
    try {
      const key = `audio:${this.hashQuery(text)}`;
      await this.redis.setEx(key, ttl, audio.toString('base64'));
      this.logger.debug(`🎵 Cached audio for text: ${text.substring(0, 30)}...`);
    } catch (error) {
      this.logger.error('Failed to cache audio:', error);
    }
  }

  async getCachedAudio(text: string): Promise<Buffer | null> {
    try {
      const key = `audio:${this.hashQuery(text)}`;
      const cached = await this.redis.get(key);
      if (cached) {
        this.logger.debug(`🎵 Cache hit for audio: ${text.substring(0, 30)}...`);
        return Buffer.from(cached, 'base64');
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get cached audio:', error);
      return null;
    }
  }

  async cacheConversationHistory(sessionId: string, history: any[], ttl: number = 86400): Promise<void> {
    try {
      const key = `conversation:${sessionId}`;
      await this.redis.setEx(key, ttl, JSON.stringify(history));
      this.logger.debug(`💬 Cached conversation history for session: ${sessionId}`);
    } catch (error) {
      this.logger.error('Failed to cache conversation history:', error);
    }
  }

  async getCachedConversationHistory(sessionId: string): Promise<any[] | null> {
    try {
      const key = `conversation:${sessionId}`;
      const cached = await this.redis.get(key);
      if (cached) {
        this.logger.debug(`💬 Cache hit for conversation: ${sessionId}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get cached conversation history:', error);
      return null;
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
        this.logger.debug(`🗑️ Invalidated ${keys.length} cache entries matching: ${pattern}`);
      }
    } catch (error) {
      this.logger.error('Failed to invalidate cache:', error);
    }
  }

  async getCacheStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
    try {
      const info = await this.redis.info('memory');
      const keys = await this.redis.keys('*');
      
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        totalKeys: keys.length,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return { totalKeys: 0, memoryUsage: 'Unknown' };
    }
  }

  private hashQuery(query: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.logger.log('🔌 Redis disconnected');
    }
  }
}
