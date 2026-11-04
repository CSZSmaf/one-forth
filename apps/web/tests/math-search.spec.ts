import { uiText } from "@one-forth/config";
import { expect, test } from "@playwright/test";
import { installPublicPageAudit, waitForPublicPage } from "./helpers/public-page-contract";

for (const width of [1440, 390]) {
  test(`mathematical queries work in the dialog and full search at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    const audit = installPublicPageAudit(page);
    await page.goto("/zh-CN");
    await waitForPublicPage(page);
    await page.keyboard.press("ControlOrMeta+K");
    const dialog = page.getByRole("dialog", { name: "搜索 One Forth" });
    const query = dialog.getByRole("combobox", { name: "搜索知识库" });
    const options = dialog.getByRole("listbox", { name: "搜索结果" }).getByRole("option");

    for (const example of uiText["zh-CN"].searchDialog.examples) {
      await query.fill("");
      await expect(options).toHaveCount(0);
      await query.fill(example);
      await expect(options.first(), example).toBeVisible();
    }
    for (const input of ["partial", "\\partial", "∂", "∇", "∫", "α"]) {
      await query.fill("");
      await expect(options).toHaveCount(0);
      await query.fill(input);
      await expect(options.first(), input).toBeVisible();
    }
    await dialog.getByLabel("按类型筛选").selectOption("equation");
    await query.fill("∂");
    await expect(options.first()).toBeVisible();
    await expect(options.first().locator(".search-result__kind")).toHaveText("公式");
    await query.press("Enter");
    await expect(page).toHaveURL(/\/zh-CN\/equations\?equation=.+#.+$/u);
    await waitForPublicPage(page);
    expect(new URL(page.url()).pathname).toBe("/zh-CN/equations");
    const equationId = new URL(page.url()).hash.slice(1);
    expect(equationId).not.toBe("");
    await expect(page.locator(`[id="${equationId}"]`)).toBeVisible();

    await page.goto("/zh-CN/search");
    await waitForPublicPage(page);
    const fullQuery = page.getByRole("textbox", { name: "搜索全部知识" });
    await page.getByLabel("类型", { exact: true }).selectOption("equation");
    const results = page.locator(".search-page-results ol > li");
    const urls: string[][] = [];
    for (const input of ["∂", "\\partial", "partial"]) {
      await fullQuery.fill("");
      await expect(results).toHaveCount(0);
      await fullQuery.fill(input);
      await expect(results.first(), input).toBeVisible();
      urls.push(
        await results
          .locator("a")
          .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? "")),
      );
    }
    expect(urls[0]).toEqual(urls[1]);
    expect(urls[2]?.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const platformScript = new URL("/cdn-cgi/challenge-platform/", page.url()).href;
    expect(
      audit.failures.filter(
        (issue) => !issue.startsWith(`script Content-Type <missing>: ${platformScript}`),
      ),
    ).toEqual([]);
  });
}
