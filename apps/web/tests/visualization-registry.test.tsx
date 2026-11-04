import { Suspense } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisteredVisualization } from "@/features/visualizations/registry";
import type { VisualizationId } from "@/features/visualizations/types";

async function renderRegistered(id: VisualizationId, title: string) {
  render(
    <Suspense fallback={<p>loading</p>}>
      <RegisteredVisualization id={id} locale="zh-CN" />
    </Suspense>,
  );

  return screen.findByRole("region", { name: title }, { timeout: 5_000 });
}

describe("second-round visualization registry", () => {
  beforeEach(() => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
        }) as unknown as MediaQueryList,
    );
    window.history.replaceState({}, "", "/zh-CN/playground");
  });

  it("renders the gradient field and updates the selected surface", async () => {
    const region = await renderRegistered("gradient-field", "方向导数与梯度场");
    const surface = within(region).getByRole("combobox", { name: "曲面" });

    fireEvent.change(surface, { target: { value: "saddle" } });

    expect(surface).toHaveValue("saddle");
    await waitFor(() => {
      expect(within(region).getByRole("img")).toHaveAccessibleName(/0\.5x²−0\.5y²/);
    });
  });

  it("renders Fourier superposition and switches the target waveform", async () => {
    const region = await renderRegistered("fourier-harmonic-superposition", "傅里叶谐波叠加");
    const waveform = within(region).getByRole("combobox", { name: "目标波形" });

    fireEvent.change(waveform, { target: { value: "triangle" } });

    expect(waveform).toHaveValue("triangle");
    await waitFor(() => {
      expect(
        within(region).getByRole("group", { name: /三角波的傅里叶部分和/ }),
      ).toHaveAccessibleName(/三角波的傅里叶部分和/);
    });
  });

  it("renders the attention matrix and applies the causal mask", async () => {
    const region = await renderRegistered("attention-weight-matrix", "注意力权重矩阵");
    const causalMask = within(region).getByRole("checkbox", { name: "使用因果掩码" });

    fireEvent.click(causalMask);

    expect(causalMask).toBeChecked();
    await waitFor(() => {
      expect(within(region).getByRole("group", { name: /启用因果掩码/ })).toHaveAccessibleName(
        /启用因果掩码.*被掩码的未来位置权重为零/,
      );
    });
  });
});
