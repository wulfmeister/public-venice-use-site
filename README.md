# 🎁 Venice AI Community Proxy

A free, public API proxy for Venice.ai with a built-in web chat interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Vercel-black.svg)

## Features

- 🤖 **Multiple AI Models** - Access Llama 3.3 70B, DeepSeek R1, and Dolphin Qwen2
- 💬 **Built-in Chat UI** - Beautiful dark-themed chat interface
- 🔄 **Streaming Responses** - See AI responses as they generate
- 💾 **Chat History** - Conversations persist in your browser
- 🛡️ **Rate Limiting** - 20 requests per hour per IP
- 📜 **Terms of Service** - Built-in ToS acceptance flow

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/venice-community-proxy.git
cd venice-community-proxy
```

### 2. Install Vercel CLI (optional, for local development)

```bash
npm install -g vercel
```

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Venice API key:

```
VENICE_API_KEY=your_actual_api_key_here
```

### 4. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy (will prompt for environment variables)
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add `VENICE_API_KEY` in the Environment Variables section
4. Click Deploy

### 5. Local Development

```bash
# Add your API key to .env file first
vercel dev
```

Visit `http://localhost:3000` to see the chat interface.

## Project Structure

```
venice-community-proxy/
├── api/
│   ├── chat.js          # POST /api/chat - main proxy endpoint
│   └── info.js          # GET /api/info - returns available models
├── public/
│   ├── index.html       # Chat UI
│   └── tos.html         # Terms of Service
├── package.json
├── vercel.json          # Vercel configuration
├── .env.example         # Environment template
└── README.md
```

## API Usage

### Chat Endpoint

```bash
curl https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-TOS-Accepted: true" \
  -d '{
    "model": "llama-3.3-70b",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Info Endpoint

```bash
curl https://your-domain.vercel.app/api/info
```

### Available Models

| Model | Description |
|-------|-------------|
| `llama-3.3-70b` | Meta's Llama 3.3 70B parameter model |
| `deepseek-r1-distill-llama-70b` | DeepSeek R1 distilled to Llama 70B |
| `dolphin-2.9.2-qwen2-72b` | Dolphin fine-tuned Qwen2 72B |

### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | required | One of the allowed models |
| `messages` | array | required | Array of message objects |
| `stream` | boolean | `true` | Enable streaming responses |
| `max_tokens` | number | `2048` | Maximum tokens (max 4096) |
| `temperature` | number | `0.7` | Sampling temperature |

### Required Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Request content type |
| `X-TOS-Accepted` | `true` | Acknowledge Terms of Service |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Limit` | Total requests allowed per window |

## Rate Limits

- **20 requests per hour** per IP address
- Rate limit resets on a rolling window
- Exceeding the limit returns HTTP 429

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VENICE_API_KEY` | Yes | Your Venice.ai API key |

## Getting a Venice API Key

1. Go to [venice.ai](https://venice.ai)
2. Create an account or sign in
3. Navigate to API settings
4. Generate a new API key

## License

MIT License - feel free to use this for your own projects!

## Disclaimer

This is a community project and is not affiliated with Venice.ai. The service is provided "as-is" with no guarantees. Users are responsible for all content they generate.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
