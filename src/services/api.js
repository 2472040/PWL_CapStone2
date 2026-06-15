const API_BASE = '/api/v1';

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

// set login flag — the actual JWT lives in HttpOnly cookie
export const setToken = () => {
  localStorage.setItem('loka_logged_in', 'true');
};

// check if user is logged in using a non-sensitive flag
export const getToken = () => {
  return localStorage.getItem('loka_logged_in') === 'true';
};

// clear login flag
export const removeToken = () => {
  localStorage.removeItem('loka_logged_in');
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

// header helper — no Bearer token needed since it is handled by HttpOnly cookie
export const authHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCookie('csrfToken') || '',
    'X-Requested-With': 'XMLHttpRequest',
  };
};

let _refreshPromise = null;

async function attemptTokenRefresh() {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      const csrfCookie = getCookie('csrfToken');
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrfCookie && { 'X-CSRF-Token': csrfCookie }),
        },
      });

      if (!res.ok) {
        throw new Error('Session expired');
      }

      const data = await res.json();
      if (data && data.data && data.data.user) {
        setToken();
        return true;
      }
      throw new Error('Invalid refresh response');
    } catch (e) {
      removeToken();
      localStorage.removeItem('loka-role');
      localStorage.removeItem('loka-view');
      if (window.__lokaLogout) window.__lokaLogout();
      else window.location.reload();
      throw e;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// wrapper fetch with credentials: 'include' support
export async function apiFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  // Clear cache on write operations (POST, PUT, DELETE)
  if (method !== 'GET') {
    clearApiCache();
  }

  // Handle dynamic caching for GET requests — use endpoint only as cache key
  // (GET requests shouldn't have bodies; including body in key risks collisions)
  const cacheKey = endpoint;
  if (method === 'GET') {
    const cached = _apiCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL) {
      console.log(`⚡ [API Cache] Cache hit for ${endpoint}`);
      return cached.data;
    }
  }

  try {
    let response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include', // Ensure HttpOnly cookies are attached
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });

    // Intercept 401 Unauthorized for Access Token Expiration
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      try {
        console.log(
          `🔑 [API Session] Access token expired, attempting silent refresh for ${endpoint}...`
        );
        await attemptTokenRefresh();
        // Retry the original request with the new tokens
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          credentials: 'include',
          headers: {
            ...authHeaders(),
            ...(options.headers || {}),
          },
        });
      } catch (refreshErr) {
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
      }
    }

    let result;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      // Handle HTML proxy errors (e.g. 401 from middleware)
      if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
        removeToken();
        localStorage.removeItem('loka-role');
        localStorage.removeItem('loka-view');
        if (window.__lokaLogout) window.__lokaLogout();
        else window.location.reload();
      }
      throw new Error(
        `Server error: ${response.status}. Pastikan backend sudah dijalankan (npm run server).`
      );
    }

    if (!response.ok) {
      if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
        removeToken();
        localStorage.removeItem('loka-role');
        localStorage.removeItem('loka-view');
        if (window.__lokaLogout) window.__lokaLogout();
        else window.location.reload();
      }
      throw new Error(result.error || result.message || 'API Error');
    }

    // Cache successful GET results
    if (method === 'GET' && response.ok) {
      _apiCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return result;
  } catch (err) {
    if (
      err.message.includes('Unexpected end of JSON input') ||
      err.message.includes('Failed to fetch')
    ) {
      throw new Error(
        'Gagal terhubung ke server. Pastikan backend sudah dijalankan (npm run server atau npm run dev:all).'
      );
    }
    throw err;
  }
}
