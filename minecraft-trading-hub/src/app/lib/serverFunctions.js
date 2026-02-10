/**
 * Verifies if the given origin is in the list of allowed origins
 * @param {string} origin - The origin to check
 * @param {string[]} allowedOrigins - Array of allowed origin URLs
 * @returns {boolean} - True if origin is allowed, false otherwise
 */
export function isOriginAllowed(origin, allowedOrigins) {
  return allowedOrigins.includes(origin);
}
