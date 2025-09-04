import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

interface EmotionAnalysis {
  emotion: 'happy' | 'sad' | 'angry' | 'excited' | 'calm' | 'confused' | 'neutral';
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  intensity: 'low' | 'medium' | 'high';
  responseTone: 'professional' | 'casual' | 'empathetic' | 'enthusiastic' | 'calm';
  suggestedActions: string[];
}

interface VoiceAnalysis {
  pitch: number;
  volume: number;
  speed: number;
  clarity: number;
  stress: number;
}

@Injectable()
export class EmotionAnalysisService {
  private openai: OpenAI;
  private readonly logger = new Logger('EmotionAnalysisService');

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeTextEmotion(text: string): Promise<EmotionAnalysis> {
    this.logger.log(`🧠 Analyzing emotion for text: "${text.substring(0, 50)}..."`);

    try {
      const prompt = `
        Analyze the emotional content of this text and provide a detailed emotion analysis.
        
        Text: "${text}"
        
        Please respond with a JSON object containing:
        - emotion: one of [happy, sad, angry, excited, calm, confused, neutral]
        - confidence: number between 0 and 1
        - sentiment: one of [positive, negative, neutral]
        - intensity: one of [low, medium, high]
        - responseTone: one of [professional, casual, empathetic, enthusiastic, calm]
        - suggestedActions: array of suggested response actions
        
        Consider:
        - Word choice and language patterns
        - Punctuation and capitalization
        - Context and implied meaning
        - Emotional indicators and keywords
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert emotion analysis AI. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      try {
        const analysis = JSON.parse(response);
        this.logger.log(`✅ Emotion analysis: ${analysis.emotion} (${analysis.confidence})`);
        return analysis;
      } catch (parseError) {
        this.logger.warn('Failed to parse emotion analysis, using fallback');
        return this.getFallbackEmotionAnalysis(text);
      }
    } catch (error) {
      this.logger.error('Error in emotion analysis:', error);
      return this.getFallbackEmotionAnalysis(text);
    }
  }

  async analyzeVoiceEmotion(audioFeatures: VoiceAnalysis): Promise<EmotionAnalysis> {
    this.logger.log(`🎤 Analyzing voice emotion from audio features`);

    // Simple rule-based voice emotion analysis
    let emotion: EmotionAnalysis['emotion'] = 'neutral';
    let confidence = 0.5;
    let sentiment: EmotionAnalysis['sentiment'] = 'neutral';
    let intensity: EmotionAnalysis['intensity'] = 'medium';
    let responseTone: EmotionAnalysis['responseTone'] = 'casual';

    // Analyze pitch
    if (audioFeatures.pitch > 0.7) {
      emotion = 'excited';
      sentiment = 'positive';
      intensity = 'high';
      responseTone = 'enthusiastic';
      confidence = 0.8;
    } else if (audioFeatures.pitch < 0.3) {
      emotion = 'sad';
      sentiment = 'negative';
      intensity = 'medium';
      responseTone = 'empathetic';
      confidence = 0.7;
    }

    // Analyze volume
    if (audioFeatures.volume > 0.8) {
      if (emotion === 'excited') {
        intensity = 'high';
        confidence = Math.min(1, confidence + 0.2);
      } else {
        emotion = 'angry';
        sentiment = 'negative';
        intensity = 'high';
        responseTone = 'calm';
        confidence = 0.6;
      }
    } else if (audioFeatures.volume < 0.3) {
      emotion = 'calm';
      sentiment = 'neutral';
      intensity = 'low';
      responseTone = 'calm';
      confidence = 0.7;
    }

    // Analyze speed
    if (audioFeatures.speed > 0.8) {
      if (emotion === 'excited') {
        confidence = Math.min(1, confidence + 0.1);
      } else {
        emotion = 'confused';
        sentiment = 'negative';
        responseTone = 'empathetic';
        confidence = 0.6;
      }
    }

    // Analyze stress
    if (audioFeatures.stress > 0.7) {
      emotion = 'angry';
      sentiment = 'negative';
      intensity = 'high';
      responseTone = 'empathetic';
      confidence = 0.8;
    }

    const suggestedActions = this.getSuggestedActions(emotion, sentiment);

    return {
      emotion,
      confidence,
      sentiment,
      intensity,
      responseTone,
      suggestedActions
    };
  }

  async analyzeConversationContext(messages: any[]): Promise<{
    overallEmotion: EmotionAnalysis;
    emotionTrend: 'improving' | 'declining' | 'stable';
    conversationMood: string;
    recommendations: string[];
  }> {
    this.logger.log(`💬 Analyzing conversation context from ${messages.length} messages`);

    if (messages.length === 0) {
      return {
        overallEmotion: this.getFallbackEmotionAnalysis(''),
        emotionTrend: 'stable',
        conversationMood: 'neutral',
        recommendations: ['Start the conversation positively']
      };
    }

    // Analyze recent messages
    const recentMessages = messages.slice(-5);
    const emotions = await Promise.all(
      recentMessages
        .filter(msg => msg.role === 'user')
        .map(msg => this.analyzeTextEmotion(msg.content))
    );

    if (emotions.length === 0) {
      return {
        overallEmotion: this.getFallbackEmotionAnalysis(''),
        emotionTrend: 'stable',
        conversationMood: 'neutral',
        recommendations: ['Continue the conversation']
      };
    }

    // Calculate overall emotion
    const emotionCounts = emotions.reduce((acc, emotion) => {
      acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0][0] as EmotionAnalysis['emotion'];

    const avgConfidence = emotions.reduce((sum, e) => sum + e.confidence, 0) / emotions.length;
    const avgSentiment = this.calculateAverageSentiment(emotions);

    // Determine emotion trend
    const emotionTrend = this.calculateEmotionTrend(emotions);

    // Generate recommendations
    const recommendations = this.generateConversationRecommendations(dominantEmotion, emotionTrend);

    return {
      overallEmotion: {
        emotion: dominantEmotion,
        confidence: avgConfidence,
        sentiment: avgSentiment,
        intensity: this.calculateAverageIntensity(emotions),
        responseTone: this.getRecommendedTone(dominantEmotion, emotionTrend),
        suggestedActions: this.getSuggestedActions(dominantEmotion, avgSentiment)
      },
      emotionTrend,
      conversationMood: this.getConversationMood(dominantEmotion, emotionTrend),
      recommendations
    };
  }

  private getFallbackEmotionAnalysis(text: string): EmotionAnalysis {
    // Simple keyword-based fallback analysis
    const lowerText = text.toLowerCase();
    
    let emotion: EmotionAnalysis['emotion'] = 'neutral';
    let sentiment: EmotionAnalysis['sentiment'] = 'neutral';
    let confidence = 0.5;

    if (lowerText.includes('happy') || lowerText.includes('great') || lowerText.includes('awesome')) {
      emotion = 'happy';
      sentiment = 'positive';
      confidence = 0.7;
    } else if (lowerText.includes('sad') || lowerText.includes('upset') || lowerText.includes('disappointed')) {
      emotion = 'sad';
      sentiment = 'negative';
      confidence = 0.7;
    } else if (lowerText.includes('angry') || lowerText.includes('mad') || lowerText.includes('frustrated')) {
      emotion = 'angry';
      sentiment = 'negative';
      confidence = 0.7;
    } else if (lowerText.includes('excited') || lowerText.includes('amazing') || lowerText.includes('wow')) {
      emotion = 'excited';
      sentiment = 'positive';
      confidence = 0.7;
    }

    return {
      emotion,
      confidence,
      sentiment,
      intensity: 'medium',
      responseTone: this.getRecommendedTone(emotion, 'stable'),
      suggestedActions: this.getSuggestedActions(emotion, sentiment)
    };
  }

  private calculateAverageSentiment(emotions: EmotionAnalysis[]): EmotionAnalysis['sentiment'] {
    const sentimentCounts = emotions.reduce((acc, emotion) => {
      acc[emotion.sentiment] = (acc[emotion.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sentimentCounts)
      .sort(([,a], [,b]) => b - a)[0][0] as EmotionAnalysis['sentiment'];
  }

  private calculateEmotionTrend(emotions: EmotionAnalysis[]): 'improving' | 'declining' | 'stable' {
    if (emotions.length < 2) return 'stable';

    const recent = emotions.slice(-2);
    const older = emotions.slice(0, -2);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, e) => sum + this.emotionToNumber(e.emotion), 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + this.emotionToNumber(e.emotion), 0) / older.length;

    if (recentAvg > olderAvg + 0.5) return 'improving';
    if (recentAvg < olderAvg - 0.5) return 'declining';
    return 'stable';
  }

  private emotionToNumber(emotion: EmotionAnalysis['emotion']): number {
    const emotionMap = {
      'sad': -2,
      'angry': -1,
      'confused': -0.5,
      'neutral': 0,
      'calm': 0.5,
      'happy': 1,
      'excited': 2
    };
    return emotionMap[emotion] || 0;
  }

  private calculateAverageIntensity(emotions: EmotionAnalysis[]): EmotionAnalysis['intensity'] {
    const intensityMap = { 'low': 1, 'medium': 2, 'high': 3 };
    const avgIntensity = emotions.reduce((sum, e) => sum + intensityMap[e.intensity], 0) / emotions.length;
    
    if (avgIntensity <= 1.5) return 'low';
    if (avgIntensity <= 2.5) return 'medium';
    return 'high';
  }

  private getRecommendedTone(emotion: EmotionAnalysis['emotion'], trend: string): EmotionAnalysis['responseTone'] {
    if (emotion === 'sad' || emotion === 'angry') return 'empathetic';
    if (emotion === 'excited') return 'enthusiastic';
    if (emotion === 'confused') return 'empathetic';
    if (trend === 'declining') return 'empathetic';
    return 'casual';
  }

  private getSuggestedActions(emotion: EmotionAnalysis['emotion'], sentiment: EmotionAnalysis['sentiment']): string[] {
    const actions: Record<string, string[]> = {
      'happy': ['celebrate', 'share enthusiasm', 'ask for more details'],
      'sad': ['offer support', 'be empathetic', 'suggest positive activities'],
      'angry': ['stay calm', 'acknowledge feelings', 'offer solutions'],
      'excited': ['match enthusiasm', 'ask questions', 'encourage sharing'],
      'confused': ['clarify', 'provide examples', 'break down complex topics'],
      'calm': ['maintain calm tone', 'be thoughtful', 'ask open questions'],
      'neutral': ['be friendly', 'ask engaging questions', 'provide helpful information']
    };

    return actions[emotion] || ['be helpful', 'ask questions', 'provide support'];
  }

  private generateConversationRecommendations(emotion: EmotionAnalysis['emotion'], trend: string): string[] {
    const recommendations: string[] = [];

    if (emotion === 'sad' && trend === 'declining') {
      recommendations.push('Consider changing the topic to something more positive');
      recommendations.push('Offer emotional support and validation');
    } else if (emotion === 'excited' && trend === 'improving') {
      recommendations.push('Maintain the positive energy');
      recommendations.push('Ask follow-up questions to keep engagement high');
    } else if (emotion === 'confused') {
      recommendations.push('Simplify explanations');
      recommendations.push('Use more examples and analogies');
    }

    return recommendations;
  }

  private getConversationMood(emotion: EmotionAnalysis['emotion'], trend: string): string {
    const moods = {
      'happy': 'cheerful and positive',
      'sad': 'melancholic and reflective',
      'angry': 'tense and frustrated',
      'excited': 'energetic and enthusiastic',
      'confused': 'uncertain and seeking clarity',
      'calm': 'peaceful and relaxed',
      'neutral': 'balanced and steady'
    };

    const baseMood = moods[emotion] || 'neutral';
    
    if (trend === 'improving') return `increasingly ${baseMood}`;
    if (trend === 'declining') return `becoming less ${baseMood}`;
    return baseMood;
  }
}
