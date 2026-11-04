import { equations } from "@one-forth/content";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathRichText, MathRichTextContent, parseMathRichText } from "@/components/math-rich-text";

describe("MathRichText", () => {
  it("separates inline and display delimiters without exposing raw LaTeX markers", () => {
    expect(parseMathRichText("能量满足 $E=mc^2$，并且 $$p=mv$$。")).toEqual([
      { kind: "text", text: "能量满足 " },
      { kind: "math", latex: "E=mc^2", sourceDisplay: false },
      { kind: "text", text: "，并且 " },
      { kind: "math", latex: "p=mv", sourceDisplay: true },
      { kind: "text", text: "。" },
    ]);

    const view = render(
      <MathRichText
        value="能量满足 $E=mc^2$，并且 $$p=mv$$。"
        prefix={<strong>支持的主张：</strong>}
      />,
    );

    expect(
      [...view.container.querySelectorAll<HTMLElement>("[data-latex]")].map(
        (element) => element.dataset.latex,
      ),
    ).toEqual(["E=mc^2", "p=mv"]);
    expect(view.container.textContent).not.toContain("$");
    expect(view.container.querySelector(".katex-error")).toBeNull();
  });

  it("can render compact math inside list items and semantic headings", () => {
    const view = render(
      <li>
        <MathRichTextContent value="从 $E=mc^2$ 开始。" />
      </li>,
    );

    expect(
      view.container.querySelector("li > .static-math--authored")?.getAttribute("data-latex"),
    ).toBe("E=mc^2");
    expect(view.container.textContent).not.toContain("$");
  });

  it("compiles every formula metadata fragment without exposing delimiters", () => {
    const metadataValues = equations.flatMap((equation) => [
      ...equation.assumptions.map((assumption) => assumption["zh-CN"]),
      ...equation.applications,
      ...equation.limitingCases,
    ]);
    const expectedLatex = metadataValues.flatMap((value) =>
      parseMathRichText(value)
        .filter((segment) => segment.kind === "math")
        .map((segment) => segment.latex),
    );
    const view = render(
      <div>
        {metadataValues.map((value, index) => (
          <p key={`${index}-${value}`}>
            <MathRichTextContent value={value} />
          </p>
        ))}
      </div>,
    );

    expect(view.container.querySelector(".katex-error")).toBeNull();
    expect(
      [...view.container.querySelectorAll<HTMLElement>("[data-latex]")].map(
        (element) => element.dataset.latex,
      ),
    ).toEqual(expectedLatex);
    expect(view.container.textContent).not.toContain("$");
  });
});
