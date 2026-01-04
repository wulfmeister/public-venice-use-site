# Venice AI Community Proxy

A free, privacy-focused API proxy for Venice.ai with a built-in web chat interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Vercel-black.svg)

## Features

- **Privacy-First Architecture** - Zero conversation logging; your chats stay in your browser
- **Multiple AI Models** - Access Venice Uncensored, Llama 3.3 70B, DeepSeek R1, and more (dynamically loaded)
- **Multi-Chat Management** - Create, rename, and organize multiple conversations
- **Private Web Search** - AI can search the web without tracking (via Venice.ai)
- **Light/Dark Theme** - Toggle between light cream and dark modes
- **Streaming Responses** - See AI responses as they generate
- **Local Storage Only** - Conversations persist only in your browser's localStorage
- **Rate Limiting** - 20 requests per hour per IP
- **Terms of Service** - Built-in ToS acceptance flow

## Privacy Architecture

This proxy is designed to maximize user privacy. Here's how data flows:

```
┌─────────────┐    HTTPS/TLS    ┌─────────────┐    HTTPS/TLS    ┌─────────────┐
│   Browser   │ ───────────────▶│   Vercel    │ ───────────────▶│  Venice.ai  │
│             │◀─────────────── │ Edge Proxy  │◀─────────────── │     API     │
└─────────────┘   (encrypted)   └─────────────┘   (encrypted)   └─────────────┘
      │                                │                               │
      │                                │                               │
      ▼                                ▼                               ▼
 localStorage               No content logging              No storage of
 (conversations)            (only IP for rate limit)        prompts/responses
```

### What Gets Logged

| Data | Logged? | Where | Duration |
|------|---------|-------|----------|
| Prompts/Messages | No | - | - |
| AI Responses | No | - | - |
| Conversation History | No | Browser only | Until cleared |
| IP Addresses | Yes | In-memory | Until cold start |
| Model Selection | Yes | In-memory | Per request |
| Error Details | Yes | Vercel logs | Standard retention |

### Privacy Guarantees

1. **This Proxy**: Does not log, store, or have access to conversation content. Request bodies are parsed, validated, and forwarded without persistence.

2. **Venice.ai**: Does not store prompts or model responses on their servers. Conversations exist only in your browser's localStorage. See [Venice.ai Privacy Architecture](https://venice.ai/privacy).

3. **Vercel**: Provides hosting infrastructure with TLS 1.2/1.3 encryption. Does not log request/response bodies by default. See [Vercel Security Docs](https://vercel.com/docs/security).

4. **Encryption**: All traffic is encrypted end-to-end using TLS. Vercel enforces HTTPS and does not allow unencrypted connections.

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
│   ├── chat.js          # POST /api/chat - main proxy endpoint (Edge Runtime)
│   └── info.js          # GET /api/info - returns available models + capabilities
├── public/
│   ├── index.html       # Chat UI (single-page app with multi-chat, themes)
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
    "model": "venice-uncensored",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true,
    "enable_web_search": "auto"
  }'
```

### Info Endpoint

```bash
curl https://your-domain.vercel.app/api/info
```

Returns available models and their capabilities (web search, vision, reasoning, etc.).

### Available Models

Models are dynamically loaded from Venice.ai's API and filtered by cost thresholds:
- Max input price: $2.00 per 1M tokens
- Max output price: $6.00 per 1M tokens

Common models include:

| Model | Description |
|-------|-------------|
| `venice-uncensored` | Venice's uncensored model (default) |
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
| `enable_web_search` | string | `"auto"` | `"auto"`, `"on"`, or `"off"` |

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
- Rate limit data is stored in-memory and resets on cold starts

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VENICE_API_KEY` | Yes | Your Venice.ai API key |

## Getting a Venice API Key

1. Go to [venice.ai](https://venice.ai)
2. Create an account or sign in
3. Navigate to API settings
4. Generate a new API key

## Architecture Notes

### Edge Runtime

The chat endpoint runs on Vercel's Edge Runtime (`runtime: 'edge'`), which provides:
- Low latency globally
- Streaming support
- No cold start delays
- Stateless execution (rate limits reset on new instances)

### Streaming

Responses are streamed directly from Venice.ai to the browser. The proxy pipes the response body through without buffering, enabling real-time token display.

### Model Filtering

Models are filtered by cost on first request and cached in memory. This ensures users can only access reasonably-priced models while keeping the list dynamic as Venice adds new models.

## License

MIT License - feel free to use this for your own projects!

## Disclaimer

This is a community project and is not affiliated with Venice.ai. The service is provided "as-is" with no guarantees. Users are responsible for all content they generate.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
