#!/bin/bash

# Apache 2.0 AI Models Setup Script
# This script helps you set up free, open-source AI models for your HealthyTipApp

echo "🚀 BioPulse Apache 2.0 AI Models Setup"
echo "======================================"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to setup Ollama
setup_ollama() {
    echo "📦 Setting up Ollama (Recommended for beginners)..."
    
    if command_exists ollama; then
        echo "✅ Ollama is already installed"
    else
        echo "📥 Installing Ollama..."
        curl -fsSL https://ollama.ai/install.sh | sh
    fi
    
    echo "🔄 Pulling Apache 2.0 licensed models..."
    ollama pull llama2        # Llama 2 7B (Apache 2.0)
    ollama pull codellama     # Code Llama (Apache 2.0)
    ollama pull mistral       # Mistral 7B (Apache 2.0)
    
    echo "✅ Ollama setup complete!"
    echo "💡 Add to your .env file:"
    echo "OLLAMA_ENABLED=true"
    echo "OLLAMA_MODEL=llama2"
    echo ""
}

# Function to setup llama.cpp
setup_llamacpp() {
    echo "⚡ Setting up llama.cpp (Best performance)..."
    
    if [ ! -d "llama.cpp" ]; then
        echo "📥 Cloning llama.cpp..."
        git clone https://github.com/ggerganov/llama.cpp
    fi
    
    cd llama.cpp
    echo "🔨 Building llama.cpp..."
    make
    
    echo "📥 Downloading Llama 2 7B Chat model (Apache 2.0)..."
    if [ ! -f "llama-2-7b-chat.Q4_K_M.gguf" ]; then
        wget https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_K_M.gguf
    fi
    
    echo "🚀 Starting llama.cpp server..."
    echo "💡 Server will run on http://localhost:8080"
    echo "💡 Add to your .env file:"
    echo "LOCAL_LLAMA_ENABLED=true"
    echo "LOCAL_LLAMA_MODEL=llama-2-7b-chat"
    echo "LOCAL_LLAMA_BASE_URL=http://localhost:8080"
    echo ""
    echo "🔄 Starting server (press Ctrl+C to stop)..."
    ./server -m llama-2-7b-chat.Q4_K_M.gguf -c 2048 --host 0.0.0.0 --port 8080
}

# Function to setup Hugging Face
setup_huggingface() {
    echo "🤗 Setting up Hugging Face (Cloud-based)..."
    echo ""
    echo "📝 Steps to get your free Hugging Face API key:"
    echo "1. Go to https://huggingface.co/"
    echo "2. Create a free account"
    echo "3. Go to Settings > Access Tokens"
    echo "4. Create a new token"
    echo "5. Add it to your .env file:"
    echo ""
    echo "HUGGINGFACE_API_KEY=your_token_here"
    echo "HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf"
    echo ""
    echo "🎯 Recommended Apache 2.0 models:"
    echo "- meta-llama/Llama-2-7b-chat-hf (General purpose)"
    echo "- codellama/CodeLlama-7b-Instruct-hf (Code-focused)"
    echo "- mistralai/Mistral-7B-Instruct-v0.2 (Fast & efficient)"
    echo ""
}

# Main menu
echo "Choose your setup option:"
echo "1) 🤗 Hugging Face API (Easiest, requires internet)"
echo "2) 📦 Ollama (User-friendly, runs locally)"
echo "3) ⚡ llama.cpp (Best performance, runs locally)"
echo "4) 📚 Show all options"
echo "5) ❌ Exit"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        setup_huggingface
        ;;
    2)
        setup_ollama
        ;;
    3)
        setup_llamacpp
        ;;
    4)
        echo "🎯 All Apache 2.0 AI Setup Options:"
        echo ""
        setup_huggingface
        echo "----------------------------------------"
        setup_ollama
        echo "----------------------------------------"
        echo "💡 For llama.cpp setup, run: ./scripts/setup-apache-ai.sh and choose option 3"
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup complete!"
echo "📖 For more details, see: APACHE_2_0_AI_MODELS_GUIDE.md"
echo "🧪 Test your setup by running your HealthyTipApp"
echo ""