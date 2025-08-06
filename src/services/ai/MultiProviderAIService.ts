/**
 * Multi-Provider AI Service
 * Manages multiple AI providers with automatic fallback and load balancing
 */

import { AIProvider, AIMessage, AIResponse } from './providers/AIProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GoogleProvider } from './providers/GoogleProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { HuggingFaceProvider } from './providers/HuggingFaceProvider';
import { LocalLlamaProvider } from './providers/LocalLlamaProvider';

export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'ollama' | 'huggingface' | 'localllama';

export interface MultiProviderConfig {
  providers: {
    [key in AIProviderType]?: {
      apiKey?: string;
      model: string;
      maxTokens: number;
      temperature: number;
      baseURL?: string;
      priority: number; // Lower number = higher priority
      enabled: boolean;
    };
  };
  fallbackEnabled: boolean;
  loadBalancing: boolean;
  retryAttempts: number;
}

export interface ProviderUsage {
  provider: AIProviderType;
  requests: number;
  errors: number;
  totalTokens: number;
  avgResponseTime: number;
  lastUsed: Date;
}

export class MultiProviderAIService {
  private static instance: MultiProviderAIService;
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private config: MultiProviderConfig;
  private usage: Map<AIProviderType, ProviderUsage> = new Map();
  private currentProviderIndex = 0;

  private constructor() {
    this.config = this.loadConfig();
    this.initializeProviders();
  }

  static getInstance(): MultiProviderAIService {
    if (!MultiProviderAIService.instance) {
      MultiProviderAIService.instance = new MultiProviderAIService();
    }
    return MultiProviderAIService.instance;
  }

  private loadConfig(): MultiProviderConfig {
    return {
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
          priority: 1,
          enabled: !!process.env.OPENAI_API_KEY
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
          maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1000'),
          temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7'),
          priority: 2,
          enabled: !!process.env.ANTHROPIC_API_KEY
        },
        google: {
          apiKey: process.env.GOOGLE_API_KEY,
          model: process.env.GOOGLE_MODEL || 'gemini-pro',
          maxTokens: parseInt(process.env.GOOGLE_MAX_TOKENS || '1000'),
          temperature: parseFloat(process.env.GOOGLE_TEMPERATURE || '0.7'),
          priority: 3,
          enabled: !!process.env.GOOGLE_API_KEY
        },
        ollama: {
          model: process.env.OLLAMA_MODEL || 'llama2',
          maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '1000'),
          temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
          baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          priority: 4,
          enabled: process.env.OLLAMA_ENABLED === 'true'
        },
        huggingface: {
          apiKey: process.env.HUGGINGFACE_API_KEY,
          model: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-2-7b-chat-hf',
          maxTokens: parseInt(process.env.HUGGINGFACE_MAX_TOKENS || '1000'),
          temperature: parseFloat(process.env.HUGGINGFACE_TEMPERATURE || '0.7'),
          priority: 5,
          enabled: !!process.env.HUGGINGFACE_API_KEY
        },
        localllama: {
          model: process.env.LOCAL_LLAMA_MODEL || 'llama-2-7b-chat',
          maxTokens: parseInt(process.env.LOCAL_LLAMA_MAX_TOKENS || '1000'),
          temperature: parseFloat(process.env.LOCAL_LLAMA_TEMPERATURE || '0.7'),
          baseURL: process.env.LOCAL_LLAMA_BASE_URL || 'http://localhost:8080',
          priority: 6,
          enabled: process.env.LOCAL_LLAMA_ENABLED === 'true'
        }
      },
      fallbackEnabled: process.env.AI_FALLBACK_ENABLED !== 'false',
      loadBalancing: process.env.AI_LOAD_BALANCING === 'true',
      retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '2')
    };
  }

  private async initializeProviders(): Promise<void> {
    const providerClasses = {
      openai: OpenAIProvider,
      anthropic: AnthropicProvider,
      google: GoogleProvider,
      ollama: OllamaProvider,
      huggingface: HuggingFaceProvider,
      localllama: LocalLlamaProvider
    };

    for (const [type, config] of Object.entries(this.config.providers)) {
      if (!config.enabled) continue;

      try {
        const ProviderClass = providerClasses[type as AIProviderType];
        const provider = new ProviderClass({
          apiKey: config.apiKey || '',
          model: config.model,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          baseURL: config.baseURL
        });

        await provider.initialize();
        this.providers.set(type as AIProviderType, provider);

        // Initialize usage tracking
        this.usage.set(type as AIProviderType, {
          provider: type as AIProviderType,
          requests: 0,
          errors: 0,
          totalTokens: 0,
          avgResponseTime: 0,
          lastUsed: new Date()
        });

        console.log(`${provider.getProviderName()} provider initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize ${type} provider:`, error);
      }
    }
  }

  async generateCompletion(messages: AIMessage[]): Promise<AIResponse> {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      const provider = this.selectProvider(availableProviders);
      const startTime = Date.now();
      
      try {
        const response = await provider.generateCompletion(messages);
        
        // Update usage statistics
        this.updateUsageStats(provider, startTime, response.usage?.totalTokens || 0, false);
        
        return response;
      } catch (error) {
        lastError = error as Error;
        console.error(`Provider ${provider.getProviderName()} failed:`, error);
        
        // Update error statistics
        this.updateUsageStats(provider, startTime, 0, true);
        
        // Remove failed provider from this attempt
        const providerType = this.getProviderType(provider);
        if (providerType) {
          const index = availableProviders.findIndex(p => this.getProviderType(p) === providerType);
          if (index > -1) {
            availableProviders.splice(index, 1);
          }
        }
        
        if (availableProviders.length === 0) {
          break;
        }
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  private getAvailableProviders(): AIProvider[] {
    const providers = Array.from(this.providers.values()).filter(p => p.isAvailable());
    
    // Sort by priority (lower number = higher priority)
    return providers.sort((a, b) => {
      const aType = this.getProviderType(a);
      const bType = this.getProviderType(b);
      const aPriority = aType ? this.config.providers[aType]?.priority || 999 : 999;
      const bPriority = bType ? this.config.providers[bType]?.priority || 999 : 999;
      return aPriority - bPriority;
    });
  }

  private selectProvider(availableProviders: AIProvider[]): AIProvider {
    if (!this.config.loadBalancing) {
      return availableProviders[0]; // Use highest priority provider
    }

    // Round-robin load balancing
    const provider = availableProviders[this.currentProviderIndex % availableProviders.length];
    this.currentProviderIndex++;
    return provider;
  }

  private getProviderType(provider: AIProvider): AIProviderType | null {
    for (const [type, p] of this.providers.entries()) {
      if (p === provider) {
        return type;
      }
    }
    return null;
  }

  private updateUsageStats(provider: AIProvider, startTime: number, tokens: number, isError: boolean): void {
    const providerType = this.getProviderType(provider);
    if (!providerType) return;

    const usage = this.usage.get(providerType);
    if (!usage) return;

    const responseTime = Date.now() - startTime;
    
    usage.requests++;
    usage.totalTokens += tokens;
    usage.lastUsed = new Date();
    
    if (isError) {
      usage.errors++;
    }
    
    // Update average response time
    usage.avgResponseTime = (usage.avgResponseTime * (usage.requests - 1) + responseTime) / usage.requests;
  }

  async healthCheck(): Promise<{ [key in AIProviderType]?: boolean }> {
    const results: { [key in AIProviderType]?: boolean } = {};
    
    for (const [type, provider] of this.providers.entries()) {
      try {
        results[type] = await provider.healthCheck();
      } catch (error) {
        console.error(`Health check failed for ${type}:`, error);
        results[type] = false;
      }
    }
    
    return results;
  }

  getUsageStats(): ProviderUsage[] {
    return Array.from(this.usage.values());
  }

  getAvailableProviderNames(): string[] {
    return Array.from(this.providers.values())
      .filter(p => p.isAvailable())
      .map(p => p.getProviderName());
  }

  updateConfig(newConfig: Partial<MultiProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Re-initialize providers if needed
    this.initializeProviders();
  }

  async addProvider(type: AIProviderType, config: any): Promise<void> {
    const providerClasses = {
      openai: OpenAIProvider,
      anthropic: AnthropicProvider,
      google: GoogleProvider,
      ollama: OllamaProvider,
      huggingface: HuggingFaceProvider,
      localllama: LocalLlamaProvider
    };

    const ProviderClass = providerClasses[type];
    const provider = new ProviderClass(config);
    
    await provider.initialize();
    this.providers.set(type, provider);
    
    // Initialize usage tracking
    this.usage.set(type, {
      provider: type,
      requests: 0,
      errors: 0,
      totalTokens: 0,
      avgResponseTime: 0,
      lastUsed: new Date()
    });

    console.log(`${provider.getProviderName()} provider added successfully`);
  }

  removeProvider(type: AIProviderType): void {
    this.providers.delete(type);
    this.usage.delete(type);
    console.log(`${type} provider removed`);
  }

  isAnyProviderAvailable(): boolean {
    return Array.from(this.providers.values()).some(p => p.isAvailable());
  }
}

export const multiProviderAIService = MultiProviderAIService.getInstance();