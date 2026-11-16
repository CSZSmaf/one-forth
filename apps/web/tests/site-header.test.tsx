import type { SearchDocument } from "@one-forth/search/client";
import { siteConfig, uiText } from "@one-forth/config";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";

const toolCoverage = {
  visualizations: 16,
  nodes: 415,
  relations: 1_916,
  learningPaths: 19,
  glossaryEntries: 707,
  symbols: 320,
  equations: 480,
  resources: 120,
  updates: 288,
} as const;

const routerPush = vi.hoisted(() => vi.fn());
const navigationState = vi.hoisted(() => ({ pathname: "/zh-CN" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  usePathname: () => navigationState.pathname,
}));

const catalog: readonly SearchDocument[] = [
  {
    key: "concept:/zh-CN/learn/mathematics/optimization/gradient-descent",
    kind: "concept",
    title: "梯度下降：模型为什么能够学习",
    summary: "比较学习率、动量与收敛轨迹。",
    domain: "mathematics",
    subject: "optimization",
    difficulty: 3,
    locale: "zh-CN",
    url: "/zh-CN/learn/mathematics/optimization/gradient-descent",
    keywords: ["gradient descent", "梯度下降"],
  },
];

describe("SiteHeader", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "light";
    document.body.style.overflow = "";
    navigationState.pathname = "/zh-CN";
    routerPush.mockReset();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) =>
        ({
          ok: true,
          status: 200,
          json: async () => (String(input).includes("/base-catalog?schema=2") ? catalog : []),
        }) as Response,
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["zh-CN", "en"] as const)(
    "exposes the repository link with a localized name in %s",
    (locale) => {
      render(<SiteHeader locale={locale} toolCoverage={toolCoverage} />);
      const repository = screen.getByRole("link", { name: uiText[locale].githubRepository });
      expect(repository).toHaveAttribute("href", siteConfig.social.github);
      expect(repository).toHaveAttribute("target", "_blank");
      expect(repository).toHaveAttribute("rel", "noopener noreferrer");
      expect(repository).toHaveClass("icon-button");
    },
  );

  it("links books, author projects and the profile alongside the auxiliary tools", () => {
    render(<SiteHeader locale="zh-CN" toolCoverage={toolCoverage} />);

    const primaryNavigation = screen.getByRole("navigation", { name: "主导航" });
    const primaryLinks = within(primaryNavigation).getAllByRole("link");
    expect(primaryLinks).toHaveLength(3);
    expect(primaryLinks[0]).toHaveTextContent("教材目录");
    expect(primaryLinks[0]).toHaveAttribute("href", "/zh-CN/books");
    expect(within(primaryNavigation).getByRole("link", { name: "作者的其他项目" })).toHaveAttribute(
      "href",
      "/zh-CN/projects",
    );
    expect(within(primaryNavigation).getByRole("link", { name: "作者资料" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(primaryNavigation).not.toHaveTextContent("学科");
    expect(primaryNavigation).not.toHaveTextContent("学习路径");

    const toolTrigger = screen.getByRole("button", { name: "工具" });
    toolTrigger.focus();
    fireEvent.click(toolTrigger);

    const toolMenu = screen.getByRole("menu", { name: "工具" });
    const expectedTools = [
      ["交互实验", "/zh-CN/playground"],
      ["知识图谱", "/zh-CN/graph"],
      ["学习路径", "/zh-CN/paths"],
      ["术语表", "/zh-CN/glossary"],
      ["符号表", "/zh-CN/symbols"],
      ["公式索引", "/zh-CN/equations"],
      ["资源与论文", "/zh-CN/resources"],
      ["最近更新", "/zh-CN/updates"],
    ] as const;
    for (const [label, href] of expectedTools) {
      expect(within(toolMenu).getByRole("menuitem", { name: new RegExp(label) })).toHaveAttribute(
        "href",
        href,
      );
    }
    expect(toolMenu).not.toHaveTextContent("运行可复现的数学与科学实验");

    const firstItem = within(toolMenu).getByRole("menuitem", { name: /交互实验/ });
    const secondItem = within(toolMenu).getByRole("menuitem", { name: /知识图谱/ });
    expect(firstItem).toHaveFocus();
    fireEvent.keyDown(firstItem, { key: "ArrowDown" });
    expect(secondItem).toHaveFocus();
    fireEvent.keyDown(secondItem, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "工具" })).not.toBeInTheDocument();
    expect(toolTrigger).toHaveFocus();
  });

  it("marks the active tool with aria-current", () => {
    navigationState.pathname = "/zh-CN/resources/attention-is-all-you-need";
    render(<SiteHeader locale="zh-CN" toolCoverage={toolCoverage} />);

    fireEvent.click(screen.getByRole("button", { name: "工具" }));
    expect(screen.getByRole("menuitem", { name: /资源与论文/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens a focus-constrained mobile directory and restores the trigger on Escape", async () => {
    render(<SiteHeader locale="zh-CN" toolCoverage={toolCoverage} />);

    const trigger = screen.getByRole("button", { name: "打开目录" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");

    const dialog = screen.getByRole("dialog", { name: "目录" });
    const closeButton = within(dialog).getByRole("button", { name: "关闭目录" });
    expect(closeButton).toHaveFocus();
    const navigation = within(dialog).getByRole("navigation", { name: "移动目录" });
    expect(within(navigation).getByRole("link", { name: /教材目录/ })).toHaveAttribute(
      "href",
      "/zh-CN/books",
    );
    expect(within(navigation).queryByRole("link", { name: "专题路线" })).not.toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "交互实验" })).toBeVisible();

    const themeControl = within(dialog).getByRole("button", { name: "切换到深色主题" });
    themeControl.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "目录" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("persists theme changes", () => {
    render(<SiteHeader locale="zh-CN" toolCoverage={toolCoverage} />);

    fireEvent.click(screen.getByRole("button", { name: "切换到深色主题" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("one-forth-theme")).toBe("dark");
  });

  it("opens search with Ctrl+K and routes the active result with Enter", async () => {
    render(<SiteHeader locale="zh-CN" toolCoverage={toolCoverage} />);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const dialog = screen.getByRole("dialog", { name: "搜索 One Forth" });
    expect(dialog).toBeVisible();

    const input = within(dialog).getByRole("combobox", { name: "搜索知识库" });
    fireEvent.change(input, { target: { value: "梯度下降" } });
    expect(await within(dialog).findByRole("option", { name: /梯度下降/ })).toBeVisible();
    fireEvent.keyDown(input, { key: "Enter" });

    expect(routerPush).toHaveBeenCalledWith(
      "/zh-CN/learn/mathematics/optimization/gradient-descent",
    );
    expect(JSON.parse(localStorage.getItem("one-forth-recent-searches") ?? "[]")).toContain(
      "梯度下降",
    );
  });
});
