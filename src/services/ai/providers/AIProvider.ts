/**
 * AI Provider Interface
 * Abstract interface for different LLM providers
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  baseURL?: string;
  timeout?: number;
}

export abstract class AIProvider {
  protected config: AIProviderConfig;
  protected isInitialized = false;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract isAvailable(): boolean;
  abstract generateCompletion(messages: AIMessage[]): Promise<AIResponse>;
  abstract healthCheck(): Promise<boolean>;
  abstract getProviderName(): string;
  abstract getSupportedModels(): string[];

  updateConfig(newConfig: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): Omit<AIProviderConfig, 'apiKey'> {
    const { apiKey, ...configWithoutKey } = this.config;
    return configWithoutKey;
  }
}