import { describe, expect, it } from "vitest";

const closeTo = (actual: number, expected: number, tolerance = 1e-10): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

describe("M01 worked-example calculations", () => {
  it("rejects extraneous radical candidates and preserves rational inequality boundaries", () => {
    const radicalCandidates = [0, 3];
    const radicalSolutions = radicalCandidates.filter(
      (x) => x + 1 >= 0 && x - 1 >= 0 && Math.sqrt(x + 1) === x - 1,
    );
    expect(radicalSolutions).toEqual([3]);

    const rational = (x: number): number => (x * x - 4) / (x - 1);
    expect(rational(-3)).toBeLessThan(0);
    expect(rational(0)).toBeGreaterThan(0);
    expect(rational(1.5)).toBeLessThan(0);
    expect(rational(3)).toBeGreaterThan(0);
    for (const endpoint of [-2, 2]) closeTo(rational(endpoint), 0);
  });

  it("checks polynomial division and root multiplicities by expansion", () => {
    const dividend = (x: number): number => 2 * x ** 3 - 3 * x ** 2 + 4 * x - 5;
    const reconstructed = (x: number): number => (x - 2) * (2 * x ** 2 + x + 6) + 7;
    for (const x of [-3, -0.5, 0, 2, 5]) closeTo(reconstructed(x), dividend(x));
    expect(dividend(2)).toBe(7);

    const cubic = (x: number): number => x ** 3 - 3 * x + 2;
    const factored = (x: number): number => (x - 1) ** 2 * (x + 2);
    for (const x of [-4, -2, 0, 1, 3]) closeTo(cubic(x), factored(x));
    expect([factored(-2), factored(1)]).toEqual([0, 0]);
  });

  it("checks graph transformations, inverse domains, and composition values", () => {
    const transformedParabola = (x: number): number => -18 * (x - 1) ** 2 + 8;
    closeTo(transformedParabola(1), 8);
    closeTo(transformedParabola(1 / 3), 0);
    closeTo(transformedParabola(5 / 3), 0);

    const f = (x: number): number => (2 * x - 1) / (x + 3);
    const inverse = (y: number): number => (1 + 3 * y) / (2 - y);
    for (const x of [-5, -2, 0, 4]) closeTo(inverse(f(x)), x);
  });

  it("checks exponential substitutions, logarithm domains, and a dimensionless decay ratio", () => {
    const exponentialEquation = (x: number): number => 4 ** x - 5 * 2 ** x + 4;
    expect([0, 2].map(exponentialEquation)).toEqual([0, 0]);
    const alternateExponentialEquation = (x: number): number => 2 ** (2 * x + 1) - 9 * 2 ** x + 4;
    for (const root of [-1, 2]) closeTo(alternateExponentialEquation(root), 0);

    const logarithmEquation = (x: number): number => Math.log2(x - 1) + Math.log2(x - 3) - 3;
    closeTo(logarithmEquation(5), 0);
    const belongsToLogDomain = (x: number): boolean => x > 3;
    expect(belongsToLogDomain(-1)).toBe(false);
    expect(belongsToLogDomain(5)).toBe(true);

    const quantityMilligrams = (timeHours: number): number => 80 * (1 / 2) ** (timeHours / 6);
    closeTo(quantityMilligrams(6), 40);
    closeTo(quantityMilligrams(18), 10);
  });

  it("checks line distance, focus-directrix equality, and translated ellipse parameters", () => {
    const lineResidual = (x: number, y: number): number => 2 * x + y - 3;
    expect(lineResidual(2, -1)).toBe(0);
    expect(lineResidual(-1, 5)).toBe(0);
    closeTo(3 / Math.sqrt(5), Math.abs(lineResidual(0, 0)) / Math.sqrt(2 ** 2 + 1));

    const focusDistance = Math.hypot(2 - 2, 4 - 0);
    const directrixDistance = Math.abs(2 - -2);
    expect(focusDistance).toBe(directrixDistance);

    const ellipse = (t: number): number => {
      const x = 2 + 4 * Math.cos(t);
      const y = -1 + 2 * Math.sin(t);
      return (x - 2) ** 2 / 16 + (y + 1) ** 2 / 4;
    };
    for (const t of [0, Math.PI / 5, Math.PI, 1.75 * Math.PI]) closeTo(ellipse(t), 1);
  });

  it("checks review-chapter parameter thresholds and tangent slopes", () => {
    const intersectionDiscriminant = (k: number): number => 4 * (1 + k);
    expect(intersectionDiscriminant(-2)).toBeLessThan(0);
    expect(intersectionDiscriminant(-1)).toBe(0);
    expect(intersectionDiscriminant(0)).toBeGreaterThan(0);

    for (const slope of [2 / Math.sqrt(5), -2 / Math.sqrt(5)]) {
      const discriminant = 36 * slope ** 2 - 16 * (1 + slope ** 2);
      closeTo(discriminant, 0);
      closeTo(3 / Math.sqrt(slope ** 2 + 1), Math.sqrt(5));
    }
  });
});
