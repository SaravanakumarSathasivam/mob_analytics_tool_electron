/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-explicit-any */
// parsers/common.ts

export interface ParsedEvent {
  timestamp: string;
  type: string;
  source: string;
  requestUrl: string;
  method: string;
  statusCode?: number;
  headers?: Record<string, string>;
  payload?: Record<string, any>;
}

/**
 * Parse a query string or request body into an object
 */
export function parseKeyValueString(data: string): Record<string, any> {
  // Step 1: Clean up Adobe-style delimiters
  const cleaned = data
    .replace(/c\.\&a\.\&/g, "") // remove "c.&a.&"
    .replace(/\.c\&/g, "&") // replace ".c&" with "&"
    .replace(/\.a\&/g, "&"); // replace ".a&" with "&"

  // Step 2: Parse like normal query params
  const params = new URLSearchParams(cleaned);
  const obj: Record<string, any> = {};

  params.forEach((value, key) => {
    // decode both key and value for readability
    const decodedKey = decodeURIComponent(key);
    const decodedValue = decodeURIComponent(value);
    obj[decodedKey] = decodedValue;
  });

  return obj;
}

/**
 * Parse query parameters from a URL into an object
 */
export function parseQueryParams(url: string): Record<string, any> {
  try {
    const parsedUrl = new URL(url, "http://dummy"); // base required for relative URLs
    return parseKeyValueString(parsedUrl.search);
  } catch {
    return {};
  }
}

/**
 * Parse body parameters (supports x-www-form-urlencoded and JSON)
 */
export function parseBodyParams(
  body: string,
  contentType?: string
): Record<string, any> {
  if (!body) return {};
  try {
    if (contentType?.includes("application/json")) {
      return JSON.parse(body);
    }
    if (contentType?.includes("application/x-www-form-urlencoded")) {
      return parseKeyValueString(body);
    }
  } catch {
    return {};
  }
  return {};
}

/**
 * Normalize request/response headers into a consistent object
 */
export function normalizeHeaders(
  headers: Record<string, string | string[]>
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = Array.isArray(value)
      ? value.join(", ")
      : value;
  }
  return normalized;
}

/**
 * Create a standardized parsed event object
 */
export function createParsedEvent(
  source: string,
  type: string,
  payload: Record<string, any>,
  method: string,
  requestUrl: string,
  headers?: Record<string, string>,
  statusCode?: number,
  timestamp?: string
): ParsedEvent {
  return {
    timestamp: timestamp || new Date().toISOString(),
    type,
    source,
    requestUrl,
    method,
    statusCode,
    headers,
    payload,
  };
}
