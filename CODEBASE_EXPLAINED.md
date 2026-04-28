# Codebase Explained — Mise·en·place Recipe Finder
### Written for a freshman Computer Engineering student with zero web dev experience

---

> Before anything else, know this: every professional web app is just files sending messages to each other. Once you understand *who sends what to whom and why*, the rest is just details. We'll go layer by layer, starting broad and getting very specific — especially on the backend.

---

## Part 0 — What Does This App Actually Do?

1. You upload up to **3 photos** of your fridge / pantry / counter
2. All 3 photos are sent to **Google Gemini AI** in one request — it reads all of them and lists every food ingredient it sees
3. Those ingredients are sent to **Spoonacular** (a recipe database) — it returns recipes you can actually make
4. Click any recipe to see the full instructions, ingredients, and nutrition

Simple idea. But it touches every layer of modern web development: HTML, CSS, JavaScript, HTTP, REST APIs, JWT authentication, MongoDB, AI APIs, file uploads, rate limiting, and more.

---

## Part 1 — Frontend vs Backend (The Restaurant Analogy)

```
DINING ROOM (Frontend)          KITCHEN (Backend)
────────────────────────────────────────────────────
HTML  → the bones (structure)
CSS   → the skin  (appearance)   Node.js + Express runs here
JS    → the muscles (behavior)   MongoDB stores data permanently
        │                                │
        │   ←── HTTP requests ──►        │
        │   ←── HTTP responses ──►       │
        │                                │
You click "Identify"          Server receives the photos,
→ JS packages the photos      calls Gemini AI,
→ sends to /api/recipes/identify  returns ingredient list
```

The browser and server **cannot share variables**. They live in completely separate processes, possibly on different continents. The only way they communicate is by sending text messages (HTTP requests and responses) back and forth.

---

## Part 2 — The Folder Structure

```
recipe-finder/
│
├── public/               ← FRONTEND — browser downloads these
│   ├── index.html        ← Main page
│   ├── login.html        ← Login page
│   ├── register.html     ← Register page
│   ├── recipe.html       ← Single recipe detail page
│   ├── css/
│   │   └── style.css     ← All visual styling
│   └── js/
│       ├── api.js        ← HTTP communication layer (loaded on ALL pages)
│       ├── auth.js       ← Login/register form logic
│       ├── app.js        ← Main page logic
│       └── recipe.js     ← Recipe detail page logic
│
└── src/                  ← BACKEND — runs on the server, browser never sees this
    ├── app.js            ← Builds the Express server
    ├── config/
    │   ├── env.js        ← Loads and validates secret keys from .env
    │   └── database.js   ← Connects to MongoDB
    ├── models/
    │   └── User.js       ← Defines what a User looks like in the database
    ├── routes/
    │   ├── index.js          ← Master router: sends traffic to the right sub-router
    │   ├── auth.routes.js    ← /api/auth/* paths
    │   └── recipe.routes.js  ← /api/recipes/* paths
    ├── controllers/
    │   ├── auth.controller.js    ← Handles login/register HTTP requests
    │   └── recipe.controller.js  ← Handles recipe HTTP requests
    ├── services/
    │   ├── auth.service.js        ← All login/register business logic
    │   ├── gemini.service.js      ← Talks to Google Gemini AI
    │   └── spoonacular.service.js ← Talks to Spoonacular recipe API
    ├── middlewares/
    │   ├── auth.middleware.js     ← Checks if the user is logged in
    │   ├── upload.middleware.js   ← Handles image file uploads (Multer)
    │   ├── validate.middleware.js ← Checks that request data is valid
    │   └── error.middleware.js    ← Catches ALL errors and formats them
    ├── validators/
    │   ├── auth.validator.js      ← Rules: what a valid login/register looks like
    │   └── recipe.validator.js    ← Rules: what a valid recipe request looks like
    └── utils/
        ├── ApiError.js       ← Custom error class that carries an HTTP status code
        └── asyncHandler.js   ← Eliminates repetitive try/catch in controllers
```

---

## Part 3 — The Backend In Depth

The backend is where almost all the real work happens. Let's go through every single piece carefully.

---

### `src/config/env.js` — The Secret Safe

```javascript
require('dotenv').config();

const required = ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY', 'SPOONACULAR_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  JWT_SECRET: process.env.JWT_SECRET,
  // ... etc
};
```

**What is a `.env` file?**
A plain text file that lives only on the server machine and is never committed to Git. It looks like this:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mydb
JWT_SECRET=some_very_long_random_string_nobody_can_guess
GEMINI_API_KEY=AIzaSy...
SPOONACULAR_API_KEY=abc123...
```

**Why not just hardcode the keys in the source code?**
If you push your code to GitHub with a real API key in it, bots scan GitHub 24/7 and will find and abuse your key within minutes. A `.env` file stays on your machine only.

**`process.env`** is Node.js's built-in object that holds all environment variables. `dotenv.config()` reads the `.env` file and injects its contents into `process.env` so the rest of your code can read them.

**Why crash immediately if a key is missing?**
If your server starts without `GEMINI_API_KEY`, it will work fine until someone tries to identify ingredients — then it crashes mysteriously. Crashing at startup with a clear message is infinitely better than a mysterious crash in production at 2am.

---

### `src/config/database.js` — The Database Connection

```javascript
const mongoose = require('mongoose');
const config = require('./env');

async function connectDatabase() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);  // Kill the server — can't run without a database
  }
}

module.exports = connectDatabase;
```

**What is MongoDB?**
A database is a program that stores data permanently on disk so it survives server restarts. MongoDB specifically stores data as JSON-like documents instead of rows in a table (like Excel). A user account, for example, is stored as:
```json
{
  "_id": "64abc123...",
  "username": "john",
  "email": "john@example.com",
  "password": "$2b$10$hashedpassword...",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

**What is Mongoose?**
Mongoose is a library that sits between your Node.js code and MongoDB. Without Mongoose, you'd talk to MongoDB using raw queries. With Mongoose, you define a schema (a blueprint) and use simple JavaScript methods like `User.create()`, `User.findOne()`, etc.

**`process.exit(1)`** — forcefully kills the Node.js process with exit code 1 (meaning "error"). If the database is unreachable, the server is useless, so there's no point staying running.

---

### `src/models/User.js` — The User Blueprint

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,         // No two users can share a username
      trim: true,           // Remove leading/trailing whitespace
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,     // Always store email as lowercase
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,       // NEVER return this field unless explicitly requested
    },
  },
  { timestamps: true }     // Automatically adds createdAt and updatedAt fields
);
```

**`select: false` on password** is a critical security decision. Whenever you do `User.findOne({ email })`, the returned object will NOT include the password field. You have to explicitly opt-in with `User.findOne({ email }).select('+password')`. This prevents accidentally leaking hashed passwords in API responses.

**`{ timestamps: true }`** tells Mongoose to automatically manage two extra fields: `createdAt` (when the document was first saved) and `updatedAt` (when it was last changed). You never have to set these yourself.

---

#### How Password Hashing Works (Very Important)

```javascript
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();  // Don't re-hash if not changed
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

**Why you can NEVER store a plain password:**
If your database gets hacked (it happens to big companies), the attacker gets every user's password in plain text. People reuse passwords, so now they have access to their email, bank, everything.

**What is hashing?**
A one-way mathematical function. `bcrypt.hash("mypassword123", salt)` → `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHuy`

The key word is **one-way**. You cannot go backwards from the hash to get `"mypassword123"`. There is no "decrypt" function.

**What is a salt?**
A random string added to the password before hashing. Without a salt, two users with the same password would produce the same hash, making it easy for attackers to spot duplicates. The salt makes every hash unique even for identical passwords. `bcrypt.genSalt(10)` means "do 2^10 = 1024 rounds of computation" — making brute-force attacks impractically slow.

**How does login work if you can't reverse the hash?**

```javascript
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
```

`bcrypt.compare("mypassword123", "$2b$10$N9qo8uL...")` → re-hashes the candidate with the same salt that's embedded in the stored hash, then compares. Returns `true` or `false`. This is the only correct way to verify a password.

---

### `src/app.js` — Building the Express Server

```javascript
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

**What is Express?**
A framework that wraps Node.js's raw HTTP capabilities. Without Express, handling an HTTP request means manually parsing binary data. With Express, you just write `req.body.email` and the data is there.

**What does `app.use(...)` do?**
It registers **middleware** — functions that run on every incoming HTTP request. Think of it as an assembly line. Every request starts at the top and passes through each station in order.

```
Incoming request
      │
      ▼
express.json()         ← parse the body: "{"email":"a@b.com"}" → req.body.email
      │
      ▼
express.urlencoded()   ← parse form data (different format, same idea)
      │
      ▼
morgan('dev')          ← print "POST /api/auth/login 200 45ms" to terminal
      │
      ▼
express.static()       ← is this request for a file in /public? serve it and stop
      │ (only continues if it's NOT a static file)
      ▼
/api routes            ← is the URL /api/something? route it
      │ (only continues if no route matched)
      ▼
notFound               ← nothing matched → send 404
      │ (any error from above jumps here)
      ▼
errorHandler           ← format any error as clean JSON
```

**`express.static(path.join(__dirname, '..', 'public'))`**
This one line serves your entire frontend. When the browser requests `/index.html`, Express looks in the `public/` folder, finds `index.html`, and sends it. When it requests `/js/app.js`, it finds `public/js/app.js` and sends that. The browser never knows or cares about your `src/` folder — it only ever receives what's in `public/`.

**Why is `errorHandler` last?**
Express identifies error-handling middleware by the fact that it takes **4 parameters** `(err, req, res, next)` instead of the normal 3. It must come last because it's a catch-all — any `next(error)` call from anywhere above jumps directly to it, skipping all remaining normal middleware.

---

### `src/routes/` — The URL Directory

**The Router Pattern**
Express lets you split routes into sub-routers. Instead of one giant file listing every URL, you group related URLs together.

**`src/routes/index.js`** — The Master Router

```javascript
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth',    authRoutes);     // /api/auth/...    → auth.routes.js
router.use('/recipes', recipeRoutes);   // /api/recipes/... → recipe.routes.js

module.exports = router;
```

The `/health` endpoint is a standard practice. Deployment services ping `/api/health` every 30 seconds to check if the server is alive. If it doesn't respond, they restart it automatically.

**`src/routes/auth.routes.js`** — Login and Register

```javascript
const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login',    validate(loginSchema),    authController.login);
```

Reading this line: `router.post('/register', validate(registerSchema), authController.register)`
- `router.post` → only matches `POST` requests (not GET, PUT, DELETE)
- `'/register'` → only matches this exact path
- `validate(registerSchema)` → middleware: check inputs, reject if invalid
- `authController.register` → the actual handler that runs if everything is valid

**`src/routes/recipe.routes.js`** — All Recipe Actions

```javascript
router.use(authenticate);  // applies to EVERY route below this line

router.post('/identify', upload,                    recipeController.identifyIngredients);
router.post('/search',   validate(searchSchema),    recipeController.searchRecipes);
router.get('/:id',       validate(recipeIdSchema, 'params'), recipeController.getRecipe);
```

`router.use(authenticate)` is placed at the top, so authentication runs before any recipe handler. You can't reach any recipe endpoint without a valid JWT token.

`'/:id'` is a **URL parameter** — a wildcard. A `GET` request to `/api/recipes/12345` sets `req.params.id = "12345"` inside the controller. The colon `:` is the signal that this is a variable, not a literal string.

---

### `src/middlewares/` — The Assembly Line Workers

This is where most of the backend complexity lives. Middleware is the most important concept to understand in Express.

---

#### `auth.middleware.js` — The Bouncer

```javascript
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const token = authHeader.substring(7); // removes "Bearer " (7 characters)

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded; // { id: "...", username: "...", iat: ..., exp: ... }
    next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};
```

**What is a JWT (JSON Web Token)?**
A string in three parts separated by dots: `header.payload.signature`

- **Header**: `{"alg":"HS256","typ":"JWT"}` encoded as base64 — describes how it was signed
- **Payload**: `{"id":"64abc...","username":"john","iat":1700000000,"exp":1700604800}` encoded as base64 — the actual data
- **Signature**: `HMACSHA256(base64(header) + "." + base64(payload), JWT_SECRET)` — a mathematical stamp

The signature is the key part. It can only be generated if you know `JWT_SECRET`. The server uses the same secret to verify: "did I create this token, or did someone forge it?" If the payload is tampered with even slightly, the signature won't match and `jwt.verify()` throws an error.

`iat` = "issued at" (Unix timestamp). `exp` = "expires at". `jwt.verify()` automatically rejects expired tokens.

**`req.user = decoded`** — this is how context passes down the middleware chain. The authenticate middleware stamps the user's identity onto the request object. The controller that runs later can read `req.user.id` to know which user is making the request without asking for a password again.

**`return next(new ApiError(...))`** — the `return` is important. Without it, the code would continue executing after calling `next()` and might try to send a second response, causing a crash.

---

#### `upload.middleware.js` — The File Inspector

```javascript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB in bytes

const storage = multer.memoryStorage(); // keep file in RAM as a Buffer

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);  // null = no error, true = accept the file
  } else {
    cb(new ApiError(400, 'Only JPEG, PNG, WEBP, and HEIC images are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

module.exports = upload.array('images', 3); // accept up to 3 files, field name "images"
```

**What is Multer?**
When a browser uploads a file, the HTTP request body is encoded as `multipart/form-data` — a special binary format that mixes regular form fields with file data. Express's built-in `express.json()` parser cannot handle this. Multer is a dedicated library that parses this format.

**`multer.memoryStorage()`** — two storage options exist:
- `diskStorage()` — saves the file to the server's hard drive as a temp file
- `memoryStorage()` — keeps the file in RAM as a Node.js `Buffer` object

We use memory storage because we immediately forward the image to the Gemini API and don't need it on disk. It also avoids the need to clean up temp files.

**What is a `Buffer`?**
In Node.js, a `Buffer` is a raw sequence of bytes in memory. An image file is ultimately just a sequence of numbers (each pixel's color data, plus metadata). `req.files[0].buffer` is that raw byte sequence. To send it over HTTP as JSON, we convert it to base64: `buffer.toString('base64')` — this turns binary bytes into a string of ASCII characters that can be embedded in JSON.

**`upload.array('images', 3)`** — after Multer runs, `req.files` becomes an array of file objects:
```javascript
req.files = [
  { fieldname: 'images', originalname: 'photo1.jpg', mimetype: 'image/jpeg', buffer: <Buffer ...>, size: 533000 },
  { fieldname: 'images', originalname: 'photo2.jpg', mimetype: 'image/jpeg', buffer: <Buffer ...>, size: 820000 },
]
```

---

#### `validate.middleware.js` — The Input Checker

```javascript
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,   // collect ALL errors, not just the first one
    stripUnknown: true,  // remove any fields not declared in the schema
  });

  if (error) {
    const message = error.details.map((d) => d.message).join(', ');
    return next(new ApiError(400, message));
  }

  req[source] = value; // replace with the cleaned/coerced version
  next();
};
```

**What is Joi?**
A validation library. You define rules once:
```javascript
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});
```

And Joi checks every incoming request against those rules. If `email` is `"notanemail"`, Joi catches it immediately — the controller never even runs. This is called **input validation** and it's the first line of defence against bad data.

**`stripUnknown: true`** is a security measure. If someone sends `{ email: "a@b.com", password: "123456", isAdmin: true }`, Joi silently removes `isAdmin` before the data reaches the controller. The controller only ever sees the fields you explicitly allowed.

**`source = 'body'` vs `source = 'params'`** — the same middleware works for both the request body and URL parameters. For `GET /api/recipes/12345`, you'd call `validate(recipeIdSchema, 'params')` to validate `req.params.id`.

---

#### `error.middleware.js` — The Safety Net

```javascript
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Multer file-too-large error
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Image must be smaller than 15MB';
  }

  // MongoDB duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with that value already exists';
  }

  // Mongoose schema validation failed
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Only log truly unexpected errors (not ones we threw intentionally)
  if (!err.isOperational) console.error('Unexpected error:', err);

  res.status(statusCode).json({ success: false, message });
};
```

**Why does this need 4 parameters?**
Express identifies error-handling middleware by signature. If you write `(req, res, next)` it's a normal middleware. If you write `(err, req, res, next)` Express knows it's an error handler and only routes errors to it — not normal requests.

**What is error code `11000`?**
MongoDB's internal code for a duplicate key violation. If you try to insert a user with an email that already exists (the field has `unique: true`), MongoDB throws an error with `err.code === 11000`. We catch it here and convert it to a clean `409 Conflict` response.

**`err.isOperational`** — our custom `ApiError` class sets `isOperational = true`, meaning "this is an error we expected and handled intentionally." If `isOperational` is false or undefined, it means something truly unexpected happened (a bug, a library crash) — we log it in detail for debugging.

---

### `src/utils/ApiError.js` — Structured Errors

```javascript
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);              // calls Error's constructor
    this.statusCode = statusCode; // 400, 401, 404, 409, 429, 500, 502...
    this.isOperational = true;   // "we planned for this error"
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**Why extend `Error`?**
JavaScript's built-in `Error` only stores a message. We need to also store an HTTP status code so the error handler knows what status to send in the response. Extending it means we can use `throw new ApiError(404, 'Recipe not found')` anywhere in the codebase and the error handler knows exactly what HTTP status and message to send back.

**`Error.captureStackTrace`** — makes sure the stack trace (the list of function calls that led to the error) starts from where you threw the ApiError, not from inside the ApiError constructor. This makes debugging much cleaner.

---

### `src/utils/asyncHandler.js` — The Try/Catch Eliminator

```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

This is one line but dense. Let's unpack it:

**The problem it solves:**
```javascript
// WITHOUT asyncHandler — every controller needs this boilerplate
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.json(result);
  } catch (err) {
    next(err); // pass to error handler
  }
};
```

**With asyncHandler:**
```javascript
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.json(result);
  // Any thrown error is automatically caught and passed to next()
});
```

**How does it work?**
`asyncHandler` is a function that takes your async controller function (`fn`) and returns a **new** function. The new function wraps your controller in `Promise.resolve(...).catch(next)`. If your controller throws or rejects a promise, `.catch(next)` automatically calls `next(error)` which routes to the error handler. You write zero try/catch blocks in your controllers.

This is called a **higher-order function** — a function that takes or returns another function.

---

### `src/controllers/` — The Department Heads

Controllers are deliberately thin. They read the request, call a service, and send the response. No business logic lives here.

**`auth.controller.js`**
```javascript
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const result = await authService.register({ username, email, password });
  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: result,
  });
});
```

`res.status(201)` — HTTP status codes communicate meaning:
- `200 OK` — request succeeded, here's the data
- `201 Created` — a new resource was created
- `400 Bad Request` — you sent invalid data
- `401 Unauthorized` — not logged in
- `404 Not Found` — resource doesn't exist
- `409 Conflict` — duplicate (e.g. email already taken)
- `429 Too Many Requests` — rate limited
- `500 Internal Server Error` — something broke on our end
- `502 Bad Gateway` — an external service (Gemini, Spoonacular) failed

**`recipe.controller.js`**
```javascript
const identifyIngredients = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No image files uploaded');
  }

  const images = req.files.map(f => ({ buffer: f.buffer, mimeType: f.mimetype }));
  const ingredients = await geminiService.identifyIngredients(images);

  res.status(200).json({
    success: true,
    data: { ingredients },
  });
});
```

`req.files.map(...)` — transforms the Multer file array into a simpler structure that the service expects. The service shouldn't need to know about Multer's internals (`originalname`, `fieldname`, etc.) — it just needs the raw bytes and the file type.

---

### `src/services/` — The Workers

Services contain all business logic. They talk to databases, external APIs, and do the real work.

---

#### `auth.service.js` — Account Logic, Fully Explained

```javascript
async function register({ username, email, password }) {
  // Step 1: Check if the email or username is already taken
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw new ApiError(409, `An account with this ${field} already exists`);
  }

  // Step 2: Create the user (password gets hashed by the pre-save hook)
  const user = await User.create({ username, email, password });

  // Step 3: Generate a JWT token
  const token = generateToken(user);

  // Step 4: Return the user (without password) and the token
  return { user: sanitizeUser(user), token };
}
```

**`$or: [{ email }, { username }]`** — MongoDB query operator. Finds a document where the email field matches OR the username field matches. The shorthand `{ email }` is ES6 and means `{ email: email }`. This single database query checks both fields at once instead of making two separate queries.

```javascript
function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username },   // payload — what to embed
    config.JWT_SECRET,                            // secret key for signing
    { expiresIn: config.JWT_EXPIRES_IN }          // e.g. '7d' = expires in 7 days
  );
}
```

`jwt.sign()` creates the token. The payload `{ id, username }` is what gets embedded (and will be available as `req.user` after authentication). The secret key signs the token — anyone who knows the secret can verify tokens, but you never share the secret publicly.

```javascript
function sanitizeUser(user) {
  return { id: user._id, username: user.username, email: user.email };
}
```

Never send back more than the client needs. The user object from MongoDB includes the hashed password field (when explicitly selected), internal MongoDB versioning fields, etc. `sanitizeUser` extracts only what the browser should see.

```javascript
async function login({ email, password }) {
  // explicitly request password field (it's hidden by default via select: false)
  const user = await User.findOne({ email }).select('+password');

  if (!user) throw new ApiError(401, 'Invalid email or password');

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) throw new ApiError(401, 'Invalid email or password');

  const token = generateToken(user);
  return { user: sanitizeUser(user), token };
}
```

**Why "Invalid email or password" for BOTH failures?**
If you said "Email not found" for wrong email and "Wrong password" for wrong password, attackers could use your login form to enumerate valid email addresses. "Invalid email or password" tells them nothing about which part was wrong.

---

#### `gemini.service.js` — AI Image Analysis, Fully Explained

```javascript
const imageParts = images.map(({ buffer, mimeType }) => ({
  inlineData: { mimeType, data: buffer.toString('base64') },
}));

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    {
      parts: [...imageParts, { text: PROMPT }],
    },
  ],
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'array',
      items: { type: 'string' },
    },
  },
});
```

**How does the Gemini API receive images?**
Images are sent as **base64-encoded inline data** inside the JSON request body. Base64 is a way of encoding binary data (image bytes) using only printable ASCII characters (A-Z, a-z, 0-9, +, /) so it can be embedded in JSON.

`buffer.toString('base64')` — converts the raw bytes in memory to a base64 string. A 500KB image becomes about a 667KB string.

**The `parts` array is the key to multi-image support.**
Each Gemini request is a `contents` array, where each element has a `parts` array. Each part is either an image (`inlineData`) or text. By putting multiple image parts before the text prompt, we tell Gemini: "Here are up to 3 photos. Look at ALL of them and identify every ingredient you see across all images." Gemini processes everything in one shot and returns one combined list.

```javascript
// Before (3 separate requests — hits rate limits):
for (const image of images) {
  await callGemini(image);
}

// After (1 request with all images):
await callGemini([image1, image2, image3]);
```

**`responseMimeType: 'application/json'` + `responseSchema`** — this tells Gemini to use **structured output**. Instead of returning a text paragraph like "I can see tomatoes, eggs, and cheese in the images", it is forced to return a valid JSON array: `["tomato", "egg", "cheese"]`. This is more reliable than trying to parse free text.

**`responseSchema`** is a JSON Schema definition. `type: 'array', items: { type: 'string' }` means "return a JSON array where every element is a string." Gemini won't deviate from this schema.

---

#### The Retry Logic for Rate Limiting

```javascript
function parseRetryDelay(error) {
  try {
    const body = JSON.parse(error.message);
    if (body.error?.code !== 429) return null;
    const retryInfo = (body.error.details || []).find(d =>
      typeof d['@type'] === 'string' && d['@type'].endsWith('RetryInfo')
    );
    const seconds = retryInfo?.retryDelay ? parseInt(retryInfo.retryDelay) : 20;
    return seconds;
  } catch {
    return null;
  }
}
```

**What is a rate limit?**
APIs limit how many requests you can make per unit of time to prevent abuse and control costs. Gemini's free tier allows 5 requests per minute. If you exceed that, it returns HTTP 429 with a message telling you how many seconds to wait.

**What does the 429 error look like?**
```json
{
  "error": {
    "code": 429,
    "status": "RESOURCE_EXHAUSTED",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.RetryInfo",
        "retryDelay": "17s"
      }
    ]
  }
}
```

The Google GenAI SDK throws this as a JavaScript `Error` where `error.message` is the above JSON as a string. `parseRetryDelay` parses that string, finds the `RetryInfo` detail, and extracts the number of seconds.

```javascript
async function identifyIngredients(images, attempt = 1) {
  try {
    // ... call Gemini ...
  } catch (error) {
    if (error instanceof ApiError) throw error; // don't re-handle our own errors

    const retryAfter = parseRetryDelay(error);
    if (retryAfter !== null && attempt <= 2) {
      const waitMs = (retryAfter + 2) * 1000; // wait suggested time + 2s buffer
      await new Promise(r => setTimeout(r, waitMs)); // pause execution
      return identifyIngredients(images, attempt + 1); // try again
    }

    if (retryAfter !== null) {
      throw new ApiError(429, `AI quota reached — please wait ${retryAfter}s and try again.`);
    }

    throw new ApiError(502, 'Failed to identify ingredients from image');
  }
}
```

`await new Promise(r => setTimeout(r, waitMs))` — this is how you "sleep" in JavaScript. `setTimeout` is normally callback-based (runs a function after N milliseconds). Wrapping it in a `Promise` lets us use `await` to pause execution of the async function for the specified duration without blocking the entire server.

`attempt = 1` as a default parameter — the function is recursive. On the first call, `attempt` is 1. If rate-limited, it waits, then calls itself with `attempt = 2`. On the second call, if rate-limited again (attempt would be 3 which is > 2), it gives up and throws a user-friendly error instead of looping forever.

---

#### `spoonacular.service.js` — Recipe Search

```javascript
const client = axios.create({
  baseURL: 'https://api.spoonacular.com/recipes',
  timeout: 10000, // give up after 10 seconds
  params: { apiKey: config.SPOONACULAR_API_KEY }, // auto-added to every request
});

async function findByIngredients(ingredients) {
  const { data } = await client.get('/findByIngredients', {
    params: {
      ingredients: ingredients.join(','), // "tomato,egg,cheese"
      number: 12,        // return up to 12 recipes
      ranking: 2,        // minimize missing ingredients
      ignorePantry: true, // ignore salt, water, flour, etc.
    },
  });
  return data;
}
```

**Why does the backend call Spoonacular instead of the frontend calling it directly?**
The Spoonacular API key must be kept secret. If the frontend called Spoonacular directly, the API key would be visible in the browser's Network tab for anyone to steal. The backend acts as a proxy — it makes the request using the secret key and forwards the results. The frontend never sees the key.

**`axios.create()`** — creates a pre-configured HTTP client. `params: { apiKey: ... }` means the API key is automatically appended as a query parameter to every request: `/findByIngredients?apiKey=abc123&ingredients=tomato,egg`. You never have to manually add it to each call.

**`ranking: 2`** — Spoonacular's parameter that means "prefer recipes with the fewest missing ingredients." Without this, it might return recipes where you have 1 out of 12 ingredients. With this, it tries to maximize how many ingredients you already have.

---

## Part 4 — The Frontend Files

---

### `public/js/api.js` — The Communication Layer (Loaded on Every Page)

This file does two completely separate things and both are critical.

**Thing 1: The `Auth` object — managing login state in the browser**

```javascript
const TOKEN_KEY = 'recipe_finder_token';
const USER_KEY  = 'recipe_finder_user';

const Auth = {
  getToken:   () => localStorage.getItem(TOKEN_KEY),
  setToken:   (t) => localStorage.setItem(TOKEN_KEY, t),
  getUser:    () => { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; },
  setUser:    (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clear:      () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
  requireLogin: () => {
    if (!localStorage.getItem(TOKEN_KEY)) window.location.href = '/login.html';
  },
};
```

`localStorage` is a browser-provided key-value store that persists across page reloads and browser restarts (unlike JavaScript variables that disappear when the page refreshes). It can only hold strings, so objects are stored as JSON strings with `JSON.stringify()` and read back with `JSON.parse()`.

**Thing 2: The `request()` function — sending HTTP requests**

```javascript
async function request(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`; // attach the wristband

  let payload = body;
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  // For FormData (file uploads), DON'T set Content-Type manually —
  // the browser sets it automatically with the correct multipart boundary

  const res = await fetch(`/api${path}`, { method, headers, body: payload });

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }

  if (!res.ok) {
    // Only redirect to login if we HAD a token (session expired).
    // If no token exists, we're on the login page — show the error instead.
    if (res.status === 401 && Auth.getToken()) {
      Auth.clear();
      window.location.href = '/login.html';
    }
    const msg = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
```

**Why NOT set `Content-Type` for FormData?**
When you upload files, the request body is multipart/form-data with a **boundary** — a random string separator between the fields. The browser generates this boundary automatically and sets the correct `Content-Type` header including it: `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW`. If you override `Content-Type` manually, the boundary is missing and the server can't parse the body.

**The `Api` object:**

```javascript
const Api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login:    (payload) => request('/auth/login',    { method: 'POST', body: payload }),

  identifyIngredients: (files) => {
    const fd = new FormData();
    files.forEach(file => fd.append('images', file)); // append each File object
    return request('/recipes/identify', { method: 'POST', body: fd, isFormData: true });
  },

  searchRecipes: (ingredients) =>
    request('/recipes/search', { method: 'POST', body: { ingredients } }),

  getRecipe: (id) => request(`/recipes/${id}`),
};
```

`FormData` is a browser API that builds multipart/form-data bodies. `fd.append('images', file)` adds a file under the field name `'images'`. Calling `.append` multiple times with the same key adds multiple values under that key — this is how Multer's `upload.array('images', 3)` on the server receives all 3 images.

---

### `public/js/app.js` — The Main Page Logic

**Multi-image upload flow:**

```javascript
const MAX_IMAGES = 3;
let selectedFiles = []; // [{ file: File, previewUrl: "data:image/jpeg;base64,..." }]
```

```javascript
function handleFiles(e) {
  const files = Array.from(e.target.files);  // FileList → regular array
  const remaining = MAX_IMAGES - selectedFiles.length;
  const toAdd = files.slice(0, remaining);   // never exceed the limit
  if (toAdd.length === 0) return;

  let loaded = 0;
  toAdd.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      selectedFiles.push({ file, previewUrl: ev.target.result }); // data URL for preview
      loaded++;
      if (loaded === toAdd.length) renderImageTray(); // re-draw only when all are ready
    };
    reader.readAsDataURL(file); // converts file to "data:image/jpeg;base64,..."
  });

  e.target.value = ''; // reset input so the same file can be selected again
}
```

`FileReader.readAsDataURL()` converts the raw file into a data URL — a string that starts with `data:image/jpeg;base64,` followed by base64-encoded image data. This string can be set directly as an `<img src>` to show a preview without uploading anything.

**`renderImageTray()`** — builds the thumbnail grid from scratch each time:
- Loops through `selectedFiles` and creates a `div.img-thumb` for each
- If under the limit, appends a `label.img-thumb-add` (the `+` tile) with a hidden file input inside
- Sets `filePick.style.display = 'none'` once images exist (hides the big drop zone)
- Sets `imageTray.style.display = 'flex'` and `uploadActions.style.display = 'flex'`

**The resize step (before upload):**

```javascript
const filesToUpload = await Promise.all(selectedFiles.map(({ file }) => resizeImage(file)));
```

`Promise.all([...])` runs all the resize operations in parallel. Resizing is browser-side canvas work — it doesn't hit any network or rate limit — so parallel is fine and faster. Afterwards, one `Api.identifyIngredients(filesToUpload)` call sends all resized files in a single request.

**Session persistence:**

```javascript
const SESSION_KEY = 'mise_session';

function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ingredients, recipes: currentRecipes }));
  } catch {}
}
```

`sessionStorage` is like `localStorage` but erases when the browser tab is closed. We use it to survive navigating to the recipe detail page and pressing back. The empty `catch {}` is intentional — if sessionStorage is full or unavailable, fail silently rather than crashing the app.

Only `ingredients` and `recipes` are saved — NOT the image thumbnails. Image files are `File` objects and cannot be serialized to JSON. Image data URLs (base64 strings) can be serialized but are hundreds of kilobytes each; storing 3 of them would risk hitting sessionStorage's ~5MB limit.

---

### `public/js/auth.js` — Login/Register Form

```javascript
if (Auth.isLoggedIn()) {
  window.location.href = '/index.html'; // already logged in → skip this page
  return;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault(); // stop the browser from doing a full page refresh

  const data = Object.fromEntries(new FormData(form).entries());
  // → { email: "user@example.com", password: "mypassword" }

  const result = window.PAGE_MODE === 'login'
    ? await Api.login(data)
    : await Api.register(data);

  Auth.setToken(result.data.token);
  Auth.setUser(result.data.user);
  window.location.href = '/index.html';
});
```

`new FormData(form)` — automatically collects all `<input>` values from the form. `.entries()` gives `[["email", "user@example.com"], ["password", "mypassword"]]`. `Object.fromEntries()` converts that to `{ email: "...", password: "..." }`. This is more robust than manually reading each input with `document.getElementById`.

`window.PAGE_MODE` — set by a `<script>` tag in each HTML file:
- `login.html`: `<script>window.PAGE_MODE = 'login';</script>`
- `register.html`: `<script>window.PAGE_MODE = 'register';</script>`

Both pages load the same `auth.js`, and this variable tells it which API to call.

---

### `public/css/style.css` — Styling

A few patterns worth understanding:

**CSS custom properties (variables):**
```css
:root {
  --terracotta: #c8553d;
  --cream: #f8f3ea;
}
/* Usage: */
.btn-accent { background: var(--terracotta); }
```
Change `--terracotta` in one place and every element using it updates.

**Responsive design with media queries:**
```css
@media (max-width: 768px) {
  .recipe-hero { grid-template-columns: 1fr; }
}
```
Rules inside `@media (max-width: 768px)` only apply on screens 768px wide or less (phones). Without this, the layout would be the same on a tiny phone screen as on a desktop monitor.

**The logout confirmation popover:**
```css
.logout-wrap { position: relative; }

.logout-popover {
  display: none;
  position: absolute;
  top: calc(100% + 8px); /* just below the button */
  right: 0;
  z-index: 100;
  /* ... */
}
.logout-popover.show { display: block; }
```
`position: relative` on the parent + `position: absolute` on the child means the popover is positioned relative to the button, not the whole page. `z-index: 100` makes it appear on top of everything else. JavaScript toggles the `.show` class to show/hide it.

---

## Part 5 — The Complete Journey: 3 Photos → Recipes

Here is the exact sequence of what happens when a user uploads 3 photos and clicks "Identify ingredients":

```
BROWSER

1. User selects 3 photos via the file picker
   → handleFiles() runs for each file
   → FileReader reads each as a data URL
   → selectedFiles = [{ file, previewUrl }, { file, previewUrl }, { file, previewUrl }]
   → renderImageTray() shows 3 thumbnails + hides the big drop zone

2. User clicks "Identify ingredients"
   → identifyBtn is disabled, spinner shown
   → resizeImage() runs on all 3 files IN PARALLEL (canvas work, no network)
     - Files < 1MB are returned as-is
     - Larger files are redrawn at max 1280px and re-encoded as JPEG
   → Api.identifyIngredients([file1, file2, file3]) is called

3. api.js builds a FormData:
   fd.append('images', resizedFile1)
   fd.append('images', resizedFile2)
   fd.append('images', resizedFile3)
   → fetch('POST /api/recipes/identify', { body: fd, Authorization: 'Bearer eyJ...' })

SERVER

4. Express receives the request
   → express.static? No — it's /api
   → morgan logs: "POST /api/recipes/identify"
   → Goes to apiRoutes → recipeRoutes

5. authenticate middleware runs
   → reads Authorization header: "Bearer eyJ..."
   → jwt.verify(token, JWT_SECRET) → { id: "64abc...", username: "john" }
   → req.user = { id: "64abc...", username: "john" }
   → next()

6. upload middleware (Multer) runs
   → parses the multipart/form-data body
   → checks each file's MIME type against the allowed list
   → keeps all 3 files in memory as Buffers
   → req.files = [{ buffer: <Buffer>, mimetype: 'image/jpeg' }, ...]
   → next()

7. recipeController.identifyIngredients() runs
   → checks req.files exists and has items
   → maps: images = [{ buffer, mimeType }, { buffer, mimeType }, { buffer, mimeType }]
   → calls geminiService.identifyIngredients(images)

8. geminiService builds ONE Gemini request:
   imageParts = [
     { inlineData: { mimeType: 'image/jpeg', data: base64(buffer1) } },
     { inlineData: { mimeType: 'image/jpeg', data: base64(buffer2) } },
     { inlineData: { mimeType: 'image/jpeg', data: base64(buffer3) } },
   ]
   contents = [{ parts: [...imageParts, { text: PROMPT }] }]

   → Sends ONE request to Gemini 2.5 Flash
   → If 429 rate limit: waits (retryDelay + 2) seconds, retries once
   → Gemini analyzes all 3 images simultaneously
   → Returns: ["tomato", "egg", "cheese", "milk", "butter", "onion"]

9. Service deduplicates and cleans the list
   → controller sends: { success: true, data: { ingredients: [...] } }

BROWSER (back in the await)

10. api.js receives the response, parses JSON, returns data
11. app.js: ingredients = result.data.ingredients
12. renderChips() creates clickable tag bubbles for each ingredient
13. ingredientsSection.classList.add('show') — the section slides into view
14. saveSession() saves ingredients to sessionStorage
15. spinner is removed, button re-enabled
```

---

## Part 6 — Authentication Flow End to End

```
REGISTER:
  Browser                    Server                      MongoDB
  ───────                    ──────                      ───────
  fill form
  Api.register({ username, email, password })
    → POST /api/auth/register ──────────────────────────►
                               validate middleware:
                               check username/email/password rules ✓
                               authController.register()
                               authService.register()
                                 User.findOne({ email OR username })──►  (search)
                                 ◄──────────────────────────────────── not found ✓
                                 User.create({ username, email, password })
                                    pre-save hook: bcrypt.hash(password) ──►
                                    ◄── hashed password stored ────────────
                                 jwt.sign({ id, username }, JWT_SECRET)
                               ◄── { token, user: { id, username, email } }
    ◄── 201 { data: { token, user } }
  Auth.setToken(token) → localStorage
  Auth.setUser(user)   → localStorage
  redirect to /index.html

EVERY PROTECTED REQUEST:
  Browser                    Server
  ───────                    ──────
  Authorization: Bearer eyJ...
  → POST /api/recipes/identify ──────────────────────────►
                               authenticate middleware:
                               jwt.verify(token, JWT_SECRET) → { id, username }
                               req.user = { id, username }
                               next() → continues to upload, then controller

LOGOUT:
  Auth.clear() removes token and user from localStorage
  redirect to /login.html
  Next protected request: no token → authenticate throws 401 → redirect to login
```

---

## Part 7 — Key Concepts Quick Reference

| Concept | Simple explanation | Where in this project |
|---|---|---|
| **HTML** | Structure of a web page | `.html` files |
| **CSS** | Visual appearance | `style.css` |
| **DOM** | The live HTML tree JS can read/write | `document.getElementById()` everywhere |
| **fetch** | Browser's built-in HTTP request function | `api.js` → `request()` |
| **FormData** | Builds multipart/form-data bodies (for file uploads) | `api.js` → `identifyIngredients` |
| **FileReader** | Browser API to read a File as data URL or bytes | `app.js` → `handleFiles` |
| **Canvas** | Browser drawing surface — used to resize images | `app.js` → `resizeImage` |
| **localStorage** | Browser key-value store, persists forever | `api.js` → `Auth` object |
| **sessionStorage** | Browser key-value store, clears on tab close | `app.js` → `saveSession` |
| **Express** | Web server framework for Node.js | `src/app.js` |
| **Middleware** | Function that runs between request and response | `src/middlewares/` |
| **JWT** | Signed token proving identity | `auth.service.js`, `auth.middleware.js` |
| **bcrypt** | One-way password hashing | `src/models/User.js` |
| **MongoDB** | Document database | `src/config/database.js`, `User.js` |
| **Mongoose** | Library that simplifies MongoDB access | `src/models/User.js` |
| **Multer** | Middleware that parses file upload requests | `upload.middleware.js` |
| **Buffer** | Raw bytes in Node.js memory | `req.files[0].buffer` |
| **base64** | Encoding binary as ASCII text | `gemini.service.js` → `buffer.toString('base64')` |
| **REST API** | URL + HTTP method = action convention | `src/routes/` |
| **async/await** | "Wait here until the Promise resolves" | Almost every function |
| **Rate limiting** | API enforcing request count limits | `gemini.service.js` retry logic |
| **Higher-order function** | Function that returns another function | `asyncHandler`, `validate` |
| **Environment variables** | Secrets stored outside source code | `src/config/env.js`, `.env` |

---

## Part 8 — Connection Map

```
                    ┌──────────────────────────────────────────────┐
                    │                  BROWSER                       │
                    │                                               │
  login.html  ──►   │  api.js (loaded on every page)               │
  register.html     │    Auth  → localStorage (token, user)        │
  index.html  ──►   │    Api   → fetch wrapper (attaches JWT)       │
  recipe.html ──►   │         │                                     │
                    │  auth.js       app.js         recipe.js       │
                    │  (login form)  (main page)    (recipe detail) │
                    └──────────────┬────────────────────────────────┘
                                   │  HTTP (fetch)
                                   │  Authorization: Bearer <JWT>
                                   │  multipart/form-data (images)
                    ┌──────────────▼────────────────────────────────┐
                    │                  SERVER                        │
                    │                                               │
                    │  src/app.js  (Express setup)                  │
                    │    │                                          │
                    │    ├── express.json()    parse JSON bodies    │
                    │    ├── express.static()  serve /public/       │
                    │    └── /api ──► src/routes/index.js           │
                    │                   │                           │
                    │         ┌─────────┴─────────┐                 │
                    │         │                   │                 │
                    │    /auth routes        /recipes routes        │
                    │         │               authenticate ◄─ JWT   │
                    │         │               upload (Multer)       │
                    │         │               validate              │
                    │         │                   │                 │
                    │    auth.controller     recipe.controller      │
                    │         │                   │                 │
                    │    auth.service        gemini.service ──► Google AI
                    │         │              spoonacular.service ──► Recipe DB
                    │         │                                     │
                    │       User.js ──► MongoDB                     │
                    │                                               │
                    │    error.middleware (catches everything)       │
                    └────────────────────────────────────────────────┘
```

---

If you want to fully understand this codebase, read the files in this order:

1. `public/js/api.js` — understand how browser and server communicate
2. `src/app.js` — understand how the server is structured
3. `src/middlewares/auth.middleware.js` — understand JWT
4. `src/models/User.js` — understand password hashing
5. `src/services/gemini.service.js` — understand the multi-image AI call and retry logic
6. `public/js/app.js` — trace the full upload-to-recipe flow in the browser

Everything else connects through those six files.
