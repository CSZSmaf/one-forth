import type { SearchDocument } from "@one-forth/search/client";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchPageClient } from "@/components/search-page-client";

it("shows a bounded result page and resets it when the query changes", () => {
  const many: readonly SearchDocument[] = Array.from({ length: 85 }, (_, index) => ({
    key: `chapter:/chapter-${index}`,
    kind: "chapter",
    title: `Matrix ${index}`,
    summary: "linear algebra",
    locale: "en",
    url: `/chapter-${index}`,
    keywords: [],
  }));
  const { container } = render(
    <SearchPageClient catalog={many} initialQuery="matrix" initialDomain="" initialSubject="" />,
  );
  expect(container.querySelectorAll(".search-page-results ol > li")).toHaveLength(40);
  fireEvent.click(screen.getByRole("button", { name: "显示更多结果" }));
  expect(container.querySelectorAll(".search-page-results ol > li")).toHaveLength(80);
  fireEvent.change(screen.getByRole("textbox", { name: "搜索全部知识" }), {
    target: { value: "algebra" },
  });
  expect(container.querySelectorAll(".search-page-results ol > li")).toHaveLength(40);
});

const catalog: readonly SearchDocument[] = [
  {
    key: "concept:/zh-CN/learn/mathematics/calculus/gradient",
    kind: "concept",
    title: "导数、方向导数与梯度",
    summary: "从一维变化率进入多变量梯度。",
    domain: "mathematics",
    subject: "calculus",
    difficulty: 3,
    locale: "zh-CN",
    url: "/zh-CN/learn/mathematics/calculus/gradient",
    keywords: ["gradient", "nabla", "∇"],
    curriculum: {
      seriesTitle: "数学",
      bookCode: "M03",
      bookTitle: "微积分",
      partTitle: "多变量微分",
      chapterTitle: "方向导数与梯度",
      chapterNumber: 4,
    },
  },
  {
    key: "concept:/zh-CN/learn/physics/waves/wave-equation-1d",
    kind: "concept",
    title: "一维波动方程：从局部振动到波的传播",
    summary: "连接波速、初始条件与时间演化。",
    domain: "physics",
    subject: "waves",
    difficulty: 3,
    locale: "zh-CN",
    url: "/zh-CN/learn/physics/waves/wave-equation-1d",
    keywords: ["wave equation", "波动方程"],
  },
  {
    key: "equation:/zh-CN/equations?equation=gradient-definition#gradient-definition",
    kind: "equation",
    title: "梯度定义",
    summary: "\\nabla f(x)=\\left(\\partial_1f(x),\\partial_2f(x)\\right)",
    domain: "mathematics",
    subject: "calculus",
    difficulty: 3,
    locale: "zh-CN",
    url: "/zh-CN/equations?equation=gradient-definition#gradient-definition",
    keywords: ["gradient", "nabla", "∇"],
  },
  {
    key: "theorem:/zh-CN/glossary?entry=gradient-bound#glossary-gradient-bound",
    kind: "theorem",
    title: "梯度上界",
    summary: "若 $\\lVert \\nabla f(x)\\rVert\\le L$，则函数沿线段的变化受 $L$ 控制。",
    domain: "mathematics",
    subject: "calculus",
    difficulty: 3,
    locale: "zh-CN",
    url: "/zh-CN/glossary?entry=gradient-bound#glossary-gradient-bound",
    keywords: ["gradient", "nabla", "∇"],
  },
];

describe("SearchPageClient", () => {
  it("searches aliases and applies domain filters", () => {
    render(
      <SearchPageClient catalog={catalog} initialQuery="" initialDomain="" initialSubject="" />,
    );

    expect(screen.queryByText("mathematics")).not.toBeInTheDocument();
    expect(screen.getAllByText("数学").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "输入关键词开始搜索" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "导数、方向导数与梯度" })).not.toBeInTheDocument();

    const input = screen.getByRole("textbox", { name: "搜索全部知识" });
    fireEvent.change(input, { target: { value: "nabla" } });
    expect(screen.getByRole("heading", { name: "导数、方向导数与梯度" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "一维波动方程：从局部振动到波的传播" }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("学科"), { target: { value: "physics" } });
    expect(screen.getByRole("heading", { name: "没有匹配项" })).toBeVisible();

    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByRole("heading", { name: "输入关键词开始搜索" })).toBeVisible();

    fireEvent.change(input, { target: { value: "wave" } });
    expect(
      screen.getByRole("heading", { name: "一维波动方程：从局部振动到波的传播" }),
    ).toBeVisible();
    expect(screen.queryByText(/预览稿|待人工审校|编辑状态|草稿/)).not.toBeInTheDocument();
  });

  it("respects the maximum difficulty control", () => {
    render(
      <SearchPageClient
        catalog={catalog}
        initialQuery="nabla"
        initialDomain=""
        initialSubject=""
      />,
    );

    fireEvent.change(screen.getByLabelText(/最高难度/), { target: { value: "2" } });
    expect(screen.getByRole("heading", { name: "没有匹配项" })).toBeVisible();
  });

  it("shows only reader-facing curriculum context", () => {
    render(
      <SearchPageClient
        catalog={catalog}
        initialQuery="nabla"
        initialDomain=""
        initialSubject=""
      />,
    );

    expect(
      screen.getByText("数学 / M03 微积分 / 多变量微分 · 第 4 章 方向导数与梯度"),
    ).toBeVisible();
    expect(screen.queryByText(/草稿|规划|预览|已审阅/)).not.toBeInTheDocument();
  });

  it("has no editorial planning control", () => {
    render(
      <SearchPageClient catalog={catalog} initialQuery="" initialDomain="" initialSubject="" />,
    );

    expect(screen.queryByRole("checkbox", { name: /规划/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/课程规划|包含规划章节/)).not.toBeInTheDocument();
  });

  it("renders equation and inline-math summaries without visible TeX commands", () => {
    const view = render(
      <SearchPageClient
        catalog={catalog}
        initialQuery="nabla"
        initialDomain=""
        initialSubject=""
      />,
    );

    const renderedMath = view.container.querySelectorAll<HTMLElement>(
      ".static-math--search-result[data-latex]",
    );
    const visibleText = view.container.cloneNode(true) as HTMLElement;
    visibleText.querySelectorAll(".static-math").forEach((element) => element.remove());
    expect(renderedMath.length).toBeGreaterThanOrEqual(3);
    expect(visibleText.textContent).not.toMatch(/\\nabla|\\lVert|\$/);
  });
});
