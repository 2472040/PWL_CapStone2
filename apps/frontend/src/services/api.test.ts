import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// We need to reset modules and re-import to test the cache cleanly
vi.stubGlobal('fetch', vi.fn());

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });

// Mock document.cookie
Object.defineProperty(globalThis, 'document', {
  value: {
    cookie: 'csrfToken=test-csrf-value; other=value',
    documentElement: { setAttribute: vi.fn() },
  },
  writable: true,
});

// Mock window
vi.stubGlobal('window', {
  clearApiCache: undefined,
  __lokaLogout: vi.fn(),
  location: { reload: vi.fn() },
});

import { apiFetch, clearApiCache, setToken, getToken, removeToken, authHeaders } from './api';

const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('api.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiCache();
  });

  describe('Token utilities', () => {
    it('setToken stores login flag in localStorage', () => {
      setToken();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('loka_logged_in', 'true');
    });

    it('getToken returns true when login flag is set', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('true');
      expect(getToken()).toBe(true);
    });

    it('getToken returns false when login flag is absent', () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null as unknown as string);
      expect(getToken()).toBe(false);
    });

    it('removeToken removes login flag', () => {
      removeToken();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('loka_logged_in');
    });
  });

  describe('authHeaders', () => {
    it('returns correct headers with CSRF token', () => {
      const headers = authHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Requested-With']).toBe('XMLHttpRequest');
      expect(headers['X-CSRF-Token']).toBe('test-csrf-value');
    });
  });

  describe('apiFetch - GET requests', () => {
    it('fetches data successfully', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: 1 } }));
      const result = await apiFetch<{ data: { id: number } }>('/test');
      expect(result.data.id).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('caches GET responses', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'cached' }));
      await apiFetch('/cache-test');
      const cached = await apiFetch('/cache-test');
      expect(cached).toEqual({ data: 'cached' });
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only 1 real fetch call
    });

    it('clears cache on clearApiCache()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'first' }));
      await apiFetch('/clear-test');
      clearApiCache();
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'second' }));
      const result = await apiFetch('/clear-test');
      expect(result).toEqual({ data: 'second' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('apiFetch - Write operations', () => {
    it('clears cache on POST requests', async () => {
      // Pre-populate cache
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'cached' }));
      await apiFetch('/some-endpoint');

      // POST should clear cache
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await apiFetch('/some-endpoint', { method: 'POST', body: '{}' });

      // Next GET should re-fetch
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'fresh' }));
      const result = await apiFetch('/some-endpoint');
      expect(result).toEqual({ data: 'fresh' });
    });
  });

  describe('apiFetch - Error handling', () => {
    it('throws on non-JSON response', async () => {
      const htmlResponse = new Response('<html>Error</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });
      mockFetch.mockResolvedValueOnce(htmlResponse);
      await expect(apiFetch('/bad-response')).rejects.toThrow('Server error: 502');
    });

    it('throws on failed fetch (network error)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
      await expect(apiFetch('/network-error')).rejects.toThrow('Gagal terhubung ke server');
    });

    it('throws on JSON error response', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Not found' }, 404));
      await expect(apiFetch('/not-found')).rejects.toThrow('Not found');
    });
  });

  describe('apiFetch - Credentials and headers', () => {
    it('sends credentials: include on all requests', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await apiFetch('/any');
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].credentials).toBe('include');
    });

    it('merges custom headers', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
      await apiFetch('/custom', { headers: { 'X-Custom': 'value' } });
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers['X-Custom']).toBe('value');
      expect(callArgs[1].headers['X-CSRF-Token']).toBe('test-csrf-value');
    });
  });
});
