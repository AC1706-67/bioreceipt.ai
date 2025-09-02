# OpenAI Integration Guide

## Overview

The BioReceipt BioReceipt now uses real OpenAI integration for AI personalization features. This replaces the previous mock implementation with actual OpenAI API calls.

## Setup

### 1. Install Dependencies

The OpenAI package has been installed:
```bash
npm install openai --legacy-peer-deps
```

### 2. Environment Configuration

Create a `.env` file in the project root with your OpenAI API key:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

### 3. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

## Features Implemented

### 1. AI Personalization Service (`aiPersonalizationService.ts`)

- **Real OpenAI Integration**: Uses OpenAI's chat completions API
- **Fallback System**: Gracefully falls back to mock recommendations when OpenAI is unavailable
- **Error Handling**: Comprehensive error handling with retry logic
- **Caching**: Intelligent caching to reduce API calls and costs

### 2. KIRO AI Service (`kiroAIService.ts`)

- **OpenAI Chat Completions**: Uses GPT-3.5-turbo for generating personalized health tips
- **Structured Prompts**: Well-engineered prompts for consistent, high-quality responses
- **JSON Response Format**: Enforces structured JSON responses for reliable parsing
- **Health Monitoring**: Built-in health checks and status monitoring

## Key Methods

### AI Personalization Service

```typescript
// Get personalized recommendations
const personalizations = await aiPersonalizationService.getUserPersonalizations(userId, limit);

// Check if OpenAI is configured
const isConfigured = aiPersonalizationService.isConfigured();

// Update configuration
aiPersonalizationService.updateConfig({ 
  apiKey: 'new-key',
  model: 'gpt-4',
  temperature: 0.8 
});
```

### KIRO AI Service

```typescript
// Generate personalized tips
const response = await kiroAIService.generatePersonalizedTips(
  userId, 
  profile, 
  engagementData, 
  recentActivity, 
  { count: 5, category: 'nutrition' }
);

// Check service health
const healthStatus = await kiroAIService.getHealthStatus();

// Record user feedback
await kiroAIService.recordFeedback(userId, requestId, tipId, 'positive', 'Very helpful');
```

## Fallback Behavior

When OpenAI is not available (missing API key, network issues, etc.), the system automatically falls back to:

1. **Rule-based recommendations**: Pre-defined health tips based on user preferences
2. **Generic tips**: Universal health advice when personalization isn't possible
3. **Cached responses**: Previously generated AI responses when available

## Cost Optimization

- **Intelligent Caching**: Responses are cached based on confidence levels and user context
- **Request Deduplication**: Prevents duplicate API calls for similar requests
- **Token Management**: Optimized prompts to minimize token usage
- **Fallback First**: Uses fallback for basic scenarios to save API costs

## Error Handling

The integration includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **API Errors**: Graceful degradation to fallback systems
- **Rate Limiting**: Respects OpenAI rate limits with appropriate delays
- **Invalid Responses**: Robust parsing with fallback to text responses

## Testing

The system maintains compatibility with existing tests through:

- **Mock Injection**: Tests can inject mock OpenAI clients
- **Fallback Testing**: Tests verify fallback behavior when AI is unavailable
- **Configuration Testing**: Tests verify proper configuration handling

## Security

- **API Key Protection**: API keys are loaded from environment variables
- **No Key Logging**: API keys are never logged or exposed in responses
- **Error Sanitization**: Error messages don't expose sensitive information

## Monitoring

Built-in monitoring includes:

- **Health Checks**: Regular verification that OpenAI is accessible
- **Response Time Tracking**: Monitoring of API response times
- **Success/Failure Rates**: Tracking of successful vs failed requests
- **Fallback Usage**: Monitoring when fallback systems are used

## Usage Examples

### Basic Personalization

```typescript
import { useAIPersonalization } from '../hooks/useAIPersonalization';

const MyComponent = () => {
  const {
    personalizedTips,
    loading,
    error,
    confidence,
    fallbackUsed,
    refreshTips
  } = useAIPersonalization(userId, 5);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {fallbackUsed && <FallbackNotice />}
      <ConfidenceIndicator confidence={confidence} />
      {personalizedTips.map(tip => (
        <TipCard key={tip.id} tip={tip} />
      ))}
      <RefreshButton onClick={refreshTips} />
    </div>
  );
};
```

### Advanced Configuration

```typescript
// Configure for production
aiPersonalizationService.updateConfig({
  model: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.6
});

// Check configuration
if (!aiPersonalizationService.isConfigured()) {
  console.warn('OpenAI not configured, using fallback mode');
}
```

## Troubleshooting

### Common Issues

1. **"OpenAI API key not found"**
   - Ensure `.env` file exists with `OPENAI_API_KEY`
   - Verify the API key is valid and has sufficient credits

2. **"Invalid JSON response from AI service"**
   - This is handled automatically with fallback to text parsing
   - Check if the model supports JSON response format

3. **High API costs**
   - Review caching configuration
   - Consider using gpt-3.5-turbo instead of gpt-4
   - Implement usage limits in your application

4. **Rate limiting errors**
   - The system automatically retries with exponential backoff
   - Consider upgrading your OpenAI plan for higher rate limits

### Debug Mode

Enable debug logging by setting:
```env
DEBUG_AI_PERSONALIZATION=true
```

This will log detailed information about API calls, caching, and fallback usage.

## Future Enhancements

Planned improvements include:

1. **Fine-tuned Models**: Custom models trained on health data
2. **Embeddings Integration**: Semantic search for better tip matching
3. **Multi-modal Support**: Integration with image and audio content
4. **Advanced Analytics**: Detailed usage and effectiveness tracking
5. **A/B Testing**: Built-in experimentation framework

## Support

For issues related to OpenAI integration:

1. Check the console for error messages
2. Verify your OpenAI API key and credits
3. Review the fallback behavior logs
4. Test with a simple health check call

The system is designed to be resilient and will continue working even when OpenAI is unavailable, ensuring a smooth user experience.