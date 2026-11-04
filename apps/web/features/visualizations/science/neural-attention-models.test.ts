import { describe, expect, it } from "vitest";
import {
  attentionExampleKey,
  attentionExampleQuery,
  attentionExampleTokens,
  attentionExampleValue,
  computeScaledDotProductAttention,
  createAttentionAccessibilitySummary,
  createNeuralAccessibilitySummary,
  evaluateNeuralSnapshot,
  generateNeuralDataset,
  inspectNeuralSnapshot,
  trainDeterministicNeuralNetwork,
  type NeuralNetworkSnapshot,
} from "./neural-attention-models";

describe("deterministic neural decision-boundary model", () => {
  const options = {
    dataset: "moons" as const,
    hiddenWidth: 4,
    activation: "tanh" as const,
    learningRate: 0.06,
    epochs: 8,
    seed: 17,
  };

  it("generates identical data and training snapshots for a fixed seed", () => {
    expect(generateNeuralDataset("moons", 17)).toEqual(generateNeuralDataset("moons", 17));
    expect(generateNeuralDataset("moons", 17)).not.toEqual(generateNeuralDataset("moons", 18));

    const first = trainDeterministicNeuralNetwork(options);
    const second = trainDeterministicNeuralNetwork(options);
    expect(first).toEqual(second);
    expect(first.status).toBe("completed");
    expect(first.snapshots).toHaveLength(options.epochs + 1);
  });

  it("reports loss and accuracy from the exact weights used for prediction", () => {
    const result = trainDeterministicNeuralNetwork(options);
    const snapshot = result.snapshots.at(-1);
    if (!snapshot) throw new Error("Expected a trained network snapshot.");
    const evaluation = evaluateNeuralSnapshot(
      snapshot,
      generateNeuralDataset(options.dataset, options.seed),
      options.activation,
    );

    expect(snapshot.loss).toBeCloseTo(evaluation.loss, 12);
    expect(snapshot.accuracy).toBeCloseTo(evaluation.accuracy, 12);
    expect(snapshot.accuracy).toBeGreaterThanOrEqual(0);
    expect(snapshot.accuracy).toBeLessThanOrEqual(1);
  });

  it("supports cancellation and explicitly classifies numerical divergence", () => {
    let checks = 0;
    const cancelled = trainDeterministicNeuralNetwork({
      ...options,
      epochs: 20,
      shouldCancel: () => {
        checks += 1;
        return checks > 20;
      },
    });
    expect(cancelled.status).toBe("cancelled");

    const valid = trainDeterministicNeuralNetwork(options).snapshots[0];
    if (!valid) throw new Error("Expected an initial neural snapshot.");
    const divergent: NeuralNetworkSnapshot = { ...valid, outputBias: 1_000_001 };
    expect(inspectNeuralSnapshot(divergent)).toMatchObject({
      ok: false,
      kind: "diverged",
    });
  });

  it("describes the dataset, training metrics, and visual legend accessibly", () => {
    const snapshot = trainDeterministicNeuralNetwork(options).snapshots.at(-1);
    const summary = createNeuralAccessibilitySummary(snapshot, "训练完成。");
    expect(summary).toContain("二维合成样本");
    expect(summary).toContain("训练准确率");
    expect(summary).toContain("背景表示当前模型的预测概率");
  });
});

describe("scaled dot-product attention model", () => {
  it("applies the exact sqrt(d_k) scale and returns dimensionally valid output", () => {
    const computation = computeScaledDotProductAttention({
      query: attentionExampleQuery,
      key: attentionExampleKey,
      value: attentionExampleValue,
      temperature: 1,
      causal: false,
    });

    expect(computation.keyDimension).toBe(3);
    for (let row = 0; row < computation.rawScores.length; row += 1) {
      const rawRow = computation.rawScores[row];
      const scaledRow = computation.scaledScores[row];
      if (!rawRow || !scaledRow) throw new Error(`Missing attention score row ${row}.`);
      for (let column = 0; column < rawRow.length; column += 1) {
        const rawScore = rawRow[column];
        const scaledScore = scaledRow[column];
        if (rawScore === undefined || scaledScore === undefined) {
          throw new Error(`Missing attention score ${row},${column}.`);
        }
        expect(scaledScore).toBeCloseTo(rawScore / Math.sqrt(3), 12);
      }
    }
    expect(computation.rawScores).toHaveLength(5);
    expect(computation.rawScores.every((row) => row.length === 5)).toBe(true);
    expect(computation.output).toHaveLength(5);
    expect(computation.output.every((row) => row.length === 2)).toBe(true);
  });

  it("normalizes every softmax row to one within numerical tolerance", () => {
    const computation = computeScaledDotProductAttention({
      query: attentionExampleQuery,
      key: attentionExampleKey,
      value: attentionExampleValue,
      temperature: 0.85,
      causal: false,
    });
    computation.weights.forEach((row) => {
      expect(row.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
      expect(row.every((value) => value >= 0 && value <= 1)).toBe(true);
    });
  });

  it("sets every future weight to exactly zero under a causal mask", () => {
    const computation = computeScaledDotProductAttention({
      query: attentionExampleQuery,
      key: attentionExampleKey,
      value: attentionExampleValue,
      temperature: 0.85,
      causal: true,
    });
    computation.weights.forEach((row, rowIndex) => {
      row.forEach((weight, columnIndex) => {
        if (columnIndex > rowIndex) expect(weight).toBe(0);
      });
      expect(row.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    });
  });

  it("rejects incompatible Q, K, V dimensions", () => {
    expect(() =>
      computeScaledDotProductAttention({
        query: [[1, 2]],
        key: [[1, 2, 3]],
        value: [[1]],
        temperature: 1,
        causal: false,
      }),
    ).toThrow(/Q and K/);
    expect(() =>
      computeScaledDotProductAttention({
        query: [[1, 2]],
        key: [[1, 2]],
        value: [[1], [2]],
        temperature: 1,
        causal: false,
      }),
    ).toThrow(/K and V/);
  });

  it("describes the sequence, attention mask, and weights", () => {
    const computation = computeScaledDotProductAttention({
      query: attentionExampleQuery,
      key: attentionExampleKey,
      value: attentionExampleValue,
      temperature: 0.85,
      causal: false,
    });
    const summary = createAttentionAccessibilitySummary(computation, attentionExampleTokens, 2);
    expect(summary).toContain("模型根据上下文分配权重");
    expect(summary).toContain("sqrt(d_k)");
    expect(summary).toContain("双向、非因果注意力演示");
    expect(summary).toContain("当前查询对各个值向量的加权系数");
  });
});
