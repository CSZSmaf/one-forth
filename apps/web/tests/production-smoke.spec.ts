import { expect, test } from "@playwright/test";
import { encodeVisualizationState } from "@one-forth/visualization";
import { learningStateStorageKey } from "../lib/learning-state";
import { waitForPublicPage } from "./helpers/public-page-contract";

const matrices = "/zh-CN/books/mathematics/linear-algebra/matrices-operations";
const programs =
  "/zh-CN/books/computer-science/programming-scientific-computing-foundations/programs-types-control";

test("old reading and exercise records reach reader pages", async ({ page }) => {
  await page.addInitScript(
    ({ key, oldExercise }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          concepts: {
            matrices: {
              status: "completed",
              progress: 100,
              lastAnchor: "article-overview",
              updatedAt: "2026-11-01T00:00:00Z",
            },
          },
          exercises: {
            [oldExercise]: {
              exerciseId: oldExercise,
              completed: true,
              updatedAt: "2026-11-01T00:00:00Z",
            },
          },
        }),
      );
    },
    {
      key: learningStateStorageKey,
      oldExercise:
        programs.replace("/computer-science/", "/computing-ai/") +
        "#exercise-programs-types-control-1",
    },
  );
  await page.goto(matrices);
  await waitForPublicPage(page);
  await expect(page.getByRole("button", { name: "重新学习" })).toBeVisible();
  await page.goto("/zh-CN");
  await waitForPublicPage(page);
  await expect(page.getByRole("link", { name: "回到最近章节" })).toHaveAttribute(
    "href",
    `${matrices}#article-overview`,
  );
  await page.goto(programs);
  await waitForPublicPage(page);
  await expect(page.locator("#exercise-programs-types-control-1")).toHaveAttribute(
    "data-completed",
    "true",
  );
});

test("chapter filters and bounded search pages use the real catalog", async ({ page }) => {
  await page.goto("/zh-CN/search");
  await waitForPublicPage(page);
  const query = page.getByRole("textbox", { name: "搜索全部知识" });
  await page.getByLabel("类型", { exact: true }).selectOption("chapter");
  await query.fill("矩阵");
  await expect(page.locator(`.search-page-results a[href="${matrices}"]`)).toBeVisible();
  await page.getByLabel("类型", { exact: true }).selectOption("");
  await query.fill("a");
  await expect(page.locator(".search-page-results ol > li")).toHaveCount(40);
  await page.getByRole("button", { name: "显示更多结果" }).click();
  await expect(page.locator(".search-page-results ol > li")).toHaveCount(80);
  await page.keyboard.press("ControlOrMeta+K");
  const dialog = page.getByRole("dialog", { name: "搜索 One Forth" });
  await dialog.getByLabel("按类型筛选").selectOption("chapter");
  await dialog.getByRole("combobox", { name: "搜索知识库" }).fill("矩阵");
  await expect(dialog.getByRole("listbox").getByRole("option").first()).toContainText("章节");
});

test("shared epoch survives a real training worker and page reload", async ({ page }) => {
  test.setTimeout(90_000);
  const state = encodeVisualizationState({
    dataset: "moons",
    hiddenWidth: 5,
    activation: "tanh",
    learningRate: 0.08,
    epochs: 80,
    seed: 17,
    step: 30,
    speed: 1,
  });
  await page.goto(
    `/zh-CN/playground?figure=neural-decision-boundary&viz=neural-decision-boundary&state=${state}`,
  );
  await waitForPublicPage(page);
  const epoch = page
    .locator("dt")
    .filter({ hasText: /^epoch$/ })
    .locator("+ dd");
  await expect(epoch).toHaveText("30", { timeout: 30_000 });
  await page.reload();
  await waitForPublicPage(page);
  await expect(epoch).toHaveText("30", { timeout: 30_000 });
  await page.getByRole("button", { name: "重新训练" }).click();
  await expect(epoch).toHaveText("0");
});

test("production security policy allows page hydration and theme restoration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => localStorage.setItem("one-forth-theme", "dark"));
  const response = await page.goto("/zh-CN");
  await waitForPublicPage(page);
  if (test.info().project.name === "production")
    expect(response?.headers()["content-security-policy"]).toContain("script-src");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("heading", { name: "数学、物理、计算机与人工智能教材" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
