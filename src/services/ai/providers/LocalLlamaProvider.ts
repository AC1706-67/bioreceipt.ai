/**
 * Local Llama Provider Implementation
 * For running Apache 2.0 licensed models locally using llama.cpp or similar
 */

import { AIProvider, AIMessage, AIResponse, AIProviderConfig } from './AIProvider';

export class LocalLlamaProvider extends AIProvider {
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'http://localhost:8080';
  }

  async initialize(): Promise<void> {
    try {
      // For local models, we don't need an API key
      this.isInitialized = true;
      console.log('Local Llama provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Local Llama provider:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  async generateCompletion(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('Local Llama provider not initialized');
    }

    try {
      // Convert messages to llama.cpp format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');
      
      // Format prompt for Llama models
      const prompt = this.formatLlamaPrompt(systemMessage, userMessages);

      const requestBody = {
        prompt,
        n_predict: this.config.maxTokens,
        temperature: this.config.temperature,
        stop: ['</s>', '[/INST]', 'User:', '\n\n'],
        stream: false
      };

      const response = await fetch(`${this.baseURL}/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Local Llama API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.content) {
        throw new Error('Invalid response from Local Llama');
      }

      return {
        content: data.content.trim(),
        usage: {
          promptTokens: data.tokens_evaluated || this.estimateTokens(prompt),
          completionTokens: data.tokens_predicted || this.estimateTokens(data.content),
          totalTokens: (data.tokens_evaluated || 0) + (data.tokens_predicted || 0)
        },
        model: this.config.model,
        finishReason: data.stopped_eos ? 'stop' : 'length'
      };
    } catch (error) {
      console.error('Local Llama completion failed:', error);
      throw error;
    }
  }

  private formatLlamaPrompt(systemMessage: string, userMessages: AIMessage[]): string {
    const userContent = userMessages.map(m => m.content).join('\n');
    
    // Use Llama 2 chat format
    return `<s>[INST] <<SYS>>\n${systemMessage}\n<</SYS>>\n\n${userContent} [/INST]`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation for token counting
    return Math.ceil(text.length / 4);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Local Llama health check failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'Local Llama';
  }

  getSupportedModels(): string[] {
    return [
      // Apache 2.0 Licensed Models (local GGUF/GGML files)
      'llama-2-7b-chat',
      'llama-2-13b-chat',
      'llama-2-70b-chat',
      'code-llama-7b-instruct',
      'code-llama-13b-instruct',
      'code-llama-34b-instruct',
      'mistral-7b-instruct',
      'zephyr-7b-beta',
      'neural-chat-7b',
      'starling-lm-7b-alpha'
    ];
  }
}