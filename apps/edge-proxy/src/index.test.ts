import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";
import { siteConfig } from "@one-forth/config";

const publicOrigin = siteConfig.url;
const regionalOrigin = new URL(publicOrigin);
regionalOrigin.hostname = `cn.${regionalOrigin.hostname}`;
const testOrigin = new URL(publicOrigin);
testOrigin.hostname = `cn-test.${testOrigin.hostname}`;
const wwwOrigin = new URL(publicOrigin);
wwwOrigin.hostname = `www.${wwwOrigin.hostname}`;

const env: Parameters<typeof worker.fetch>[1] = {
  ORIGIN_URL: "https://origin.example.org",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function requestFromCountry(url: string, country: string): Request {
  const request = new Request(url);
  Object.defineProperty(request, "cf", {
    configurable: true,
    value: { country },
  });
  return request;
}

describe("One Forth edge proxy", () => {
  it.each([
    ["next", "/zh-CN/books/next"],
    ["?page=2", "/zh-CN/books/current?page=2"],
    ["../next", "/zh-CN/next"],
    ["/absolute", "/absolute"],
  ])("resolves relative Location %s from the origin request", async (location, path) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 302, headers: { Location: location } })));
    const response = await worker.fetch(new Request(`${publicOrigin}/zh-CN/books/current`), env);
    expect(response.headers.get("Location")).toBe(`${publicOrigin}${path}`);
  });

  it.each(["/zh-CN/resources?kind=book", "/assets/client.js"])(
    "serves %s through the primary binding with sanitized request headers",
    async (path) => {
      const publicFetch = vi.fn();
      vi.stubGlobal("fetch", publicFetch);
      const primaryFetch = vi.fn(async (request: Request) => {
        expect(request.url).toBe(`${env.ORIGIN_URL}${path}`);
        expect(request.headers.get("Authorization")).toBeNull();
        expect(request.headers.get("Cookie")).toBeNull();
        expect(request.headers.get("X-Forwarded-Host")).toBe(new URL(publicOrigin).host);
        return new Response("primary content", {
          headers: { "Content-Security-Policy": "script-src 'nonce-example'" },
        });
      });
      const response = await worker.fetch(
        new Request(`${publicOrigin}${path}`, {
          headers: { Authorization: "Bearer private", Cookie: "private=value" },
        }),
        { ...env, PRIMARY_ORIGIN: { fetch: primaryFetch } },
      );
      expect(await response.text()).toBe("primary content");
      expect(response.headers.get("Content-Security-Policy")).toBe("script-src 'nonce-example'");
      expect(primaryFetch).toHaveBeenCalledOnce();
      expect(publicFetch).not.toHaveBeenCalled();
    },
  );

  it("keeps regional binding precedence when the primary binding is present", async () => {
    const primaryFetch = vi.fn();
    const regionalFetch = vi.fn(async () => new Response("regional content"));
    const response = await worker.fetch(new Request(`${regionalOrigin.origin}/zh-CN`), {
      ...env,
      PRIMARY_ORIGIN: { fetch: primaryFetch },
      MAINLAND_ORIGIN: { fetch: regionalFetch },
      MAINLAND_ORIGIN_URL: "https://regional-origin.example",
      MAINLAND_ORIGIN_MODE: "active",
    });
    expect(await response.text()).toBe("regional content");
    expect(regionalFetch).toHaveBeenCalledOnce();
    expect(primaryFetch).not.toHaveBeenCalled();
  });

  it("rewrites primary binding redirects to the requested public host", async () => {
    const response = await worker.fetch(new Request(`${publicOrigin}/`), {
      ...env,
      PRIMARY_ORIGIN: {
        fetch: async () => Response.redirect(`${env.ORIGIN_URL}/zh-CN?from=origin`, 307),
      },
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(`${publicOrigin}/zh-CN?from=origin`);
  });

  it("retains the mainland redirect before calling the primary binding", async () => {
    const primaryFetch = vi.fn();
    const response = await worker.fetch(requestFromCountry(`${publicOrigin}/zh-CN`, "CN"), {
      ...env,
      PRIMARY_ORIGIN: { fetch: primaryFetch },
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(`${regionalOrigin.origin}/zh-CN`);
    expect(primaryFetch).not.toHaveBeenCalled();
  });

  it("returns 502 without silently changing origins when the primary binding fails", async () => {
    const publicFetch = vi.fn();
    vi.stubGlobal("fetch", publicFetch);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await worker.fetch(new Request(`${publicOrigin}/zh-CN`), {
      ...env,
      PRIMARY_ORIGIN: { fetch: async () => { throw new Error("binding unavailable"); } },
    });
    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(publicFetch).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it.each([
    { accept: "gzip, br", encoded: true },
    { accept: "gzip;q=0", encoded: false },
    { accept: "identity", encoded: false },
    { accept: "", encoded: false },
  ])("prevents injected analytics and retains compatible HTML compression: %j", async ({ accept, encoded }) => {
    vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
      expect(request.headers.get("Accept-Encoding")).toBe(accept || "identity");
      return new Response("<html>content</html>", {
        headers: { "Content-Type": "text/html", "Content-Length": "20", "Vary": "RSC" },
      });
    }));
    const response = await worker.fetch(new Request(`${publicOrigin}/zh-CN`, {
      headers: { "Accept-Encoding": accept },
    }), env);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, no-transform");
    expect(response.headers.get("Content-Encoding")).toBe(encoded ? "gzip" : null);
    expect(response.headers.get("Vary")).toContain("Accept-Encoding");
    expect(response.headers.get("Vary")).toContain("RSC");
    if (encoded) expect(response.headers.has("Content-Length")).toBe(false);
  });

  it("uses the original client encoding when Cloudflare normalizes its request header", async () => {
    vi.stubGlobal("fetch", vi.fn(async (request: Request) => {
      expect(request.headers.get("Accept-Encoding")).toBe("identity");
      return new Response("<html>content</html>", { headers: { "Content-Type": "text/html" } });
    }));
    const request = new Request(`${publicOrigin}/zh-CN`, { headers: { "Accept-Encoding": "gzip, br" } });
    Object.defineProperty(request, "cf", { value: { clientAcceptEncoding: "identity" } });
    const response = await worker.fetch(request, env);
    expect(response.headers.has("Content-Encoding")).toBe(false);
  });

  it("serves a bounded health response without calling the origin", async () => {
    const originFetch = vi.fn();
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      new Request(`${testOrigin.origin}/.well-known/one-forth-edge-health`),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-One-Forth-Edge")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      status: "ok",
    });
    expect(originFetch).not.toHaveBeenCalled();
  });

  it("streams GET requests to the fixed origin and removes client edge credentials", async () => {
    const originFetch = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      expect(request.url).toBe(
        "https://origin.example.org/zh-CN/glossary?schema=2",
      );
      expect(request.headers.get("Cookie")).toBeNull();
      expect(request.headers.get("CF-Connecting-IP")).toBeNull();
      expect(request.headers.get("Authorization")).toBeNull();
      expect(request.headers.get("X-Forwarded-Host")).toBe("cn-test.one-forth.com");
      expect(request.headers.get("X-Forwarded-Proto")).toBe("https");

      return new Response("glossary", {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60",
          "Set-Cookie": "__cf_bm=provider-cookie; Secure",
          "CF-Ray": "provider-ray",
        },
      });
    });
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      new Request(`${testOrigin.origin}/zh-CN/glossary?schema=2`, {
        headers: {
          Authorization: "Bearer should-not-forward",
          Cookie: "__cf_bm=client-cookie",
          "CF-Connecting-IP": "203.0.113.10",
        },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(response.headers.get("CF-Ray")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(response.headers.get("X-One-Forth-Edge")).toBeNull();
    await expect(response.text()).resolves.toBe("glossary");
    expect(originFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps network-path request targets on the configured origin", async () => {
    const originFetch = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      expect(request.url).toBe(
        "https://origin.example.org//attacker.example/path?query=1",
      );
      expect(new URL(request.url).hostname).toBe("origin.example.org");
      return new Response("fixed origin", { status: 200 });
    });
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      new Request(`${testOrigin.origin}//attacker.example/path?query=1`),
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("fixed origin");
    expect(originFetch).toHaveBeenCalledOnce();
  });

  it("rewrites provider redirects back to the public hostname", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.redirect("https://origin.example.org/zh-CN?from=origin", 307),
      ),
    );

    const response = await worker.fetch(new Request(`${testOrigin.origin}/`), env);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      `${testOrigin.origin}/zh-CN?from=origin`,
    );
  });

  it("keeps www as a permanent canonical redirect without contacting the origin", async () => {
    const originFetch = vi.fn();
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      new Request(`${wwwOrigin.origin}/zh-CN/glossary?source=www`),
      env,
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(
      `${publicOrigin}/zh-CN/glossary?source=www`,
    );
    expect(response.headers.get("X-One-Forth-Edge")).toBeNull();
    expect(originFetch).not.toHaveBeenCalled();
  });

  it("temporarily redirects Mainland China readers from the apex to the regional host", async () => {
    const originFetch = vi.fn();
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      requestFromCountry(`${publicOrigin}/zh-CN/glossary?source=apex`, "CN"),
      env,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      `${regionalOrigin.origin}/zh-CN/glossary?source=apex`,
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("CF-IPCountry");
    expect(response.headers.get("X-One-Forth-Geo")).toBeNull();
    expect(originFetch).not.toHaveBeenCalled();
  });

  it("keeps non-Mainland readers on the canonical apex", async () => {
    const originFetch = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      expect(request.url).toBe("https://origin.example.org/zh-CN");
      expect(request.headers.get("X-Forwarded-Host")).toBe("one-forth.com");
      return new Response("canonical content", { status: 200 });
    });
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      requestFromCountry(`${publicOrigin}/zh-CN`, "US"),
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("canonical content");
    expect(originFetch).toHaveBeenCalledOnce();
  });

  it("serves the regional hostname directly for Mainland readers without a redirect loop", async () => {
    const originFetch = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      expect(request.url).toBe("https://origin.example.org/zh-CN");
      expect(request.headers.get("X-Forwarded-Host")).toBe("cn.one-forth.com");
      return new Response("regional content", { status: 200 });
    });
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      requestFromCountry(`${regionalOrigin.origin}/zh-CN`, "CN"),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
    await expect(response.text()).resolves.toBe("regional content");
    expect(originFetch).toHaveBeenCalledOnce();
  });

  it("redirects the www health path instead of creating a second canonical surface", async () => {
    const originFetch = vi.fn();
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      new Request(`${wwwOrigin.origin}/.well-known/one-forth-edge-health`),
      env,
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe(
      `${publicOrigin}/.well-known/one-forth-edge-health`,
    );
    expect(originFetch).not.toHaveBeenCalled();
  });

  it("rejects write methods instead of exposing a general-purpose proxy", async () => {
    const originFetch = vi.fn();
    vi.stubGlobal("fetch", originFetch);

    const response = await worker.fetch(
      new Request(`${testOrigin.origin}/zh-CN`, { method: "POST" }),
      env,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
    expect(originFetch).not.toHaveBeenCalled();
  });

  it("returns a non-cacheable 502 when the origin request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network unavailable");
      }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await worker.fetch(new Request(`${testOrigin.origin}/zh-CN`), env);

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("uses the bound origin for regional HTML and assets without a public fetch", async () => {
    const publicFetch = vi.fn();
    vi.stubGlobal("fetch", publicFetch);
    const boundFetch = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      expect(new URL(request.url).origin).toBe("https://regional-origin.example");
      expect(request.headers.get("Cookie")).toBeNull();
      expect(request.headers.get("X-One-Forth-Origin-Check")).toBeNull();
      return new Response("bound content");
    });
    const regionalEnv: Parameters<typeof worker.fetch>[1] = {
      ...env,
      MAINLAND_ORIGIN: { fetch: boundFetch },
      MAINLAND_ORIGIN_URL: "https://regional-origin.example",
      MAINLAND_ORIGIN_MODE: "active",
    };
    for (const path of ["/zh-CN", "/assets/client.js"]) {
      const response = await worker.fetch(
        new Request(new URL(path, regionalOrigin), {
          headers: { Cookie: "private=value", "X-One-Forth-Origin-Check": "1" },
        }),
        regionalEnv,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("X-One-Forth-Origin")).toBeNull();
    }
    expect(boundFetch).toHaveBeenCalledTimes(2);
    expect(publicFetch).not.toHaveBeenCalled();
  });

  it.each([
    { mode: "canary" as const, check: false, apex: false, bound: false },
    { mode: "canary" as const, check: true, apex: false, bound: true },
    { mode: "active" as const, check: true, apex: true, bound: false },
    { mode: "off" as const, check: true, apex: false, bound: false },
  ])("limits regional rollout to its configured mode: %j", async ({ mode, check, apex, bound }) => {
    const publicFetch = vi.fn(async () => new Response("provider"));
    const boundFetch = vi.fn(async () => new Response("regional"));
    vi.stubGlobal("fetch", publicFetch);
    const request = new Request(new URL("/zh-CN", apex ? publicOrigin : regionalOrigin), {
      headers: check ? { "X-One-Forth-Origin-Check": "1" } : {},
    });
    const response = await worker.fetch(request, {
      ...env,
      MAINLAND_ORIGIN: { fetch: boundFetch },
      MAINLAND_ORIGIN_URL: "https://regional-origin.example",
      MAINLAND_ORIGIN_MODE: mode,
    });
    expect(response.headers.get("X-One-Forth-Origin")).toBeNull();
    if (bound && mode === "canary") {
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("Vary")).toContain("x-one-forth-origin-check");
    }
    expect(boundFetch).toHaveBeenCalledTimes(bound ? 1 : 0);
    expect(publicFetch).toHaveBeenCalledTimes(bound ? 0 : 1);
  });

  it("rewrites a bound-origin redirect to the regional entry", async () => {
    const response = await worker.fetch(new Request(new URL("/", regionalOrigin)), {
      ...env,
      MAINLAND_ORIGIN: {
        fetch: async () => Response.redirect("https://regional-origin.example/zh-CN?from=origin"),
      },
      MAINLAND_ORIGIN_URL: "https://regional-origin.example",
      MAINLAND_ORIGIN_MODE: "active",
    });
    expect(response.headers.get("Location")).toBe(`${regionalOrigin.origin}/zh-CN?from=origin`);
  });
});
