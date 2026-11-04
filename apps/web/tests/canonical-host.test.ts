import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@one-forth/config";
import { canonicalRedirectUrl } from "@/worker/canonical-host";

describe("canonicalRedirectUrl", () => {
  it("redirects www to HTTPS apex while preserving path and query", () => {
    expect(
      canonicalRedirectUrl("http://www.one-forth.com/zh-CN/search?q=vector&kind=concept"),
    ).toBe(`${siteConfig.url}/zh-CN/search?q=vector&kind=concept`);
    expect(canonicalRedirectUrl("https://www.one-forth.com/a%20b/?q=%E5%90%91%E9%87%8F")).toBe(
      `${siteConfig.url}/a%20b/?q=%E5%90%91%E9%87%8F`,
    );
  });

  it("leaves HTTP and HTTPS apex plus unrelated hosts unchanged", () => {
    expect(canonicalRedirectUrl("https://one-forth.com/zh-CN")).toBeNull();
    expect(canonicalRedirectUrl("http://one-forth.com/zh-CN?q=1")).toBeNull();
    expect(canonicalRedirectUrl("https://preview.example/zh-CN")).toBeNull();
  });

  it("uses a permanent 301 response at the Worker boundary", async () => {
    const workerSource = await readFile(resolve(process.cwd(), "worker/index.ts"), "utf8");
    expect(workerSource).toContain("Response.redirect(redirectUrl, 301)");
  });
});
