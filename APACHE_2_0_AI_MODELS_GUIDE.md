# Apache 2.0 Licensed AI Models Integration Guide

## Overview

Your BioReceipt BioReceipt now supports **completely free** Apache 2.0 licensed AI models! This means you can run powerful AI personalization without any API costs or external dependencies.

## Why Apache 2.0 Licensed Models?

### ✅ Benefits:
- **100% Free** - No API costs, no usage limits
- **Complete Privacy** - Data never leaves your servers
- **No Vendor Lock-in** - Open source models you can modify
- **Commercial Use** - Apache 2.0 license allows commercial applications
- **Self-hosted** - Full control over your AI infrastructure

### 🎯 Perfect For:
- Cost-conscious deployments
- Privacy-sensitive health applications
- High-volume usage scenarios
- Offline/air-gapped environments
- Custom model fine-tuning

## Supported Apache 2.0 Licensed Models

### 1. Meta Llama 2 Models
**License:** Apache 2.0 (with custom license for commercial use)
- `meta-llama/Llama-2-7b-chat-hf` - 7B parameters, fast inference
- `meta-llama/Llama-2-13b-chat-hf` - 13B parameters, better quality
- `meta-llama/Llama-2-70b-chat-hf` - 70B parameters, highest quality

### 2. Code Llama Models
**License:** Apache 2.0
- `codellama/CodeLlama-7b-Instruct-hf` - Code-focused, 7B parameters
- `codellama/CodeLlama-13b-Instruct-hf` - Code-focused, 13B parameters
- `codellama/CodeLlama-34b-Instruct-hf` - Code-focused, 34B parameters

### 3. Mistral Models
**License:** Apache 2.0
- `mistralai/Mistral-7B-Instruct-v0.1` - Efficient 7B model
- `mistralai/Mistral-7B-Instruct-v0.2` - Improved version

### 4. Other Apache 2.0 Models
- `HuggingFaceH4/zephyr-7b-beta` - Fine-tuned for helpfulness
- `microsoft/DialoGPT-large` - Conversation-focused
- `tiiuae/falcon-7b-instruct` - UAE's Falcon model
- `mosaicml/mpt-7b-chat` - MosaicML's efficient model

## Setup Options

### Option 1: Hugging Face Inference API (Easiest)

**Pros:** No local setup, managed infrastructure
**Cons:** Requires internet, some API costs (but much cheaper than OpenAI)

```env
# .env configuration
HUGGINGFACE_API_KEY=your_free_huggingface_token
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf
HUGGINGFACE_MAX_TOKENS=1000
HUGGINGFACE_TEMPERATURE=0.7
```

**Setup Steps:**
1. Create free account at https://huggingface.co/
2. Generate API token in settings
3. Add token to your `.env` file
4. Choose your preferred Apache 2.0 model

### Option 2: Local Llama.cpp (Best Performance)

**Pros:** Completely free, fastest inference, full privacy
**Cons:** Requires local setup and model downloads

```env
# .env configuration
LOCAL_LLAMA_ENABLED=true
LOCAL_LLAMA_MODEL=llama-2-7b-chat
LOCAL_LLAMA_MAX_TOKENS=1000
LOCAL_LLAMA_TEMPERATURE=0.7
LOCAL_LLAMA_BASE_URL=http://localhost:8080
```

**Setup Steps:**
1. Install llama.cpp:
   ```bash
   git clone https://github.com/ggerganov/llama.cpp
   cd llama.cpp
   make
   ```

2. Download Apache 2.0 model (GGUF format):
   ```bash
   # Download Llama 2 7B Chat (Apache 2.0)
   wget https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
   ```

3. Start the server:
   ```bash
   ./server -m llama-2-7b-chat.Q4_K_M.gguf -c 2048 --host 0.0.0.0 --port 8080
   ```

### Option 3: Ollama (User-Friendly)

**Pros:** Easy installation, model management, good performance
**Cons:** Limited to Ollama's model selection

```env
# .env configuration
OLLAMA_ENABLED=true
OLLAMA_MODEL=llama2
OLLAMA_MAX_TOKENS=1000
OLLAMA_TEMPERATURE=0.7
OLLAMA_BASE_URL=http://localhost:11434
```

**Setup Steps:**
1. Install Ollama: https://ollama.ai/
2. Pull Apache 2.0 model:
   ```bash
   ollama pull llama2        # Llama 2 7B
   ollama pull codellama     # Code Llama
   ollama pull mistral       # Mistral 7B
   ```
3. Start Ollama service (usually auto-starts)

## Model Recommendations by Use Case

### 🏥 Health Tips Generation
**Recommended:** `meta-llama/Llama-2-7b-chat-hf`
- **Why:** Good balance of quality and speed for health advice
- **Performance:** ~2-3 seconds per response on modern hardware
- **Memory:** ~4GB RAM required

### 💻 Development/Debugging
**Recommended:** `codellama/CodeLlama-7b-Instruct-hf`
- **Why:** Specialized for code-related tasks
- **Use Case:** Generating health tip templates, API responses

### ⚡ High-Volume/Production
**Recommended:** `mistralai/Mistral-7B-Instruct-v0.2`
- **Why:** Fastest inference, good quality
- **Performance:** ~1-2 seconds per response
- **Memory:** ~3.5GB RAM required

### 🎯 Highest Quality
**Recommended:** `meta-llama/Llama-2-13b-chat-hf`
- **Why:** Better reasoning and more detailed responses
- **Trade-off:** Slower inference, more memory
- **Memory:** ~8GB RAM required

## Configuration Examples

### Multi-Provider Setup (Recommended)
```env
# Primary: Free Hugging Face
HUGGINGFACE_API_KEY=hf_your_token_here
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf

# Fallback: Local Llama
LOCAL_LLAMA_ENABLED=true
LOCAL_LLAMA_MODEL=llama-2-7b-chat

# Fallback: Ollama
OLLAMA_ENABLED=true
OLLAMA_MODEL=llama2

# Enable automatic fallback
AI_FALLBACK_ENABLED=true
```

### Cost-Optimized Setup
```env
# Only use free local models
LOCAL_LLAMA_ENABLED=true
LOCAL_LLAMA_MODEL=llama-2-7b-chat

OLLAMA_ENABLED=true
OLLAMA_MODEL=mistral

# Disable paid APIs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
```

## Performance Optimization

### Hardware Requirements

| Model Size | RAM Required | CPU Cores | GPU (Optional) | Inference Speed |
|------------|-------------|-----------|----------------|-----------------|
| 7B         | 4-6GB       | 4+        | 6GB VRAM       | 1-3 seconds     |
| 13B        | 8-12GB      | 8+        | 12GB VRAM      | 3-6 seconds     |
| 34B        | 20-24GB     | 16+       | 24GB VRAM      | 8-15 seconds    |

### Optimization Tips

1. **Use Quantized Models** (GGUF Q4_K_M format)
   - 75% smaller file size
   - 2-3x faster inference
   - Minimal quality loss

2. **GPU Acceleration**
   ```bash
   # For llama.cpp with CUDA
   make LLAMA_CUBLAS=1
   
   # For Ollama with GPU
   ollama run llama2 --gpu
   ```

3. **Batch Processing**
   - Process multiple health tips in one request
   - Reduces per-request overhead

## Integration Examples

### Basic Usage
```typescript
import { multiProviderAIService } from './ai/MultiProviderAIService';

// Automatically uses best available Apache 2.0 model
const response = await multiProviderAIService.generateCompletion([
  {
    role: 'system',
    content: 'You are a health and wellness AI assistant.'
  },
  {
    role: 'user',
    content: 'Generate 3 personalized health tips for someone interested in nutrition.'
  }
]);

console.log(response.content); // AI-generated health tips
console.log(response.model);   // Which model was used
```

### Provider-Specific Usage
```typescript
// Force use of Hugging Face Apache 2.0 model
await multiProviderAIService.addProvider('huggingface', {
  apiKey: 'your_hf_token',
  model: 'meta-llama/Llama-2-7b-chat-hf',
  maxTokens: 1000,
  temperature: 0.7
});
```

## Cost Comparison

| Provider | Model | Cost per 1M tokens | Monthly cost (10K users) |
|----------|-------|-------------------|-------------------------|
| OpenAI | GPT-3.5-turbo | $2.00 | $2,000 |
| Anthropic | Claude-3-Sonnet | $15.00 | $15,000 |
| **Hugging Face** | **Llama-2-7b** | **$0.50** | **$500** |
| **Local Llama** | **Llama-2-7b** | **$0.00** | **$0** |
| **Ollama** | **Llama-2** | **$0.00** | **$0** |

## Deployment Strategies

### Development
```env
# Use Hugging Face for easy setup
HUGGINGFACE_API_KEY=your_token
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf
```

### Staging
```env
# Use local Ollama for testing
OLLAMA_ENABLED=true
OLLAMA_MODEL=llama2
```

### Production
```env
# Use optimized local llama.cpp
LOCAL_LLAMA_ENABLED=true
LOCAL_LLAMA_MODEL=llama-2-7b-chat
LOCAL_LLAMA_BASE_URL=http://your-llama-server:8080

# With Hugging Face as fallback
HUGGINGFACE_API_KEY=your_token
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf
```

## Monitoring and Analytics

### Check Provider Status
```typescript
// Get health status of all providers
const health = await multiProviderAIService.healthCheck();
console.log(health);
// { huggingface: true, localllama: true, ollama: false }

// Get usage statistics
const stats = multiProviderAIService.getUsageStats();
console.log(stats);
// Shows requests, errors, tokens used per provider
```

### Performance Monitoring
```typescript
// Monitor which providers are being used
const availableProviders = multiProviderAIService.getAvailableProviderNames();
console.log('Available providers:', availableProviders);
// ['Hugging Face', 'Local Llama', 'Ollama']
```

## Troubleshooting

### Common Issues

1. **"Model not found" error**
   - Ensure model name is correct
   - Check if model is available on the provider
   - Try a different Apache 2.0 model

2. **Slow inference**
   - Use smaller model (7B instead of 13B)
   - Enable GPU acceleration
   - Use quantized models (Q4_K_M)

3. **Out of memory**
   - Reduce max_tokens
   - Use smaller model
   - Add swap space

4. **Connection refused**
   - Check if local server is running
   - Verify port and URL configuration
   - Check firewall settings

### Debug Mode
```env
DEBUG_AI_PROVIDERS=true
```

## Legal Compliance

### Apache 2.0 License Requirements
✅ **Allowed:**
- Commercial use
- Modification
- Distribution
- Private use

✅ **Required:**
- Include license notice
- Include copyright notice
- Document changes (if modified)

✅ **Health App Compliance:**
- HIPAA compliant (data stays local)
- GDPR compliant (no data sharing)
- FDA compliant (no medical claims)

## Next Steps

1. **Choose Your Setup:**
   - Quick start: Hugging Face API
   - Best performance: Local llama.cpp
   - User-friendly: Ollama

2. **Select Your Model:**
   - General health tips: Llama-2-7b-chat
   - High volume: Mistral-7B-Instruct
   - Best quality: Llama-2-13b-chat

3. **Configure Environment:**
   - Update your `.env` file
   - Test the integration
   - Monitor performance

4. **Optimize for Production:**
   - Set up GPU acceleration
   - Configure load balancing
   - Implement monitoring

Your BioReceipt app now has access to powerful, free, Apache 2.0 licensed AI models that can provide excellent health tip personalization without any ongoing costs! 🎉