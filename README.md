# Mise — AI Recipe Finder

Snap a photo of your fridge, get recipe suggestions. Built with Node.js, Express, MongoDB, Gemini 2.5 Flash, and Spoonacular.

---

## Stack

**Backend**
- Node.js 20 + Express 4
- MongoDB + Mongoose
- bcrypt (password hashing) + JWT (auth)
- Multer (image upload) + Joi (validation)
- `@google/genai` (Gemini 2.5 Flash for vision)
- axios (Spoonacular API)

**Frontend**
- Plain HTML, CSS, vanilla JS — served as static files by Express
- No build step

---

## Project structure

```
recipe-finder/
├── src/
│   ├── config/         ← env loader, mongo connection
│   ├── models/         ← Mongoose schemas (User)
│   ├── controllers/    ← HTTP handlers
│   ├── services/       ← business logic (auth, gemini, spoonacular)
│   ├── routes/         ← Express routers
│   ├── middlewares/    ← auth, upload, validate, error
│   ├── validators/     ← Joi schemas
│   ├── utils/          ← ApiError, asyncHandler
│   └── app.js
├── public/             ← frontend (login, register, app, recipe pages)
└── server.js           ← entry point
```

---

## Setup

### 1. Set up MongoDB

**Recommended — MongoDB Atlas (cloud, free tier):**
1. Create a free cluster at https://mongodb.com/atlas
2. Under **Network Access**, add your IP (or `0.0.0.0/0` for dev)
3. Copy the connection string — it looks like `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/recipe-finder?appName=Cluster0`

**Alternative — local MongoDB:**
- **Mac**: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- **Windows**: Download from https://www.mongodb.com/try/download/community
- Use `mongodb://localhost:27017/recipe-finder` as your `MONGODB_URI`

### 2. Get API keys

- **Gemini**: https://aistudio.google.com/apikey — sign in with Google, click "Create API key" (free tier available)
- **Spoonacular**: https://spoonacular.com/food-api → sign up → dashboard → copy API key (free tier: 150 points/day)

### 3. Install dependencies and configure

```bash
npm install
cp .env.example .env
```

Open `.env` and fill in your `GEMINI_API_KEY`, `SPOONACULAR_API_KEY`, and pick any random string for `JWT_SECRET`.

### 4. Run the server

```bash
npm run dev    # auto-restart on file changes
# or
npm start      # production mode
```

Open http://localhost:3000 in your browser.

---

## How it works

1. User registers / logs in → gets a JWT stored in `localStorage`
2. User types ingredients directly **or** uploads up to 3 photos
3. If photos: Multer buffers them → `geminiService.identifyIngredients()` → Gemini Vision returns ingredient list
4. User edits the ingredient list (add / remove chips), then clicks "Find recipes"
5. `spoonacularService.findByIngredients()` → recipe grid with "you have / missing" counts
6. User clicks a recipe → full info via `spoonacularService.getRecipeInformation()` — ingredient list shows which items the user has (green dot) vs needs to buy (grey dot)
7. User can save any recipe to their Favorites — stored on the User document in MongoDB

---

## API reference

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | `{ username, email, password }` | Create account |
| POST | `/api/auth/login`    | — | `{ email, password }`           | Sign in, returns JWT |
| POST | `/api/recipes/identify`      | Bearer | `multipart/form-data` field `images` | Detect ingredients from photos (rate limited: 5 RPM) |
| POST | `/api/recipes/search`        | Bearer | `{ ingredients: [...] }` | Find matching recipes (rate limited: 20 RPM) |
| GET  | `/api/recipes/favorites`     | Bearer | — | Get saved recipes |
| POST | `/api/recipes/:id/favorite`  | Bearer | `{ title, image }` | Toggle save/unsave a recipe |
| GET  | `/api/recipes/:id`           | Bearer | — | Full recipe info (rate limited: 20 RPM) |
| GET  | `/api/health` | — | — | Health check |

---

## Things to know

- **Spoonacular free tier limit**: 150 points/day. `findByIngredients` is 1 point, `getRecipeInformation` (with nutrition) is also 1 point. So ~75 recipe views/day on the free tier.
- **Gemini free tier**: 15 RPM on Gemini 1.5 Flash. Check https://ai.google.dev/pricing for current quotas.
- **Rate limiting**: Per-user token bucket stored in MongoDB. Limits are configured in `src/config/rateLimit.js`. Identify is capped at 5 RPM per user to stay within Gemini's 15 RPM global limit.
- **Image size limit**: 5MB per upload (configured in `src/middlewares/upload.middleware.js`).
- **JWT lifetime**: 7 days by default (configurable via `JWT_EXPIRES_IN`).
