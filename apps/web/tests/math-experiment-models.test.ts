import type { Matrix2, Vector2 } from "@one-forth/math-core";
import { describe, expect, it } from "vitest";
import {
  applyMatrix2,
  classifyQuadraticDescentStability,
  determinantMatrix2,
  directionalDerivativeSnapshot,
  experimentQuadraticGradient,
  experimentQuadraticLoss,
  gradientSurfaceModels,
  interpolateFromIdentity,
  isProjectionMatrix2,
  linearTransformSnapshot,
  matrixRank2,
  multiplyMatrix2,
  normalizedDirection,
  ordinaryDescentClosedForm,
  quadraticEigenvalues,
  quadraticHessian,
  runExperimentQuadraticDescent,
  smallBackprop,
  transformedOrientedArea,
  validateBackpropWithFiniteDifferences,
} from "../features/visualizations/science/math-experiment-models";

function expectVectorClose(actual: Vector2, expected: Vector2, digits = 10): void {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
}

describe("linear transformation scientific model", () => {
  const vector = { x: 2, y: -3 };
  const cases: readonly {
    readonly name: string;
    readonly matrix: Matrix2;
    readonly expected: Vector2;
    readonly determinant: number;
    readonly rank: 0 | 1 | 2;
  }[] = [
    {
      name: "identity",
      matrix: [1, 0, 0, 1],
      expected: vector,
      determinant: 1,
      rank: 2,
    },
    {
      name: "rotation",
      matrix: [0, -1, 1, 0],
      expected: { x: 3, y: 2 },
      determinant: 1,
      rank: 2,
    },
    {
      name: "scale",
      matrix: [2, 0, 0, 0.5],
      expected: { x: 4, y: -1.5 },
      determinant: 1,
      rank: 2,
    },
    {
      name: "shear",
      matrix: [1, 1.5, 0, 1],
      expected: { x: -2.5, y: -3 },
      determinant: 1,
      rank: 2,
    },
    {
      name: "reflection",
      matrix: [-1, 0, 0, 1],
      expected: { x: -2, y: -3 },
      determinant: -1,
      rank: 2,
    },
    {
      name: "rank-one",
      matrix: [1, 2, 2, 4],
      expected: { x: -4, y: -8 },
      determinant: 0,
      rank: 1,
    },
    {
      name: "zero",
      matrix: [0, 0, 0, 0],
      expected: { x: 0, y: 0 },
      determinant: 0,
      rank: 0,
    },
  ];

  for (const testCase of cases) {
    it(`computes the ${testCase.name} map`, () => {
      expectVectorClose(applyMatrix2(testCase.matrix, vector), testCase.expected);
      expect(determinantMatrix2(testCase.matrix)).toBeCloseTo(testCase.determinant, 12);
      expect(matrixRank2(testCase.matrix)).toBe(testCase.rank);
    });
  }

  it("preserves the determinant as the signed unit-square area scale", () => {
    const matrix: Matrix2 = [1.2, -0.4, 0.7, 1.5];
    const signedArea = transformedOrientedArea(matrix, { x: 1, y: 0 }, { x: 0, y: 1 });
    expect(signedArea).toBeCloseTo(determinantMatrix2(matrix), 12);
    const snapshot = linearTransformSnapshot(matrix, 1);
    expect(snapshot.orientedAreaScale).toBeCloseTo(snapshot.determinant, 12);
    expect(snapshot.areaScale).toBeCloseTo(Math.abs(snapshot.determinant), 12);
  });

  it("identifies a rank-one orthogonal projection and verifies idempotence", () => {
    const projection: Matrix2 = [1, 0, 0, 0];
    expect(multiplyMatrix2(projection, projection)).toEqual(projection);
    expect(isProjectionMatrix2(projection)).toBe(true);
    expectVectorClose(applyMatrix2(projection, { x: 2, y: -3 }), { x: 2, y: 0 });
    const snapshot = linearTransformSnapshot(projection, 1);
    expect(snapshot.targetIsProjection).toBe(true);
    expect(snapshot.singular).toBe(true);
    expect(snapshot.rank).toBe(1);
  });

  it("interpolates from identity with exact boundaries and clamped progress", () => {
    const target: Matrix2 = [-1, 2, 0.5, 3];
    expect(interpolateFromIdentity(target, -0.2)).toEqual([1, 0, 0, 1]);
    expect(interpolateFromIdentity(target, 1.2)).toEqual(target);
    expect(interpolateFromIdentity(target, 0.5)).toEqual([0, 1, 0.25, 2]);
    expect(linearTransformSnapshot([-1, 0, 0, 1], 0.5).singular).toBe(true);
  });
});

describe("gradient and directional-derivative scientific model", () => {
  it("normalizes arbitrary nonzero directions", () => {
    const direction = normalizedDirection({ x: 3, y: 4 });
    expectVectorClose(direction, { x: 0.6, y: 0.8 });
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 12);
    expect(() => normalizedDirection({ x: 0, y: 0 })).toThrow(/零向量/);
  });

  for (const surfaceId of ["bowl", "saddle", "coupled"] as const) {
    it(`matches the ${surfaceId} analytic dot product with a central difference`, () => {
      const snapshot = directionalDerivativeSnapshot(
        surfaceId,
        { x: 1.3, y: -0.8 },
        { x: 3, y: 4 },
      );
      expect(Math.hypot(snapshot.unitDirection.x, snapshot.unitDirection.y)).toBeCloseTo(1, 12);
      expect(snapshot.analyticDerivative).toBeCloseTo(
        snapshot.gradient.x * snapshot.unitDirection.x +
          snapshot.gradient.y * snapshot.unitDirection.y,
        12,
      );
      expect(snapshot.centralDifferenceDerivative).toBeCloseTo(snapshot.analyticDerivative, 9);
      expect(snapshot.relativeError).toBeLessThan(1e-9);
      expect(gradientSurfaceModels[surfaceId].value(0, 0)).toBe(0);
    });
  }
});

describe("quadratic gradient-descent scientific model", () => {
  it("uses one consistent positive-definite quadratic for loss and gradient", () => {
    const point = { x: -1.4, y: 0.9 };
    const epsilon = 1e-6;
    const gradient = experimentQuadraticGradient(point);
    const finiteX =
      (experimentQuadraticLoss({ x: point.x + epsilon, y: point.y }) -
        experimentQuadraticLoss({ x: point.x - epsilon, y: point.y })) /
      (2 * epsilon);
    const finiteY =
      (experimentQuadraticLoss({ x: point.x, y: point.y + epsilon }) -
        experimentQuadraticLoss({ x: point.x, y: point.y - epsilon })) /
      (2 * epsilon);
    expect(gradient.x).toBeCloseTo(finiteX, 8);
    expect(gradient.y).toBeCloseTo(finiteY, 8);
    const eigenvalues = quadraticEigenvalues();
    expect(eigenvalues.minimum).toBeGreaterThan(0);
    expect(eigenvalues.maximum).toBeGreaterThan(eigenvalues.minimum);
    expect(determinantMatrix2(quadraticHessian)).toBeGreaterThan(0);
  });

  it("matches the exact matrix-power baseline without momentum", () => {
    const initialPoint = { x: -4, y: 2.8 };
    const steps = runExperimentQuadraticDescent({
      learningRate: 0.22,
      momentum: 0,
      iterations: 20,
      initialPoint,
    });
    for (const step of steps) {
      expectVectorClose(step.point, ordinaryDescentClosedForm(initialPoint, 0.22, step.index), 10);
      expect(step.loss).toBeCloseTo(experimentQuadraticLoss(step.point), 12);
      expectVectorClose(step.gradient, experimentQuadraticGradient(step.point), 12);
    }
  });

  it("classifies stable, critical, and unstable rates analytically", () => {
    const noMomentumCritical = 2 / quadraticEigenvalues().maximum;
    expect(classifyQuadraticDescentStability(noMomentumCritical * 0.5, 0).classification).toBe(
      "stable",
    );
    expect(classifyQuadraticDescentStability(noMomentumCritical, 0).classification).toBe(
      "critical",
    );
    expect(classifyQuadraticDescentStability(noMomentumCritical * 1.01, 0).classification).toBe(
      "unstable",
    );

    const momentumCritical = (2 * (1 + 0.8)) / quadraticEigenvalues().maximum;
    expect(classifyQuadraticDescentStability(momentumCritical * 0.9, 0.8).classification).toBe(
      "stable",
    );
    expect(classifyQuadraticDescentStability(momentumCritical, 0.8).classification).toBe(
      "critical",
    );
    expect(classifyQuadraticDescentStability(momentumCritical * 1.1, 0.8).classification).toBe(
      "unstable",
    );
  });

  it("shows the critical and unstable behavior in the maximum-curvature eigendirection", () => {
    const maximumEigenvalue = quadraticEigenvalues().maximum;
    const rawEigenvector = {
      x: quadraticHessian[1],
      y: maximumEigenvalue - quadraticHessian[0],
    };
    const initialPoint = normalizedDirection(rawEigenvector);
    const criticalSteps = runExperimentQuadraticDescent({
      learningRate: 2 / maximumEigenvalue,
      momentum: 0,
      iterations: 6,
      initialPoint,
    });
    expect(criticalSteps.at(-1)?.loss).toBeCloseTo(criticalSteps[0]?.loss ?? 0, 10);
    const unstableSteps = runExperimentQuadraticDescent({
      learningRate: 2.04 / maximumEigenvalue,
      momentum: 0,
      iterations: 6,
      initialPoint,
    });
    expect(unstableSteps.at(-1)?.loss ?? 0).toBeGreaterThan(unstableSteps[0]?.loss ?? Infinity);
  });

  it("replays a momentum trajectory deterministically from a fixed initial state", () => {
    const options = {
      learningRate: 0.18,
      momentum: 0.8,
      iterations: 30,
      initialPoint: { x: -3, y: 2.4 },
    } as const;
    const first = runExperimentQuadraticDescent(options);
    const second = runExperimentQuadraticDescent(options);
    expect(first).toEqual(second);
    expect(first).toHaveLength(31);
    expect(first[0]?.velocity).toEqual({ x: 0, y: 0 });
    expect(first.at(-1)?.loss ?? Infinity).toBeLessThan(first[0]?.loss ?? 0);
  });
});

describe("small backpropagation graph", () => {
  const input = {
    x: 1.2,
    weight: -0.4,
    bias: 0.1,
    target: 0.7,
    activation: "tanh" as const,
    l2: 0.15,
  };

  it("exposes forward values, local derivatives, upstream gradients, and branch accumulation", () => {
    const result = smallBackprop(input);
    expect(result.loss).toBeCloseTo(result.dataLoss + result.regularizationLoss, 12);
    expect(result.preActivationUpstreamGradient).toBeCloseTo(
      result.outputUpstreamGradient * result.localActivationDerivative,
      12,
    );
    expect(result.weightDataGradient).toBeCloseTo(
      result.preActivationUpstreamGradient * result.localPreActivationWeightDerivative,
      12,
    );
    expect(result.weightGradient).toBeCloseTo(
      result.weightDataGradient + result.weightRegularizationGradient,
      12,
    );
    expect(result.biasGradient).toBeCloseTo(
      result.preActivationUpstreamGradient * result.localPreActivationBiasDerivative,
      12,
    );
    expect(result.inputGradient).toBeCloseTo(
      result.preActivationUpstreamGradient * result.localPreActivationInputDerivative,
      12,
    );
  });

  it("matches finite differences across smooth parameter sets", () => {
    const parameterSets = [
      input,
      { ...input, x: -0.8, weight: 0.7, bias: 0.2, activation: "sigmoid" as const, l2: 0 },
      { ...input, x: 1.1, weight: 0.9, bias: 0.4, activation: "relu" as const, l2: 0.3 },
      { ...input, x: -1.1, weight: 0.9, bias: -0.4, activation: "relu" as const, l2: 0.3 },
    ];
    for (const parameters of parameterSets) {
      const validation = validateBackpropWithFiniteDifferences(parameters);
      expect(validation.validAtPoint).toBe(true);
      expect(validation.maximumRelativeError ?? Infinity).toBeLessThan(1e-8);
      expect(validation.checks).toHaveLength(3);
    }
  });

  it("does not present a finite-difference check as valid at the ReLU kink", () => {
    const validation = validateBackpropWithFiniteDifferences({
      x: 1,
      weight: 0,
      bias: 0,
      target: 1,
      activation: "relu",
      l2: 0,
    });
    expect(validation.validAtPoint).toBe(false);
    expect(validation.maximumRelativeError).toBeNull();
  });
});
