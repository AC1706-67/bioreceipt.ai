/**
 * Google Gemini Provider Implementation
 */

import { AIProvider, AIMessage, AIResponse, AIProviderConfig } from './AIProvider';

export class GoogleProvider extends AIProvider {
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';

  async initialize(): Promise<void> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Google API key is required');
      }

      this.isInitialized = true;
      console.log('Google provider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google provider:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.config.apiKey;
  }

  async generateCompletion(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error('Google provider not initialized');
    }

    try {
      // Convert messages to Google format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');
      
      // Combine system message with user message for Gemini
      const combinedContent = systemMessage + '\n\n' + userMessages.map(m => m.content).join('\n');

      const requestBody = {
        contents: [{
          parts: [{
            text: combinedContent
          }]
        }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          topP: 0.8,
          topK: 10
        }
      };

      const url = `${this.baseURL}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Google API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Google');
      }

      const content = data.candidates[0].content.parts[0].text;
      const usage = data.usageMetadata || {};

      return {
        content,
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0
        },
        model: this.config.model,
        finishReason: data.candidates[0].finishReason
      };
    } catch (error) {
      console.error('Google completion failed:', error);
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
      console.error('Google health check failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'Google';
  }

  getSupportedModels(): string[] {
    return [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-pro',
      'gemini-pro-vision'
    ];
  }
}