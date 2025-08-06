/**
 * Anthropic Claude Provider Implementation
 */

import { AIProvider, AIMessage, AIResponse, AIProviderConfig } from './AIProvider';

export class AnthropicProvider extends AIProvider {
  private baseURL = 'https://api.anthropic.com/v1/messages';

  async initialize(): Promise<void> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Anthropic API key is required');
      }

      this.isInitialized = true;
      console.log('Anthropic provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Anthropic provider:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.config.apiKey;
  }

  async generateCompletion(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('Anthropic provider not initialized');
    }

    try {
      // Convert messages to Anthropic format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');

      const requestBody = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemMessage,
        messages: userMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      };

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0]?.text) {
        throw new Error('Invalid response from Anthropic');
      }

      return {
        content: data.content[0].text,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        model: data.model,
        finishReason: data.stop_reason
      };
    } catch (error) {
      console.error('Anthropic completion failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateCompletion([
        { role: 'user', content: 'Say "OK" if you can hear me.' }
      ]);
      return response.content.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Anthropic health check failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'Anthropic';
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ];
  }
}