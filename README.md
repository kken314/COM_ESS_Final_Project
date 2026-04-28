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

### 1. Install MongoDB locally

If you don't have it yet, install MongoDB Community Edition:
- **Mac**: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- **Windows**: Download installer from https://www.mongodb.com/try/download/community
- **Linux**: Follow https://www.mongodb.com/docs/manual/administration/install-on-linux/

Verify it's running: `mongosh` should connect without error.

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
2. User uploads an image → sent to backend via `multipart/form-data`
3. Backend's Multer middleware → memory buffer
4. `geminiService.identifyIngredients()` → Gemini 2.5 Flash with `responseSchema` enforcing JSON array
5. Returns ingredient list to frontend → user can edit (remove / add)
6. User clicks "Find recipes" → `spoonacularService.findByIngredients()`
7. User clicks a recipe → loads full info via `spoonacularService.getRecipeInformation()` (instructions + nutrition)

---

## API reference

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | `{ username, email, password }` | Create account |
| POST | `/api/auth/login`    | — | `{ email, password }`           | Sign in, returns JWT |
| POST | `/api/recipes/identify` | Bearer | `multipart/form-data` field `image` | Detect ingredients |
| POST | `/api/recipes/search`   | Bearer | `{ ingredients: [...] }` | Find matching recipes |
| GET  | `/api/recipes/:id`      | Bearer | — | Full recipe info |
| GET  | `/api/health` | — | — | Health check |

---

## Things to know

- **Spoonacular free tier limit**: 150 points/day. `findByIngredients` is 1 point, `getRecipeInformation` (with nutrition) is also 1 point. So ~75 recipe views/day on the free tier.
- **Gemini free tier**: also limited but more generous. Check https://ai.google.dev/pricing for current quotas.
- **Image size limit**: 5MB per upload (configured in `src/middlewares/upload.middleware.js`).
- **JWT lifetime**: 7 days by default (configurable via `JWT_EXPIRES_IN`).
