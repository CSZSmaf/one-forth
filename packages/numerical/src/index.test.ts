import { describe, expect, it } from "vitest";
import { runGradientDescent, scalarBackprop } from "./index";

describe("numerical models", () => {
  it("reduces a convex quadratic loss with a stable learning rate", () => {
    const steps = runGradientDescent({
      learningRate: 0.18,
      momentum: 0,
      iterations: 30,
      initialPoint: { x: -3, y: 2.4 },
    });
    expect(steps.at(-1)?.loss ?? Infinity).toBeLessThan(steps[0]?.loss ?? 0);
  });

  it("matches a finite-difference weight gradient", () => {
    const input = { x: 1.2, weight: -0.4, bias: 0.1, target: 0.7, activation: "tanh" as const };
    const analytic = scalarBackprop(input).weightGradient;
    const epsilon = 1e-5;
    const plus = scalarBackprop({ ...input, weight: input.weight + epsilon }).loss;
    const minus = scalarBackprop({ ...input, weight: input.weight - epsilon }).loss;
    expect(analytic).toBeCloseTo((plus - minus) / (2 * epsilon), 5);
  });
});
