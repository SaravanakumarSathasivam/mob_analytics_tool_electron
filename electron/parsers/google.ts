/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ParsedEvent,
  parseQueryParams,
  parseBodyParams,
  normalizeHeaders,
  createParsedEvent,
} from "./common";

/**
 * Detects if a request belongs to Google Analytics or Firebase.
 */
export function isGoogleRequest(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("google-analytics.com") ||
    url.includes("analytics.google.com") ||
    url.includes("/collect") || // GA Measurement Protocol
    url.includes("gtag/js")
  ); // GA4
}

/**
 * Parses Google Analytics / Firebase events into a uniform format.
 */
export function parseGoogleRequest(request: any): ParsedEvent | null {
  if (!isGoogleRequest(request.url)) return null;

  const queryParams = parseQueryParams(request.url);
  const bodyParams =
    typeof request.body === "string"
      ? parseBodyParams(request.body, request.headers?.["content-type"])
      : request.body || {};
  const headers = normalizeHeaders(request.headers);

  const eventName = queryParams.en || queryParams.t || "google_event";
  const payload = { ...queryParams, ...bodyParams };

  return createParsedEvent(
    "google_analytics",
    eventName,
    payload,
    request.method,
    request.url,
    headers,
    request.timestamp
  );
}
