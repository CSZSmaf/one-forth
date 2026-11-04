/** Cloudflare Worker entry point generated around the Next.js App Router by vinext. */
import handler from "vinext/server/app-router-entry";
import { normalizeCurriculumPath } from "@one-forth/config";
import { canonicalRedirectUrl } from "./canonical-host";
import { addSecurityHeaders, contentSecurityPolicy, createScriptNonce } from "./security-headers";

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

const worker = {
  async fetch(
    request: Request,
    env?: Parameters<typeof handler.fetch>[1],
    ctx?: Parameters<typeof handler.fetch>[2],
  ): Promise<Response> {
    const url = new URL(request.url);
    const development = import.meta.env.DEV && localHosts.has(url.hostname);
    const nonce = createScriptNonce();
    const policy = development ? null : contentSecurityPolicy(nonce);
    const redirectUrl = canonicalRedirectUrl(request.url);
    if (redirectUrl) return addSecurityHeaders(Response.redirect(redirectUrl, 301), policy);
    if (/^\/(?:\.vite|\.wrangler|\.openai)(?:\/|$)/i.test(url.pathname)) {
      return addSecurityHeaders(new Response(null, { status: 404 }), policy);
    }
    const pathname = normalizeCurriculumPath(url.pathname);
    if (pathname !== url.pathname) {
      url.pathname = pathname;
      return addSecurityHeaders(Response.redirect(url.toString(), 301), policy);
    }
    // Vinext reads this policy for SSR and streamed RSC scripts.
    // Replace client-supplied values before they reach the renderer.
    const headers = new Headers(request.headers);
    headers.delete("x-nonce");
    headers.delete("content-security-policy");
    if (policy) headers.set("content-security-policy", policy);
    const response = await handler.fetch(new Request(request, { headers }), env, ctx);
    return addSecurityHeaders(response, policy);
  },
};

export default worker;
