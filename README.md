# OpenChat

A free, privacy-focused AI chat app powered by Venice.ai with a built-in Next.js interface.

**[Try the free public demo](https://public-venice-use-site.vercel.app/)**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Vercel-black.svg)
[![Venice AI](https://img.shields.io/badge/Powered%20by-Venice.ai-purple)](https://venice.ai)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4.svg?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-tested-6E9F18.svg?logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-e2e-2EAD33.svg?logo=playwright&logoColor=white)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](https://github.com/yourusername/openchat/issues)

## Features

- **Privacy-First Architecture** — Zero conversation logging; chats stay in your browser
- **Multiple AI Models** — Access GLM 5, Llama 3.3 70B, DeepSeek R1, and more via a custom model dropdown with capability badges (Vision, Web Search)
- **Multi-Chat Management** — Create, rename, and organize conversations with date-grouped sidebar (Today, Yesterday, This Week, etc.) and search
- **Image Generation & Upscaling** — Generate images with Nano Banana, Venice SD3.5, Seedream, and upscale existing images
- **File Analysis** — Upload CSV, PDF, and XLSX files for AI-assisted analysis
- **Syntax Highlighting** — Code blocks render with Prism.js token coloring (16 languages) and one-click copy
- **Message Actions** — Copy any message or regenerate the last assistant response on hover
- **Private Web Search** — AI searches the web without tracking (via Venice.ai)
- **Custom System Prompt** — Configure a persistent system prompt for all conversations
- **Scheduled Daily Prompts** — Set a prompt to auto-run at a specific time with browser notifications
- **Light / Dark Theme** — Toggle between light and dark modes with theme-aware syntax highlighting
- **Streaming Responses** — See AI responses as they generate in real-time
- **Modern UI** — Shimmer loading skeletons, glassmorphism header, gradient welcome screen with quick-action cards
- **Link Previews** — Dynamic Open Graph image generation for rich Slack/iMessage/social previews
- **Rate Limiting** — 20 requests per hour per IP with progressive color indicator (green → amber → red)
- **OpenAI-Compatible Endpoint** — Use as a drop-in Venice proxy at `/v1/chat/completions`

## Application State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION STATES                           │
│                                                                     │
│  ┌──────────┐   accept    ┌──────────┐  select   ┌──────────────┐  │
│  │   TOS    │ ──────────▸ │   IDLE   │ ───────▸  │   CHATTING   │  │
│  │  GATE    │             │  (empty) │ ◂───────  │  (streaming) │  │
│  └──────────┘             └──────────┘  new chat  └──────────────┘  │
│       │                     │    ▴                    │    │        │
│       │ reject              │    │ done               │    │        │
│       ▾                     ▾    │                    ▾    │        │
│  ┌──────────┐           ┌──────────────┐        ┌─────────┐        │
│  │  BLOCKED │           │   GENERATING │        │ ERROR   │        │
│  │  (no UI) │           │   (image)    │        │ (retry) │        │
│  └──────────┘           └──────────────┘        └─────────┘        │
│                                                                     │
│  ── Overlays (available in any state) ──────────────────────────    │
│  Sidebar: search, date-grouped conversations, system prompt,        │
│           scheduled prompt                                          │
│  Header: model dropdown (text + image models, web search toggle,    │
│          capability badges, rate limit), settings gear, theme btn   │
│  Messages: hover actions (copy, regenerate), syntax-highlighted     │
│            code blocks with copy button                             │
│  Toasts: error / success / info notifications (bottom-right)        │
│  Scheduled: background timer → auto-creates/updates conversation    │
└─────────────────────────────────────────────────────────────────────┘
```

### State Transitions

| From         | Event                     | To                  | Description                                      |
| ------------ | ------------------------- | ------------------- | ------------------------------------------------ |
| `TOS_GATE`   | User accepts ToS          | `IDLE`              | ToS flag saved to localStorage                   |
| `TOS_GATE`   | User rejects              | `BLOCKED`           | Cannot use the app                               |
| `IDLE`       | User sends message        | `CHATTING`          | New conversation auto-created                    |
| `IDLE`       | User clicks "New Chat"    | `IDLE`              | Empty conversation created                       |
| `IDLE`       | User selects conversation | `CHATTING`          | Existing conversation loaded                     |
| `CHATTING`   | User sends message        | `CHATTING`          | Message added, streaming begins                  |
| `CHATTING`   | Stream completes          | `CHATTING`          | Assistant response finalized                     |
| `CHATTING`   | Stream error              | `ERROR`             | Error displayed, user can retry                  |
| `CHATTING`   | User deletes all convos   | `IDLE`              | Reset to empty state                             |
| `IDLE`       | User requests image       | `GENERATING`        | Image generation request sent                    |
| `GENERATING` | Image received            | `IDLE` / `CHATTING` | Image displayed                                  |
| `*`          | Rate limit hit            | `ERROR`             | 429 response, retry timer shown                  |
| `*`          | Scheduled prompt fires    | `CHATTING`          | Background prompt sent to dedicated conversation |

### Data Flow

```
┌───────────────┐     POST /api/chat     ┌──────────────┐     POST /chat/completions     ┌─────────────┐
│               │ ─────────────────────▸ │              │ ─────────────────────────────▸ │             │
│    Browser    │     (streaming SSE)     │  Next.js API │     (streaming SSE)            │  Venice.ai  │
│               │ ◂───────────────────── │    Routes    │ ◂───────────────────────────── │     API     │
└───────────────┘                        └──────────────┘                                └─────────────┘
       │                                        │
       │ localStorage                           │ In-memory only
       │ IndexedDB (images)                     │ (rate limit counters,
       ▾                                        │  model cache 5 min TTL)
  Conversations, settings               No content stored
  Theme, system prompt                    IP → request count
  Scheduled prompt config
```

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourusername/openchat.git
cd openchat
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Venice API key:

```
VENICE_API_KEY=your_actual_api_key_here
```

### 3. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 4. Deploy to Vercel

```bash
vercel --prod
```

Or push to GitHub and import in the [Vercel dashboard](https://vercel.com). Add `VENICE_API_KEY` as an environment variable.

## Project Structure

```
openchat/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main page component
│   ├── globals.css             # Tailwind + theme CSS variables
│   └── api/
│       ├── chat/route.ts       # POST — chat proxy with streaming
│       ├── image/route.ts      # POST — image generation
│       ├── upscale/route.ts    # POST — image upscaling
│       ├── info/route.ts       # GET  — available models + capabilities
│       └── og/route.tsx        # GET  — dynamic Open Graph preview image
├── components/client/
│   ├── ChatArea.tsx            # Message list + scroll management
│   ├── Header.tsx              # Model dropdown, settings, theme toggle
│   ├── InputArea.tsx           # Chat input orchestration
│   ├── Message.tsx             # Message rendering, syntax highlighting, actions
│   ├── QuickActions.tsx        # Quick action chips
│   ├── Sidebar.tsx             # Search, date-grouped conversations, settings
│   ├── SystemPromptSettings.tsx # Custom system prompt editor
│   ├── ScheduledPrompt.tsx     # Scheduled daily prompt UI
│   ├── TermsOfService.tsx      # ToS acceptance gate
│   ├── WelcomeMessage.tsx      # Welcome screen with quick-action card grid
│   └── input/
│       ├── InputComposer.tsx   # Text input + button groups + stop control
│       ├── InputAttachments.tsx # File/image attachment UI
│       └── input-types.ts      # Attachment type definitions
├── contexts/
│   ├── AppContext.tsx           # App settings (model, web search, ToS)
│   ├── ChatContext.tsx          # Conversations, messages, file uploads
│   ├── ToastContext.tsx         # Toast notifications (error/success/info)
│   └── ThemeContext.tsx         # Light/dark theme persistence
├── hooks/
│   └── useScheduledPrompt.ts   # Scheduled prompt timer + execution
├── lib/
│   ├── api-utils.ts            # CORS, rate limit, validation helpers (server)
│   ├── chat-api.ts             # Client-side chat request wrapper
│   ├── constants.ts            # App-wide constants and defaults
│   ├── file-parser.ts          # CSV, PDF, XLSX parsing and file context builder
│   ├── id-generator.ts         # Scoped UUID generation (conv-*, msg-*, img-*)
│   ├── image-store.ts          # IndexedDB image blob storage
│   ├── markdown.ts             # Markdown → HTML with citation links
│   ├── rate-limit.ts           # Sliding-window per-IP rate limiter (server)
│   ├── storage.ts              # localStorage typed getters/setters
│   ├── streaming.ts            # SSE stream parser + citation normalizer
│   ├── types.ts                # TypeScript interfaces
│   ├── validation.ts           # Input validators (URL, role, data URL)
│   ├── venice-models.ts        # Model fetching, price filtering, caching
│   └── __tests__/              # Unit tests (vitest)
├── e2e/                        # Playwright end-to-end tests
├── public/
│   ├── tos.html                # Terms of Service page
│   └── pdf.worker.min.mjs     # PDF.js worker for client-side PDF parsing
├── vitest.config.ts            # Unit test config
├── playwright.config.ts        # E2E test config
├── tailwind.config.ts
├── next.config.js
├── package.json
└── vercel.json                 # Vercel rewrites (/v1/* → /api/chat)
```

## API Reference

### `POST /api/chat` — Chat Completions

Proxies to Venice's `/chat/completions` with validation and rate limiting.

```bash
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-TOS-Accepted: true" \
  -d '{
    "model": "zai-org-glm-5",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true,
    "enable_web_search": "auto"
  }'
```

| Parameter           | Type    | Default  | Description                           |
| ------------------- | ------- | -------- | ------------------------------------- |
| `model`             | string  | required | Model ID (from `/api/info`)           |
| `messages`          | array   | required | `[{role, content}]` (max 50 messages) |
| `stream`            | boolean | `true`   | Enable SSE streaming                  |
| `max_tokens`        | integer | `2048`   | Max response tokens (up to 4096)      |
| `temperature`       | number  | `0.7`    | Sampling temperature (0–2)            |
| `enable_web_search` | string  | `"auto"` | `"auto"`, `"on"`, or `"off"`          |
| `system_prompt`     | string  | —        | Custom system prompt (max 4000 chars) |
| `image_data_url`    | string  | —        | Base64 image for vision models        |

### `POST /api/image` — Image Generation

```bash
curl -X POST https://your-domain.vercel.app/api/image \
  -H "Content-Type: application/json" \
  -H "X-TOS-Accepted: true" \
  -d '{"prompt": "A sunset over mountains", "model": "nano-banana-pro"}'
```

### `POST /api/upscale` — Image Upscaling

```bash
curl -X POST https://your-domain.vercel.app/api/upscale \
  -H "Content-Type: application/json" \
  -H "X-TOS-Accepted: true" \
  -d '{"image_data_url": "data:image/png;base64,...", "scale": 2}'
```

### `GET /api/info` — Available Models

Returns all available text/image models, capabilities, and rate limit info.

### Required Headers

| Header           | Value              | Description                  |
| ---------------- | ------------------ | ---------------------------- |
| `Content-Type`   | `application/json` | Request content type         |
| `X-TOS-Accepted` | `true`             | Acknowledge Terms of Service |

### Response Headers

| Header                  | Description                       |
| ----------------------- | --------------------------------- |
| `X-RateLimit-Remaining` | Requests remaining in window      |
| `X-RateLimit-Limit`     | Total requests allowed per window |

## Privacy Architecture

| Data               | Stored?     | Where                | Duration         |
| ------------------ | ----------- | -------------------- | ---------------- |
| Prompts / Messages | No (server) | Browser localStorage | Until cleared    |
| AI Responses       | No (server) | Browser localStorage | Until cleared    |
| Images             | No (server) | Browser IndexedDB    | Until cleared    |
| IP Addresses       | In-memory   | Server               | Until cold start |
| API Key            | Server env  | Vercel secrets       | Persistent       |

The proxy **never** logs, stores, or has access to conversation content. Requests are validated, forwarded to Venice, and the response is streamed back.

## Testing

```bash
# Unit tests
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report

# End-to-end tests
npx playwright test         # Run e2e tests
npx playwright test --ui    # Interactive UI mode
```

## Rate Limits

- **20 requests per hour** per IP address (rolling window)
- Exceeding returns HTTP 429 with `Retry-After` header
- In-memory tracking resets on cold starts / deployments

## Environment Variables

| Variable              | Required | Description                                          |
| --------------------- | -------- | ---------------------------------------------------- |
| `VENICE_API_KEY`      | Yes      | Your Venice.ai API key                               |
| `ALLOWED_ORIGIN`      | No       | CORS origin restriction (defaults to `*`)            |
| `NEXT_PUBLIC_BASE_URL`| No       | Base URL for OG images (auto-detected on Vercel)     |

Get a key at [venice.ai](https://venice.ai) → API settings.

## License

MIT License — feel free to use this for your own projects.

## Disclaimer

This is a community project and is not affiliated with Venice.ai. The service is provided "as-is" with no guarantees.

## Contributing

Contributions welcome! See [agents.md](agents.md) for codebase guide and conventions.
