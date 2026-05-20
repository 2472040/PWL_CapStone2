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
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "API Error");
  }

  return result;
}