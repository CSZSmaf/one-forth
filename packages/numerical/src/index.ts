import type { Vector2 } from "@one-forth/math-core";

export interface GradientDescentOptions {
  readonly learningRate: number;
  readonly momentum: number;
  readonly iterations: number;
  readonly initialPoint: Vector2;
}

export interface OptimizationStep {
  readonly index: number;
  readonly point: Vector2;
  readonly gradient: Vector2;
  readonly loss: number;
}

export function quadraticLoss(point: Vector2): number {
  return 0.4 * point.x * point.x + 1.25 * point.y * point.y + 0.25 * point.x * point.y;
}

export function quadraticGradient(point: Vector2): Vector2 {
  return { x: 0.8 * point.x + 0.25 * point.y, y: 2.5 * point.y + 0.25 * point.x };
}

export function runGradientDescent(options: GradientDescentOptions): readonly OptimizationStep[] {
  const steps: OptimizationStep[] = [];
  let point = { ...options.initialPoint };
  let velocity: Vector2 = { x: 0, y: 0 };

  for (let index = 0; index <= options.iterations; index += 1) {
    const gradient = quadraticGradient(point);
    steps.push({ index, point, gradient, loss: quadraticLoss(point) });
    velocity = {
      x: options.momentum * velocity.x - options.learningRate * gradient.x,
      y: options.momentum * velocity.y - options.learningRate * gradient.y,
    };
    point = { x: point.x + velocity.x, y: point.y + velocity.y };
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) break;
  }
  return steps;
}

export type ActivationName = "tanh" | "sigmoid" | "relu";

export function activate(value: number, name: ActivationName): number {
  if (name === "relu") return Math.max(0, value);
  if (name === "sigmoid") return 1 / (1 + Math.exp(-value));
  return Math.tanh(value);
}

export function activationDerivative(value: number, name: ActivationName): number {
  if (name === "relu") return value > 0 ? 1 : 0;
  if (name === "sigmoid") {
    const output = activate(value, name);
    return output * (1 - output);
  }
  const output = Math.tanh(value);
  return 1 - output * output;
}

export interface ScalarBackpropInput {
  readonly x: number;
  readonly weight: number;
  readonly bias: number;
  readonly target: number;
  readonly activation: ActivationName;
}

export interface ScalarBackpropResult {
  readonly preActivation: number;
  readonly output: number;
  readonly loss: number;
  readonly localActivationDerivative: number;
  readonly outputGradient: number;
  readonly weightGradient: number;
  readonly biasGradient: number;
  readonly inputGradient: number;
}

export function scalarBackprop(input: ScalarBackpropInput): ScalarBackpropResult {
  const preActivation = input.x * input.weight + input.bias;
  const output = activate(preActivation, input.activation);
  const loss = 0.5 * (output - input.target) ** 2;
  const outputGradient = output - input.target;
  const localActivationDerivative = activationDerivative(preActivation, input.activation);
  const preActivationGradient = outputGradient * localActivationDerivative;
  return {
    preActivation,
    output,
    loss,
    localActivationDerivative,
    outputGradient,
    weightGradient: preActivationGradient * input.x,
    biasGradient: preActivationGradient,
    inputGradient: preActivationGradient * input.weight,
  };
}
