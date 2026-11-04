import { describe, expect, it } from "vitest";

const closeTo = (actual: number, expected: number, tolerance = 1e-10): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

const periodicMidpointIntegral = (fn: (theta: number) => number, steps = 20_000): number => {
  const width = (2 * Math.PI) / steps;
  return Array.from({ length: steps }, (_, index) => fn((index + 0.5) * width)).reduce(
    (sum, value) => sum + value * width,
    0,
  );
};

describe("M03 worked-example calculations", () => {
  it("checks path-dependent limits and a norm-controlled continuous extension", () => {
    const pathCounterexample = (x: number, y: number): number => (x * x * y) / (x ** 4 + y * y);
    for (const t of [1e-1, 1e-2, 1e-3]) {
      closeTo(pathCounterexample(t, 0), 0);
      closeTo(pathCounterexample(t, t * t), 1 / 2);
    }

    const controlled = (x: number, y: number): number => {
      if (x === 0 && y === 0) return 0;
      return (x * y) / Math.hypot(x, y);
    };
    for (const [x, y] of [
      [0.1, -0.2],
      [0.003, 0.004],
      [-1e-5, 2e-5],
    ] as const) {
      expect(Math.abs(controlled(x, y))).toBeLessThanOrEqual(Math.hypot(x, y) / 2);
    }
  });

  it("checks gradients, directional derivatives, Hessian classification, and chain-rule shape", () => {
    const gradientAtPoint = [2 * 1 + -1, 1 + 4 * -1] as const;
    expect(gradientAtPoint).toEqual([1, -3]);
    closeTo(gradientAtPoint[0] * (3 / 5) + gradientAtPoint[1] * (4 / 5), -9 / 5);
    closeTo(Math.hypot(...gradientAtPoint), Math.sqrt(10));

    const hessian = [
      [2, 1],
      [1, 4],
    ] as const;
    expect(hessian[0][0]).toBeGreaterThan(0);
    expect(hessian[0][0] * hessian[1][1] - hessian[0][1] * hessian[1][0]).toBe(7);

    const x = 1;
    const y = 2;
    const intermediate = [x + y, x * y] as const;
    const outerGradient = [2 * intermediate[0], 3] as const;
    const jacobian = [
      [1, 1],
      [y, x],
    ] as const;
    const composedGradient = [
      jacobian[0][0] * outerGradient[0] + jacobian[1][0] * outerGradient[1],
      jacobian[0][1] * outerGradient[0] + jacobian[1][1] * outerGradient[1],
    ];
    expect(composedGradient).toEqual([12, 9]);
  });

  it("checks iterated integrals, polar Jacobians, and spherical volume factors", () => {
    closeTo(
      Array.from({ length: 200_000 }, (_, index) => {
        const x = (index + 0.5) / 200_000;
        return (1 + x - 2 * x * x) / 200_000;
      }).reduce((sum, value) => sum + value, 0),
      5 / 6,
      1e-10,
    );

    const diskMoment = 2 * Math.PI * (2 ** 4 / 4);
    closeTo(diskMoment, 8 * Math.PI);

    const radius = 3;
    const sphericalVolume =
      (radius ** 3 / 3) *
      periodicMidpointIntegral(() => 1) *
      2; /* integral of sin(phi) from 0 to pi */
    closeTo(sphericalVolume, (4 * Math.PI * radius ** 3) / 3, 1e-8);
  });

  it("checks the authored helix, work, surface-area, and oriented-flux examples", () => {
    const helixRadius = 2;
    const helixRisePerRadian = 1;
    closeTo(
      periodicMidpointIntegral(() => Math.hypot(helixRadius, helixRisePerRadian)),
      2 * Math.PI * Math.sqrt(5),
      1e-8,
    );

    closeTo(
      Array.from({ length: 200_000 }, (_, index) => {
        const t = (index + 0.5) / 200_000;
        return (4 * t + 10 * t) / 200_000;
      }).reduce((sum, value) => sum + value, 0),
      7,
      1e-10,
    );

    const paraboloidScale = 2;
    const radialSteps = 200_000;
    const paraboloidArea =
      2 *
      Math.PI *
      Array.from({ length: radialSteps }, (_, index) => {
        const radius = ((index + 0.5) * paraboloidScale) / radialSteps;
        return (
          (Math.sqrt(1 + radius ** 2 / paraboloidScale ** 2) * radius * paraboloidScale) /
          radialSteps
        );
      }).reduce((sum, value) => sum + value, 0);
    closeTo(paraboloidArea, ((2 * Math.PI * paraboloidScale ** 2) / 3) * (2 * Math.sqrt(2) - 1));

    const radius = 2;
    closeTo(radius * 4 * Math.PI * radius ** 2, 4 * Math.PI * radius ** 3);
    closeTo(-radius * 4 * Math.PI * radius ** 2, -4 * Math.PI * radius ** 3);
  });

  it("cross-checks Green, Stokes, and Gauss while preserving singularity conditions", () => {
    const greenRadius = 2;
    const greenBoundary = periodicMidpointIntegral((theta) => {
      const x = greenRadius * Math.cos(theta);
      const y = greenRadius * Math.sin(theta);
      const dx = -greenRadius * Math.sin(theta);
      const dy = greenRadius * Math.cos(theta);
      return (-y / 2) * dx + (x / 2) * dy;
    });
    closeTo(greenBoundary, 4 * Math.PI, 1e-8);
    closeTo(Math.PI * greenRadius ** 2, greenBoundary, 1e-8);

    const angularVelocity = 2;
    const stokesRadius = 1.5;
    const stokesBoundary = periodicMidpointIntegral(
      () => (angularVelocity * stokesRadius ** 2) / 2,
    );
    closeTo(stokesBoundary, angularVelocity * Math.PI * stokesRadius ** 2, 1e-8);
    closeTo(stokesBoundary, 4.5 * Math.PI, 1e-8);

    const cylinderVolume = 2 * Math.PI;
    const divergenceIntegral = 3 * cylinderVolume;
    const directCylinderFlux = 4 * Math.PI + 2 * Math.PI;
    closeTo(divergenceIntegral, directCylinderFlux);

    const singularField = (x: number, y: number): readonly [number, number] => {
      const radiusSquared = x * x + y * y;
      if (radiusSquared === 0) throw new RangeError("The field is undefined at the origin.");
      return [-y / radiusSquared, x / radiusSquared];
    };
    expect(() => singularField(0, 0)).toThrow(RangeError);
    for (const [x, y] of [
      [1, 2],
      [-2, 0.5],
      [0.25, -0.75],
    ] as const) {
      const radiusFourth = (x * x + y * y) ** 2;
      const qx = (y * y - x * x) / radiusFourth;
      const py = (y * y - x * x) / radiusFourth;
      closeTo(qx - py, 0);
    }
    const singularCirculation = periodicMidpointIntegral((theta) => {
      const x = Math.cos(theta);
      const y = Math.sin(theta);
      const [p, q] = singularField(x, y);
      return p * -Math.sin(theta) + q * Math.cos(theta);
    });
    closeTo(singularCirculation, 2 * Math.PI, 1e-8);
    expect(singularCirculation).not.toBe(0);
  });

  it("checks the authored integrated review examples and linear change of variables", () => {
    const linearTemperatureChange = 0.8 * 0.2 + -0.4 * -0.1;
    const quadraticTemperatureChange = 0.02 * 0.2 ** 2 + 0.01 * 0.2 * -0.1 + 0.03 * (-0.1) ** 2;
    closeTo(linearTemperatureChange, 0.2);
    closeTo(quadraticTemperatureChange, 0.0009);
    closeTo(linearTemperatureChange + quadraticTemperatureChange, 0.2009);
    closeTo(0.04 * 0.06 - 0.01 ** 2, 0.0023);

    for (const [x, y, expected] of [
      [Math.sqrt(2), 1 / Math.sqrt(2), 1],
      [Math.sqrt(2), -1 / Math.sqrt(2), -1],
    ] as const) {
      closeTo(x * x + 4 * y * y, 4);
      closeTo(x * y, expected);
    }

    const diskUSecondMoment = periodicMidpointIntegral(
      (theta) => (Math.cos(theta) ** 2 * 1 ** 4) / 4,
    );
    const referenceDensity = 3;
    const laminaMass = 2 * referenceDensity * Math.PI;
    const laminaFirstMomentX = 4 * referenceDensity * diskUSecondMoment;
    closeTo(laminaMass, 6 * Math.PI, 1e-8);
    closeTo(laminaFirstMomentX / laminaMass, 0.5, 1e-8);

    const projectedStokesArea = 1 * 1;
    closeTo(4 * projectedStokesArea, 4);
    const ellipsoidVolume = (4 * Math.PI * 2 * 1 * 0.5) / 3;
    closeTo(3 * ellipsoidVolume, 4 * Math.PI);

    const determinant = 2 * -1 - 1 * 1;
    expect(determinant).toBe(-3);
    closeTo(Math.abs(determinant), 3);
  });
});
