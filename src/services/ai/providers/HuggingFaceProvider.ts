/**
 * Hugging Face Provider Implementation
 * Supports Apache 2.0 licensed models like Llama 2, Code Llama, Mistral, etc.
 */

import { AIProvider, AIMessage, AIResponse, AIProviderConfig } from './AIProvider';

export class HuggingFaceProvider extends AIProvider {
  private baseURL = 'https://api-inference.huggingface.co/models';

  async initialize(): Promise<void> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Hugging Face API key is required');
      }

      this.isInitialized = true;
      console.log('Hugging Face provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Hugging Face provider:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.config.apiKey;
  }

  async generateCompletion(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('Hugging Face provider not initialized');
    }

    try {
      // Convert messages to a single prompt for most HF models
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');
      
      // Format prompt for instruction-following models
      const prompt = this.formatPromptForModel(systemMessage, userMessages);

      const requestBody = {
        inputs: prompt,
        parameters: {
          max_new_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          do_sample: true,
          return_full_text: false
        }
      };

      const response = await fetch(`${this.baseURL}/${this.config.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Hugging Face API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let content = '';
      if (Array.isArray(data) && data[0]?.generated_text) {
        content = data[0].generated_text;
      } else if (data.generated_text) {
        content = data.generated_text;
      } else {
        throw new Error('Invalid response from Hugging Face');
      }

      return {
        content: content.trim(),
        usage: {
          promptTokens: this.estimateTokens(prompt),
          completionTokens: this.estimateTokens(content),
          totalTokens: this.estimateTokens(prompt + content)
        },
        model: this.config.model,
        finishReason: 'stop'
      };
    } catch (error) {
      console.error('Hugging Face completion failed:', error);
      throw error;
    }
  }

  private formatPromptForModel(systemMessage: string, userMessages: AIMessage[]): string {
    const modelName = this.config.model.toLowerCase();
    
    // Format for Llama 2 models
    if (modelName.includes('llama') || modelName.includes('code-llama')) {
      const userContent = userMessages.map(m => m.content).join('\n');
      return `<s>[INST] <<SYS>>\n${systemMessage}\n<</SYS>>\n\n${userContent} [/INST]`;
    }
    
    // Format for Mistral models
    if (modelName.includes('mistral')) {
      const userContent = userMessages.map(m => m.content).join('\n');
      return `<s>[INST] ${systemMessage}\n\n${userContent} [/INST]`;
    }
    
    // Format for Zephyr models
    if (modelName.includes('zephyr')) {
      let formatted = `<|system|>\n${systemMessage}</s>\n`;
      userMessages.forEach(msg => {
        formatted += `<|user|>\n${msg.content}</s>\n<|assistant|>\n`;
      });
      return formatted;
    }
    
    // Default format for other models
    const userContent = userMessages.map(m => m.content).join('\n');
    return `${systemMessage}\n\nUser: ${userContent}\nAssistant:`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateCompletion([
        { role: 'user', content: 'Say "OK" if you can hear me.' }
      ]);
      return response.content.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Hugging Face health check failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'Hugging Face';
  }

  getSupportedModels(): string[] {
    return [
      // Apache 2.0 Licensed Models
      'meta-llama/Llama-2-7b-chat-hf',
      'meta-llama/Llama-2-13b-chat-hf',
      'meta-llama/Llama-2-70b-chat-hf',
      'codellama/CodeLlama-7b-Instruct-hf',
      'codellama/CodeLlama-13b-Instruct-hf',
      'codellama/CodeLlama-34b-Instruct-hf',
      'mistralai/Mistral-7B-Instruct-v0.1',
      'mistralai/Mistral-7B-Instruct-v0.2',
      'HuggingFaceH4/zephyr-7b-beta',
      'microsoft/DialoGPT-large',
      'facebook/blenderbot-400M-distill',
      'microsoft/GODEL-v1_1-large-seq2seq',
      // Other popular open models
      'tiiuae/falcon-7b-instruct',
      'tiiuae/falcon-40b-instruct',
      'mosaicml/mpt-7b-chat',
      'mosaicml/mpt-30b-chat'
    ];
  }
}