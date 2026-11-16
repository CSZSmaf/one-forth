"use client";

import { MathLabel } from "@one-forth/ui";
import { experimentMathText } from "@one-forth/config";

import { uiText } from "@one-forth/config";

import type { ActivationName } from "@one-forth/numerical";
import { clamp } from "@one-forth/math-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canvasToPng } from "./export";
import { visualizationMetadata } from "./metadata";
import { usePlayback } from "./playback";
import {
  createNeuralAccessibilitySummary,
  evaluateNeuralSnapshot,
  generateNeuralDataset,
  inspectNeuralSnapshot,
  neuralDivergenceLimit,
  predictNeuralProbability,
  type NeuralDataPoint,
  type NeuralDatasetName,
  type NeuralNetworkSnapshot,
} from "./science/neural-attention-models";
import {
  isRecord,
  readEnum,
  readInputNumber,
  readInteger,
  readNumber,
  readPlaybackSpeed,
  useUrlBackedVisualizationState,
} from "./state";
import type { VisualizationComponentProps, VisualizationExportHandlers } from "./types";
import { VisualizationFrame } from "./visualization-frame";

type DatasetName = NeuralDatasetName;
type TrainingStatus = "training" | "completed" | "cancelled" | "diverged" | "error";

interface DecisionBoundaryState {
  readonly dataset: DatasetName;
  readonly hiddenWidth: number;
  readonly activation: ActivationName;
  readonly learningRate: number;
  readonly epochs: number;
  readonly seed: number;
  readonly step: number;
  readonly speed: number;
}

const datasets: readonly DatasetName[] = ["xor", "moons"];
const activationNames: readonly ActivationName[] = ["tanh", "sigmoid", "relu"];
const initialState: DecisionBoundaryState = {
  dataset: "moons",
  hiddenWidth: 5,
  activation: "tanh",
  learningRate: 0.08,
  epochs: 80,
  seed: 17,
  step: 0,
  speed: 1,
};

function validateState(value: unknown): DecisionBoundaryState {
  if (!isRecord(value)) return initialState;
  return {
    dataset: readEnum(value, "dataset", datasets, initialState.dataset),
    hiddenWidth: readInteger(value, "hiddenWidth", initialState.hiddenWidth, {
      minimum: 2,
      maximum: 8,
    }),
    activation: readEnum(value, "activation", activationNames, initialState.activation),
    learningRate: readNumber(value, "learningRate", initialState.learningRate, {
      minimum: 0.005,
      maximum: 0.4,
    }),
    epochs: readInteger(value, "epochs", initialState.epochs, { minimum: 20, maximum: 120 }),
    seed: readInteger(value, "seed", initialState.seed, { minimum: 0, maximum: 2_147_483_647 }),
    step: readInteger(value, "step", initialState.step, { minimum: 0, maximum: 120 }),
    speed: readPlaybackSpeed(value, "speed", initialState.speed),
  };
}

function toRecord(state: DecisionBoundaryState): Readonly<Record<string, unknown>> {
  return { ...state };
}

const workerSource = `
const sigmoid = (value) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
const activate = (value, name) => name === "relu" ? Math.max(0, value) : name === "sigmoid" ? sigmoid(value) : Math.tanh(value);
const derivative = (value, name) => {
  if (name === "relu") return value > 0 ? 1 : 0;
  const output = activate(value, name);
  return name === "sigmoid" ? output * (1 - output) : 1 - output * output;
};
const seeded = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
self.onmessage = (event) => {
  const { taskId, points, hiddenWidth, activation, learningRate, epochs, seed } = event.data;
  const random = seeded(seed);
  const inputWeights = Array.from({ length: hiddenWidth }, () => [(random() - 0.5) * 1.4, (random() - 0.5) * 1.4]);
  const hiddenBiases = Array.from({ length: hiddenWidth }, () => (random() - 0.5) * 0.2);
  const outputWeights = Array.from({ length: hiddenWidth }, () => (random() - 0.5) * 1.4);
  let outputBias = 0;
  const snapshots = [];
  const snapshot = (epoch) => {
    let loss = 0;
    let correct = 0;
    for (const point of points) {
      const z = inputWeights.map((weights, index) => weights[0] * point.x + weights[1] * point.y + hiddenBiases[index]);
      const hidden = z.map((value) => activate(value, activation));
      const prediction = sigmoid(hidden.reduce((sum, value, index) => sum + value * outputWeights[index], outputBias));
      loss += -(point.label * Math.log(prediction + 1e-8) + (1 - point.label) * Math.log(1 - prediction + 1e-8));
      if ((prediction >= 0.5 ? 1 : 0) === point.label) correct += 1;
    }
    snapshots.push({
      epoch,
      inputWeights: inputWeights.map((row) => [...row]),
      hiddenBiases: [...hiddenBiases],
      outputWeights: [...outputWeights],
      outputBias,
      loss: loss / points.length,
      accuracy: correct / points.length,
    });
  };
  snapshot(0);
  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    for (const point of points) {
      const z = inputWeights.map((weights, index) => weights[0] * point.x + weights[1] * point.y + hiddenBiases[index]);
      const hidden = z.map((value) => activate(value, activation));
      const prediction = sigmoid(hidden.reduce((sum, value, index) => sum + value * outputWeights[index], outputBias));
      const outputGradient = prediction - point.label;
      const previousOutputWeights = [...outputWeights];
      for (let index = 0; index < hiddenWidth; index += 1) outputWeights[index] -= learningRate * outputGradient * hidden[index];
      outputBias -= learningRate * outputGradient;
      for (let index = 0; index < hiddenWidth; index += 1) {
        const hiddenGradient = outputGradient * previousOutputWeights[index] * derivative(z[index], activation);
        inputWeights[index][0] -= learningRate * hiddenGradient * point.x;
        inputWeights[index][1] -= learningRate * hiddenGradient * point.y;
        hiddenBiases[index] -= learningRate * hiddenGradient;
      }
    }
    snapshot(epoch);
    const current = snapshots[snapshots.length - 1];
    if (!Number.isFinite(current.loss)) {
      self.postMessage({ taskId, type: "diverged", reason: "交叉熵损失出现 NaN 或 Infinity。", snapshots });
      return;
    }
    const parameterValues = [
      ...inputWeights.flat(),
      ...hiddenBiases,
      ...outputWeights,
      outputBias,
    ];
    if (parameterValues.some((value) => !Number.isFinite(value))) {
      self.postMessage({ taskId, type: "diverged", reason: "网络参数出现 NaN 或 Infinity。", snapshots });
      return;
    }
    if (parameterValues.some((value) => Math.abs(value) > ${neuralDivergenceLimit})) {
      self.postMessage({ taskId, type: "diverged", reason: "网络参数超过显式数值安全界限 ${neuralDivergenceLimit}。", snapshots });
      return;
    }
    if (epoch % 5 === 0) self.postMessage({ taskId, type: "progress", progress: epoch / epochs });
  }
  self.postMessage({ taskId, type: "result", snapshots });
};
`;

function numberArray(value: unknown): readonly number[] | null {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "number" && Number.isFinite(item))
  )
    return null;
  return value;
}

function numberPair(value: unknown): readonly [number, number] | null {
  const array = numberArray(value);
  if (!array || array.length !== 2) return null;
  const [first, second] = array;
  return first === undefined || second === undefined ? null : [first, second];
}

function parseSnapshot(
  value: unknown,
  points: readonly NeuralDataPoint[],
  activation: ActivationName,
  hiddenWidth: number,
): NeuralNetworkSnapshot | null {
  if (!isRecord(value)) return null;
  const inputWeightsValue = value.inputWeights;
  if (!Array.isArray(inputWeightsValue)) return null;
  const inputWeights = inputWeightsValue.map(numberPair);
  if (inputWeights.some((row) => row === null) || inputWeights.length !== hiddenWidth) return null;
  const hiddenBiases = numberArray(value.hiddenBiases);
  const outputWeights = numberArray(value.outputWeights);
  if (
    !hiddenBiases ||
    !outputWeights ||
    hiddenBiases.length !== hiddenWidth ||
    outputWeights.length !== hiddenWidth
  )
    return null;
  if (
    typeof value.epoch !== "number" ||
    !Number.isInteger(value.epoch) ||
    value.epoch < 0 ||
    typeof value.outputBias !== "number" ||
    !Number.isFinite(value.outputBias)
  )
    return null;
  const unevaluated: NeuralNetworkSnapshot = {
    epoch: value.epoch,
    inputWeights: inputWeights.filter((row): row is readonly [number, number] => row !== null),
    hiddenBiases,
    outputWeights,
    outputBias: value.outputBias,
    loss: 0,
    accuracy: 0,
  };
  try {
    return { ...unevaluated, ...evaluateNeuralSnapshot(unevaluated, points, activation) };
  } catch {
    return null;
  }
}

function parseSnapshots(
  value: unknown,
  points: readonly NeuralDataPoint[],
  activation: ActivationName,
  hiddenWidth: number,
): readonly NeuralNetworkSnapshot[] | null {
  if (!Array.isArray(value)) return null;
  const snapshots = value.map((snapshot) =>
    parseSnapshot(snapshot, points, activation, hiddenWidth),
  );
  if (snapshots.some((snapshot) => snapshot === null)) return null;
  const parsed = snapshots.filter(
    (snapshot): snapshot is NeuralNetworkSnapshot => snapshot !== null,
  );
  return parsed.every((snapshot, index) => snapshot.epoch === index) ? parsed : null;
}

function canvasColours(
  canvas: HTMLCanvasElement,
): Readonly<{ positive: string; negative: string; surface: string }> {
  const styles = window.getComputedStyle(canvas);
  return {
    positive: styles.getPropertyValue("--visualization-positive").trim() || styles.color,
    negative: styles.getPropertyValue("--visualization-negative").trim() || styles.color,
    surface: styles.getPropertyValue("--visualization-surface").trim() || styles.backgroundColor,
  };
}

function drawBoundary(
  canvas: HTMLCanvasElement,
  points: readonly NeuralDataPoint[],
  snapshot: NeuralNetworkSnapshot | undefined,
  activation: ActivationName,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;
  const colours = canvasColours(canvas);
  context.clearRect(0, 0, width, height);
  context.fillStyle = colours.surface;
  context.fillRect(0, 0, width, height);
  if (snapshot) {
    const columns = 56;
    const rows = 36;
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (column / (columns - 1)) * 5 - 2.5;
        const y = 2 - (row / (rows - 1)) * 4;
        const probability = predictNeuralProbability(snapshot, x, y, activation);
        context.fillStyle = probability >= 0.5 ? colours.positive : colours.negative;
        context.globalAlpha = 0.12 + Math.abs(probability - 0.5) * 1.1;
        context.fillRect(
          column * cellWidth,
          row * cellHeight,
          Math.ceil(cellWidth) + 1,
          Math.ceil(cellHeight) + 1,
        );
      }
    }
  }
  context.globalAlpha = 1;
  context.lineWidth = 2;
  points.forEach((point) => {
    const x = ((point.x + 2.5) / 5) * width;
    const y = ((2 - point.y) / 4) * height;
    context.fillStyle = point.label === 1 ? colours.positive : colours.negative;
    context.strokeStyle = colours.surface;
    context.beginPath();
    if (point.label === 1) context.arc(x, y, 4.5, 0, Math.PI * 2);
    else context.rect(x - 4.5, y - 4.5, 9, 9);
    context.fill();
    context.stroke();
  });
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function canvasAsSvg(canvas: HTMLCanvasElement): string {
  const data = canvas.toDataURL("image/png");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${escapeXml(data)}" width="${canvas.width}" height="${canvas.height}" /></svg>`;
}

export function NeuralDecisionBoundary({ locale }: VisualizationComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerUrlRef = useRef<string | null>(null);
  const taskRunRef = useRef(0);
  const [snapshots, setSnapshots] = useState<readonly NeuralNetworkSnapshot[]>([]);
  const [status, setStatus] = useState<TrainingStatus>("training");
  const [statusDetail, setStatusDetail] = useState("");
  const [progress, setProgress] = useState(0);
  const [retrainVersion, setRetrainVersion] = useState(0);
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    "neural-decision-boundary",
    initialState,
    validateState,
    toRecord,
    locale,
  );
  const points = useMemo(
    () => generateNeuralDataset(state.dataset, state.seed),
    [state.dataset, state.seed],
  );

  useEffect(() => {
    workerRef.current?.terminate();
    if (workerUrlRef.current) URL.revokeObjectURL(workerUrlRef.current);
    const taskId = taskRunRef.current + 1;
    taskRunRef.current = taskId;
    const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
    const worker = new Worker(workerUrl, { type: "module", name: "one-forth-neural-boundary" });
    workerRef.current = worker;
    workerUrlRef.current = workerUrl;
    const resetState = window.setTimeout(() => {
      if (taskRunRef.current !== taskId || workerRef.current !== worker) return;
      setStatus("training");
      setStatusDetail("");
      setProgress(0);
      setSnapshots([]);
    }, 0);
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (taskRunRef.current !== taskId || workerRef.current !== worker) return;
      if (!isRecord(event.data)) {
        setStatus("error");
        setStatusDetail("无法读取训练结果，请重新训练。");
        return;
      }
      if (event.data.taskId !== taskId) {
        setStatus("error");
        setStatusDetail("训练结果与当前设置不一致，请重新训练。");
        return;
      }
      if (event.data.type === "progress") {
        if (typeof event.data.progress !== "number" || !Number.isFinite(event.data.progress)) {
          setStatus("error");
          setStatusDetail("无法读取训练进度，请重新训练。");
          return;
        }
        setProgress(clamp(event.data.progress, 0, 1));
        return;
      }
      if (event.data.type === "error") {
        setStatus("error");
        setStatusDetail(
          typeof event.data.reason === "string" ? event.data.reason : "训练未能完成。",
        );
        return;
      }
      if (event.data.type !== "result" && event.data.type !== "diverged") {
        setStatus("error");
        setStatusDetail("无法读取训练结果，请重新训练。");
        return;
      }
      const parsed = parseSnapshots(
        event.data.snapshots,
        points,
        state.activation,
        state.hiddenWidth,
      );
      if (!parsed || parsed.length === 0) {
        setStatus("error");
        setStatusDetail("训练结果不完整，请重新训练。");
        return;
      }
      const lastSnapshot = parsed.at(-1);
      const health = lastSnapshot ? inspectNeuralSnapshot(lastSnapshot) : null;
      setSnapshots(parsed);
      setProgress(1);
      if (event.data.type === "diverged" || (health && !health.ok)) {
        setStatus("diverged");
        setStatusDetail(
          typeof event.data.reason === "string"
            ? event.data.reason
            : health && !health.ok
              ? health.reason
              : "训练越过显式数值安全界限。",
        );
      } else {
        setStatus("completed");
        setStatusDetail("");
      }
      setState((current) => ({
        ...current,
        step: Math.min(current.step, parsed.length - 1),
      }));
    };
    worker.onerror = (event) => {
      if (taskRunRef.current !== taskId || workerRef.current !== worker) return;
      setStatus("error");
      setStatusDetail(event.message || "训练中断，请重新训练。");
    };
    worker.postMessage({
      taskId,
      points,
      hiddenWidth: state.hiddenWidth,
      activation: state.activation,
      learningRate: state.learningRate,
      epochs: state.epochs,
      seed: state.seed,
    });
    return () => {
      worker.terminate();
      window.clearTimeout(resetState);
      URL.revokeObjectURL(workerUrl);
      if (taskRunRef.current === taskId) taskRunRef.current += 1;
      if (workerRef.current === worker) workerRef.current = null;
      if (workerUrlRef.current === workerUrl) workerUrlRef.current = null;
    };
  }, [
    points,
    retrainVersion,
    setState,
    state.activation,
    state.epochs,
    state.hiddenWidth,
    state.learningRate,
    state.seed,
  ]);

  const maximumStep = Math.max(0, snapshots.length - 1);
  const effectiveStep = Math.min(state.step, maximumStep);
  const currentSnapshot = snapshots[effectiveStep];
  const setStep = useCallback(
    (step: number) => {
      setState((current) => ({ ...current, step }));
    },
    [setState],
  );
  const playback = usePlayback({
    step: effectiveStep,
    maximumStep,
    speed: state.speed,
    onStepChange: setStep,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawBoundary(canvas, points, currentSnapshot, state.activation);
  }, [currentSnapshot, points, state.activation]);

  const exportHandlers = useMemo<VisualizationExportHandlers>(
    () => ({
      toSvg: () => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("决策边界画布尚未就绪。");
        return canvasAsSvg(canvas);
      },
      toPng: async () => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("决策边界画布尚未就绪。");
        return canvasToPng(canvas);
      },
    }),
    [],
  );

  function updateParameter(patch: Partial<DecisionBoundaryState>): void {
    playback.pause();
    setState((current) => ({ ...current, ...patch, step: 0 }));
  }

  function cancelTraining(): void {
    taskRunRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
    if (workerUrlRef.current) URL.revokeObjectURL(workerUrlRef.current);
    workerUrlRef.current = null;
    setStatus("cancelled");
    setStatusDetail("训练已取消。");
  }

  const controls = (
    <div className="visualization-controls visualization-controls--neural-network">
      <label>
        <span>数据集</span>
        <select
          value={state.dataset}
          onChange={(event) =>
            updateParameter({
              dataset: readEnum({ dataset: event.target.value }, "dataset", datasets, "moons"),
            })
          }
        >
          <option value="moons">双月</option>
          <option value="xor">XOR</option>
        </select>
      </label>
      <label>
        <span>隐藏层宽度</span>
        <input
          type="range"
          min="2"
          max="8"
          step="1"
          value={state.hiddenWidth}
          onChange={(event) => updateParameter({ hiddenWidth: Number(event.target.value) })}
        />
        <output>{state.hiddenWidth}</output>
      </label>
      <label>
        <span>激活函数</span>
        <select
          value={state.activation}
          onChange={(event) =>
            updateParameter({
              activation: readEnum(
                { activation: event.target.value },
                "activation",
                activationNames,
                "tanh",
              ),
            })
          }
        >
          <option value="tanh">tanh</option>
          <option value="sigmoid">sigmoid</option>
          <option value="relu">ReLU</option>
        </select>
      </label>
      <label>
        <span>学习率</span>
        <input
          type="range"
          min="0.005"
          max="0.4"
          step="0.005"
          value={state.learningRate}
          onChange={(event) => updateParameter({ learningRate: Number(event.target.value) })}
        />
        <output>{state.learningRate.toFixed(3)}</output>
      </label>
      <label>
        <span>训练轮数</span>
        <input
          type="number"
          min="20"
          max="120"
          step="5"
          value={state.epochs}
          onChange={(event) =>
            updateParameter({
              epochs: Math.round(
                readInputNumber(event.target.value, state.epochs, { minimum: 20, maximum: 120 }),
              ),
            })
          }
        />
      </label>
      <label>
        <span>随机种子</span>
        <input
          type="number"
          min="0"
          max="2147483647"
          step="1"
          value={state.seed}
          onChange={(event) =>
            updateParameter({
              seed: Math.round(
                readInputNumber(event.target.value, state.seed, {
                  minimum: 0,
                  maximum: 2_147_483_647,
                }),
              ),
            })
          }
        />
      </label>
      <div className="visualization-training-actions">
        <button
          type="button"
          onClick={() => {
            setState((current) => ({ ...current, step: 0 }));
            setRetrainVersion((version) => version + 1);
          }}
        >
          重新训练
        </button>
        <button type="button" onClick={cancelTraining} disabled={status !== "training"}>
          取消训练
        </button>
      </div>
      {status === "training" ? <progress value={progress} max="1" aria-label="训练进度" /> : null}
      <p className="visualization-control-note">固定数据集与随机种子可重复同一训练过程。</p>
    </div>
  );

  const statusText: Readonly<Record<TrainingStatus, string>> = {
    training: uiText[locale].readerInterface.trainingProgress.replace(
      "{percent}",
      String(Math.round(progress * 100)),
    ),
    completed: "训练完成，可沿时间轴查看决策边界形成过程。",
    cancelled: uiText[locale].readerInterface.trainingCancelled,
    diverged: `训练数值发散：${statusDetail || "参数或损失越过显式数值安全界限。"} 请降低学习率后重试。`,
    error: `训练失败：${statusDetail || "计算未能完成，请重新训练。"}`,
  };
  const modelBoundary = "实验训练一个小型网络，对二维合成样本进行分类。";
  const textAlternative = createNeuralAccessibilitySummary(currentSnapshot, statusText[status]);
  const metadata = visualizationMetadata("neural-decision-boundary", locale);

  return (
    <VisualizationFrame
      id="neural-decision-boundary"
      locale={locale}
      title={metadata.title}
      description={metadata.description}
      playback={playback}
      onReset={() => {
        setState(initialState);
        setRetrainVersion((version) => version + 1);
      }}
      onSpeedChange={(speed) => setState((current) => ({ ...current, speed }))}
      shareUrl={shareUrl}
      exports={exportHandlers}
      controls={controls}
      textAlternative={textAlternative}
      notice={notice}
      status={`${statusText[status]} ${modelBoundary}`}
      metrics={
        <dl>
          <div>
            <dt>epoch</dt>
            <dd>{currentSnapshot?.epoch ?? 0}</dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].loss} />
            </dt>
            <dd>{currentSnapshot?.loss.toFixed(4) ?? "—"}</dd>
          </div>
          <div>
            <dt>accuracy</dt>
            <dd>{currentSnapshot ? `${(currentSnapshot.accuracy * 100).toFixed(1)}%` : "—"}</dd>
          </div>
          <div>
            <dt>样本 / seed</dt>
            <dd>
              {points.length} / {state.seed}
            </dd>
          </div>
        </dl>
      }
    >
      <canvas
        ref={canvasRef}
        className="visualization-canvas visualization-canvas--decision-boundary"
        width="560"
        height="360"
        role="img"
        aria-label={textAlternative}
      />
    </VisualizationFrame>
  );
}
