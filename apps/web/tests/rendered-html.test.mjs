import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = process.cwd();

describe("application shell source contracts", () => {
  it("keeps metadata in centralized site configuration", async () => {
    const layout = await readFile(resolve(webRoot, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/siteConfig\.name/);
    expect(layout).toMatch(/siteConfig\.url/);
    expect(layout).toMatch(/metadataBase:\s*new URL\(siteConfig\.url\)/);
    expect(layout).not.toMatch(/Starter Project|Your site is taking shape/);
  });

  it("provides a localized skip link and theme bootstrap", async () => {
    const [layout, rootLayout, themeScript] = await Promise.all([
      readFile(resolve(webRoot, "app/[locale]/layout.tsx"), "utf8"),
      readFile(resolve(webRoot, "app/layout.tsx"), "utf8"),
      readFile(resolve(webRoot, "components/theme-script.tsx"), "utf8"),
    ]);
    expect(layout).toMatch(/href="#main-content"/);
    expect(rootLayout).toMatch(/<head>\s*<ThemeScript\s*\/>/);
    expect(layout).not.toMatch(/<ThemeScript\s*\/>/);
    expect(themeScript).toMatch(/one-forth-theme/);
    expect(themeScript).toMatch(/prefers-color-scheme:\s*dark/);
  });

  it("keeps internal design tooling out of the ordinary footer", async () => {
    const [layout, footer] = await Promise.all([
      readFile(resolve(webRoot, "app/[locale]/layout.tsx"), "utf8"),
      readFile(resolve(webRoot, "components/site-footer.tsx"), "utf8"),
    ]);
    expect(layout).toMatch(/<SiteFooter locale=\{locale\} toolCoverage=\{toolCoverage\}\s*\/>/);
    expect(layout).toMatch(/getToolCoverageSummary\(locale\)/);
    expect(footer).not.toMatch(/href=\{`\/\$\{locale\}\/design-system`\}/);
    expect(footer).toMatch(/href=\{`\/\$\{locale\}\/contribute`\}/);
  });
});
