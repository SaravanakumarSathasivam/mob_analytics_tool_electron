/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ParsedEvent,
  parseQueryParams,
  parseBodyParams,
  normalizeHeaders,
  createParsedEvent,
} from "./common";

/**
 * Detects if a request belongs to Adobe Analytics.
 * Typical pattern: /b/ss/{rsid}/...
 */
export function isAdobeRequest(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("omtrdc.net") ||
    url.includes("adobedc.net") ||
    url.includes("sc.omtrdc.net") ||
    url.includes("/b/ss/")
  ); // Classic Adobe Analytics endpoint
}

/**
 * Parses Adobe Analytics events into a uniform format.
 */
export function parseAdobeRequest(request: any): ParsedEvent | null {
  if (!isAdobeRequest(request.url)) return null;

  const queryParams = parseQueryParams(request.url);
  const bodyParams = parseBodyParams(request.body);
  const headers = normalizeHeaders(request.headers);

  // Adobe event names often stored in 'pev2', 'pe', or 'pageName'
  const eventName =
    queryParams.pev2 || queryParams.pe || queryParams.pageName || "adobe_event";
  const payload = { ...queryParams, ...bodyParams };

  console.log(eventName, bodyParams, request, 'adobee')

  return createParsedEvent(
    "adobe_analytics",
    eventName,
    payload,
    request.method,
    request.url,
    headers,
    request.timestamp
  );
}
