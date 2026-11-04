import { siteConfig } from "@one-forth/config";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/zh-CN/design-system", "/en/design-system"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.domain,
  };
}
