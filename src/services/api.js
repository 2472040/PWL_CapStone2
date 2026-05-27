const API_BASE = "/api";

// In-memory JWT storage (fallback when cookie doesn't work through Vite proxy)
let _memoryToken = null;

// check if user is logged in using a non-sensitive flag
export const getToken = () => {
  return localStorage.getItem("loka_logged_in");
};

// set login flag + store actual JWT in memory for Bearer header fallback
export const setToken = (token) => {
  _memoryToken = token; // Store actual JWT in memory
  localStorage.setItem("loka_logged_in", "true");
};

// clear login flag and memory token
export const removeToken = () => {
  _memoryToken = null;
  localStorage.removeItem("loka_logged_in");
};

// header helper — includes Bearer token from memory if available
export const authHeaders = () => {
  return {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest", // Protect against CSRF attacks
    ...(_memoryToken && {
      Authorization: `Bearer ${_memoryToken}`,
    }),
  };
};

// wrapper fetch with credentials: 'include' support
export async function apiFetch(endpoint, options = {}) {
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

    return result;
  } catch (err) {
    if (err.message.includes('Unexpected end of JSON input') || err.message.includes('Failed to fetch')) {
      throw new Error("Gagal terhubung ke server. Pastikan backend sudah dijalankan (npm run server atau npm run dev:all).");
    }
    throw err;
  }
}