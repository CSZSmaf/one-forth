import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeMathField } from "@/components/home-math-field";

describe("home math field", () => {
  it("names the function, reports current parameters, and explains the observation", () => {
    render(<HomeMathField />);

    expect(screen.getByText("正弦函数参数实验")).toBeVisible();
    expect(screen.getByLabelText(/函数 f 括号 x 等于 46 乘正弦/)).toBeVisible();
    expect(screen.getByText(/峰值与谷值约为 ±46/)).toBeVisible();
    expect(screen.getByText(/虚线是参考函数 46 sin\(x\)/)).toBeVisible();
  });

  it("supports native controls and keyboard operation on the graph", () => {
    render(<HomeMathField />);

    const amplitude = screen.getByRole("slider", { name: "振幅 A" });
    const phase = screen.getByRole("slider", { name: "相位 φ" });
    const graph = screen.getByRole("slider", { name: "在函数图像中调整相位" });

    fireEvent.change(amplitude, { target: { value: "70" } });
    expect(screen.getByText(/峰值与谷值约为 ±70/)).toBeVisible();

    fireEvent.change(phase, { target: { value: "1.20" } });
    expect(graph).toHaveAttribute("aria-valuenow", "1.2");
    expect(screen.getByText(/向左平移 1.20 弧度/)).toBeVisible();

    fireEvent.keyDown(graph, { key: "ArrowRight" });
    expect(graph).toHaveAttribute("aria-valuenow", "1.3");
    fireEvent.keyDown(graph, { key: "Home" });
    expect(graph).toHaveAttribute("aria-valuenow", "0");
  });
});
