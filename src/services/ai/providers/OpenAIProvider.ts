/**
 * OpenAI Provider Implementation
 */

import OpenAI from 'openai';
import { AIProvider, AIMessage, AIResponse, AIProviderConfig } from './AIProvider';

export class OpenAIProvider extends AIProvider {
  private client: OpenAI | null = null;

  async initialize(): Promise<void> {
    try {
      if (!this.config.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        timeout: this.config.timeout || 30000,
      });

      this.isInitialized = true;
      console.log('OpenAI provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenAI provider:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.client && !!this.config.apiKey;
  }

  async generateCompletion(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      });

      const choice = completion.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response from OpenAI');
      }

      return {
        content: choice.message.content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        },
        model: completion.model,
        finishReason: choice.finish_reason || undefined
      };
    } catch (error) {
      console.error('OpenAI completion failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'Say "OK" if you can hear me.' }],
        max_tokens: 10,
        temperature: 0
      });

      return completion.choices[0]?.message?.content?.toLowerCase().includes('ok') || false;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  getSupportedModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
  }
}