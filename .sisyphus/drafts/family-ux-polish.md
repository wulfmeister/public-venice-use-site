# Execution Plan: Family UX Polish

## Implementation Order

Quick wins first (items 7, 6, 4), then medium complexity (3, 1, 2, 5).

---

## Item 7: Skip ToS gate when password-protected ✅ IN PROGRESS

**Files**: `contexts/AppContext.tsx`, `components/client/Header.tsx`
**Approach**: When `passwordRequired=true` and password is accepted, auto-set `tosAccepted=true`

- Hydration path: if cached `passwordRequired` is true and cached password exists → auto-accept
- Fetch path: after `/api/info` confirms `password_required=true` and password already accepted → auto-accept
  **Tests**: Add unit test verifying ToS auto-skip when password-protected

---

## Item 6: Configurable rate limits via env vars

**Files**: `lib/constants.ts`, `lib/rate-limit.ts` or `lib/api-utils.ts`, `.env.example`
**Approach**: Read `RATE_LIMIT_CHAT`, `RATE_LIMIT_IMAGE`, `RATE_LIMIT_UPSCALE` from `process.env` at request time, fallback to current hardcoded defaults (20/5/5)

- Constants stay as defaults, env vars override at runtime
- Update `/api/info` response to reflect actual limits
- Update `.env.example` with new optional vars
  **Tests**: Unit test that env var overrides work

---

## Item 4: Deploy to Vercel button in README

**Files**: `README.md`
**Approach**: Add Vercel deploy button markdown after the badges section

- `repository-url` pointing to GitHub repo
- `env=VENICE_API_KEY,DEPLOYMENT_PASSWORD` with descriptions
- Use `envDescription` to guide the deployer
  **No tests needed** — README-only change

---

## Item 3: Better error messages

**Files**: New `lib/error-messages.ts`, `components/client/InputArea.tsx`
**Approach**: Create a mapping function `friendlyError(error)` that:

- 401 → "Session expired. Please re-enter your password."
- 429 → "Too many requests. Please wait a minute and try again."
- 500/502/503 → "The AI service is temporarily unavailable. Try again shortly."
- 404 → "This model is no longer available. Try selecting a different one."
- Network errors → "Connection lost. Check your internet and try again."
- Default → "Something went wrong. Please try again."
- Apply in all catch blocks in InputArea (chat, image, upscale)
  **Tests**: Unit tests for each mapping

---

## Item 1: Conversation persistence warning banner

**Files**: New `components/client/PersistenceWarning.tsx`, `app/page.tsx`, `lib/storage.ts`
**Approach**: One-time dismissible banner shown on first visit

- Check localStorage key `persistenceWarningDismissed`
- Show subtle info bar: "Your chats are saved in this browser only. They won't sync to other devices."
- Dismiss button sets the key and hides banner
- Render above chat area, below header
  **Tests**: Unit test for dismiss logic

---

## Item 2: Simpler model selector with friendly names

**Files**: `lib/constants.ts`, `components/client/Header.tsx`
**Approach**: Add a `MODEL_DISPLAY_NAMES` map in constants for curated models:

- Map model IDs → friendly labels like "GLM-5 (Default)", "Llama 3.3 70B", "DeepSeek R1"
- `formatModelName()` in Header checks the map first, falls back to existing capitalize logic
- Keep showing all models (no "simple mode" toggle — just better names)
  **Tests**: Unit test for formatModelName with mapped and unmapped models

---

## Item 5: Usage/cost visibility (Venice billing API)

**Files**: New `app/api/balance/route.ts`, `components/client/Header.tsx`
**Approach**:

- New `/api/balance` proxy route → Venice `GET /api/v1/billing/balance`
- Returns `{ canConsume, balances: { diem, usd } }`
- Show in settings dropdown: "API Balance: $X.XX" (or DIEM amount)
- Only fetch on settings dropdown open, cache for 5 min client-side
- Only show when `passwordRequired` (private instance = you're the admin)
  **Tests**: Unit test for balance route

---

## Scope Boundaries

- INCLUDE: All 7 items listed above
- EXCLUDE: User accounts, server-side storage, admin dashboard, mobile app, i18n
