import type { Matrix2, Vector2 } from "@one-forth/math-core";
import { activate, activationDerivative } from "@one-forth/numerical";
import type { ActivationName } from "@one-forth/numerical";

const identityMatrix: Matrix2 = [1, 0, 0, 1];
const numericalTolerance = 1e-10;

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} 必须是有限数。`);
  }
}

function assertFiniteVector(vector: Vector2, name: string): void {
  assertFinite(vector.x, `${name}.x`);
  assertFinite(vector.y, `${name}.y`);
}

export function applyMatrix2(matrix: Matrix2, vector: Vector2): Vector2 {
  return {
    x: matrix[0] * vector.x + matrix[1] * vector.y,
    y: matrix[2] * vector.x + matrix[3] * vector.y,
  };
}

export function multiplyMatrix2(left: Matrix2, right: Matrix2): Matrix2 {
  return [
    left[0] * right[0] + left[1] * right[2],
    left[0] * right[1] + left[1] * right[3],
    left[2] * right[0] + left[3] * right[2],
    left[2] * right[1] + left[3] * right[3],
  ];
}

export function determinantMatrix2(matrix: Matrix2): number {
  return matrix[0] * matrix[3] - matrix[1] * matrix[2];
}

export function interpolateFromIdentity(target: Matrix2, progress: number): Matrix2 {
  assertFinite(progress, "progress");
  const t = Math.min(1, Math.max(0, progress));
  return [1 + (target[0] - 1) * t, target[1] * t, target[2] * t, 1 + (target[3] - 1) * t];
}

export function matrixRank2(matrix: Matrix2, tolerance = numericalTolerance): 0 | 1 | 2 {
  const scale = Math.max(...matrix.map(Math.abs));
  if (scale <= tolerance) return 0;
  return Math.abs(determinantMatrix2(matrix)) <= tolerance * scale * scale ? 1 : 2;
}

export function isProjectionMatrix2(matrix: Matrix2, tolerance = numericalTolerance): boolean {
  const squared = multiplyMatrix2(matrix, matrix);
  return (
    Math.abs(squared[0] - matrix[0]) <= tolerance &&
    Math.abs(squared[1] - matrix[1]) <= tolerance &&
    Math.abs(squared[2] - matrix[2]) <= tolerance &&
    Math.abs(squared[3] - matrix[3]) <= tolerance
  );
}

function orientedArea(first: Vector2, second: Vector2): number {
  return first.x * second.y - first.y * second.x;
}

export function transformedOrientedArea(matrix: Matrix2, first: Vector2, second: Vector2): number {
  return orientedArea(applyMatrix2(matrix, first), applyMatrix2(matrix, second));
}

export interface LinearTransformSnapshot {
  readonly matrix: Matrix2;
  readonly firstBasis: Vector2;
  readonly secondBasis: Vector2;
  readonly determinant: number;
  readonly orientedAreaScale: number;
  readonly areaScale: number;
  readonly rank: 0 | 1 | 2;
  readonly singular: boolean;
  readonly targetIsProjection: boolean;
}

export function linearTransformSnapshot(
  target: Matrix2,
  progress: number,
): LinearTransformSnapshot {
  const matrix = interpolateFromIdentity(target, progress);
  const determinant = determinantMatrix2(matrix);
  const rank = matrixRank2(matrix);
  return {
    matrix,
    firstBasis: applyMatrix2(matrix, { x: 1, y: 0 }),
    secondBasis: applyMatrix2(matrix, { x: 0, y: 1 }),
    determinant,
    orientedAreaScale: transformedOrientedArea(matrix, { x: 1, y: 0 }, { x: 0, y: 1 }),
    areaScale: Math.abs(determinant),
    rank,
    singular: rank < 2,
    targetIsProjection: isProjectionMatrix2(target),
  };
}

export type GradientSurfaceId = "bowl" | "saddle" | "coupled";

export interface GradientSurfaceModel {
  readonly formula: string;
  readonly value: (x: number, y: number) => number;
  readonly gradient: (x: number, y: number) => Vector2;
}

export const gradientSurfaceModels: Readonly<Record<GradientSurfaceId, GradientSurfaceModel>> = {
  bowl: {
    formula: "f(x,y)=0.5x²+0.35y²",
    value: (x, y) => 0.5 * x * x + 0.35 * y * y,
    gradient: (x, y) => ({ x, y: 0.7 * y }),
  },
  saddle: {
    formula: "f(x,y)=0.5x²−0.5y²",
    value: (x, y) => 0.5 * x * x - 0.5 * y * y,
    gradient: (x, y) => ({ x, y: -y }),
  },
  coupled: {
    formula: "f(x,y)=0.45x²+0.75y²+0.35xy",
    value: (x, y) => 0.45 * x * x + 0.75 * y * y + 0.35 * x * y,
    gradient: (x, y) => ({ x: 0.9 * x + 0.35 * y, y: 1.5 * y + 0.35 * x }),
  },
};

export function normalizedDirection(direction: Vector2): Vector2 {
  assertFiniteVector(direction, "direction");
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude <= numericalTolerance) {
    throw new Error("方向向量不能是零向量。");
  }
  return { x: direction.x / magnitude, y: direction.y / magnitude };
}

export interface DirectionalDerivativeSnapshot {
  readonly point: Vector2;
  readonly gradient: Vector2;
  readonly unitDirection: Vector2;
  readonly analyticDerivative: number;
  readonly centralDifferenceDerivative: number;
  readonly absoluteError: number;
  readonly relativeError: number;
  readonly differenceStep: number;
}

export function directionalDerivativeSnapshot(
  surfaceId: GradientSurfaceId,
  point: Vector2,
  direction: Vector2,
  requestedStep?: number,
): DirectionalDerivativeSnapshot {
  assertFiniteVector(point, "point");
  const surface = gradientSurfaceModels[surfaceId];
  const unitDirection = normalizedDirection(direction);
  const gradient = surface.gradient(point.x, point.y);
  const analyticDerivative = gradient.x * unitDirection.x + gradient.y * unitDirection.y;
  const differenceStep = requestedStep ?? 1e-5 * Math.max(1, Math.abs(point.x), Math.abs(point.y));
  assertFinite(differenceStep, "differenceStep");
  if (differenceStep <= 0) throw new Error("differenceStep 必须大于零。");
  const plus = surface.value(
    point.x + differenceStep * unitDirection.x,
    point.y + differenceStep * unitDirection.y,
  );
  const minus = surface.value(
    point.x - differenceStep * unitDirection.x,
    point.y - differenceStep * unitDirection.y,
  );
  const centralDifferenceDerivative = (plus - minus) / (2 * differenceStep);
  const absoluteError = Math.abs(analyticDerivative - centralDifferenceDerivative);
  const relativeError =
    absoluteError /
    Math.max(1e-12, Math.abs(analyticDerivative) + Math.abs(centralDifferenceDerivative));
  return {
    point,
    gradient,
    unitDirection,
    analyticDerivative,
    centralDifferenceDerivative,
    absoluteError,
    relativeError,
    differenceStep,
  };
}

export const quadraticHessian: Matrix2 = [0.8, 0.25, 0.25, 2.5];

export function experimentQuadraticLoss(point: Vector2): number {
  const hessianTimesPoint = applyMatrix2(quadraticHessian, point);
  return 0.5 * (point.x * hessianTimesPoint.x + point.y * hessianTimesPoint.y);
}

export function experimentQuadraticGradient(point: Vector2): Vector2 {
  return applyMatrix2(quadraticHessian, point);
}

export interface QuadraticEigenvalues {
  readonly minimum: number;
  readonly maximum: number;
}

export function quadraticEigenvalues(): QuadraticEigenvalues {
  const [a, b, , d] = quadraticHessian;
  const halfTrace = (a + d) / 2;
  const radius = Math.hypot((a - d) / 2, b);
  return { minimum: halfTrace - radius, maximum: halfTrace + radius };
}

export type DescentStability = "stable" | "critical" | "unstable";

export interface DescentStabilitySnapshot {
  readonly classification: DescentStability;
  readonly criticalLearningRate: number;
  readonly maximumHessianEigenvalue: number;
}

export function classifyQuadraticDescentStability(
  learningRate: number,
  momentum: number,
): DescentStabilitySnapshot {
  assertFinite(learningRate, "learningRate");
  assertFinite(momentum, "momentum");
  if (learningRate <= 0) throw new Error("learningRate 必须大于零。");
  if (momentum < 0 || momentum >= 1) throw new Error("momentum 必须位于 [0, 1) 区间。");
  const maximumEigenvalue = quadraticEigenvalues().maximum;
  const criticalLearningRate = (2 * (1 + momentum)) / maximumEigenvalue;
  const ratio = learningRate / criticalLearningRate;
  const classification =
    Math.abs(ratio - 1) <= 1e-9 ? "critical" : ratio < 1 ? "stable" : "unstable";
  return {
    classification,
    criticalLearningRate,
    maximumHessianEigenvalue: maximumEigenvalue,
  };
}

export interface QuadraticDescentOptions {
  readonly learningRate: number;
  readonly momentum: number;
  readonly iterations: number;
  readonly initialPoint: Vector2;
}

export interface QuadraticDescentStep {
  readonly index: number;
  readonly point: Vector2;
  readonly velocity: Vector2;
  readonly gradient: Vector2;
  readonly loss: number;
}

export function runExperimentQuadraticDescent(
  options: QuadraticDescentOptions,
): readonly QuadraticDescentStep[] {
  classifyQuadraticDescentStability(options.learningRate, options.momentum);
  if (!Number.isInteger(options.iterations) || options.iterations < 0) {
    throw new Error("iterations 必须是非负整数。");
  }
  assertFiniteVector(options.initialPoint, "initialPoint");
  const steps: QuadraticDescentStep[] = [];
  let point = { ...options.initialPoint };
  let velocity: Vector2 = { x: 0, y: 0 };
  for (let index = 0; index <= options.iterations; index += 1) {
    const gradient = experimentQuadraticGradient(point);
    const loss = experimentQuadraticLoss(point);
    if (![gradient.x, gradient.y, loss].every(Number.isFinite)) {
      throw new Error(`梯度下降在第 ${index} 步产生了非有限值。`);
    }
    steps.push({ index, point, velocity, gradient, loss });
    if (index === options.iterations) break;
    velocity = {
      x: options.momentum * velocity.x - options.learningRate * gradient.x,
      y: options.momentum * velocity.y - options.learningRate * gradient.y,
    };
    point = { x: point.x + velocity.x, y: point.y + velocity.y };
  }
  return steps;
}

export function ordinaryDescentClosedForm(
  initialPoint: Vector2,
  learningRate: number,
  iteration: number,
): Vector2 {
  assertFiniteVector(initialPoint, "initialPoint");
  assertFinite(learningRate, "learningRate");
  if (!Number.isInteger(iteration) || iteration < 0) {
    throw new Error("iteration 必须是非负整数。");
  }
  const update: Matrix2 = [
    1 - learningRate * quadraticHessian[0],
    -learningRate * quadraticHessian[1],
    -learningRate * quadraticHessian[2],
    1 - learningRate * quadraticHessian[3],
  ];
  let power = identityMatrix;
  let factor = update;
  let exponent = iteration;
  while (exponent > 0) {
    if (exponent % 2 === 1) power = multiplyMatrix2(power, factor);
    factor = multiplyMatrix2(factor, factor);
    exponent = Math.floor(exponent / 2);
  }
  return applyMatrix2(power, initialPoint);
}

export interface SmallBackpropInput {
  readonly x: number;
  readonly weight: number;
  readonly bias: number;
  readonly target: number;
  readonly activation: ActivationName;
  readonly l2: number;
}

export interface SmallBackpropResult {
  readonly preActivation: number;
  readonly output: number;
  readonly dataLoss: number;
  readonly regularizationLoss: number;
  readonly loss: number;
  readonly outputUpstreamGradient: number;
  readonly localActivationDerivative: number;
  readonly preActivationUpstreamGradient: number;
  readonly localPreActivationWeightDerivative: number;
  readonly localPreActivationBiasDerivative: number;
  readonly localPreActivationInputDerivative: number;
  readonly weightDataGradient: number;
  readonly weightRegularizationGradient: number;
  readonly weightGradient: number;
  readonly biasGradient: number;
  readonly inputGradient: number;
  readonly differentiable: boolean;
}

function validateBackpropInput(input: SmallBackpropInput): void {
  assertFinite(input.x, "x");
  assertFinite(input.weight, "weight");
  assertFinite(input.bias, "bias");
  assertFinite(input.target, "target");
  assertFinite(input.l2, "l2");
  if (input.l2 < 0) throw new Error("l2 不能小于零。");
}

export function smallBackprop(input: SmallBackpropInput): SmallBackpropResult {
  validateBackpropInput(input);
  const preActivation = input.x * input.weight + input.bias;
  const output = activate(preActivation, input.activation);
  const dataLoss = 0.5 * (output - input.target) ** 2;
  const regularizationLoss = 0.5 * input.l2 * input.weight * input.weight;
  const outputUpstreamGradient = output - input.target;
  const localActivationDerivative = activationDerivative(preActivation, input.activation);
  const preActivationUpstreamGradient = outputUpstreamGradient * localActivationDerivative;
  const weightDataGradient = preActivationUpstreamGradient * input.x;
  const weightRegularizationGradient = input.l2 * input.weight;
  return {
    preActivation,
    output,
    dataLoss,
    regularizationLoss,
    loss: dataLoss + regularizationLoss,
    outputUpstreamGradient,
    localActivationDerivative,
    preActivationUpstreamGradient,
    localPreActivationWeightDerivative: input.x,
    localPreActivationBiasDerivative: 1,
    localPreActivationInputDerivative: input.weight,
    weightDataGradient,
    weightRegularizationGradient,
    weightGradient: weightDataGradient + weightRegularizationGradient,
    biasGradient: preActivationUpstreamGradient,
    inputGradient: preActivationUpstreamGradient * input.weight,
    differentiable: input.activation !== "relu" || Math.abs(preActivation) > 1e-8,
  };
}

export type BackpropCheckedParameter = "x" | "weight" | "bias";

export interface BackpropFiniteDifferenceCheck {
  readonly parameter: BackpropCheckedParameter;
  readonly analytic: number;
  readonly numerical: number;
  readonly relativeError: number;
}

export interface BackpropValidation {
  readonly validAtPoint: boolean;
  readonly checks: readonly BackpropFiniteDifferenceCheck[];
  readonly maximumRelativeError: number | null;
}

export function validateBackpropWithFiniteDifferences(
  input: SmallBackpropInput,
): BackpropValidation {
  const analytic = smallBackprop(input);
  const parameters: readonly BackpropCheckedParameter[] = ["x", "weight", "bias"];
  const analyticGradients: Readonly<Record<BackpropCheckedParameter, number>> = {
    x: analytic.inputGradient,
    weight: analytic.weightGradient,
    bias: analytic.biasGradient,
  };
  let finiteDifferenceStencilIsSmooth = analytic.differentiable;
  const checks = parameters.map((parameter): BackpropFiniteDifferenceCheck => {
    const value = input[parameter];
    const epsilon = 1e-5 * Math.max(1, Math.abs(value));
    const plusInput = { ...input, [parameter]: value + epsilon };
    const minusInput = { ...input, [parameter]: value - epsilon };
    const plusResult = smallBackprop(plusInput);
    const minusResult = smallBackprop(minusInput);
    if (input.activation === "relu" && plusResult.preActivation * minusResult.preActivation <= 0) {
      finiteDifferenceStencilIsSmooth = false;
    }
    const plus = plusResult.loss;
    const minus = minusResult.loss;
    const numerical = (plus - minus) / (2 * epsilon);
    const analyticValue = analyticGradients[parameter];
    return {
      parameter,
      analytic: analyticValue,
      numerical,
      relativeError:
        Math.abs(analyticValue - numerical) /
        Math.max(1e-12, Math.abs(analyticValue) + Math.abs(numerical)),
    };
  });
  return {
    validAtPoint: finiteDifferenceStencilIsSmooth,
    checks,
    maximumRelativeError: finiteDifferenceStencilIsSmooth
      ? Math.max(...checks.map((check) => check.relativeError))
      : null,
  };
}

export function repeatedLocalDerivativeProduct(localDerivative: number, depth: number): number {
  assertFinite(localDerivative, "localDerivative");
  if (!Number.isInteger(depth) || depth < 1) throw new Error("depth 必须是正整数。");
  return Math.abs(localDerivative) ** depth;
}
