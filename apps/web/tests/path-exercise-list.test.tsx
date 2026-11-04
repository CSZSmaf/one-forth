import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PathExerciseList,
  pathExerciseStorageKey,
  readCompletedPathExerciseIds,
  type PathExerciseDto,
} from "@/components/path-exercise-list";
import { learningStateStorageKey } from "@/lib/learning-state";

const exercise: PathExerciseDto = {
  id: "calculus-gradient-model",
  title: "构造并解释一个二维目标函数的梯度",
  prompt: "计算给定点与单位方向上的方向导数，并解释结果。",
  difficulty: 3,
  hint: "先求梯度，再计算内积。",
  workedSolution: "梯度为 (1,-3)，方向导数为 -9/5。",
  verification: "方向向量范数为 1，内积可直接复算。",
  chapters: [
    {
      label: "M03 · 第 2 章 偏导数、方向导数与梯度",
      href: "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis/partials-gradient",
    },
  ],
};

describe("path exercise list", () => {
  it("renders a structured problem with canonical chapter links and no visible raw ids", async () => {
    const { container } = render(<PathExerciseList exercises={[exercise]} locale="zh-CN" />);

    expect(screen.getByRole("heading", { name: exercise.title })).toBeVisible();
    expect(screen.getByText(exercise.prompt)).toBeVisible();
    expect(screen.getByText("难度 3/5")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "M03 · 第 2 章 偏导数、方向导数与梯度" }),
    ).toHaveAttribute(
      "href",
      "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis/partials-gradient",
    );
    expect(screen.getByText("查看提示").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText("展开分步解答").closest("details")).not.toHaveAttribute("open");
    expect(container.textContent).not.toContain(exercise.id);
    expect(container.textContent).not.toContain("m03-partials-gradient");

    await waitFor(() => expect(screen.getByText("练习完成进度：0/1")).toBeVisible());
  });

  it("persists completion independently without overwriting chapter progress", async () => {
    localStorage.setItem(learningStateStorageKey, "existing-chapter-progress");
    const view = render(<PathExerciseList exercises={[exercise]} locale="zh-CN" />);

    const toggle = await screen.findByRole("button", { name: `标记完成：${exercise.title}` });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: `已完成：${exercise.title}` })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("练习完成进度：1/1")).toBeVisible();
    });
    expect([...readCompletedPathExerciseIds(localStorage)]).toEqual([exercise.id]);
    expect(localStorage.getItem(learningStateStorageKey)).toBe("existing-chapter-progress");

    view.unmount();
    render(<PathExerciseList exercises={[exercise]} locale="zh-CN" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: `已完成：${exercise.title}` })).toBeVisible(),
    );
  });

  it("recovers from malformed local exercise data", () => {
    localStorage.setItem(pathExerciseStorageKey, "{not-json");
    expect([...readCompletedPathExerciseIds(localStorage)]).toEqual([]);

    render(<PathExerciseList exercises={[exercise]} locale="zh-CN" />);
    expect(screen.getByRole("button", { name: `标记完成：${exercise.title}` })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
