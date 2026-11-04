export function contentSecurityPolicy(nonce?: string): string {
  if (nonce !== undefined && !/^[A-Za-z0-9+/]{32}$/.test(nonce)) {
    throw new Error("Invalid script nonce");
  }
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    `script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function createScriptNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes));
}

export const securityHeaders = {
  "Strict-Transport-Security": "max-age=15552000",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
} as const;

export function addSecurityHeaders(response: Response, policy: string | null): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
  headers.delete("X-Powered-By");
  if (policy) headers.set("Content-Security-Policy", policy);
  if (policy && headers.get("Content-Type")?.includes("text/html")) {
    headers.set("Cache-Control", "private, no-store");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
