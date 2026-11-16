import { siteConfig } from "@one-forth/config";

const HEALTH_PATH = "/.well-known/one-forth-edge-health";
const CANONICAL_HOST = new URL(siteConfig.url).hostname;
const WWW_HOST = `www.${CANONICAL_HOST}`;
const MAINLAND_HOST = `cn.${CANONICAL_HOST}`;
const MAINLAND_COUNTRY = "CN";
const ORIGIN_CHECK_HEADER = "x-one-forth-origin-check";

interface EdgeEnv {
  ORIGIN_URL: string;
  PRIMARY_ORIGIN?: Pick<Fetcher, "fetch">;
  MAINLAND_ORIGIN?: Pick<Fetcher, "fetch">;
  MAINLAND_ORIGIN_URL?: string;
  MAINLAND_ORIGIN_MODE?: "canary" | "active" | "off";
}

function useMainlandOrigin(request: Request, requestUrl: URL, env: EdgeEnv): boolean {
  return (
    requestUrl.hostname === MAINLAND_HOST &&
    Boolean(env.MAINLAND_ORIGIN && env.MAINLAND_ORIGIN_URL) &&
    (env.MAINLAND_ORIGIN_MODE === "active" ||
      (env.MAINLAND_ORIGIN_MODE === "canary" && request.headers.get(ORIGIN_CHECK_HEADER) === "1"))
  );
}

const strippedRequestHeaders = new Set([
  ORIGIN_CHECK_HEADER,
  "authorization",
  "cdn-loop",
  "cf-connecting-ip",
  "cf-ew-via",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "cf-worker",
  "connection",
  "cookie",
  "forwarded",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "true-client-ip",
  "upgrade",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]);

const strippedResponseHeaders = new Set([
  "cf-cache-status",
  "cf-ray",
  "nel",
  "report-to",
  "set-cookie",
  "x-powered-by",
  "x-one-forth-edge",
  "x-one-forth-origin",
  "x-one-forth-geo",
]);

function healthResponse(): Response {
  return Response.json(
    {
      status: "ok",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function redirectWwwToCanonical(requestUrl: URL): Response {
  const destination = new URL(requestUrl);
  destination.protocol = "https:";
  destination.hostname = CANONICAL_HOST;
  destination.port = "";

  return new Response(null, {
    status: 301,
    headers: {
      "Cache-Control": "public, max-age=3600",
      Location: destination.toString(),
    },
  });
}

function redirectMainlandToRegionalHost(requestUrl: URL): Response {
  const destination = new URL(requestUrl);
  destination.protocol = "https:";
  destination.hostname = MAINLAND_HOST;
  destination.port = "";

  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      Location: destination.toString(),
      Vary: "CF-IPCountry",
    },
  });
}

function shouldUseMainlandHost(request: Request, requestUrl: URL): boolean {
  return (
    requestUrl.hostname === CANONICAL_HOST && request.cf?.country === MAINLAND_COUNTRY
  );
}

function createOriginRequest(request: Request, requestUrl: URL, originUrl: URL): Request {
  const targetUrl = new URL(originUrl);
  targetUrl.pathname = requestUrl.pathname;
  targetUrl.search = requestUrl.search;
  targetUrl.hash = "";
  const headers = new Headers();

  for (const [name, value] of request.headers) {
    if (!strippedRequestHeaders.has(name.toLowerCase())) {
      headers.append(name, value);
    }
  }

  headers.set("X-Forwarded-Host", requestUrl.host);
  headers.set("X-Forwarded-Proto", "https");
  headers.set("Accept-Encoding", clientAcceptEncoding(request) || "identity");

  return new Request(targetUrl, {
    method: request.method,
    headers,
    redirect: "manual",
  });
}

function rewriteLocation(headers: Headers, requestUrl: URL, originUrl: URL): void {
  const location = headers.get("Location");
  if (!location) return;

  let resolved: URL;
  try {
    resolved = new URL(location, originUrl);
  } catch {
    return;
  }

  if (resolved.origin !== originUrl.origin) return;

  resolved.protocol = "https:";
  resolved.hostname = requestUrl.hostname;
  resolved.port = requestUrl.port;
  headers.set("Location", resolved.toString());
}

function clientAcceptEncoding(request: Request): string {
  const original = request.cf?.clientAcceptEncoding;
  return typeof original === "string" ? original : request.headers.get("Accept-Encoding") ?? "";
}

function acceptsGzip(request: Request): boolean {
  return clientAcceptEncoding(request).split(",").some((entry) => {
    const [name, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    return name === "gzip" && (!quality || Number(quality.trim().slice(2)) > 0);
  });
}

function createProxyResponse(originResponse: Response, request: Request, requestUrl: URL, originUrl: URL): Response {
  const headers = new Headers(originResponse.headers);
  for (const name of strippedResponseHeaders) {
    headers.delete(name);
  }
  rewriteLocation(headers, requestUrl, originUrl);
  if (headers.get("Content-Type")?.includes("text/html")) {
    // Prevent the zone from adding analytics scripts that inherit the page nonce.
    headers.set("Cache-Control", "private, no-store, no-transform");
    if (!headers.has("Content-Encoding") && originResponse.body && acceptsGzip(request)) {
      // Workers Response performs the requested encoding when sending the stream.
      headers.set("Content-Encoding", "gzip");
      headers.delete("Content-Length");
    }
    headers.append("Vary", "Accept-Encoding");
  }

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers,
  });
}

function methodNotAllowed(): Response {
  return Response.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
        "Cache-Control": "no-store",
      },
    },
  );
}

function originUnavailable(): Response {
  return Response.json(
    { error: "Origin temporarily unavailable" },
    {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export default {
  async fetch(request: Request, env: EdgeEnv): Promise<Response> {
    const requestUrl = new URL(request.url);
    const mainlandOrigin = useMainlandOrigin(request, requestUrl, env)
      ? env.MAINLAND_ORIGIN
      : undefined;
    const originBinding = mainlandOrigin ?? env.PRIMARY_ORIGIN;
    const originUrl = new URL(
      mainlandOrigin && env.MAINLAND_ORIGIN_URL ? env.MAINLAND_ORIGIN_URL : env.ORIGIN_URL,
    );

    if (requestUrl.hostname === WWW_HOST) {
      return redirectWwwToCanonical(requestUrl);
    }

    if (requestUrl.pathname === HEALTH_PATH) {
      return healthResponse();
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return methodNotAllowed();
    }

    if (shouldUseMainlandHost(request, requestUrl)) {
      return redirectMainlandToRegionalHost(requestUrl);
    }

    try {
      const originRequest = createOriginRequest(request, requestUrl, originUrl);
      const originResponse = originBinding
        ? await originBinding.fetch(originRequest)
        : await fetch(originRequest);
      const response = createProxyResponse(originResponse, request, requestUrl, new URL(originRequest.url));
      if (mainlandOrigin && env.MAINLAND_ORIGIN_MODE === "canary") {
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.append("Vary", ORIGIN_CHECK_HEADER);
      }
      return response;
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "One Forth edge origin request failed",
          path: requestUrl.pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return originUnavailable();
    }
  },
} satisfies ExportedHandler<EdgeEnv>;
