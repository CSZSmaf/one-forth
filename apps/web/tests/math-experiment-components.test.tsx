import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BackpropComputationGraph } from "../features/visualizations/backprop-computation-graph";
import { GradientDescent } from "../features/visualizations/gradient-descent";
import { GradientField } from "../features/visualizations/gradient-field";
import { LinearTransform2D } from "../features/visualizations/linear-transform-2d";

describe("scientifically validated math experiment views", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/zh-CN/playground");
  });

  it("shows rank, oriented area, singular, and projection cases for linear maps", () => {
    render(<LinearTransform2D locale="zh-CN" />);
    expect(screen.getByText("秩一压缩")).toBeInTheDocument();
    expect(screen.getByText("零变换")).toBeInTheDocument();
    expect(screen.getByText("有向面积")).toBeInTheDocument();
    expect(screen.getByText("秩")).toBeInTheDocument();
  });

  it("shows analytic and central-difference directional derivatives", () => {
    render(<GradientField locale="zh-CN" />);
    expect(screen.getByText("解析 ∇f·u")).toBeInTheDocument();
    expect(screen.getByText("中心差分")).toBeInTheDocument();
    expect(screen.getByText("绝对误差")).toBeInTheDocument();
  });

  it("shows the analytic stability boundary for the quadratic descent model", () => {
    render(<GradientDescent locale="zh-CN" />);
    expect(screen.getByText("解析稳定性预设")).toBeInTheDocument();
    expect(screen.getByText("稳定区间")).toBeInTheDocument();
    expect(screen.getByText("临界边界")).toBeInTheDocument();
    expect(screen.getByText("不稳定区间")).toBeInTheDocument();
    expect(screen.getByText("临界 η")).toBeInTheDocument();
  });

  it("shows branch accumulation and finite-difference validation for backpropagation", () => {
    render(<BackpropComputationGraph locale="zh-CN" />);
    expect(screen.getByText("L2 系数 λ")).toBeInTheDocument();
    expect(screen.getByText("差分最大误差")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /λw = .*; ∂L\/∂w =/ })).toBeInTheDocument();
    expect(document.querySelector(".katex-error")).toBeNull();
  });
});
