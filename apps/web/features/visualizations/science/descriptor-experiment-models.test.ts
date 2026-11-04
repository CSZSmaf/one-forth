import { describe, expect, it } from "vitest";
import {
  descriptorExperimentIds,
  getDescriptorExperiment,
  type DescriptorExperimentState,
} from "./descriptor-experiment-models";

describe("descriptor experiment models", () => {
  it("builds every registered experiment deterministically and passes its invariant check", () => {
    for (const id of descriptorExperimentIds) {
      const descriptor = getDescriptorExperiment(id);
      const state: DescriptorExperimentState = {
        ...descriptor.initialState,
        step: descriptor.resolveMaximumStep?.(descriptor.initialState) ?? descriptor.maximumStep,
      };
      const first = descriptor.build(state);
      const second = descriptor.build(state);
      expect(first, id).toEqual(second);
      expect(first.primary.length, id).toBeGreaterThan(1);
      expect(first.verification.passed, id).toBe(true);
      expect(Number.isFinite(first.verification.residual), id).toBe(true);
      expect(first.textAlternative["zh-CN"].trim(), id).not.toBe("");
      expect(first.status["zh-CN"].trim(), id).not.toBe("");
    }
  });

  it("uses a fixed seed reproducibly in every descriptor experiment", () => {
    for (const id of descriptorExperimentIds) {
      const descriptor = getDescriptorExperiment(id);
      const step = Math.min(48, descriptor.maximumStep);
      const parameter = id === "confidence-coverage" ? 0.8 : descriptor.initialState.parameter;
      const baseline = descriptor.build({ ...descriptor.initialState, parameter, seed: 101, step });
      const replay = descriptor.build({ ...descriptor.initialState, parameter, seed: 101, step });
      const changed = descriptor.build({ ...descriptor.initialState, parameter, seed: 102, step });
      expect(replay.primary, id).toEqual(baseline.primary);
      expect(changed.primary, id).not.toEqual(baseline.primary);
    }
  });

  it("exposes real analytical checks for the field, ODE, and PINN experiments", () => {
    const field = getDescriptorExperiment("coulomb-gauss-field").build({
      parameter: 2.4,
      seed: 19,
      step: 96,
      speed: 1,
    });
    expect(field.verification.residual).toBeLessThan(5e-3);

    const stableOde = getDescriptorExperiment("ode-stability-convergence").build({
      parameter: 0.5,
      seed: 1,
      step: 32,
      speed: 1,
    });
    const unstableOde = getDescriptorExperiment("ode-stability-convergence").build({
      parameter: 2.2,
      seed: 1,
      step: 32,
      speed: 1,
    });
    expect(stableOde.metrics.find((entry) => entry.label.en === "Stability")?.value).toBe("stable");
    expect(unstableOde.metrics.find((entry) => entry.label.en === "Stability")?.value).toBe(
      "unstable",
    );

    const pinn = getDescriptorExperiment("pinn-residual-training").build({
      parameter: 0.08,
      seed: 23,
      step: 60,
      speed: 1,
    });
    expect(pinn.metrics.find((entry) => entry.label.en === "Boundary error")?.value).toBe(
      "0.00e+0",
    );
    expect(pinn.verification.passed).toBe(true);
  });

  it("keeps the PINN trajectory seed-reproducible through its final epoch", () => {
    const descriptor = getDescriptorExperiment("pinn-residual-training");
    const state = {
      ...descriptor.initialState,
      step: descriptor.maximumStep,
      seed: 101,
    };
    const baseline = descriptor.build(state);
    const replay = descriptor.build(state);
    const changedSeed = descriptor.build({ ...state, seed: 102 });

    expect(replay.primary).toEqual(baseline.primary);
    expect(changedSeed.primary).not.toEqual(baseline.primary);
    expect(baseline.verification.passed).toBe(true);
    expect(changedSeed.verification.passed).toBe(true);
    expect(baseline.metrics.find((entry) => entry.label.en === "Boundary error")?.value).toBe(
      "0.00e+0",
    );
  });

  it("uses domain-semantic geometry instead of one generic time-series layer", () => {
    const phase = getDescriptorExperiment("phase-space-chaos").build({
      parameter: 3.9,
      seed: 17,
      step: 80,
      speed: 1,
    });
    expect(phase.xLabel.en).toContain("x_n");
    expect(phase.yLabel.en).toContain("x_n+1");
    expect(phase.primary.every((entry) => entry.x >= 0 && entry.x <= 1)).toBe(true);
    expect(phase.primary.every((entry) => entry.y >= 0 && entry.y <= 1)).toBe(true);

    const fieldDescriptor = getDescriptorExperiment("coulomb-gauss-field");
    const fieldFirst = fieldDescriptor.build({ parameter: 1.2, seed: 41, step: 48, speed: 1 });
    const fieldSecond = fieldDescriptor.build({ parameter: 1.2, seed: 42, step: 48, speed: 1 });
    expect(fieldFirst.semanticLayer?.kind).toBe("field");
    expect(fieldSecond.semanticLayer?.kind).toBe("field");
    expect(fieldFirst.semanticLayer).not.toEqual(fieldSecond.semanticLayer);
    expect(fieldFirst.primary).not.toEqual(fieldSecond.primary);

    const quantum = getDescriptorExperiment("quantum-measurement").build({
      parameter: 75,
      seed: 31,
      step: 60,
      speed: 1,
    });
    expect(quantum.semanticLayer?.kind).toBe("quantum");

    const algorithm = getDescriptorExperiment("algorithm-complexity-trace").build({
      parameter: 24,
      seed: 31,
      step: 12,
      speed: 1,
    });
    expect(algorithm.semanticLayer?.kind).toBe("algorithm");

    const pinn = getDescriptorExperiment("pinn-residual-training").build({
      parameter: 0.08,
      seed: 31,
      step: 20,
      speed: 1,
    });
    expect(pinn.primary[0]?.x).toBe(0);
    expect(pinn.primary.at(-1)?.x).toBe(1);
    expect(pinn.reference?.at(-1)?.y).toBe(0);
    expect(pinn.semanticLayer?.kind).toBe("pinn");
  });
});

describe("second-round descriptor experiments", () => {
  it("function-graph-transform maps the anchor and reduces to identity at step zero", () => {
    const descriptor = getDescriptorExperiment("function-graph-transform");
    const identity = descriptor.build({ parameter: 2, seed: 5, step: 0, speed: 1 });
    expect(identity.primary).toEqual(identity.reference);
    const full = descriptor.build({ parameter: 2, seed: 5, step: 40, speed: 1 });
    expect(full.verification.passed).toBe(true);
    expect(full.verification.residual).toBeLessThanOrEqual(1e-9);
    const layer = full.semanticLayer;
    if (layer?.kind !== "function-transform") throw new Error("missing function-transform layer");
    // seed 5 selects |x|: f(0)=0, so the anchor image is (h, a*0+k) = (2, -1).
    expect(layer.baseName.en).toBe("f(x)=|x|");
    expect(layer.anchorImage.x).toBeCloseTo(2, 9);
    expect(layer.anchorImage.y).toBeCloseTo(-1, 9);
    expect(layer.a).toBeCloseTo(1.6, 9);
    expect(layer.b).toBeCloseTo(0.5, 9);
    const otherSeed = descriptor.build({ parameter: 2, seed: 6, step: 40, speed: 1 });
    if (otherSeed.semanticLayer?.kind !== "function-transform")
      throw new Error("missing function-transform layer");
    expect(otherSeed.semanticLayer.baseName.en).not.toBe(layer.baseName.en);
  });

  it("riemann-sum-convergence keeps midpoint below endpoint error and within bounds", () => {
    const descriptor = getDescriptorExperiment("riemann-sum-convergence");
    const left = descriptor.build({ parameter: 0, seed: 8, step: 64, speed: 1 });
    const midpoint = descriptor.build({ parameter: 2, seed: 8, step: 64, speed: 1 });
    expect(left.verification.passed).toBe(true);
    expect(midpoint.verification.passed).toBe(true);
    // seed 8 selects exp(x) on [0,1]; both final errors must respect their classical bounds.
    expect(left.primary.at(-1)!.y).toBeLessThanOrEqual(left.reference!.at(-1)!.y + 1e-12);
    expect(midpoint.primary.at(-1)!.y).toBeLessThanOrEqual(
      midpoint.reference!.at(-1)!.y + 1e-12,
    );
    expect(midpoint.primary.at(-1)!.y).toBeLessThan(left.primary.at(-1)!.y / 10);
    const empty = descriptor.build({ parameter: 1, seed: 8, step: 0, speed: 1 });
    expect(empty.primary).toHaveLength(0);
    expect(empty.verification.passed).toBe(true);
    const exactIntegral = Number(
      midpoint.metrics.find((entry) => entry.label.en === "Exact integral I")?.value,
    );
    expect(exactIntegral).toBeCloseTo(Math.E - 1, 8);
  });

  it("birthday-paradox-simulation matches the exact product formula", () => {
    const descriptor = getDescriptorExperiment("birthday-paradox-simulation");
    const at23 = descriptor.build({ parameter: 23, seed: 99, step: 240, speed: 1 });
    expect(at23.reference?.[0]?.y).toBeCloseTo(0.5072972343239854, 12);
    expect(at23.verification.passed).toBe(true);
    const at2 = descriptor.build({ parameter: 2, seed: 99, step: 10, speed: 1 });
    expect(at2.reference?.[0]?.y).toBeCloseTo(1 / 365, 12);
    const at60 = descriptor.build({ parameter: 60, seed: 99, step: 10, speed: 1 });
    expect(at60.reference?.[0]?.y).toBeCloseTo(0.994122660865348, 9);
    const replay = descriptor.build({ parameter: 23, seed: 99, step: 240, speed: 1 });
    expect(replay.primary).toEqual(at23.primary);
  });

  it("damped-oscillator-regimes classifies and solves all three regimes", () => {
    const descriptor = getDescriptorExperiment("damped-oscillator-regimes");
    const under = descriptor.build({ parameter: 1, seed: 7, step: 96, speed: 1 });
    const critical = descriptor.build({ parameter: 2, seed: 7, step: 96, speed: 1 });
    const over = descriptor.build({ parameter: 3.2, seed: 7, step: 96, speed: 1 });
    for (const snapshot of [under, critical, over]) {
      expect(snapshot.verification.passed).toBe(true);
      expect(snapshot.verification.residual).toBeLessThanOrEqual(1e-9);
      expect(snapshot.primary[0]).toEqual({ x: 0, y: 1 });
      // The analytical envelope bounds |x(t)| at every sampled instant.
      for (let index = 0; index < snapshot.primary.length; index += 1) {
        expect(snapshot.reference![index]!.y + 1e-9).toBeGreaterThanOrEqual(
          Math.abs(snapshot.primary[index]!.y),
        );
      }
    }
    expect(under.metrics.find((entry) => entry.label.en === "Regime")?.value).toContain(
      "underdamped",
    );
    expect(critical.metrics.find((entry) => entry.label.en === "Regime")?.value).toContain(
      "critically damped",
    );
    expect(over.metrics.find((entry) => entry.label.en === "Regime")?.value).toContain(
      "overdamped",
    );
    expect(
      under.metrics.find((entry) => entry.label.en === "Damped frequency omega_d")?.value,
    ).toBe(`${Math.sqrt(0.75).toFixed(4)} rad/s`);
  });

  it("projectile-motion reproduces the closed-form range, apex, and flight time", () => {
    const descriptor = getDescriptorExperiment("projectile-motion");
    const full = descriptor.build({ parameter: 45, seed: 11, step: 64, speed: 1 });
    expect(full.verification.passed).toBe(true);
    const layer = full.semanticLayer;
    if (layer?.kind !== "projectile") throw new Error("missing projectile layer");
    const gravity = 9.80665;
    expect(layer.range).toBeCloseTo((layer.initialSpeed * layer.initialSpeed) / gravity, 9);
    expect(layer.apexY).toBeCloseTo((layer.initialSpeed * layer.initialSpeed) / (4 * gravity), 9);
    expect(layer.flightTime).toBeCloseTo(
      (2 * layer.initialSpeed * Math.SQRT1_2) / gravity,
      9,
    );
    expect(full.primary.at(-1)!.x).toBeCloseTo(layer.range, 9);
    expect(full.primary.at(-1)!.y).toBeCloseTo(0, 9);
    const shallow = descriptor.build({ parameter: 30, seed: 11, step: 64, speed: 1 });
    const steep = descriptor.build({ parameter: 60, seed: 11, step: 64, speed: 1 });
    if (shallow.semanticLayer?.kind !== "projectile" || steep.semanticLayer?.kind !== "projectile")
      throw new Error("missing projectile layer");
    expect(shallow.semanticLayer.range).toBeCloseTo(steep.semanticLayer.range, 9);
    expect(shallow.semanticLayer.apexY).toBeLessThan(steep.semanticLayer.apexY);
  });

  it("maxwell-speed-distribution keeps the exact speed ratios and normalization", () => {
    const descriptor = getDescriptorExperiment("maxwell-speed-distribution");
    const snapshot = descriptor.build({ parameter: 300, seed: 2, step: 64, speed: 1 });
    expect(snapshot.verification.passed).toBe(true);
    expect(snapshot.verification.residual).toBeLessThanOrEqual(1e-6);
    const layer = snapshot.semanticLayer;
    if (layer?.kind !== "maxwell") throw new Error("missing maxwell layer");
    // seed 2 selects O2 with molar mass 0.031998 kg/mol.
    expect(layer.molarMass).toBeCloseTo(0.031998, 9);
    expect(layer.mean / layer.mostProbable).toBeCloseTo(2 / Math.sqrt(Math.PI), 12);
    expect(layer.rootMeanSquare / layer.mostProbable).toBeCloseTo(Math.sqrt(1.5), 12);
    expect(layer.mostProbable).toBeCloseTo(
      Math.sqrt((2 * 8.314462618 * 300) / 0.031998),
      6,
    );
    const hotter = descriptor.build({ parameter: 1200, seed: 2, step: 64, speed: 1 });
    if (hotter.semanticLayer?.kind !== "maxwell") throw new Error("missing maxwell layer");
    expect(hotter.semanticLayer.mostProbable / layer.mostProbable).toBeCloseTo(2, 12);
    expect(snapshot.primary.at(-1)!.x).toBeLessThanOrEqual(layer.speedLimit);
  });

  it("least-squares-regression recovers the true line at zero noise", () => {
    const descriptor = getDescriptorExperiment("least-squares-regression");
    const exact = descriptor.build({ parameter: 0, seed: 21, step: 40, speed: 1 });
    expect(exact.verification.passed).toBe(true);
    expect(exact.primary.at(-1)!.y).toBeLessThanOrEqual(1e-9);
    expect(exact.reference!.at(-1)!.y).toBeLessThanOrEqual(1e-9);
    const noisy = descriptor.build({ parameter: 1.5, seed: 21, step: 40, speed: 1 });
    expect(noisy.verification.passed).toBe(true);
    expect(noisy.primary).not.toEqual(exact.primary);
    const layer = noisy.semanticLayer;
    if (layer?.kind !== "least-squares") throw new Error("missing least-squares layer");
    expect(layer.points).toHaveLength(40);
    expect(layer.fit).not.toBeNull();
    expect(layer.residualSumOfSquares ?? -1).toBeGreaterThan(0);
    const single = descriptor.build({ parameter: 1.5, seed: 21, step: 1, speed: 1 });
    if (single.semanticLayer?.kind !== "least-squares")
      throw new Error("missing least-squares layer");
    expect(single.semanticLayer.fit?.slope).toBe(0);
    expect(single.verification.passed).toBe(true);
  });

  it("epsilon-greedy-bandit keeps counts, replay, and the asymptotic bound consistent", () => {
    const descriptor = getDescriptorExperiment("epsilon-greedy-bandit");
    const snapshot = descriptor.build({ parameter: 0.1, seed: 31, step: 400, speed: 1 });
    expect(snapshot.verification.passed).toBe(true);
    const reference = snapshot.reference;
    if (!reference || reference.length === 0) throw new Error("missing bandit asymptote reference");
    expect(reference.every((entry) => entry.y === reference[0]!.y)).toBe(true);
    const bestMean = Number(
      snapshot.metrics.find((entry) => entry.label.en === "Best arm mean mu*")?.value,
    );
    expect(reference[0]!.y).toBeLessThanOrEqual(bestMean + 1e-4);
    const half = descriptor.build({ parameter: 0.5, seed: 31, step: 400, speed: 1 });
    const rateMetric = half.metrics.find((entry) => entry.label.en === "Optimal-arm rate")?.value;
    expect(rateMetric).toContain((0.5 + 0.5 / 4).toFixed(4));
    const greedy = descriptor.build({ parameter: 0, seed: 31, step: 400, speed: 1 });
    expect(greedy.verification.passed).toBe(true);
    const replay = descriptor.build({ parameter: 0.1, seed: 31, step: 400, speed: 1 });
    expect(replay.primary).toEqual(snapshot.primary);
  });
});
