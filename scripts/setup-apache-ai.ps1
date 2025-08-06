# Apache 2.0 AI Models Setup Script for Windows
# This script helps you set up free, open-source AI models for your HealthyTipApp

Write-Host "🚀 BioPulse Apache 2.0 AI Models Setup" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to setup Ollama
function Setup-Ollama {
    Write-Host "📦 Setting up Ollama (Recommended for beginners)..." -ForegroundColor Yellow
    
    if (Test-Command ollama) {
        Write-Host "✅ Ollama is already installed" -ForegroundColor Green
    } else {
        Write-Host "📥 Please install Ollama manually:" -ForegroundColor Cyan
        Write-Host "1. Go to https://ollama.ai/" -ForegroundColor White
        Write-Host "2. Download Ollama for Windows" -ForegroundColor White
        Write-Host "3. Run the installer" -ForegroundColor White
        Write-Host "4. Restart this script" -ForegroundColor White
        return
    }
    
    Write-Host "🔄 Pulling Apache 2.0 licensed models..." -ForegroundColor Yellow
    ollama pull llama2        # Llama 2 7B (Apache 2.0)
    ollama pull codellama     # Code Llama (Apache 2.0)
    ollama pull mistral       # Mistral 7B (Apache 2.0)
    
    Write-Host "✅ Ollama setup complete!" -ForegroundColor Green
    Write-Host "💡 Add to your .env file:" -ForegroundColor Cyan
    Write-Host "OLLAMA_ENABLED=true" -ForegroundColor White
    Write-Host "OLLAMA_MODEL=llama2" -ForegroundColor White
    Write-Host ""
}

# Function to setup Hugging Face
function Setup-HuggingFace {
    Write-Host "🤗 Setting up Hugging Face (Cloud-based)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 Steps to get your free Hugging Face API key:" -ForegroundColor Cyan
    Write-Host "1. Go to https://huggingface.co/" -ForegroundColor White
    Write-Host "2. Create a free account" -ForegroundColor White
    Write-Host "3. Go to Settings > Access Tokens" -ForegroundColor White
    Write-Host "4. Create a new token" -ForegroundColor White
    Write-Host "5. Add it to your .env file:" -ForegroundColor White
    Write-Host ""
    Write-Host "HUGGINGFACE_API_KEY=your_token_here" -ForegroundColor Green
    Write-Host "HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Recommended Apache 2.0 models:" -ForegroundColor Cyan
    Write-Host "- meta-llama/Llama-2-7b-chat-hf (General purpose)" -ForegroundColor White
    Write-Host "- codellama/CodeLlama-7b-Instruct-hf (Code-focused)" -ForegroundColor White
    Write-Host "- mistralai/Mistral-7B-Instruct-v0.2 (Fast & efficient)" -ForegroundColor White
    Write-Host ""
}

# Function to setup llama.cpp
function Setup-LlamaCpp {
    Write-Host "⚡ Setting up llama.cpp (Best performance)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 Manual setup required for Windows:" -ForegroundColor Cyan
    Write-Host "1. Install Visual Studio Build Tools or Visual Studio" -ForegroundColor White
    Write-Host "2. Install Git for Windows" -ForegroundColor White
    Write-Host "3. Clone llama.cpp:" -ForegroundColor White
    Write-Host "   git clone https://github.com/ggerganov/llama.cpp" -ForegroundColor Gray
    Write-Host "4. Build with CMake:" -ForegroundColor White
    Write-Host "   cd llama.cpp" -ForegroundColor Gray
    Write-Host "   mkdir build && cd build" -ForegroundColor Gray
    Write-Host "   cmake .." -ForegroundColor Gray
    Write-Host "   cmake --build . --config Release" -ForegroundColor Gray
    Write-Host "5. Download model:" -ForegroundColor White
    Write-Host "   Download from: https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF" -ForegroundColor Gray
    Write-Host "6. Run server:" -ForegroundColor White
    Write-Host "   .\server.exe -m llama-2-7b-chat.Q4_K_M.gguf -c 2048 --host 0.0.0.0 --port 8080" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Add to your .env file:" -ForegroundColor Cyan
    Write-Host "LOCAL_LLAMA_ENABLED=true" -ForegroundColor Green
    Write-Host "LOCAL_LLAMA_MODEL=llama-2-7b-chat" -ForegroundColor Green
    Write-Host "LOCAL_LLAMA_BASE_URL=http://localhost:8080" -ForegroundColor Green
    Write-Host ""
}

# Main menu
Write-Host "Choose your setup option:" -ForegroundColor Cyan
Write-Host "1) 🤗 Hugging Face API (Easiest, requires internet)" -ForegroundColor White
Write-Host "2) 📦 Ollama (User-friendly, runs locally)" -ForegroundColor White
Write-Host "3) ⚡ llama.cpp (Best performance, runs locally)" -ForegroundColor White
Write-Host "4) 📚 Show all options" -ForegroundColor White
Write-Host "5) ❌ Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Setup-HuggingFace
    }
    "2" {
        Setup-Ollama
    }
    "3" {
        Setup-LlamaCpp
    }
    "4" {
        Write-Host "🎯 All Apache 2.0 AI Setup Options:" -ForegroundColor Green
        Write-Host ""
        Setup-HuggingFace
        Write-Host "----------------------------------------" -ForegroundColor Gray
        Setup-Ollama
        Write-Host "----------------------------------------" -ForegroundColor Gray
        Write-Host "💡 For llama.cpp setup, run this script again and choose option 3" -ForegroundColor Cyan
    }
    "5" {
        Write-Host "👋 Goodbye!" -ForegroundColor Green
        exit 0
    }
    default {
        Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host "📖 For more details, see: APACHE_2_0_AI_MODELS_GUIDE.md" -ForegroundColor Cyan
Write-Host "🧪 Test your setup by running your HealthyTipApp" -ForegroundColor Cyan
Write-Host ""