/**
 * Ollama Provider Implementation (for local/self-hosted models)
 */

import { AIProvider, AIMessage, AIResponse, AIProviderConfig } from './AIProvider';

export class OllamaProvider extends AIProvider {
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'http://localhost:11434';
  }

  async initialize(): Promise<void> {
    try {
      // For Ollama, we don't need an API key, just check if the service is available
      this.isInitialized = true;
      console.log('Ollama provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Ollama provider:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  async generateCompletion(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('Ollama provider not initialized');
    }

    try {
      // Convert messages to a single prompt for Ollama
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');
      
      const prompt = systemMessage + '\n\n' + userMessages.map(m => m.content).join('\n');

      const requestBody = {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      };

      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Ollama API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Invalid response from Ollama');
      }

      return {
        content: data.response,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        model: data.model || this.config.model,
        finishReason: data.done ? 'stop' : 'length'
      };
    } catch (error) {
      console.error('Ollama completion failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'Ollama';
  }

  getSupportedModels(): string[] {
    return [
      'llama2',
      'llama2:13b',
      'llama2:70b',
      'codellama',
      'mistral',
      'mixtral',
      'neural-chat',
      'starling-lm'
    ];
  }
}