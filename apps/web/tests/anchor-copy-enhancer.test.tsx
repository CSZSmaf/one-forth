import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnchorCopyEnhancer } from "@/components/anchor-copy-enhancer";

describe("AnchorCopyEnhancer", () => {
  it("adds a keyboard-operable copy control to stable article anchors", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.history.replaceState({}, "", "/zh-CN/books/mathematics/linear-algebra/vectors");

    render(
      <article className="article-prose">
        <AnchorCopyEnhancer />
        <h2 id="vector-coordinates">向量坐标</h2>
      </article>,
    );

    const button = await screen.findByRole("button", { name: "复制“向量坐标”的链接" });
    fireEvent.click(button);
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "http://localhost:3000/zh-CN/books/mathematics/linear-algebra/vectors#vector-coordinates",
      ),
    );
    expect(button).toHaveTextContent("已复制");
  });

  it("does not mutate headings owned by a nested interactive client island", async () => {
    render(
      <article className="article-prose">
        <AnchorCopyEnhancer />
        <h2 id="authored-section">正文标题</h2>
        <section id="figure-demo" className="interactive-figure-anchor anchor-copy-target">
          <h2 id="dynamic-client-title">客户端实验标题</h2>
          <button type="button" className="anchor-copy-button">
            复制图链接
          </button>
        </section>
      </article>,
    );

    expect(await screen.findByRole("button", { name: "复制“正文标题”的链接" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "复制“客户端实验标题”的链接" }),
    ).not.toBeInTheDocument();
    expect(document.getElementById("dynamic-client-title")).not.toHaveAttribute(
      "data-anchor-copy-ready",
    );
  });
});
