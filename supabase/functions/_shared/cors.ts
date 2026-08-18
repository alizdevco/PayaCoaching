// Central CORS allow-list for browser-facing Edge Functions.

const ALLOWED_ORIGINS = [
  "https://payacoaching.ir",
  "https://www.payacoaching.ir",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
];

const CORS_BASE_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

/** Returns CORS headers for the request origin when it is on the allow-list. */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return { ...CORS_BASE_HEADERS };
  }

  return {
    ...CORS_BASE_HEADERS,
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}
