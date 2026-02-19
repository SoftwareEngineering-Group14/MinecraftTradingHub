/**
 * Verifies if the given origin is in the list of allowed origins
 * @param {string} origin - The origin to check
 * @param {string[]} allowedOrigins - Array of allowed origin URLs
 * @returns {boolean} - True if origin is allowed, false otherwise
 */
export function isOriginAllowed(origin, allowedOrigins) {
  return allowedOrigins.includes(origin);
}

/**
 * Generates CORS headers for API responses
 * @param {string} origin - The origin making the request
 * @param {string[]} allowedOrigins - Array of allowed origin URLs
 * @param {string} methods - Comma-separated list of allowed HTTP methods
 * @param {string} headers - Comma-separated list of allowed headers
 * @returns {Object} - CORS headers object
 */
export function corsHeaders(origin, allowedOrigins, methods, headers) {
  const headersObj = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
  };

  if (isOriginAllowed(origin, allowedOrigins)) {
    headersObj['Access-Control-Allow-Origin'] = origin;
  }

  return headersObj;
}
