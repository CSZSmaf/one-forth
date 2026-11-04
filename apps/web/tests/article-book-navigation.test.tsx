import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ArticleBookNavigation,
  type ArticleBookNavigationPart,
} from "@/components/article-book-navigation";

const parts: readonly ArticleBookNavigationPart[] = [
  {
    title: "第一编 向量与矩阵",
    current: true,
    chapters: [
      {
        title: "向量与坐标",
        href: "/zh-CN/books/mathematics/linear-algebra/vectors-coordinates",
        current: true,
      },
      {
        title: "矩阵及其运算",
        href: "/zh-CN/books/mathematics/linear-algebra/matrices-operations",
        current: false,
      },
    ],
  },
  {
    title: "第二编 线性映射",
    current: false,
    chapters: [
      {
        title: "线性映射",
        href: "/zh-CN/books/mathematics/linear-algebra/linear-maps",
        current: false,
      },
    ],
  },
];

describe("ArticleBookNavigation", () => {
  it("opens a keyboard-contained mobile directory and restores focus on Escape", async () => {
    render(
      <ArticleBookNavigation
        bookTitle="M04 · 线性代数"
        bookHref="/zh-CN/books/mathematics/linear-algebra"
        chapterPosition="第 1/6 章"
        parts={parts}
      />,
    );

    const trigger = screen.getByRole("button", { name: "本册目录 · 第 1/6 章" });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");
    const dialog = screen.getByRole("dialog", { name: "M04 · 线性代数" });
    const close = within(dialog).getByRole("button", { name: "关闭本册目录" });
    expect(close).toHaveFocus();
    expect(within(dialog).getByRole("link", { name: /向量与坐标/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(dialog).getByText("第二编 线性映射").closest("details")).toHaveAttribute("open");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "M04 · 线性代数" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
