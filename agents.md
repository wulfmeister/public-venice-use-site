# Venice AI Community Proxy — Agent Guide

## Overview

This is a Next.js 16 app that acts as a privacy-focused proxy for Venice.ai's API, with a built-in React chat interface. All conversation data lives in the browser (localStorage + IndexedDB); the server only forwards validated requests to Venice.

## Architecture

```
Browser (React SPA)
  └─ contexts/ (AppContext, ChatContext, ThemeContext, ToastContext)
  └─ components/client/ (all 'use client' components)
  └─ hooks/ (useScheduledPrompt)
  └─ lib/ (client-side: chat-api, streaming, storage, markdown, csv-parser, image-store, id-generator)

Next.js API Routes (server-side)
  └─ app/api/chat/route.ts     → Venice /chat/completions
  └─ app/api/image/route.ts    → Venice /images/generations
  └─ app/api/upscale/route.ts  → Venice /image/upscale
  └─ app/api/info/route.ts     → Venice /models
```

## Key Patterns

- **Contexts over props**: Global state is managed via React Context (AppContext for app settings, ChatContext for conversations, ThemeContext for light/dark, ToastContext for notifications). Components use `useApp()`, `useChat()`, `useTheme()`, `useToast()`.
- **Server as proxy only**: API routes validate requests, apply rate limiting, and forward to Venice. No conversation data is stored server-side.
- **Streaming SSE**: Chat responses stream via Server-Sent Events. The proxy pipes Venice's stream directly to the browser. Client-side parsing is in `lib/streaming.ts`.
- **Venice parameters**: Web search config goes inside `venice_parameters` in the request body to Venice, not as a top-level param. See `app/api/chat/route.ts`.
- **Placeholder pattern**: In `lib/markdown.ts`, code blocks, inline code, and citation links are extracted into arrays and replaced with `\x00PLACEHOLDER{n}\x00` tokens before HTML escaping. This protects generated HTML from being mangled by the sanitization regexes. The tokens are restored at the end of `formatMessage()`.
- **Model price filtering**: `lib/venice-models.ts` fetches the full model list from Venice and filters out models above the price thresholds in `constants.ts`. Results are cached for 5 minutes. On API failure, a hardcoded fallback list is used.

## Testing

- **Unit tests**: Vitest + jsdom. Run `npm test` or `npm run test:watch`.
  - Tests are in `lib/__tests__/` colocated with source.
  - Mock setup in `vitest.setup.ts` (fake-indexeddb, ResizeObserver, matchMedia).
- **E2E tests**: Playwright. Run `npx playwright test`.
  - Tests are in `e2e/`.
  - Config in `playwright.config.ts` auto-starts dev server.

## File Organization

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js pages and API routes |
| `components/client/` | React UI components (all `'use client'`) |
| `contexts/` | React Context providers (App, Chat, Theme, Toast) |
| `hooks/` | Custom React hooks |
| `lib/` | Shared utilities (types, storage, API helpers, parsers) |
| `lib/__tests__/` | Unit tests |
| `e2e/` | Playwright end-to-end tests |
| `public/` | Static assets (tos.html) |

## Venice API Integration

All calls go through our proxy routes. The proxy:
1. Validates the `X-TOS-Accepted: true` header
2. Applies per-IP rate limiting (20 req/hour, in-memory)
3. Validates request body (model, messages, temperature, etc.)
4. Forwards to Venice with `Authorization: Bearer $VENICE_API_KEY`
5. Streams the response back to the client

### Endpoints

| Our Route | Venice Endpoint | Purpose |
|-----------|----------------|---------|
| `POST /api/chat` | `/chat/completions` | Chat with streaming + web search |
| `POST /api/image` | `/images/generations` | Image generation (OpenAI-compatible) |
| `POST /api/upscale` | `/image/upscale` | Image upscaling (binary PNG response) |
| `GET /api/info` | `/models` | List available models + capabilities |

### Web Search

Controlled via `venice_parameters.enable_web_search` (string: `"auto"` / `"on"` / `"off"`). Citations come back in `venice_parameters.web_search_citations` in the streaming response.

## Toast System

The toast notification system is provided by `ToastContext`.

### Usage

```tsx
import { useToast } from '@/contexts/ToastContext';

function MyComponent() {
  const { showToast } = useToast();

  // showToast(message: string, type?: 'error' | 'success' | 'info')
  showToast('File uploaded', 'success');
  showToast('Something went wrong', 'error');
  showToast('FYI…', 'info');  // default type
}
```

### Behavior

- Toasts render in a fixed stack at the bottom-right of the viewport.
- Each toast auto-dismisses after **4 seconds**.
- Clicking a toast dismisses it immediately.
- Types control the background color: `error` → red, `success` → green, `info` → gray.
- The `animate-fade-in` Tailwind animation (defined in `tailwind.config.ts`) provides the entrance effect.

### Provider

Wrap your app with `<ToastProvider>` (already done in `app/layout.tsx`). Components that call `useToast()` outside the provider will throw.

## Common Tasks

### Adding a new API route
1. Create `app/api/<name>/route.ts`
2. Use `ensureTosAccepted`, `applyRateLimit`, `ensureApiKey` from `lib/api-utils.ts`
3. Forward to Venice with the API key from `process.env.VENICE_API_KEY`

### Adding a new setting
1. Add a key to `STORAGE_KEYS` and a getter/setter pair to `appStorage` in `lib/storage.ts`
2. Add state + a one-line `useEffect` persistence hook in `contexts/AppContext.tsx`
3. Create UI in a sidebar component
4. Wire into the relevant API call chain

### Adding tests
- Unit: Create `lib/__tests__/<module>.test.ts`, use vitest
- E2E: Add to `e2e/app.spec.ts`, use Playwright `page` and `request` fixtures

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VENICE_API_KEY` | Yes | Venice.ai API key for proxied requests |
