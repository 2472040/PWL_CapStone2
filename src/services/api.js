const API_BASE = "/api";

// In-memory JWT storage (fallback when cookie doesn't work through Vite proxy)
let _memoryToken = null;

// Dynamic In-memory API Cache layer (TanStack Query-like lightweight interceptor)
const _apiCache = new Map();
const CACHE_TTL = 15000; // 15 seconds TTL

export const clearApiCache = () => {
  _apiCache.clear();
  console.log('⚡ [API Cache] Cache successfully invalidated.');
};

if (typeof window !== 'undefined') {
  window.clearApiCache = clearApiCache;
}

// set login flag + store actual JWT in memory for Bearer header fallback
export const setToken = (token) => {
  _memoryToken = token;

  localStorage.setItem("token", token);
  localStorage.setItem("loka_logged_in", "true");
};

// check if user is logged in using a non-sensitive flag
export const getToken = () => {
  return _memoryToken || localStorage.getItem("token");
};

// clear login flag and memory token
export const removeToken = () => {
  _memoryToken = null;
  localStorage.removeItem("token");
  localStorage.removeItem("loka_logged_in");
};

// helper to extract a cookie value on frontend
const getCookie = (name) => {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  } catch (e) {}
  return '';
};

// header helper — includes Bearer token from memory if available
export const authHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": getCookie("csrfToken") || "",
    "X-Requested-With": "XMLHttpRequest",
    ...(token && {
      Authorization: `Bearer ${token}`,
    }),
  };
};

// wrapper fetch with credentials: 'include' support
export async function apiFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  // Clear cache on write operations (POST, PUT, DELETE)
  if (method !== 'GET') {
    clearApiCache();
  }

  // Handle dynamic caching for GET requests
  const cacheKey = `${endpoint}?${JSON.stringify(options.body || '')}`;
  if (method === 'GET') {
    const cached = _apiCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      console.log(`⚡ [API Cache] Cache hit for ${endpoint}`);
      return cached.data;
    }
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include", // Ensure HttpOnly cookies are attached
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });

    let result;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      // Handle HTML proxy errors (e.g. 401 from middleware)
      if (response.status === 401 && endpoint !== '/auth/login') {
        removeToken();
        localStorage.removeItem('loka-role');
        localStorage.removeItem('loka-view');
        if (window.__lokaLogout) window.__lokaLogout();
        else window.location.reload();
      }
      throw new Error(`Server error: ${response.status}. Pastikan backend sudah dijalankan (npm run server).`);
    }

    if (!response.ok) {
      if (response.status === 401 && endpoint !== '/auth/login') {
        removeToken();
        localStorage.removeItem('loka-role');
        localStorage.removeItem('loka-view');
        if (window.__lokaLogout) window.__lokaLogout();
        else window.location.reload();
      }
      throw new Error(result.error || result.message || "API Error");
    }

    // Cache successful GET results
    if (method === 'GET' && response.ok) {
      _apiCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }

    return result;
  } catch (err) {
    if (err.message.includes('Unexpected end of JSON input') || err.message.includes('Failed to fetch')) {
      throw new Error("Gagal terhubung ke server. Pastikan backend sudah dijalankan (npm run server atau npm run dev:all).");
    }
    throw err;
  }
}