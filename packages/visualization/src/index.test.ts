import { describe, expect, it } from "vitest";
import {
  decodeVisualizationState,
  encodeVisualizationState,
  visualizationExists,
  visualizationManifest,
} from "./index";

describe("visualization registry and URL state", () => {
  it("contains all phase-one visualizations", () => {
    expect(visualizationExists("wave-equation-1d")).toBe(true);
    expect(visualizationExists("missing")).toBe(false);
  });

  it("registers the second-round visualizations with deterministic SVG renderers", () => {
    const ids = [
      "gradient-field",
      "fourier-harmonic-superposition",
      "attention-weight-matrix",
    ] as const;

    for (const id of ids) {
      expect(visualizationExists(id)).toBe(true);
      expect(visualizationManifest.find((entry) => entry.id === id)).toMatchObject({
        id,
        renderer: "svg",
      });
    }
  });

  it("registers the complete descriptor expansion across all public domains", () => {
    const requiredIds = [
      "probability-sampling-convergence",
      "confidence-coverage",
      "phase-space-chaos",
      "coulomb-gauss-field",
      "quantum-measurement",
      "algorithm-complexity-trace",
      "ode-stability-convergence",
      "pinn-residual-training",
    ] as const;
    for (const id of requiredIds) expect(visualizationExists(id), id).toBe(true);
    const domains = new Set(visualizationManifest.map((entry) => entry.domain));
    expect(domains).toEqual(
      new Set([
        "mathematics",
        "physics",
        "machine-learning",
        "computer-science",
        "interdisciplinary",
      ]),
    );
  });

  it("gives every experiment a complete scientific review module", () => {
    expect(visualizationManifest.length).toBeGreaterThanOrEqual(16);
    for (const entry of visualizationManifest) {
      const review = entry.scientificReview;
      expect(review.observationGoal["zh-CN"].trim(), entry.id).not.toBe("");
      expect(review.mathematicalModel["zh-CN"].trim(), entry.id).not.toBe("");
      expect(review.assumptions.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(review.procedure.length, entry.id).toBeGreaterThanOrEqual(3);
      expect(review.expectedPhenomena.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(review.numericalValidation.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(review.limitations.length, entry.id).toBeGreaterThanOrEqual(2);
      expect(review.relatedConceptIds.length, entry.id).toBeGreaterThan(0);
    }
  });

  it("round-trips unicode state", () => {
    const state = { amplitude: 1.2, label: "行波" };
    expect(decodeVisualizationState(encodeVisualizationState(state))).toEqual(state);
  });
});
