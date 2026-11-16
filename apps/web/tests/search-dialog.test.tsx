import type { SearchDocument } from "@one-forth/search/client";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchDialog } from "@/components/search-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const readablePreviewChapter: SearchDocument = {
  key: "article:/zh-CN/books/mathematics/calculus/gradient",
  kind: "article",
  title: "方向导数与梯度",
  summary: "从局部变化率进入最陡方向。",
  locale: "zh-CN",
  url: "/zh-CN/books/mathematics/calculus/gradient",
  keywords: ["gradient", "梯度"],
  curriculum: {
    seriesTitle: "数学",
    bookCode: "M03",
    bookTitle: "微积分",
    partTitle: "多变量微分",
    chapterTitle: "方向导数与梯度",
    chapterNumber: 4,
  },
};

const readableEquation: SearchDocument = {
  key: "equation:/zh-CN/equations?equation=gradient-definition#gradient-definition",
  kind: "equation",
  title: "梯度定义",
  summary: "\\nabla f(x)=\\left(\\partial_1f(x),\\partial_2f(x)\\right)",
  locale: "zh-CN",
  url: "/zh-CN/equations?equation=gradient-definition#gradient-definition",
  keywords: ["gradient", "nabla", "∇"],
};

describe("SearchDialog", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads the reader-safe base catalog without editorial labels", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [readablePreviewChapter],
    });
    vi.stubGlobal("fetch", fetchMock);
    const restoreFocusRef: RefObject<HTMLElement | null> = { current: null };
    render(
      <SearchDialog
        catalog={[]}
        locale="zh-CN"
        open
        onOpenChange={vi.fn()}
        restoreFocusRef={restoreFocusRef}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "搜索知识库" }), {
      target: { value: "梯度" },
    });

    expect(await screen.findByRole("option", { name: /方向导数与梯度/ })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/zh-CN/search/base-catalog?schema=2&revision=2", {
      headers: { Accept: "application/json" },
    });
    expect(screen.getByText(/M03 微积分/)).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: /规划/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/课程规划|编辑状态|审阅状态|草稿|预览稿/)).not.toBeInTheDocument();
  });

  it("renders equation summaries as accessible math instead of raw TeX", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [readableEquation],
      }),
    );
    const restoreFocusRef: RefObject<HTMLElement | null> = { current: null };
    render(
      <SearchDialog
        catalog={[]}
        locale="zh-CN"
        open
        onOpenChange={vi.fn()}
        restoreFocusRef={restoreFocusRef}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "搜索知识库" }), {
      target: { value: "nabla" },
    });

    expect(await screen.findByRole("option", { name: /梯度定义/ })).toBeVisible();
    const math = document.body.querySelector<HTMLElement>(
      ".static-math--search-result[data-latex]",
    );
    const visibleText = document.body.cloneNode(true) as HTMLElement;
    visibleText.querySelectorAll(".static-math").forEach((element) => element.remove());
    expect(math).toHaveAttribute("data-latex", readableEquation.summary);
    expect(visibleText.textContent).not.toContain("\\nabla");
  });
});
