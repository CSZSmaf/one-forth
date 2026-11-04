import { createSeededRandom } from "@one-forth/math-core";
import { activate, type ActivationName } from "@one-forth/numerical";

export type NeuralDatasetName = "xor" | "moons";

export interface NeuralDataPoint {
  readonly x: number;
  readonly y: number;
  readonly label: 0 | 1;
}

export interface NeuralNetworkSnapshot {
  readonly epoch: number;
  readonly inputWeights: readonly (readonly [number, number])[];
  readonly hiddenBiases: readonly number[];
  readonly outputWeights: readonly number[];
  readonly outputBias: number;
  readonly loss: number;
  readonly accuracy: number;
}

export interface NeuralTrainingOptions {
  readonly dataset: NeuralDatasetName;
  readonly hiddenWidth: number;
  readonly activation: ActivationName;
  readonly learningRate: number;
  readonly epochs: number;
  readonly seed: number;
  readonly shouldCancel?: () => boolean;
}

export type NeuralTrainingResult =
  | {
      readonly status: "completed" | "cancelled";
      readonly snapshots: readonly NeuralNetworkSnapshot[];
    }
  | {
      readonly status: "diverged";
      readonly snapshots: readonly NeuralNetworkSnapshot[];
      readonly reason: string;
    };

export type NeuralSnapshotHealth =
  | { readonly ok: true }
  | { readonly ok: false; readonly kind: "invalid" | "diverged"; readonly reason: string };

export interface NeuralEvaluation {
  readonly loss: number;
  readonly accuracy: number;
}

export const neuralDivergenceLimit = 1_000_000;

function requiredValue<T>(value: T | undefined, context: string): T {
  if (value === undefined) throw new Error(`Missing ${context}.`);
  return value;
}

function sigmoid(value: number): number {
  const bounded = Math.max(-30, Math.min(30, value));
  return 1 / (1 + Math.exp(-bounded));
}

function activationDerivative(value: number, name: ActivationName): number {
  if (name === "relu") return value > 0 ? 1 : 0;
  const output = activate(value, name);
  return name === "sigmoid" ? output * (1 - output) : 1 - output * output;
}

export function generateNeuralDataset(
  name: NeuralDatasetName,
  seed: number,
): readonly NeuralDataPoint[] {
  const random = createSeededRandom(seed);
  if (name === "xor") {
    return Array.from({ length: 80 }, (_, index) => {
      const right = index % 2 === 0;
      const top = Math.floor(index / 2) % 2 === 0;
      return {
        x: (right ? 1 : -1) + (random() - 0.5) * 0.9,
        y: (top ? 1 : -1) + (random() - 0.5) * 0.9,
        label: right === top ? 0 : 1,
      };
    });
  }

  return Array.from({ length: 90 }, (_, index) => {
    const upper = index < 45;
    const angle = ((index % 45) / 44) * Math.PI;
    const noiseX = (random() - 0.5) * 0.18;
    const noiseY = (random() - 0.5) * 0.18;
    return upper
      ? {
          x: Math.cos(angle) - 0.35 + noiseX,
          y: Math.sin(angle) - 0.25 + noiseY,
          label: 0,
        }
      : {
          x: 0.65 - Math.cos(angle) + noiseX,
          y: 0.35 - Math.sin(angle) + noiseY,
          label: 1,
        };
  });
}

function assertNeuralDimensions(snapshot: NeuralNetworkSnapshot): void {
  const hiddenWidth = snapshot.inputWeights.length;
  if (hiddenWidth === 0) throw new Error("The network must contain at least one hidden unit.");
  if (
    snapshot.hiddenBiases.length !== hiddenWidth ||
    snapshot.outputWeights.length !== hiddenWidth ||
    snapshot.inputWeights.some((row) => row.length !== 2)
  ) {
    throw new Error("Network snapshot dimensions are inconsistent.");
  }
}

export function predictNeuralProbability(
  snapshot: NeuralNetworkSnapshot,
  x: number,
  y: number,
  activation: ActivationName,
): number {
  assertNeuralDimensions(snapshot);
  const hidden = snapshot.inputWeights.map((weights, index) =>
    activate(
      weights[0] * x +
        weights[1] * y +
        requiredValue(snapshot.hiddenBiases[index], `hidden bias ${index}`),
      activation,
    ),
  );
  const logit = hidden.reduce(
    (sum, value, index) =>
      sum + value * requiredValue(snapshot.outputWeights[index], `output weight ${index}`),
    snapshot.outputBias,
  );
  return sigmoid(logit);
}

export function evaluateNeuralSnapshot(
  snapshot: NeuralNetworkSnapshot,
  points: readonly NeuralDataPoint[],
  activation: ActivationName,
): NeuralEvaluation {
  if (points.length === 0) throw new Error("The evaluation dataset cannot be empty.");
  assertNeuralDimensions(snapshot);
  let loss = 0;
  let correct = 0;
  for (const point of points) {
    const probability = predictNeuralProbability(snapshot, point.x, point.y, activation);
    const boundedProbability = Math.max(1e-12, Math.min(1 - 1e-12, probability));
    loss += -(
      point.label * Math.log(boundedProbability) +
      (1 - point.label) * Math.log(1 - boundedProbability)
    );
    if ((probability >= 0.5 ? 1 : 0) === point.label) correct += 1;
  }
  return { loss: loss / points.length, accuracy: correct / points.length };
}

export function inspectNeuralSnapshot(snapshot: NeuralNetworkSnapshot): NeuralSnapshotHealth {
  try {
    assertNeuralDimensions(snapshot);
  } catch (error) {
    return {
      ok: false,
      kind: "invalid",
      reason: error instanceof Error ? error.message : "Network dimensions are invalid.",
    };
  }
  const parameters = [
    ...snapshot.inputWeights.flat(),
    ...snapshot.hiddenBiases,
    ...snapshot.outputWeights,
    snapshot.outputBias,
  ];
  if (parameters.some((value) => !Number.isFinite(value))) {
    return { ok: false, kind: "invalid", reason: "Network parameters contain NaN or Infinity." };
  }
  if (parameters.some((value) => Math.abs(value) > neuralDivergenceLimit)) {
    return {
      ok: false,
      kind: "diverged",
      reason: `A network parameter exceeded ${neuralDivergenceLimit}.`,
    };
  }
  if (!Number.isFinite(snapshot.loss) || !Number.isFinite(snapshot.accuracy)) {
    return { ok: false, kind: "invalid", reason: "Loss or accuracy is not finite." };
  }
  if (snapshot.loss < 0 || snapshot.loss > neuralDivergenceLimit) {
    return { ok: false, kind: "diverged", reason: "Cross-entropy loss exceeded its safe bound." };
  }
  if (snapshot.accuracy < 0 || snapshot.accuracy > 1) {
    return { ok: false, kind: "invalid", reason: "Accuracy must lie in the interval [0, 1]." };
  }
  return { ok: true };
}

function captureSnapshot(
  epoch: number,
  inputWeights: readonly (readonly [number, number])[],
  hiddenBiases: readonly number[],
  outputWeights: readonly number[],
  outputBias: number,
  points: readonly NeuralDataPoint[],
  activation: ActivationName,
): NeuralNetworkSnapshot {
  const unevaluated: NeuralNetworkSnapshot = {
    epoch,
    inputWeights: inputWeights.map((row) => [row[0], row[1]]),
    hiddenBiases: [...hiddenBiases],
    outputWeights: [...outputWeights],
    outputBias,
    loss: 0,
    accuracy: 0,
  };
  return { ...unevaluated, ...evaluateNeuralSnapshot(unevaluated, points, activation) };
}

export function trainDeterministicNeuralNetwork(
  options: NeuralTrainingOptions,
): NeuralTrainingResult {
  const points = generateNeuralDataset(options.dataset, options.seed);
  const random = createSeededRandom(options.seed);
  const inputWeights: [number, number][] = Array.from({ length: options.hiddenWidth }, () => [
    (random() - 0.5) * 1.4,
    (random() - 0.5) * 1.4,
  ]);
  const hiddenBiases = Array.from({ length: options.hiddenWidth }, () => (random() - 0.5) * 0.2);
  const outputWeights = Array.from({ length: options.hiddenWidth }, () => (random() - 0.5) * 1.4);
  let outputBias = 0;
  const snapshots: NeuralNetworkSnapshot[] = [];

  const snapshot = (epoch: number) => {
    const current = captureSnapshot(
      epoch,
      inputWeights,
      hiddenBiases,
      outputWeights,
      outputBias,
      points,
      options.activation,
    );
    snapshots.push(current);
    return current;
  };

  snapshot(0);
  for (let epoch = 1; epoch <= options.epochs; epoch += 1) {
    if (options.shouldCancel?.()) return { status: "cancelled", snapshots };
    for (const point of points) {
      if (options.shouldCancel?.()) return { status: "cancelled", snapshots };
      const preActivations = inputWeights.map(
        (weights, index) =>
          weights[0] * point.x +
          weights[1] * point.y +
          requiredValue(hiddenBiases[index], `hidden bias ${index}`),
      );
      const hidden = preActivations.map((value) => activate(value, options.activation));
      const prediction = sigmoid(
        hidden.reduce(
          (sum, value, index) =>
            sum + value * requiredValue(outputWeights[index], `output weight ${index}`),
          outputBias,
        ),
      );
      const outputGradient = prediction - point.label;
      const previousOutputWeights = [...outputWeights];
      for (let index = 0; index < options.hiddenWidth; index += 1) {
        outputWeights[index] =
          requiredValue(outputWeights[index], `output weight ${index}`) -
          options.learningRate *
            outputGradient *
            requiredValue(hidden[index], `hidden activation ${index}`);
      }
      outputBias -= options.learningRate * outputGradient;
      for (let index = 0; index < options.hiddenWidth; index += 1) {
        const hiddenGradient =
          outputGradient *
          requiredValue(previousOutputWeights[index], `previous output weight ${index}`) *
          activationDerivative(
            requiredValue(preActivations[index], `pre-activation ${index}`),
            options.activation,
          );
        const weights = requiredValue(inputWeights[index], `input weight row ${index}`);
        weights[0] -= options.learningRate * hiddenGradient * point.x;
        weights[1] -= options.learningRate * hiddenGradient * point.y;
        hiddenBiases[index] =
          requiredValue(hiddenBiases[index], `hidden bias ${index}`) -
          options.learningRate * hiddenGradient;
      }
    }
    const current = snapshot(epoch);
    const health = inspectNeuralSnapshot(current);
    if (!health.ok) {
      return { status: "diverged", snapshots, reason: health.reason };
    }
  }
  return { status: "completed", snapshots };
}

export function createNeuralAccessibilitySummary(
  snapshot: NeuralNetworkSnapshot | undefined,
  status: string,
): string {
  const metrics = snapshot
    ? `第 ${snapshot.epoch} 个 epoch，交叉熵损失 ${snapshot.loss.toFixed(4)}，训练准确率 ${(snapshot.accuracy * 100).toFixed(1)}%。圆点代表类别一，方点代表类别零，背景表示当前模型的预测概率。`
    : status;
  return `${metrics} 当前网络对二维合成样本进行分类。`;
}

export type NumericMatrix = readonly (readonly number[])[];

export interface AttentionComputation {
  readonly query: NumericMatrix;
  readonly key: NumericMatrix;
  readonly value: NumericMatrix;
  readonly rawScores: NumericMatrix;
  readonly scaledScores: NumericMatrix;
  readonly mask: NumericMatrix;
  readonly maskedScores: NumericMatrix;
  readonly weights: NumericMatrix;
  readonly output: NumericMatrix;
  readonly keyDimension: number;
  readonly temperature: number;
  readonly causal: boolean;
}

export const attentionExampleTokens = ["模型", "根据", "上下文", "分配", "权重"] as const;

export const attentionExampleQuery: NumericMatrix = [
  [1.2, 0.2, 0.7],
  [0.15, 1.1, 0.35],
  [0.85, 0.35, 1.15],
  [0.3, 1.2, 0.8],
  [1.15, 0.15, 0.95],
];

export const attentionExampleKey: NumericMatrix = [
  [1.05, 0.1, 0.8],
  [0.1, 1.0, 0.25],
  [0.75, 0.25, 1.2],
  [0.2, 1.15, 0.75],
  [1.0, 0.2, 1.0],
];

export const attentionExampleValue: NumericMatrix = [
  [0.9, 0.2],
  [0.1, 0.8],
  [0.7, 0.6],
  [0.25, 0.95],
  [0.85, 0.45],
];

function matrixShape(matrix: NumericMatrix, name: string): readonly [number, number] {
  const firstRow = matrix[0];
  if (!firstRow || firstRow.length === 0) {
    throw new Error(`${name} must be a non-empty matrix.`);
  }
  const columns = firstRow.length;
  if (
    matrix.some((row) => row.length !== columns || row.some((value) => !Number.isFinite(value)))
  ) {
    throw new Error(`${name} must be rectangular and finite.`);
  }
  return [matrix.length, columns];
}

function transpose(matrix: NumericMatrix): NumericMatrix {
  const firstRow = requiredValue(matrix[0], "first matrix row");
  return firstRow.map((_, column) =>
    matrix.map((row, rowIndex) => requiredValue(row[column], `matrix value ${rowIndex},${column}`)),
  );
}

function multiplyMatrices(left: NumericMatrix, right: NumericMatrix): NumericMatrix {
  const [, leftColumns] = matrixShape(left, "left matrix");
  const [rightRows] = matrixShape(right, "right matrix");
  if (leftColumns !== rightRows) throw new Error("Matrix multiplication dimensions do not match.");
  const transposedRight = transpose(right);
  return left.map((row) =>
    transposedRight.map((column) =>
      row.reduce(
        (sum, value, index) =>
          sum + value * requiredValue(column[index], `matrix product value ${index}`),
        0,
      ),
    ),
  );
}

function stableSoftmax(values: readonly number[]): readonly number[] {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0)
    throw new Error("At least one attention position must be unmasked.");
  const maximum = Math.max(...finiteValues);
  const exponentials = values.map((value) =>
    Number.isFinite(value) ? Math.exp(value - maximum) : 0,
  );
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  if (!(denominator > 0) || !Number.isFinite(denominator)) {
    throw new Error("Softmax normalization failed.");
  }
  return exponentials.map((value) => value / denominator);
}

export function computeScaledDotProductAttention(options: {
  readonly query: NumericMatrix;
  readonly key: NumericMatrix;
  readonly value: NumericMatrix;
  readonly temperature: number;
  readonly causal: boolean;
}): AttentionComputation {
  const [queryRows, queryColumns] = matrixShape(options.query, "Q");
  const [keyRows, keyColumns] = matrixShape(options.key, "K");
  const [valueRows] = matrixShape(options.value, "V");
  if (queryColumns !== keyColumns) throw new Error("Q and K must share the key dimension.");
  if (keyRows !== valueRows) throw new Error("K and V must have the same sequence length.");
  if (!(options.temperature > 0) || !Number.isFinite(options.temperature)) {
    throw new Error("Softmax temperature must be positive and finite.");
  }

  const rawScores = multiplyMatrices(options.query, transpose(options.key));
  const scale = Math.sqrt(queryColumns);
  const scaledScores = rawScores.map((row) => row.map((score) => score / scale));
  const mask = Array.from({ length: queryRows }, (_, row) =>
    Array.from({ length: keyRows }, (_, column) =>
      options.causal && column > row ? Number.NEGATIVE_INFINITY : 0,
    ),
  );
  const maskedScores = scaledScores.map((row, rowIndex) =>
    row.map((score, columnIndex) => {
      const maskRow = requiredValue(mask[rowIndex], `mask row ${rowIndex}`);
      const maskValue = requiredValue(
        maskRow[columnIndex],
        `mask value ${rowIndex},${columnIndex}`,
      );
      return Number.isFinite(maskValue) ? score / options.temperature : Number.NEGATIVE_INFINITY;
    }),
  );
  const weights = maskedScores.map(stableSoftmax);
  const output = multiplyMatrices(weights, options.value);
  return {
    query: options.query,
    key: options.key,
    value: options.value,
    rawScores,
    scaledScores,
    mask,
    maskedScores,
    weights,
    output,
    keyDimension: queryColumns,
    temperature: options.temperature,
    causal: options.causal,
  };
}

export function createAttentionAccessibilitySummary(
  computation: AttentionComputation,
  tokens: readonly string[],
  queryIndex: number,
): string {
  if (tokens.length !== computation.query.length || !tokens[queryIndex]) {
    throw new Error("Token labels must match the query rows.");
  }
  const selected = requiredValue(computation.weights[queryIndex], `attention row ${queryIndex}`);
  const strongestIndex = selected.reduce(
    (best, weight, index) =>
      weight > requiredValue(selected[best], `attention weight ${best}`) ? index : best,
    0,
  );
  const maskDescription = computation.causal
    ? "启用因果掩码，被掩码的未来位置权重为零。"
    : "未启用因果掩码；这是双向、非因果注意力演示。";
  return `自然语言序列“${tokens.join("")}”共有 ${tokens.length} 个 token。当前查询是“${requiredValue(tokens[queryIndex], `token ${queryIndex}`)}”，键维度 d_k=${computation.keyDimension}，原始分数 QK^T 除以 sqrt(d_k) 后再以温度 ${computation.temperature.toFixed(2)} 进入 softmax。当前行权重依次为 ${selected.map((weight) => weight.toFixed(3)).join("、")}，对“${requiredValue(tokens[strongestIndex], `token ${strongestIndex}`)}”的权重最高。${maskDescription}这些权重表示当前查询对各个值向量的加权系数。`;
}
