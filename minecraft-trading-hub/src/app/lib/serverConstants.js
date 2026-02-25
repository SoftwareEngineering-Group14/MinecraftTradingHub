// HTTP Headers
export const HEADER_ACCESS_CONTROL_ALLOW_ORIGIN = 'Access-Control-Allow-Origin';
export const HEADER_ACCESS_CONTROL_ALLOW_METHODS = 'Access-Control-Allow-Methods';
export const HEADER_ACCESS_CONTROL_ALLOW_HEADERS = 'Access-Control-Allow-Headers';
export const HEADER_ACCESS_CONTROL_ALLOW_CREDENTIALS = 'Access-Control-Allow-Credentials';
export const HEADER_ACCESS_CONTROL_MAX_AGE = 'Access-Control-Max-Age';
export const HEADER_CONTENT_TYPE = 'Content-Type';
export const HEADER_AUTHORIZATION = 'Authorization';
export const HEADER_ORIGIN = 'origin';
export const HEADER_USER_AGENT = 'User-Agent';
export const HEADER_ACCEPT = 'Accept';
export const HEADER_CACHE_CONTROL = 'Cache-Control';
export const HEADER_SET_COOKIE = 'Set-Cookie';
export const HEADER_COOKIE = 'Cookie';

// HTTP Methods
export const METHOD_GET = 'GET';
export const METHOD_POST = 'POST';
export const METHOD_PUT = 'PUT';
export const METHOD_PATCH = 'PATCH';
export const METHOD_DELETE = 'DELETE';
export const METHOD_OPTIONS = 'OPTIONS';
export const METHOD_HEAD = 'HEAD';

// Content Types
export const CONTENT_TYPE_JSON = 'application/json';
export const CONTENT_TYPE_FORM_URLENCODED = 'application/x-www-form-urlencoded';
export const CONTENT_TYPE_MULTIPART = 'multipart/form-data';
export const CONTENT_TYPE_TEXT = 'text/plain';
export const CONTENT_TYPE_HTML = 'text/html';

// HTTP Status Codes
export const STATUS_OK = 200;
export const STATUS_CREATED = 201;
export const STATUS_NO_CONTENT = 204;
export const STATUS_BAD_REQUEST = 400;
export const STATUS_UNAUTHORIZED = 401;
export const STATUS_FORBIDDEN = 403;
export const STATUS_NOT_FOUND = 404;
export const STATUS_METHOD_NOT_ALLOWED = 405;
export const STATUS_CONFLICT = 409;
export const STATUS_INTERNAL_SERVER_ERROR = 500;
export const STATUS_NOT_IMPLEMENTED = 501;
export const STATUS_SERVICE_UNAVAILABLE = 503;

// Common Error Messages
export const ERROR_ORIGIN_NOT_ALLOWED = 'Origin not allowed';
export const ERROR_UNAUTHORIZED = 'Unauthorized';
export const ERROR_FORBIDDEN = 'Forbidden';
export const ERROR_NOT_FOUND = 'Not found';
export const ERROR_INTERNAL_SERVER = 'Internal server error';
export const ERROR_INVALID_REQUEST = 'Invalid request';
export const ERROR_MISSING_FIELDS = 'Missing required fields';
export const ERROR_INVALID_CREDENTIALS = 'Invalid credentials';

// Common Success Messages
export const SUCCESS_CREATED = 'Successfully created';
export const SUCCESS_UPDATED = 'Successfully updated';
export const SUCCESS_DELETED = 'Successfully deleted';

// CORS Configurations
export const CORS_METHODS_DEFAULT = 'GET, POST, PUT, DELETE, OPTIONS';
export const CORS_HEADERS_DEFAULT = 'Content-Type, Authorization';
export const CORS_MAX_AGE_DEFAULT = '86400'; // 24 hours in seconds

// Allowed Origins
export const ALLOWED_ORIGINS_DEVELOPMENT = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000'
];

// Cache Control
export const CACHE_NO_STORE = 'no-store';
export const CACHE_NO_CACHE = 'no-cache';
export const CACHE_PUBLIC = 'public';
export const CACHE_PRIVATE = 'private';

// Authentication
export const AUTH_BEARER_PREFIX = 'Bearer ';
export const AUTH_BASIC_PREFIX = 'Basic ';

// Cookie Options
export const COOKIE_HTTP_ONLY = 'HttpOnly';
export const COOKIE_SECURE = 'Secure';
export const COOKIE_SAME_SITE_STRICT = 'SameSite=Strict';
export const COOKIE_SAME_SITE_LAX = 'SameSite=Lax';
export const COOKIE_SAME_SITE_NONE = 'SameSite=None';

// Cookie Configuration for Session Persistence
export const COOKIE_MAX_AGE_30_DAYS = 60 * 60 * 24 * 30; // 30 days in seconds
export const COOKIE_MAX_AGE_7_DAYS = 60 * 60 * 24 * 7; // 7 days in seconds
export const COOKIE_MAX_AGE_1_DAY = 60 * 60 * 24; // 1 day in seconds
export const COOKIE_PATH_ROOT = '/';

// Domain Interest Constant
export const INTEREST_OPTIONS = [
  'Redstone',
  'Building',
  'PvP',
  'Farming',
  'Trading',
  'Rare Items',
  'Hardcore',
  'Creative'
];
