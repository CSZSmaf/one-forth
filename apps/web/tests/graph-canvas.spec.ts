import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/zh-CN/graph");
  await page.waitForFunction(() => document.documentElement.dataset.clientReady === "true");
  await expect(page.locator(".graph-surface")).toBeVisible();
}
async function camera(page: Page) {
  return page.locator(".graph-viewport").evaluate((element) => {
    const value = element
      .getAttribute("transform")
      ?.match(/translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/);
    if (!value) throw new Error("Missing graph transform");
    return { x: Number(value[1]), y: Number(value[2]), scale: Number(value[3]) };
  });
}

test("graph wheel zoom anchors the pointer and dragging does not activate nodes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  const surface = page.locator(".graph-surface");
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  if (!box) throw new Error("Missing canvas");
  const point = { x: box.width * 0.63, y: box.height * 0.42 };
  const before = await camera(page);
  const scroll = await page.evaluate(() => scrollY);
  await page.mouse.move(box.x + point.x, box.y + point.y);
  await page.mouse.wheel(0, -160);
  await expect.poll(async () => (await camera(page)).scale).toBeGreaterThan(before.scale);
  const after = await camera(page);
  expect(
    Math.abs((point.x - after.x) / after.scale - (point.x - before.x) / before.scale),
  ).toBeLessThan(1);
  expect(
    Math.abs((point.y - after.y) / after.scale - (point.y - before.y) / before.scale),
  ).toBeLessThan(1);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  const selected = page.locator('.graph-concept[data-selected="true"]');
  const title = await page.locator(".graph-context h2").innerText();
  const node = await selected.boundingBox();
  if (!node) throw new Error("Missing selected node");
  const old = await camera(page);
  await page.mouse.move(node.x + node.width / 2, node.y + node.height / 2);
  await page.mouse.down();
  await page.mouse.move(node.x + node.width / 2 + 90, node.y + node.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await camera(page)).x).toBeGreaterThan(old.x + 70);
  await expect(page.locator(".graph-context h2")).toHaveText(title);
  const horizontal = await camera(page);
  await page.mouse.wheel(90, 30);
  await expect.poll(async () => (await camera(page)).x).toBeLessThan(horizontal.x - 70);
  expect((await camera(page)).scale).toBeCloseTo(horizontal.scale);
  expect(errors).toEqual([]);
});

test("graph mouse selection changes the neighbourhood and back restores the overview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await ready(page);
  await page.getByRole("button", { name: "全图", exact: true }).click();
  const total = await page.locator(".graph-concept").count();
  expect(total).toBeGreaterThan(100);
  const first = page.locator(".graph-concept").first();
  const title = await first.locator("title").textContent();
  await first.focus();
  await first.click();
  await expect(page.locator(".graph-context h2")).toHaveText(title ?? "");
  expect(await page.locator(".graph-concept").count()).toBeLessThan(total);
  await expect(page.getByRole("button", { name: "概念关联", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const next = page.locator('.graph-concept[data-selected="false"]').first();
  const nextTitle = await next.locator("title").textContent();
  await next.focus();
  await next.press("Enter");
  await expect(page.locator(".graph-context h2")).toHaveText(nextTitle ?? "");
  await page.getByRole("button", { name: "上一步", exact: true }).click();
  await expect(page.locator(".graph-context h2")).toHaveText(title ?? "");
  await page.getByRole("button", { name: "上一步", exact: true }).click();
  await expect(page.getByRole("button", { name: "全图", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".graph-concept")).toHaveCount(total);
  expect(new URL(page.url()).pathname).toBe("/zh-CN/graph");
});

test("graph minimap, fit, expansion and keyboard operate the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await ready(page);
  const before = await camera(page);
  await page.locator(".graph-minimap").click({ position: { x: 70, y: 10 } });
  await expect.poll(async () => (await camera(page)).y).not.toBe(before.y);
  await page.getByRole("button", { name: "显示全部节点", exact: true }).click();
  expect((await camera(page)).scale).toBeLessThanOrEqual(before.scale);
  await page.getByRole("button", { name: "扩大画布", exact: true }).click();
  await expect(page.locator(".graph-explorer")).toHaveAttribute("data-expanded", "true");
  const expandedBounds = await page.locator(".graph-surface").boundingBox();
  if (!expandedBounds) throw new Error("Missing expanded canvas");
  // ResizeObserver recenters the view after expansion; measure keyboard motion after that reset.
  await expect.poll(async () => (await camera(page)).x).toBeCloseTo(expandedBounds.width / 2, 1);
  await page.locator(".graph-surface").focus();
  const previous = await camera(page);
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await camera(page)).x).toBeLessThan(previous.x);
  await page.keyboard.press("+");
  await expect.poll(async () => (await camera(page)).scale).toBeGreaterThan(previous.scale);
  await page.keyboard.press("Home");
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await page.getByLabel("关系类型").selectOption("prerequisite");
  expect(await page.locator('.graph-edges path:not([data-type="prerequisite"])').count()).toBe(0);
});

test("mobile graph supports pinch and pan and leaves page scrolling outside the canvas", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await ready(page);
  const client = await context.newCDPSession(page);
  const surface = page.locator(".graph-surface");
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  if (!box) throw new Error("Missing canvas");
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const before = await camera(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 35, y, id: 1 },
      { x: x + 35, y, id: 2 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 70, y, id: 1 },
      { x: x + 70, y, id: 2 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => (await camera(page)).scale).toBeGreaterThan(before.scale * 1.7);
  const after = await camera(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 50, y: y + 40, id: 1 }],
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => (await camera(page)).x).toBeGreaterThan(after.x + 30);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
    false,
  );
  const scroll = await page.evaluate(() => scrollY);
  await page.mouse.move(2, 200);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll);
  await page.getByRole("button", { name: "全图", exact: true }).click();
  await page.getByRole("button", { name: "显示全部节点", exact: true }).click();
  await expect
    .poll(() =>
      surface.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [...element.querySelectorAll(".graph-point__dot")].every((point) => {
          const box = point.getBoundingClientRect();
          return (
            box.left >= bounds.left &&
            box.right <= bounds.right &&
            box.top >= bounds.top &&
            box.bottom <= bounds.bottom
          );
        });
      }),
    )
    .toBe(true);
  await context.close();
});
