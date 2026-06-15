/**
 * Centralized Cookie Utility for LokaLab
 */

/**
 * Parses the raw Cookie header string into an object.
 * @param {string} cookieHeader - The raw Cookie header value from req.headers.cookie.
 * @returns {Object} An object mapping cookie names to their decoded values.
 */
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

module.exports = { parseCookies };
