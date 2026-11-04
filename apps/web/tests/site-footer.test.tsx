import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { createToolNavigation } from "@/components/site-navigation-data";

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

describe("SiteFooter", () => {
  it("separates author links from the book library and keeps tools and feedback", () => {
    render(<SiteFooter locale="zh-CN" toolCoverage={toolCoverage} />);

    const library = screen.getByRole("navigation", { name: "教材库" });
    expect(within(library).getByRole("link", { name: "教材目录" })).toHaveAttribute(
      "href",
      "/zh-CN/books",
    );
    const author = screen.getByRole("navigation", { name: "关于作者" });
    expect(within(author).getByRole("link", { name: "作者的其他项目" })).toHaveAttribute(
      "href",
      "/zh-CN/projects",
    );
    expect(within(author).getByRole("link", { name: "作者资料" })).toHaveAttribute(
      "href",
      "/about",
    );

    const tools = screen.getByRole("navigation", { name: "工具" });
    expect(within(tools).getByRole("link", { name: "交互实验" })).toHaveAttribute(
      "href",
      "/zh-CN/playground",
    );
    expect(within(tools).getByRole("link", { name: "最近更新" })).toHaveAttribute(
      "href",
      "/zh-CN/updates",
    );
    expect(within(tools).getAllByRole("link")).toHaveLength(
      createToolNavigation("zh-CN", toolCoverage).length,
    );

    const feedback = screen.getByRole("navigation", { name: "反馈" });
    expect(within(feedback).getByRole("link", { name: "报告正文问题" })).toHaveAttribute(
      "href",
      "/zh-CN/contribute",
    );
    expect(screen.queryByRole("link", { name: /设计系统|内部|Schema/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "页脚学科导航" })).not.toBeInTheDocument();
  });
});
