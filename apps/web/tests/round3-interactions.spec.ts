import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import type { Download, Page } from "@playwright/test";

const articleUrl = "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions";
const experimentUrl = "/zh-CN/playground?figure=wave-equation-1d";

async function gotoReady(page: Page, path: string): Promise<void> {
  const response = await page.goto(path);
  expect(response?.ok()).toBe(true);
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
}

async function waitForClientReady(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
}

async function readDownload(download: Download): Promise<Buffer> {
  const path = await download.path();
  if (!path)
    throw new Error(`Playwright did not provide a path for ${download.suggestedFilename()}.`);
  return readFile(path);
}

function stepFrom(text: string | null): number {
  const match = text?.match(/步骤\s+(\d+)\s+\//);
  if (!match?.[1]) throw new Error(`Could not read an experiment step from: ${text ?? "<null>"}`);
  return Number(match[1]);
}

test.describe("round 5 published-site interaction baseline", () => {
  test("keyboard search opens a published experiment and records the query", async ({ page }) => {
    await gotoReady(page, "/zh-CN");
    await page.keyboard.press("ControlOrMeta+K");

    const dialog = page.getByRole("dialog", { name: "搜索 One Forth" });
    const search = dialog.getByRole("combobox", { name: "搜索知识库" });
    const options = dialog.getByRole("listbox", { name: "搜索结果" }).getByRole("option");
    await expect(search).toBeFocused();
    await dialog.getByLabel("按类型筛选").selectOption("experiment");
    await search.fill("一维波动方程");
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await expect(options.first()).toContainText("实验");
    await expect(options.first()).toContainText("一维波动方程");
    await expect(search).toHaveAttribute("aria-activedescendant", "global-search-option-0");
    await search.press("Enter");

    await expect(page).toHaveURL(new RegExp(`${experimentUrl.replace("?", "\\?")}$`));
    await expect(page.getByRole("heading", { name: "一维波动方程", exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("one-forth-recent-searches") ?? "[]")),
      )
      .toContain("一维波动方程");
  });

  test("search filters dismiss before the dialog and examples return focus to the query", async ({
    page,
  }) => {
    await gotoReady(page, "/zh-CN");
    const trigger = page.locator(".search-trigger");
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "搜索 One Forth" });
    const domain = dialog.getByLabel("按学科筛选");
    await expect(domain.getByRole("option", { name: "数学", exact: true })).toBeAttached();
    await domain.click();
    await expect(dialog.locator("select:open")).toHaveCount(1);
    const triggerLeft = await domain.evaluate((el) => el.getBoundingClientRect().left);
    const optionLeft = await domain
      .locator("option")
      .first()
      .evaluate((el) => el.getBoundingClientRect().left);
    expect(Math.abs(optionLeft - triggerLeft)).toBeLessThanOrEqual(8);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(dialog.locator("select:open")).toHaveCount(0);
    await expect(domain).toBeFocused();
    await expect(domain).toHaveValue("");

    await domain.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(domain).toHaveValue("mathematics");
    await dialog.getByRole("button", { name: "线性变换", exact: true }).click();
    const input = dialog.getByRole("combobox", { name: "搜索知识库" });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("线性变换");
    await expect(dialog.getByRole("listbox").getByRole("option").first()).toBeVisible();

    await page.keyboard.press("ControlOrMeta+k");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("subject navigation exposes reader-backed routes without editorial labels", async ({
    page,
  }) => {
    await gotoReady(page, "/zh-CN/subjects");
    await expect(page.locator("main#main-content")).not.toContainText(
      /规划|建设|草稿|预览稿|待人工审校|成熟度|完成率/,
    );

    const domainLinks = page.locator(".domain-course-entry .button");
    await expect(domainLinks.first()).toBeVisible();
    await domainLinks.first().click();
    await expect(page).toHaveURL(/\/zh-CN\/subjects\/[^/]+$/);
    await expect(page.locator("main#main-content")).not.toContainText(
      /规划|建设|草稿|预览稿|待人工审校|成熟度|完成率/,
    );

    const subjectLinks = page.locator(".subject-course-grid__items > a");
    await expect(subjectLinks.first()).toBeVisible();
    await subjectLinks.first().click();
    await expect(page).toHaveURL(/\/zh-CN\/subjects\/[^/]+\/[^/]+$/);
    await expect(page.locator("main#main-content")).not.toContainText(
      /规划|建设|草稿|预览稿|待人工审校|成熟度|完成率/,
    );

    const chapterLinks = page.locator(".course-sequence a");
    await expect(chapterLinks.first()).toBeVisible();
    const chapterHref = await chapterLinks.first().getAttribute("href");
    expect(chapterHref).toMatch(/^\/zh-CN\/books\/[^/]+\/[^/]+\/[^/]+$/);
  });

  test("marking an article complete persists across reload and updates its book progress", async ({
    page,
  }) => {
    await gotoReady(page, articleUrl);

    const articleProgress = page.getByRole("region", { name: "本地学习进度" });
    await articleProgress.getByRole("button", { name: "标记为完成" }).click();
    await expect(articleProgress.getByRole("progressbar", { name: "页面滚动进度" })).toBeVisible();
    await expect(articleProgress.getByRole("button", { name: "重新学习" })).toBeVisible();

    const serialized = await page.evaluate(() =>
      localStorage.getItem("one-forth-learning-progress"),
    );
    expect(serialized).not.toBeNull();
    expect(JSON.parse(serialized ?? "null")).toMatchObject({
      version: 3,
      chapters: {
        [articleUrl]: {
          chapterId: articleUrl,
          status: "completed",
          progress: 100,
        },
      },
    });

    await expect(articleProgress).toContainText("1/6 章 · 17%");
    await expect(page.getByRole("progressbar", { name: "本册完成进度" })).toHaveAttribute(
      "value",
      "17",
    );

    await page.reload();
    await waitForClientReady(page);
    await expect(
      page.getByRole("region", { name: "本地学习进度" }).getByRole("button", { name: "重新学习" }),
    ).toBeVisible();
  });

  test("mobile navigation closes with Escape and restores focus to its trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoReady(page, "/zh-CN");

    const trigger = page.getByRole("button", { name: "打开目录" });
    await trigger.click();
    await expect(page.getByRole("button", { name: "关闭目录" }).first()).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const navigation = page.getByRole("navigation", { name: "移动目录" });
    await expect(navigation).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(navigation.getByRole("link", { name: /^教材目录/ })).toBeFocused();
    await page.keyboard.press("Escape");

    await expect(navigation).toBeHidden();
    const restoredTrigger = page.getByRole("button", { name: "打开目录" });
    await expect(restoredTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(restoredTrigger).toBeFocused();
  });

  test("article TOC follows anchor navigation and a real wheel scroll, then survives refresh", async ({
    page,
  }) => {
    await gotoReady(page, articleUrl);

    const toc = page.getByRole("navigation", { name: "文章页内目录" });
    await expect(page.getByRole("navigation", { name: /页内目录/ })).toHaveCount(1);
    const links = toc.getByRole("link");
    expect(await links.count()).toBeGreaterThan(2);
    await expect(links.first()).toHaveAttribute("aria-current", "location");

    const target = links.nth(2);
    const href = await target.getAttribute("href");
    if (!href?.startsWith("#")) throw new Error(`Unexpected article TOC href: ${href ?? "<null>"}`);
    const headingId = href.slice(1);
    await target.click();
    await expect
      .poll(() => page.evaluate(() => decodeURIComponent(new URL(window.location.href).hash)))
      .toBe(href);

    const wheelDelta = await page.evaluate((id) => {
      const heading = document.getElementById(id);
      if (!heading) throw new Error(`TOC target #${id} does not exist.`);
      return heading.getBoundingClientRect().top - window.innerHeight * 0.23;
    }, headingId);
    await page.mouse.wheel(0, wheelDelta);
    await expect(target).toHaveAttribute("aria-current", "location");

    await expect
      .poll(() =>
        page.evaluate(() => {
          const value = localStorage.getItem("one-forth-learning-progress");
          if (!value) return null;
          const parsed = JSON.parse(value) as {
            chapters?: Readonly<Record<string, { lastAnchor?: string }>>;
          };
          return (
            parsed.chapters?.[
              "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions"
            ]?.lastAnchor ?? null
          );
        }),
      )
      .toBe(headingId);

    await page.reload();
    await waitForClientReady(page);
    await expect(
      page.getByRole("navigation", { name: "文章页内目录" }).getByRole("link").nth(2),
    ).toHaveAttribute("aria-current", "location");
  });

  test("theme selection is persisted in storage and restored on refresh", async ({ page }) => {
    await gotoReady(page, "/zh-CN");

    await page.getByRole("button", { name: "切换到深色主题" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("one-forth-theme")))
      .toBe("dark");

    await page.reload();
    await waitForClientReady(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "切换到浅色主题" })).toBeVisible();

    await page.getByRole("button", { name: "切换到浅色主题" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("one-forth-theme")))
      .toBe("light");
  });

  test("experiment controls, share URL, and refresh restore the exact interactive state", async ({
    page,
  }) => {
    await gotoReady(page, experimentUrl);
    const figure = page.locator(".interactive-figure");
    await expect(figure).toHaveAttribute("data-client-ready", "true");
    const step = figure.locator(".interactive-figure__step");
    const amplitude = figure.getByLabel(/振幅 A/);

    await amplitude.fill("1.1");
    await expect(amplitude).toHaveValue("1.1");
    await expect(step).toContainText("步骤 0 /");
    await figure.getByRole("button", { name: "单步前进" }).click();
    await expect(step).toContainText("步骤 1 /");
    await figure.getByRole("button", { name: "单步后退" }).click();
    await expect(step).toContainText("步骤 0 /");

    await figure.getByRole("button", { name: "播放", exact: true }).click();
    await expect(figure.getByRole("button", { name: "暂停", exact: true })).toBeVisible();
    await expect.poll(async () => stepFrom(await step.textContent())).toBeGreaterThan(0);
    await figure.getByRole("button", { name: "暂停", exact: true }).click();
    const pausedStep = stepFrom(await step.textContent());
    await page.waitForTimeout(350);
    expect(stepFrom(await step.textContent())).toBe(pausedStep);

    await figure.getByRole("button", { name: "分享状态" }).click();
    await expect(figure.getByText("分享链接已复制。")).toBeVisible();
    await expect(page).toHaveURL(/\?figure=wave-equation-1d&viz=wave-equation-1d&state=.+/);
    const sharedUrl = page.url();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(sharedUrl);

    await page.reload();
    await waitForClientReady(page);
    const restoredFigure = page.locator(".interactive-figure");
    await expect(restoredFigure).toHaveAttribute("data-client-ready", "true");
    await expect(restoredFigure.getByLabel(/振幅 A/)).toHaveValue("1.1");
    await expect(restoredFigure.locator(".interactive-figure__step")).toContainText(
      `步骤 ${pausedStep} /`,
    );
    await expect(restoredFigure.getByText("已从分享链接恢复实验状态。")).toBeVisible();

    await restoredFigure.getByRole("button", { name: "重置", exact: true }).click();
    await expect(restoredFigure.getByLabel(/振幅 A/)).toHaveValue("0.65");
    await expect(restoredFigure.locator(".interactive-figure__step")).toContainText("步骤 0 / 200");
  });

  test("SVG and PNG exports are non-empty typed downloads and fullscreen enters then exits", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const createObjectUrl = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (value: Blob | MediaSource): string => {
        if (value instanceof Blob) {
          document.documentElement.dataset.round3LastBlob = JSON.stringify({
            type: value.type,
            size: value.size,
          });
        }
        return createObjectUrl(value);
      };
    });
    await gotoReady(page, experimentUrl);
    const figure = page.locator(".interactive-figure");
    await expect(figure).toHaveAttribute("data-client-ready", "true");

    const svgEvent = page.waitForEvent("download");
    await figure.getByRole("button", { name: "导出 SVG" }).click();
    const svgDownload = await svgEvent;
    expect(svgDownload.suggestedFilename()).toBe("wave-equation-1d.svg");
    const svgBytes = await readDownload(svgDownload);
    expect(svgBytes.byteLength).toBeGreaterThan(500);
    expect(svgBytes.toString("utf8")).toMatch(/<svg[\s>]/);
    await expect
      .poll(() =>
        page
          .locator("html")
          .getAttribute("data-round3-last-blob")
          .then((value) => {
            if (!value) return null;
            return JSON.parse(value) as { type: string; size: number };
          }),
      )
      .toMatchObject({ type: "image/svg+xml;charset=utf-8", size: svgBytes.byteLength });

    const pngEvent = page.waitForEvent("download");
    await figure.getByRole("button", { name: "导出 PNG" }).click();
    const pngDownload = await pngEvent;
    expect(pngDownload.suggestedFilename()).toBe("wave-equation-1d.png");
    const pngBytes = await readDownload(pngDownload);
    expect(pngBytes.byteLength).toBeGreaterThan(1_000);
    expect([...pngBytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    await expect
      .poll(() =>
        page
          .locator("html")
          .getAttribute("data-round3-last-blob")
          .then((value) => {
            if (!value) return null;
            return JSON.parse(value) as { type: string; size: number };
          }),
      )
      .toMatchObject({ type: "image/png", size: pngBytes.byteLength });

    await figure.getByRole("button", { name: "全屏", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() => document.fullscreenElement?.classList.contains("interactive-figure")),
      )
      .toBe(true);
    await expect(figure.getByRole("button", { name: "退出全屏", exact: true })).toBeVisible();
    await figure.getByRole("button", { name: "退出全屏", exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  });
});
