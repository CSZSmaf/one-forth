import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExerciseBlock } from "@/components/exercise-block";
import { Exercise, ExerciseHint, ExerciseSolution } from "@/components/mdx-components";
import { StaticMath } from "@/components/static-math";

vi.mock("next/navigation", () => ({
  usePathname: () => "/zh-CN/learn/vectors",
}));

describe("exercise block", () => {
  it("shows author-supplied topic, difficulty, hint, solution, and local completion", async () => {
    render(
      <ExerciseBlock
        id="exercise-projection"
        title="投影练习"
        number="2.3"
        topic="正交投影"
        difficulty={3}
        hint={<p>先检查方向向量是否单位化。</p>}
        solution={<p>把内积除以方向向量的模长平方。</p>}
      >
        求向量在给定方向上的投影。
      </ExerciseBlock>,
    );

    expect(screen.getByText("正交投影")).toBeVisible();
    expect(screen.getByText("3/5")).toBeVisible();
    expect(screen.getByText("查看提示")).toBeVisible();
    expect(screen.getByText("查看解答")).toBeVisible();
    expect(screen.getByText("先检查方向向量是否单位化。")).not.toBeVisible();
    expect(screen.getByText("把内积除以方向向量的模长平方。")).not.toBeVisible();

    const completion = screen.getByRole("button", { name: "标记完成" });
    await waitFor(() => expect(completion).toBeEnabled());
    fireEvent.click(completion);
    expect(screen.getByRole("button", { name: "已完成" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps existing child-only MDX exercises valid", async () => {
    render(<ExerciseBlock id="legacy-exercise">原有练习题目</ExerciseBlock>);

    expect(screen.getByText("原有练习题目")).toBeVisible();
    expect(screen.queryByText("所属知识")).toBeNull();
    expect(screen.queryByText("难度")).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "标记完成" })).toBeEnabled());
  });

  it("routes compiled math slots into disclosures without mixing them into the prompt", () => {
    const { container } = render(
      <Exercise id="exercise-rich-math">
        <p>写出平移对应的守恒量。</p>
        <ExerciseHint>
          <p>
            代入 <StaticMath latex={"\\delta\\phi=-\\epsilon^\\nu\\partial_\\nu\\phi"} />。
          </p>
        </ExerciseHint>
        <ExerciseSolution>
          <p>
            得到 <StaticMath latex={"T^\\mu{}_{\\nu}"} />。
          </p>
        </ExerciseSolution>
      </Exercise>,
    );

    const prompt = container.querySelector<HTMLElement>(".exercise-prompt");
    const hint = container.querySelector<HTMLElement>(".exercise-disclosure--hint");
    const solution = container.querySelector<HTMLElement>(".exercise-disclosure--solution");
    expect(prompt).toHaveTextContent("写出平移对应的守恒量。");
    expect(prompt?.querySelector(".static-math")).toBeNull();
    expect(prompt).not.toHaveTextContent("代入");
    expect(prompt).not.toHaveTextContent("得到");

    const hintMath = hint?.querySelector<HTMLElement>(".static-math");
    const solutionMath = solution?.querySelector<HTMLElement>(".static-math");
    expect(hintMath).toHaveAttribute(
      "data-latex",
      "\\delta\\phi=-\\epsilon^\\nu\\partial_\\nu\\phi",
    );
    expect(solutionMath).toHaveAttribute("data-latex", "T^\\mu{}_{\\nu}");
    expect(hintMath?.querySelector(".katex")).not.toBeNull();
    expect(solutionMath?.querySelector(".katex")).not.toBeNull();
    expect(hint?.querySelector(".katex-error")).toBeNull();
    expect(solution?.querySelector(".katex-error")).toBeNull();
  });

  it("renders high-confidence legacy formulas and preserves code identifiers", () => {
    const { container } = render(
      <Exercise
        id="exercise-legacy-inline"
        hint="先由 ω₀=√(k/m) 求频率。"
        solution="复杂度为 Θ(2^n)，字段 device_id 保持不变。"
      >
        <p>比较公式与代码。</p>
      </Exercise>,
    );

    const hint = container.querySelector<HTMLElement>(".exercise-disclosure--hint");
    const solution = container.querySelector<HTMLElement>(".exercise-disclosure--solution");
    expect(hint?.querySelector(".static-math--legacy-exercise")).toHaveAttribute(
      "data-latex",
      "\\omega_{0}=\\sqrt{k/m}",
    );
    expect(solution?.querySelector(".static-math--legacy-exercise")).toHaveAttribute(
      "data-latex",
      "\\Theta(2^n)",
    );
    expect(solution?.querySelector("code.legacy-exercise-code")).toHaveTextContent("device_id");
    expect(hint?.querySelector(".katex-error")).toBeNull();
    expect(solution?.querySelector(".katex-error")).toBeNull();
  });
});
