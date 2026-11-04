import { equations } from "@one-forth/content";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Equation } from "@/components/mdx-components";

describe("MDX Equation", () => {
  it("always renders the registered formula when an id is present", () => {
    const equation = equations[0];
    expect(equation).toBeDefined();
    if (!equation) return;

    const view = render(
      <Equation id={equation.id}>
        <span>不能覆盖注册公式</span>
      </Equation>,
    );

    expect(screen.queryByText("不能覆盖注册公式")).not.toBeInTheDocument();
    const figure = view.container.querySelector(`#equation-${equation.id}`);
    expect(figure).toHaveAttribute("aria-label", equation.accessibleLabel["zh-CN"]);
    const math = figure?.querySelector<HTMLElement>("[data-latex]");
    expect(math?.dataset.latex).toBe(equation.latex);
    expect(math).toHaveAttribute("aria-label", equation.accessibleLabel["zh-CN"]);
  });

  it("does not use children as a fallback for an unknown registered id", () => {
    render(
      <Equation id="not-a-registered-equation">
        <span>伪造公式</span>
      </Equation>,
    );

    expect(screen.queryByText("伪造公式")).not.toBeInTheDocument();
    expect(
      document.querySelector("[data-missing-equation-id='not-a-registered-equation']"),
    ).toBeInTheDocument();
  });

  it("keeps an explicit accessible boundary for id-less authored children", () => {
    render(
      <Equation label="自定义公式的文字说明">
        <span>x + y</span>
      </Equation>,
    );

    expect(screen.getByRole("figure", { name: "自定义公式的文字说明" })).toHaveTextContent("x + y");
  });
});
