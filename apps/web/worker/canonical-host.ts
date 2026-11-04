import { siteConfig } from "@one-forth/config";

export function canonicalRedirectUrl(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  const canonical = new URL(siteConfig.url);
  if (url.hostname !== `www.${siteConfig.domain}`) return null;
  url.protocol = canonical.protocol;
  url.hostname = canonical.hostname;
  url.port = canonical.port;
  return url.toString();
}
