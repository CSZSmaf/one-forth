import { describe, expect, it } from "vitest";

const closeTo = (actual: number, expected: number, tolerance = 1e-10): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

describe("M02 worked-example calculations", () => {
  it("checks sequence limits, recursive convergence, and geometric remainders", () => {
    const rationalSequence = (n: number): number => (3 * n + 1) / (2 * n - 1);
    for (const n of [10, 100, 1_000]) {
      closeTo(Math.abs(rationalSequence(n) - 3 / 2), 5 / (4 * n - 2));
    }

    let recursiveTerm = 1;
    const recursiveTerms = [recursiveTerm];
    for (let index = 0; index < 12; index += 1) {
      recursiveTerm = Math.sqrt(2 + recursiveTerm);
      recursiveTerms.push(recursiveTerm);
    }
    expect(recursiveTerms.every((term) => term >= 1 && term < 2)).toBe(true);
    expect(
      recursiveTerms.every((term, index) => index === 0 || term > recursiveTerms[index - 1]!),
    ).toBe(true);
    expect(2 - recursiveTerms.at(-1)!).toBeLessThan(1e-7);

    const geometricPartialSum = (n: number): number =>
      Array.from({ length: n + 1 }, (_, index) => 0.5 ** index).reduce(
        (sum, term) => sum + term,
        0,
      );
    closeTo(2 - geometricPartialSum(10), 2 ** -10);
    expect(2 - geometricPartialSum(10)).toBeLessThan(1e-3);

    for (const epsilon of [0.5, 0.2, 0.1]) {
      const n = Math.ceil(1 + 2 / epsilon ** 2) + 1;
      expect((n * (n - 1) * epsilon ** 2) / 2).toBeGreaterThan(n);
      expect(n ** (1 / n)).toBeLessThan(1 + epsilon);
    }
  });

  it("checks representative limits and the bracketed root calculation", () => {
    const trigonometricQuotient = (x: number): number =>
      (1 - Math.cos(2 * x)) / (x * Math.sin(3 * x));
    closeTo(trigonometricQuotient(1e-4), 2 / 3, 2e-8);

    const rationalizedRootQuotient = (x: number): number => (Math.sqrt(4 + x) - 2) / x;
    closeTo(rationalizedRootQuotient(1e-6), 1 / 4, 1e-7);

    const polynomial = (x: number): number => x ** 3 + x - 1;
    let left = 0;
    let right = 1;
    for (let step = 0; step < 20; step += 1) {
      const midpoint = (left + right) / 2;
      if (polynomial(midpoint) < 0) left = midpoint;
      else right = midpoint;
    }
    expect(polynomial(left)).toBeLessThanOrEqual(0);
    expect(polynomial(right)).toBeGreaterThanOrEqual(0);
    expect(right - left).toBeLessThan(1e-6);
    closeTo((left + right) / 2, 0.6823278038, 1e-6);
  });

  it("checks implicit differentiation, linearization, and differential units", () => {
    const implicitSlope = -(2 * 1 + 2) / (1 + 2 * 2);
    closeTo(implicitSlope, -4 / 5);
    closeTo(4 * 5 + 5 * -4, 0);

    const squareRootEstimate = 2 + 0.25 * 0.1;
    closeTo(squareRootEstimate, 2.025);
    closeTo(squareRootEstimate ** 2 - 4.1, 0.000625);
    const exactError = squareRootEstimate - Math.sqrt(4.1);
    expect(exactError).toBeGreaterThan(0);
    closeTo(exactError, 0.000625 / (squareRootEstimate + Math.sqrt(4.1)));

    const radiusCentimetres = 10;
    const radiusErrorCentimetres = 0.02;
    const areaErrorSquareCentimetres = 2 * Math.PI * radiusCentimetres * radiusErrorCentimetres;
    closeTo(areaErrorSquareCentimetres, 0.4 * Math.PI);
    closeTo(areaErrorSquareCentimetres / (Math.PI * radiusCentimetres ** 2), 0.004);
  });

  it("checks derivative sign charts, extrema, asymptotes, and Taylor bounds", () => {
    const rolleContinuityCounterexample = (x: number): number => (x === -1 ? 1 : x);
    expect(rolleContinuityCounterexample(-1)).toBe(rolleContinuityCounterexample(1));
    for (const x of [-0.75, -0.25, 0.25, 0.75]) {
      const h = 1e-6;
      closeTo(
        (rolleContinuityCounterexample(x + h) - rolleContinuityCounterexample(x - h)) / (2 * h),
        1,
        1e-8,
      );
    }

    const cubic = (x: number): number => x ** 3 - 3 * x;
    const candidates = [-2, -1, 1, 3].map((x) => ({ x, value: cubic(x) }));
    expect(candidates).toEqual([
      { x: -2, value: -2 },
      { x: -1, value: 2 },
      { x: 1, value: -2 },
      { x: 3, value: 18 },
    ]);

    const rational = (x: number): number => x ** 2 / (x - 1);
    for (const x of [-100, -10, 10, 100]) {
      closeTo(rational(x) - (x + 1), 1 / (x - 1));
    }
    expect(rational(0.999)).toBeLessThan(0);
    expect(rational(1.001)).toBeGreaterThan(0);

    const taylorThree = 1 + 0.2 + 0.2 ** 2 / 2 + 0.2 ** 3 / 6;
    const taylorError = Math.exp(0.2) - taylorThree;
    expect(taylorError).toBeGreaterThan(0);
    expect(taylorError).toBeLessThan((1.222 / 24) * 0.2 ** 4);

    const sineFive = 0.3 - 0.3 ** 3 / 6 + 0.3 ** 5 / 120;
    expect(Math.abs(Math.sin(0.3) - sineFive)).toBeLessThanOrEqual(0.3 ** 6 / 720);
  });

  it("checks Riemann sums, moving-bound derivatives, and signed accumulation", () => {
    const midpointFour = 0.5 * [0.25, 0.75, 1.25, 1.75].reduce((sum, x) => sum + x ** 2, 0);
    const trapezoidFour =
      0.5 * (0.5 * (0 ** 2 + 2 ** 2) + [0.5, 1, 1.5].reduce((sum, x) => sum + x ** 2, 0));
    closeTo(midpointFour, 21 / 8);
    closeTo(trapezoidFour, 11 / 4);
    closeTo(midpointFour - 8 / 3, -1 / 24);
    closeTo(trapezoidFour - 8 / 3, 1 / 12);

    const movingBoundsDerivativeAtZero =
      Math.exp(Math.sin(0) ** 2) * Math.cos(0) - Math.exp(0 ** 4) * 2 * 0;
    closeTo(movingBoundsDerivativeAtZero, 1);

    const antiderivative = (time: number): number => time ** 2 - 4 * time;
    closeTo(antiderivative(4) - antiderivative(0), 0);
    const totalDistance =
      Math.abs(antiderivative(2) - antiderivative(0)) +
      Math.abs(antiderivative(4) - antiderivative(2));
    closeTo(totalDistance, 8);
  });

  it("checks integration techniques, Taylor error, and series accumulation", () => {
    closeTo(Math.log(2), 0.6931471805599453);
    closeTo(0.25, 0.5 * Math.log(2) - 0.5 * (-0.5 + Math.log(2)));
    closeTo(Math.log(3 / 2), Math.log(3) - Math.log(4) + Math.log(2));
    closeTo(2 / 3, 1 - 1 / 3);

    const logarithmTaylorThree = 0.1 - 0.1 ** 2 / 2 + 0.1 ** 3 / 3;
    const logarithmTaylorError = logarithmTaylorThree - Math.log(1.1);
    expect(logarithmTaylorError).toBeGreaterThan(0);
    expect(logarithmTaylorError).toBeLessThanOrEqual(0.25 * 0.1 ** 4);

    const arctangentPartial = 0.5 - 0.5 ** 3 / 3 + 0.5 ** 5 / 5 - 0.5 ** 7 / 7;
    expect(Math.abs(Math.atan(0.5) - arctangentPartial)).toBeLessThanOrEqual(0.5 ** 9 / 9);

    const telescopingSum = (limit: number): number =>
      Array.from({ length: limit }, (_, index) => {
        const n = index + 1;
        return 1 / (n * (n + 3));
      }).reduce((sum, term) => sum + term, 0);
    closeTo(telescopingSum(100_000), 11 / 18, 1e-5);
  });
});
