/**
 * Parses the raw Cookie header string into an object.
 * @param cookieHeader - The raw Cookie header value from req.headers.cookie.
 * @returns An object mapping cookie names to their decoded values.
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      const rawValue = parts.join('=');
      try {
        list[name] = decodeURIComponent(rawValue);
      } catch {
        // Malformed cookie value (e.g. invalid percent-encoding) — use raw value as fallback
        list[name] = rawValue;
      }
    }
  });
  return list;
}
