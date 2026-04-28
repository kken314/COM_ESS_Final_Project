# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development (auto-restarts on file change via nodemon)
npm run dev

# Production
npm start
```

No test runner or linter is configured. There are no build steps — the backend runs directly with Node.js and the frontend is plain HTML/CSS/JS served as static files.

## Environment Setup

Copy `.env.example` to `.env` and fill in all four required keys before the server will start. The app crashes immediately on startup if any are missing (`src/config/env.js` enforces this).

Required keys: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `SPOONACULAR_API_KEY`.

## Architecture

**Entry point:** `server.js` → connects MongoDB → starts Express on `config.PORT` (default 3000).

**Frontend** lives in `public/` and is served as static files by `express.static`. It is plain HTML + CSS + vanilla JS — no framework, no bundler. `public/js/api.js` is loaded on every page and exposes two globals: `Auth` (localStorage-backed session) and `Api` (thin `fetch` wrapper that attaches the JWT and prefixes `/api`).

**Backend** lives in `src/` and follows a strict layered pattern — every request passes through the same pipeline:

```
Route → [middleware chain] → Controller → Service → (DB / external API)
```

- **Routes** (`src/routes/`) only declare which middleware and controller handle each URL.
- **Middlewares** (`src/middlewares/`) run before controllers: `authenticate` (JWT check), `upload` (Multer, keeps files in RAM as Buffers via `memoryStorage`), `validate` (Joi schema check).
- **Controllers** (`src/controllers/`) receive the request, call one service method, send the response. No business logic.
- **Services** (`src/services/`) contain all business logic and external API calls.

All async controllers are wrapped in `asyncHandler` (`src/utils/asyncHandler.js`) so errors propagate to `errorHandler` automatically — no try/catch in controllers. Intentional errors are thrown as `new ApiError(statusCode, message)` (`src/utils/ApiError.js`).

## Key Behaviours to Know

**Multi-image identify flow:** The browser resizes images client-side (canvas, max 1280px, skip if <1MB), appends all files under the same FormData key `"images"`, and sends **one** POST to `/api/recipes/identify`. Multer's `upload.array('images', 3)` populates `req.files[]`. The controller maps them to `[{ buffer, mimeType }]` and passes the array to `geminiService.identifyIngredients()`, which puts all images as `inlineData` parts in **a single Gemini request**. This avoids per-image rate limiting.

**Gemini rate-limit retry:** `gemini.service.js` parses the `RetryInfo.retryDelay` from 429 responses and automatically waits + retries once before surfacing a `429 ApiError` to the client.

**Session persistence:** `app.js` (frontend) saves `ingredients` and `recipes` to `sessionStorage` after each change so back-navigation from the recipe detail page restores state without a re-fetch. Image file objects are not persisted (not JSON-serialisable).

**JWT 401 redirect guard:** `api.js`'s `request()` only redirects to `/login.html` on a 401 response if a token already exists in localStorage. This prevents the login form itself from redirecting away when credentials are wrong.

**Password field:** The `password` field on the `User` schema has `select: false` — it is never returned from queries unless explicitly opted in with `.select('+password')` (only done in `auth.service.js` during login).
