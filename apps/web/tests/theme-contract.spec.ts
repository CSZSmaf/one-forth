import { expect, test } from "@playwright/test";

test("standalone profile follows the system theme on a direct visit", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: "One Forth" })).toBeVisible();
});

test("a saved theme overrides the system theme on the profile and textbook", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("one-forth-theme", "light"));
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Explore One Forth" }).click();
  await expect(page).toHaveURL(/\/zh-CN$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("changing the textbook theme persists when opening the standalone profile", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/zh-CN");
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
  await page.getByRole("button", { name: "切换到深色主题" }).click();
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
