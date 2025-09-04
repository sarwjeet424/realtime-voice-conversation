import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CacheService } from './cache.service';

interface ConversationContext {
  userId: string;
  sessionId: string;
  messageType: 'question' | 'creative' | 'code' | 'analysis' | 'casual';
  userEmotion?: 'happy' | 'sad' | 'angry' | 'excited' | 'calm' | 'confused' | 'neutral';
  conversationLength: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

interface ModelConfig {
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  useCase: string[];
}

@Injectable()
export class AdvancedAiService {
  private openai: OpenAI;
  private readonly logger = new Logger('AdvancedAiService');

  private models: Record<string, ModelConfig> = {
    conversation: {
      name: 'GPT-4 Turbo',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 150,
      systemPrompt: 'You are a helpful, friendly, and intelligent voice assistant. Respond naturally and conversationally.',
      useCase: ['question', 'casual', 'analysis']
    },
    creative: {
      name: 'GPT-4 Creative',
      model: 'gpt-4',
      temperature: 0.9,
      maxTokens: 200,
      systemPrompt: 'You are a creative and imaginative assistant. Be creative, engaging, and use storytelling elements.',
      useCase: ['creative', 'storytelling', 'brainstorming']
    },
    fast: {
      name: 'GPT-3.5 Turbo',
      model: 'gpt-3.5-turbo',
      temperature: 0.6,
      maxTokens: 100,
      systemPrompt: 'You are a quick and efficient assistant. Provide concise, helpful responses.',
      useCase: ['quick_questions', 'simple_tasks']
    },
    code: {
      name: 'GPT-4 Code',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 300,
      systemPrompt: 'You are a programming expert. Provide accurate, well-commented code solutions.',
      useCase: ['code', 'programming', 'technical']
    },
    empathetic: {
      name: 'GPT-4 Empathetic',
      model: 'gpt-4',
      temperature: 0.8,
      maxTokens: 150,
      systemPrompt: 'You are a caring and empathetic assistant. Be understanding, supportive, and emotionally intelligent.',
      useCase: ['emotional_support', 'personal_issues']
    }
  };

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async generateIntelligentResponse(
    userMessage: string,
    context: ConversationContext,
    history: any[] = []
  ): Promise<{ response: string; model: string; confidence: number; metadata: any }> {
    // Analyze the message to determine the best model
    const analysis = await this.analyzeMessage(userMessage, context);
    const selectedModel = this.selectOptimalModel(analysis, context);
    
    this.logger.log(`🧠 Using ${selectedModel.name} for: "${userMessage.substring(0, 50)}..."`);

    // Check cache first
    const cacheKey = this.generateCacheKey(userMessage, context, selectedModel.name);
    const cachedResponse = await this.cacheService.getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      return JSON.parse(cachedResponse);
    }

    // Generate response with selected model
    const response = await this.generateResponseWithModel(
      userMessage,
      selectedModel,
      context,
      history
    );

    // Cache the response
    await this.cacheService.cacheResponse(cacheKey, JSON.stringify(response), 3600);

    return response;
  }

  private async analyzeMessage(message: string, context: ConversationContext): Promise<{
    intent: string;
    emotion: string;
    complexity: 'low' | 'medium' | 'high';
    category: string;
    keywords: string[];
  }> {
    // Simple intent analysis (in production, use a proper NLP service)
    const lowerMessage = message.toLowerCase();
    
    // Intent detection
    let intent = 'question';
    if (lowerMessage.includes('story') || lowerMessage.includes('creative') || lowerMessage.includes('imagine')) {
      intent = 'creative';
    } else if (lowerMessage.includes('code') || lowerMessage.includes('function') || lowerMessage.includes('programming')) {
      intent = 'code';
    } else if (lowerMessage.includes('sad') || lowerMessage.includes('help') || lowerMessage.includes('problem')) {
      intent = 'empathetic';
    } else if (lowerMessage.includes('quick') || lowerMessage.includes('simple')) {
      intent = 'fast';
    }

    // Emotion detection
    let emotion = 'neutral';
    if (lowerMessage.includes('happy') || lowerMessage.includes('excited') || lowerMessage.includes('great')) {
      emotion = 'positive';
    } else if (lowerMessage.includes('sad') || lowerMessage.includes('angry') || lowerMessage.includes('frustrated')) {
      emotion = 'negative';
    }

    // Complexity analysis
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    if (message.length < 20) {
      complexity = 'low';
    } else if (message.length > 100 || message.includes('explain') || message.includes('detailed')) {
      complexity = 'high';
    }

    // Extract keywords
    const keywords = message.split(' ').filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'oil', 'sit', 'try', 'use'].includes(word.toLowerCase())
    );

    return {
      intent,
      emotion,
      complexity,
      category: this.categorizeMessage(message),
      keywords
    };
  }

  private categorizeMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('weather') || lowerMessage.includes('temperature')) return 'weather';
    if (lowerMessage.includes('time') || lowerMessage.includes('date')) return 'time';
    if (lowerMessage.includes('joke') || lowerMessage.includes('funny')) return 'entertainment';
    if (lowerMessage.includes('help') || lowerMessage.includes('how')) return 'help';
    if (lowerMessage.includes('what') || lowerMessage.includes('who') || lowerMessage.includes('where')) return 'information';
    
    return 'general';
  }

  private selectOptimalModel(analysis: any, context: ConversationContext): ModelConfig {
    // Model selection logic based on analysis and context
    if (analysis.intent === 'creative') {
      return this.models.creative;
    } else if (analysis.intent === 'code') {
      return this.models.code;
    } else if (analysis.intent === 'empathetic' || context.userEmotion === 'sad') {
      return this.models.empathetic;
    } else if (analysis.intent === 'fast' || analysis.complexity === 'low') {
      return this.models.fast;
    } else if (context.conversationLength > 10) {
      // Use faster model for long conversations
      return this.models.fast;
    } else {
      return this.models.conversation;
    }
  }

  private async generateResponseWithModel(
    userMessage: string,
    modelConfig: ModelConfig,
    context: ConversationContext,
    history: any[]
  ): Promise<{ response: string; model: string; confidence: number; metadata: any }> {
    const startTime = Date.now();

    // Enhance system prompt based on context
    let systemPrompt = modelConfig.systemPrompt;
    
    // Add time-based context
    if (context.timeOfDay === 'morning') {
      systemPrompt += ' It\'s morning, so be energetic and positive.';
    } else if (context.timeOfDay === 'evening') {
      systemPrompt += ' It\'s evening, so be calm and reflective.';
    }

    // Add emotion-based context
    if (context.userEmotion) {
      systemPrompt += ` The user seems ${context.userEmotion}, so respond appropriately.`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-5), // Last 5 messages for context
      { role: 'user', content: userMessage }
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: modelConfig.model,
        messages: messages as any,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
      });

      const response = completion.choices[0]?.message?.content?.trim() || 'No response';
      const duration = Date.now() - startTime;

      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(response, userMessage, duration);

      return {
        response,
        model: modelConfig.name,
        confidence,
        metadata: {
          processingTime: duration,
          modelUsed: modelConfig.model,
          temperature: modelConfig.temperature,
          tokensUsed: completion.usage?.total_tokens || 0,
          analysis: {
            intent: 'detected',
            complexity: 'analyzed'
          }
        }
      };
    } catch (error) {
      this.logger.error('Error generating response:', error);
      throw error;
    }
  }

  private calculateConfidence(response: string, userMessage: string, processingTime: number): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on response length
    if (response.length < 10) confidence -= 0.2;
    if (response.length > 200) confidence += 0.1;

    // Adjust based on processing time
    if (processingTime < 1000) confidence += 0.1;
    if (processingTime > 5000) confidence -= 0.1;

    // Adjust based on response quality indicators
    if (response.includes('I don\'t know') || response.includes('I\'m not sure')) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private generateCacheKey(userMessage: string, context: ConversationContext, modelName: string): string {
    const contextKey = `${context.userId}-${context.messageType}-${context.userEmotion || 'neutral'}`;
    return `${modelName}:${contextKey}:${userMessage}`;
  }

  async getAvailableModels(): Promise<ModelConfig[]> {
    return Object.values(this.models);
  }

  async getModelStats(): Promise<any> {
    return {
      totalModels: Object.keys(this.models).length,
      models: Object.entries(this.models).map(([key, config]) => ({
        key,
        name: config.name,
        useCases: config.useCase,
        temperature: config.temperature
      }))
    };
  }
}
