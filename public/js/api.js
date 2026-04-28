// public/js/api.js
// Thin wrapper around fetch() that:
//  - Prefixes /api to all paths
//  - Attaches the JWT from localStorage
//  - Throws an Error with a clean message on non-2xx responses
//  - Auto-redirects to /login.html on 401

const TOKEN_KEY = 'recipe_finder_token';
const USER_KEY = 'recipe_finder_user';

const Auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
  requireLogin: () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      window.location.href = '/login.html';
    }
  },
};

async function request(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });

  // Handle no-content responses gracefully.
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  }

  if (!res.ok) {
    if (res.status === 401 && Auth.getToken()) {
      Auth.clear();
      window.location.href = '/login.html';
    }
    const msg = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

const Api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login:    (payload) => request('/auth/login',    { method: 'POST', body: payload }),

  identifyIngredients: (files) => {
    const fd = new FormData();
    files.forEach(file => fd.append('images', file));
    return request('/recipes/identify', { method: 'POST', body: fd, isFormData: true });
  },
  searchRecipes: (ingredients) =>
    request('/recipes/search', { method: 'POST', body: { ingredients } }),
  getRecipe: (id) => request(`/recipes/${id}`),
};

// Expose globally so other scripts can use them.
window.Api = Api;
window.Auth = Auth;
