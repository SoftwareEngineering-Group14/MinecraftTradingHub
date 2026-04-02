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

/**
 * Handles OPTIONS requests for CORS preflight
 * @param {Request} request - The incoming request
 * @param {string[]} allowedOrigins - Array of allowed origin URLs
 * @param {string} allowedMethods - Comma-separated list of allowed HTTP methods
 * @param {string} allowedHeaders - Comma-separated list of allowed headers
 * @param {string} headerOrigin - The origin header constant
 * @returns {NextResponse} - Response with CORS headers
 */
export function handleOptions(request, allowedOrigins, allowedMethods, allowedHeaders, headerOrigin) {
  const { NextResponse } = require("next/server");
  const origin = request.headers.get(headerOrigin) || "";
  return NextResponse.json(
    {},
    { headers: corsHeaders(origin, allowedOrigins, allowedMethods, allowedHeaders) }
  );
}

/**
 * Authenticates a request using Bearer token
 * @param {Request} request - The incoming request
 * @param {Object} config - Configuration object
 * @param {string[]} config.allowedOrigins - Array of allowed origin URLs
 * @param {string} config.allowedMethods - Comma-separated list of allowed HTTP methods
 * @param {string} config.allowedHeaders - Comma-separated list of allowed headers
 * @param {string} config.headerOrigin - The origin header constant
 * @param {string} config.headerAuthorization - The authorization header constant
 * @param {string} config.authBearerPrefix - The Bearer prefix constant
 * @param {number} config.statusUnauthorized - The unauthorized status code
 * @param {string} config.errorUnauthorized - The unauthorized error message
 * @returns {Promise<{user: Object, supabase: Object, headers: Object} | {error: NextResponse}>} - Auth result or error response
 */
export async function authenticateRequest(request, config) {
  const { NextResponse } = require("next/server");
  const { createServerSideClient } = require("./supabaseClient");
  
  const origin = request.headers.get(config.headerOrigin) || "";
  const headers = corsHeaders(
    origin,
    config.allowedOrigins,
    config.allowedMethods,
    config.allowedHeaders
  );

  const authHeader = request.headers.get(config.headerAuthorization);
  if (!authHeader || !authHeader.startsWith(config.authBearerPrefix)) {
    return {
      error: NextResponse.json(
        { error: config.errorUnauthorized },
        { status: config.statusUnauthorized, headers }
      )
    };
  }

  const token = authHeader.substring(config.authBearerPrefix.length);
  const supabase = await createServerSideClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: config.errorUnauthorized },
        { status: config.statusUnauthorized, headers }
      )
    };
  }

  return { user, supabase, headers };
}
