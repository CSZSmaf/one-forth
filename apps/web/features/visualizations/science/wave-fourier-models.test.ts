import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { FourierHarmonicSuperposition } from "../fourier-harmonic-superposition";
import { WaveEquation1D } from "../wave-equation-1d";
import {
  analyticalWaveDisplacement,
  analyticalWaveInitialDisplacement,
  analyticalWaveInitialVelocity,
  createAnalyticalWaveModel,
  createFourierSeriesPlotData,
  diagnoseAnalyticalWaveEquation,
  estimateGibbsOvershootRatio,
  fourierHarmonicOrder,
  fourierMidpointGridRmse,
  fourierPartialSum,
  fourierPeriodRadians,
  fourierSineCoefficient,
  fourierTargetValue,
  sampleAnalyticalWave,
} from "./wave-fourier-models";

describe("analytical one-dimensional wave models", () => {
  it("satisfies the traveling-wave PDE and declared initial displacement and velocity", () => {
    const model = createAnalyticalWaveModel({
      scenario: "traveling",
      amplitudeMetres: 0.65,
      frequencyHertz: 0.55,
      waveSpeedMetresPerSecond: 1.8,
    });
    const xMetres = model.intervalLengthMetres * 0.37;
    const timeIncrement = 1e-6;
    const numericalInitialVelocity =
      (analyticalWaveDisplacement(model, xMetres, timeIncrement) -
        analyticalWaveDisplacement(model, xMetres, -timeIncrement)) /
      (2 * timeIncrement);

    expect(analyticalWaveDisplacement(model, xMetres, 0)).toBeCloseTo(
      analyticalWaveInitialDisplacement(model, xMetres),
      12,
    );
    expect(numericalInitialVelocity).toBeCloseTo(analyticalWaveInitialVelocity(model, xMetres), 8);
    expect(model.angularFrequencyRadiansPerSecond).toBeCloseTo(
      model.waveSpeedMetresPerSecond * model.waveNumberRadiansPerMetre,
      12,
    );
    expect(diagnoseAnalyticalWaveEquation(model, 0.43).maximumRelativePdeResidual).toBeLessThan(
      2e-4,
    );
  });

  it("derives a fixed-end fundamental interval for the standing wave", () => {
    const model = createAnalyticalWaveModel({
      scenario: "standing",
      amplitudeMetres: 0.8,
      frequencyHertz: 1.2,
      waveSpeedMetresPerSecond: 2.4,
    });

    expect(model.intervalLengthMetres).toBeCloseTo(1);
    expect(model.frequencyHertz).toBeCloseTo(
      model.waveSpeedMetresPerSecond / (2 * model.intervalLengthMetres),
    );
    for (const timeSeconds of [0, 0.17, 0.53]) {
      expect(analyticalWaveDisplacement(model, 0, timeSeconds)).toBeCloseTo(0, 12);
      expect(
        analyticalWaveDisplacement(model, model.intervalLengthMetres, timeSeconds),
      ).toBeCloseTo(0, 12);
    }
    expect(analyticalWaveInitialVelocity(model, model.intervalLengthMetres * 0.4)).toBe(0);
    const diagnostics = diagnoseAnalyticalWaveEquation(model, 0.17);
    expect(diagnostics.boundaryValueMismatchMetres).toBeLessThan(1e-12);
    expect(diagnostics.maximumRelativePdeResidual).toBeLessThan(2e-4);
    expect(
      diagnoseAnalyticalWaveEquation(model, 1 / (4 * model.frequencyHertz))
        .maximumRelativePdeResidual,
    ).toBeLessThan(2e-4);
  });

  it("models a periodic Gaussian pulse without any frequency parameter", () => {
    const model = createAnalyticalWaveModel({
      scenario: "gaussian",
      amplitudeMetres: 0.7,
      waveSpeedMetresPerSecond: 1.8,
      intervalLengthMetres: 10,
      pulseWidthMetres: 0.65,
    });
    const samples = sampleAnalyticalWave(model, 0.8, 101);

    expect("frequencyHertz" in model).toBe(false);
    expect(model.profileHarmonicCount).toBe(24);
    expect(samples).toHaveLength(101);
    expect(samples[0]?.xMetres).toBe(0);
    expect(samples.at(-1)?.xMetres).toBe(10);
    expect(samples[0]?.displacementMetres).toBeCloseTo(
      samples.at(-1)?.displacementMetres ?? Number.NaN,
      12,
    );
    expect(analyticalWaveInitialDisplacement(model, model.pulseCentreMetres)).toBeCloseTo(0.7, 12);

    const xMetres = 4.1;
    const timeIncrement = 1e-6;
    const numericalInitialVelocity =
      (analyticalWaveDisplacement(model, xMetres, timeIncrement) -
        analyticalWaveDisplacement(model, xMetres, -timeIncrement)) /
      (2 * timeIncrement);
    expect(numericalInitialVelocity).toBeCloseTo(analyticalWaveInitialVelocity(model, xMetres), 7);
    const diagnostics = diagnoseAnalyticalWaveEquation(model, 0.8);
    expect(diagnostics.boundaryValueMismatchMetres).toBeLessThan(1e-12);
    expect(diagnostics.maximumRelativePdeResidual).toBeLessThan(5e-4);
    expect(diagnostics.diagnosticCourantNumber).toBeCloseTo(0.25, 12);
  });
});

describe("Fourier coefficient and sampling conventions", () => {
  it("uses the normalized sine coefficients and correct harmonic orders", () => {
    expect(fourierSineCoefficient("square", 1)).toBeCloseTo(4 / Math.PI, 12);
    expect(fourierSineCoefficient("square", 2)).toBe(0);
    expect(fourierSineCoefficient("triangle", 1)).toBeCloseTo(8 / Math.PI ** 2, 12);
    expect(fourierSineCoefficient("triangle", 3)).toBeCloseTo(-8 / (9 * Math.PI ** 2), 12);
    expect(fourierSineCoefficient("sawtooth", 1)).toBeCloseTo(2 / Math.PI, 12);
    expect(fourierSineCoefficient("sawtooth", 2)).toBeCloseTo(-1 / Math.PI, 12);
    expect(fourierHarmonicOrder("square", 6)).toBe(13);
    expect(fourierHarmonicOrder("triangle", 6)).toBe(13);
    expect(fourierHarmonicOrder("sawtooth", 6)).toBe(7);
  });

  it("respects odd parity, a 2π period, and midpoint values at jumps", () => {
    for (const waveform of ["square", "triangle", "sawtooth"] as const) {
      const xRadians = 0.73;
      expect(fourierPartialSum(waveform, 9, -xRadians)).toBeCloseTo(
        -fourierPartialSum(waveform, 9, xRadians),
        12,
      );
      expect(fourierPartialSum(waveform, 9, xRadians + fourierPeriodRadians)).toBeCloseTo(
        fourierPartialSum(waveform, 9, xRadians),
        12,
      );
    }
    expect(fourierTargetValue("square", 0)).toBe(0);
    expect(fourierTargetValue("square", Math.PI)).toBe(0);
    expect(fourierTargetValue("sawtooth", Math.PI)).toBe(0);
    expect(fourierTargetValue("sawtooth", -Math.PI)).toBe(0);
  });

  it("uses a duplicate-free midpoint grid for RMSE and converges with added terms", () => {
    for (const waveform of ["square", "triangle", "sawtooth"] as const) {
      expect(fourierMidpointGridRmse(waveform, 15, 0, 4096)).toBeLessThan(
        fourierMidpointGridRmse(waveform, 1, 0, 4096),
      );
      expect(fourierMidpointGridRmse(waveform, 9, Math.PI / 7, 4096)).toBeCloseTo(
        fourierMidpointGridRmse(waveform, 9, 0, 4096),
        3,
      );
    }

    const data = createFourierSeriesPlotData({
      waveform: "square",
      terms: 7,
      plotSampleCount: 321,
      rmseSampleCount: 4096,
    });
    expect(data.target).toHaveLength(321);
    expect(data.target[0]).toBe(0);
    expect(data.target.at(-1)).toBe(0);
    expect(data.partialSum[0]).toBeCloseTo(data.partialSum.at(-1) ?? Number.NaN, 12);
    expect(data.highestHarmonicOrder).toBe(13);
  });

  it("states Gibbs overshoot only for discontinuous targets", () => {
    expect(estimateGibbsOvershootRatio("triangle", 15)).toBe(0);
    expect(estimateGibbsOvershootRatio("square", 15)).toBeGreaterThan(0.08);
    expect(estimateGibbsOvershootRatio("square", 15)).toBeLessThan(0.1);
    const finiteSawtoothOvershoot = estimateGibbsOvershootRatio("sawtooth", 15);
    const laterSawtoothOvershoot = estimateGibbsOvershootRatio("sawtooth", 120);
    expect(finiteSawtoothOvershoot).toBeGreaterThan(0.05);
    expect(finiteSawtoothOvershoot).toBeLessThan(0.07);
    expect(laterSawtoothOvershoot).toBeGreaterThan(0.08);
    expect(laterSawtoothOvershoot).toBeLessThan(0.09);
    expect(laterSawtoothOvershoot).toBeGreaterThan(finiteSawtoothOvershoot);
  });
});

describe("scientific visualization summaries", () => {
  it("describes the analytical wave model and removes frequency from the Gaussian scenario", async () => {
    render(createElement(WaveEquation1D, { locale: "zh-CN" }));

    expect(
      screen.getByRole("img", { name: /一维波动方程解析解.*有限差分只复核解析公式/ }),
    ).toBeVisible();
    expect(screen.getByText(/不是数值积分时间步，因此没有 CFL 稳定性限制/)).toBeVisible();
    expect(screen.getByRole("slider", { name: /频率 f/ })).toBeVisible();

    fireEvent.change(screen.getByRole("combobox", { name: /初始条件.*解析解族/ }), {
      target: { value: "gaussian" },
    });
    await waitFor(() => {
      expect(screen.queryByRole("slider", { name: /频率 f/ })).not.toBeInTheDocument();
      expect(screen.getByRole("img", { name: /该脉冲模型没有频率参数/ })).toBeVisible();
    });
  });

  it("exposes Fourier normalization, grid, order, and Gibbs semantics as text", () => {
    render(createElement(FourierHarmonicSuperposition, { locale: "zh-CN" }));

    expect(
      screen.getByRole("group", {
        name: /奇函数，仅含正弦项.*2048 点半开周期中点网格 RMSE/,
      }),
    ).toBeVisible();
    expect(screen.getByText("系数频谱")).toBeVisible();
    expect(screen.getAllByText(/极限峰值约为跳跃幅度的 8.95%/).length).toBeGreaterThan(0);
  });
});
