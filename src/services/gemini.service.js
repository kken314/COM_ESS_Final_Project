// src/services/gemini.service.js
// Sends an image to Gemini 2.5 Flash and gets back a list of ingredients.
// We use Google's structured-output feature to GUARANTEE a JSON array
// of strings — no parsing surprises.
const { GoogleGenAI } = require('@google/genai');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const PROMPT = `You are a food vision expert. Look at this image and identify
every distinct food ingredient you can see. Rules:
- Use simple, common ingredient names (e.g. "tomato" not "fresh red roma tomato")
- Use lowercase, singular form when possible
- Only include actual food items (ignore plates, utensils, packaging text)
- If you see a packaged product, name the food inside (e.g. "milk" not "milk carton")
- If the image contains no food, return an empty array

Return ONLY a JSON array of ingredient name strings.`;

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

// images: [{ buffer, mimeType }, ...]
async function identifyIngredients(images, attempt = 1) {
  try {
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

    const ingredients = JSON.parse(response.text);

    // Defensive: ensure we got an array of strings.
    if (!Array.isArray(ingredients)) {
      throw new ApiError(502, 'AI returned an unexpected response shape');
    }

    // Deduplicate and clean up.
    return [...new Set(ingredients.map((s) => String(s).trim().toLowerCase()))]
      .filter(Boolean);
  } catch (error) {
    if (error instanceof ApiError) throw error;

    console.error('Gemini API error:', error.message);

    const retryAfter = parseRetryDelay(error);
    if (retryAfter !== null && attempt <= 2) {
      const waitMs = (retryAfter + 2) * 1000; // add 2 s buffer
      console.log(`Rate limited — retrying in ${retryAfter + 2}s (attempt ${attempt}/2)…`);
      await new Promise(r => setTimeout(r, waitMs));
      return identifyIngredients(images, attempt + 1);
    }

    if (retryAfter !== null) {
      throw new ApiError(429, `AI quota reached — please wait ${retryAfter}s and try again.`);
    }

    throw new ApiError(502, 'Failed to identify ingredients from image');
  }
}

module.exports = { identifyIngredients };
