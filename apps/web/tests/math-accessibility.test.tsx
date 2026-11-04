import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { extractMathCopyText } from "@/components/math-copy-enhancer";
import { MdxCode, MdxPre } from "@/components/mdx-components";
import { StaticMath } from "@/components/static-math";

describe("math accessibility and copy source", () => {
  it("preserves the complete TeX source and an explicit accessible label", () => {
    render(<StaticMath latex={"\\mathbf{u}"} plainText="粗体向量 u" label="粗体向量 u" />);

    const formula = screen.getByRole("group", { name: "粗体向量 u" });
    expect(formula).toHaveAttribute("data-latex", "\\mathbf{u}");
    expect(formula).toHaveAttribute("data-plain-text", "粗体向量 u");
    expect(formula.querySelector('annotation[encoding="application/x-tex"]')).toHaveTextContent(
      "\\mathbf{u}",
    );
    expect(extractMathCopyText(formula.querySelector(".katex-html"))).toBe("\\mathbf{u}");
  });

  it("reads the TeX annotation from compiled article math", () => {
    const wrapper = document.createElement("span");
    wrapper.className = "katex";
    wrapper.innerHTML =
      '<span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">\\lambda</annotation></semantics></math></span><span class="katex-html">λ</span>';

    expect(extractMathCopyText(wrapper.querySelector(".katex-html"))).toBe("\\lambda");
  });

  it("renders compact inline TeX through StaticMath", () => {
    const { container } = render(
      <p>
        设 <MdxCode className="language-math math-inline">x^2</MdxCode> 为平方项。
      </p>,
    );

    const formula = container.querySelector<HTMLElement>(".static-math");
    expect(formula).toHaveAttribute("data-latex", "x^2");
    expect(formula?.querySelector(".katex-mathml")).not.toBeNull();
  });

  it("removes the code pre-wrapper around display math", () => {
    const { container } = render(
      <MdxPre>
        <MdxCode className="language-math math-display">{"\\sum_{i=1}^n x_i"}</MdxCode>
      </MdxPre>,
    );

    expect(container.querySelector("pre")).toBeNull();
    expect(container.querySelector(".static-math--display")).toHaveAttribute(
      "data-latex",
      "\\sum_{i=1}^n x_i",
    );
    expect(container.querySelector(".static-math--authored")).not.toBeNull();
  });

  it("keeps fenced math in display mode", () => {
    const { container } = render(
      <MdxPre>
        <MdxCode className="language-math">{"\\int_0^1 x\\,dx"}</MdxCode>
      </MdxPre>,
    );

    expect(container.querySelector("pre")).toBeNull();
    expect(container.querySelector(".static-math--display")).toHaveAttribute(
      "data-latex",
      "\\int_0^1 x\\,dx",
    );
  });

  it("preserves ordinary code and preformatted blocks", () => {
    const { container } = render(
      <MdxPre>
        <MdxCode className="language-ts">const x = 1;</MdxCode>
      </MdxPre>,
    );

    expect(container.querySelector("pre code.language-ts")).toHaveTextContent("const x = 1;");
  });
});
