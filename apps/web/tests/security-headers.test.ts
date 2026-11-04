import { describe, expect, it } from "vitest";
import {
  addSecurityHeaders,
  contentSecurityPolicy,
  createScriptNonce,
} from "../worker/security-headers";
import { serializeJsonLd } from "../lib/serialize-json-ld";

describe("response security headers", () => {
  it("requires HTTPS without extending the policy to unrelated subdomains", async () => {
    const response = addSecurityHeaders(new Response("content", {
      headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
    }), contentSecurityPolicy(createScriptNonce()));
    expect(response.headers.get("Strict-Transport-Security")).toBe("max-age=15552000");
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe("content");
  });

  it("preserves redirects and allows an explicit local development exemption", () => {
    const response = addSecurityHeaders(Response.redirect("https://example.org", 301), null);
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://example.org/");
    expect(response.headers.has("Content-Security-Policy")).toBe(false);
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

describe("script security", () => {
  it("uses fresh random nonces and rejects policy injection", () => {
    const nonces = Array.from({ length: 100 }, () => createScriptNonce());
    expect(new Set(nonces).size).toBe(nonces.length);
    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{32}$/);
      const policy = contentSecurityPolicy(nonce);
      expect(policy).toContain(`script-src 'self' 'nonce-${nonce}'`);
      expect(policy).toContain("script-src-attr 'none'");
      expect(policy).not.toContain("unsafe-eval");
      expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
      expect(policy).toContain("worker-src 'self' blob:");
    }
    expect(() => contentSecurityPolicy("x'; script-src *")).toThrow();
  });

  it("prevents caching nonce HTML while retaining resource cache policies", () => {
    const nonce = createScriptNonce();
    const policy = contentSecurityPolicy(nonce);
    const html = addSecurityHeaders(
      new Response("<html></html>", {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=600",
          "X-Powered-By": "framework",
        },
      }),
      policy,
    );
    expect(html.headers.get("Cache-Control")).toBe("private, no-store");
    expect(html.headers.get("Content-Security-Policy")).toBe(policy);
    expect(html.headers.has("X-Powered-By")).toBe(false);
    const asset = addSecurityHeaders(
      new Response("", {
        headers: {
          "Content-Type": "text/javascript",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }),
      policy,
    );
    expect(asset.headers.get("Cache-Control")).toContain("immutable");
  });

  it("keeps authored JSON-LD text from terminating its script element", () => {
    const value = { title: '</script><script>alert("x")</script>', math: "a < b" };
    const serialized = serializeJsonLd(value);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
