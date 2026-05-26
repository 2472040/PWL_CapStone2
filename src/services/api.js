const API_BASE = "/api";

// ambil token dari localStorage //
export const getToken = () => {
  return localStorage.getItem("token");
};

// save token ke localStorage //
export const setToken = (token) => {
  localStorage.setItem("token", token);
};

// hapus token dari localStorage //
export const removeToken = () => {
  localStorage.removeItem("token");
};

// header authorization otomatis //
export const authHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token && {
      Authorization: `Bearer ${token}`,
    }),
  };
};

// wrapper fetch //
export async function apiFetch(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
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
      // Return a text error if the response isn't JSON (e.g. proxy HTML error)
      const text = await response.text();
      throw new Error(`Server error: ${response.status}. Pastikan backend sudah dijalankan (npm run server).`);
    }

    if (!response.ok) {
      throw new Error(result.message || "API Error");
    }

    return result;
  } catch (err) {
    // If it's a TypeError like 'Failed to fetch' or our custom error
    if (err.message.includes('Unexpected end of JSON input') || err.message.includes('Failed to fetch')) {
      throw new Error("Gagal terhubung ke server. Pastikan backend sudah dijalankan (npm run server atau npm run dev:all).");
    }
    throw err;
  }
}