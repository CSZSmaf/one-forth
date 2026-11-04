import { siteConfig, uiText } from "@one-forth/config";
import { expect, test } from "@playwright/test";
import { waitForPublicPage } from "./helpers/public-page-contract";

for (const width of [320, 390, 768, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`repository link is accessible at ${width}px in ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto("/zh-CN");
      await waitForPublicPage(page);
      const header = page.locator(".site-header");
      const repository = header.getByRole("link", { name: uiText["zh-CN"].githubRepository });
      await expect(repository).toBeVisible();
      await expect(repository).toHaveAttribute("href", siteConfig.social.github);
      await expect(repository).toHaveAttribute("target", "_blank");
      await expect(repository).toHaveAttribute("rel", "noopener noreferrer");
      const bounds = await repository.boundingBox();
      expect(bounds).not.toBeNull();
      if (!bounds) throw new Error("Repository link has no visible bounds.");
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await repository.focus();
      await expect(repository).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(repository).not.toBeFocused();
      await testInfo.attach(`header-${width}-${colorScheme}.png`, {
        body: await header.screenshot(),
        contentType: "image/png",
      });
    });
  }
}
