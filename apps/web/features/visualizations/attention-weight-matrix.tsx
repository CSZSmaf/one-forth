"use client";

import { StaticMath, MathRichTextContent } from "@one-forth/ui";
import { learningToolsText } from "@one-forth/config";

import { clamp } from "@one-forth/math-core";
import { useCallback, useId, useMemo, useRef } from "react";
import { useSvgExportHandlers } from "./export";
import { visualizationMetadata } from "./metadata";
import { usePlayback } from "./playback";
import {
  attentionExampleKey,
  attentionExampleQuery,
  attentionExampleTokens,
  attentionExampleValue,
  computeScaledDotProductAttention,
  createAttentionAccessibilitySummary,
  type NumericMatrix,
} from "./science/neural-attention-models";
import { isRecord, readInteger, readPlaybackSpeed, useUrlBackedVisualizationState } from "./state";
import type { VisualizationComponentProps } from "./types";
import { VisualizationFrame } from "./visualization-frame";

interface AttentionState {
  readonly queryIndex: number;
  readonly temperature: number;
  readonly causal: boolean;
  readonly speed: number;
}

const tokens = attentionExampleTokens;

const initialState: AttentionState = {
  queryIndex: 2,
  temperature: 0.85,
  causal: false,
  speed: 1,
};

function validateState(value: unknown): AttentionState {
  if (!isRecord(value)) return initialState;
  return {
    queryIndex: readInteger(value, "queryIndex", initialState.queryIndex, {
      minimum: 0,
      maximum: tokens.length - 1,
    }),
    temperature:
      typeof value.temperature === "number" && Number.isFinite(value.temperature)
        ? clamp(value.temperature, 0.3, 2)
        : initialState.temperature,
    causal: typeof value.causal === "boolean" ? value.causal : initialState.causal,
    speed: readPlaybackSpeed(value, "speed", initialState.speed),
  };
}

function toRecord(state: AttentionState): Readonly<Record<string, unknown>> {
  return { ...state };
}

function formatMatrixValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "−∞";
}

function MatrixTable({
  title,
  matrix,
  rowLabels,
  highlightRow,
}: {
  readonly title: string;
  readonly matrix: NumericMatrix;
  readonly rowLabels?: readonly string[];
  readonly highlightRow?: number;
}) {
  const columns = matrix[0]?.length ?? 0;
  const titleId = useId();
  return (
    <figure className="attention-computation-matrix">
      <figcaption id={titleId}>
        <MathRichTextContent value={title} />
      </figcaption>
      <table aria-labelledby={titleId}>
        <thead>
          <tr>
            {rowLabels ? <th scope="col">token</th> : null}
            {Array.from({ length: columns }, (_, index) => (
              <th key={index} scope="col">
                {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex === highlightRow ? "is-current" : undefined}>
              {rowLabels ? <th scope="row">{rowLabels[rowIndex]}</th> : null}
              {row.map((value, columnIndex) => (
                <td key={columnIndex}>{formatMatrixValue(value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function AttentionWeightMatrix({ locale }: VisualizationComponentProps) {
  const text = learningToolsText[locale];
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    "attention-weight-matrix",
    initialState,
    validateState,
    toRecord,
    locale,
  );
  const setStep = useCallback(
    (queryIndex: number) => setState((current) => ({ ...current, queryIndex })),
    [setState],
  );
  const playback = usePlayback({
    step: state.queryIndex,
    maximumStep: tokens.length - 1,
    speed: state.speed,
    onStepChange: setStep,
  });
  const exports = useSvgExportHandlers(svgRef);
  const metadata = visualizationMetadata("attention-weight-matrix", locale);
  const computation = useMemo(
    () =>
      computeScaledDotProductAttention({
        query: attentionExampleQuery,
        key: attentionExampleKey,
        value: attentionExampleValue,
        temperature: state.temperature,
        causal: state.causal,
      }),
    [state.causal, state.temperature],
  );
  const rows = computation.weights;
  const selected = rows[state.queryIndex] ?? [];
  const strongestIndex = selected.reduce(
    (best, weight, index) => (weight > (selected[best] ?? -1) ? index : best),
    0,
  );
  const entropy = -selected.reduce(
    (sum, weight) => sum + (weight > 0 ? weight * Math.log(weight) : 0),
    0,
  );

  function update(patch: Partial<AttentionState>) {
    playback.pause();
    setState((current) => ({ ...current, ...patch }));
  }

  const controls = (
    <div className="visualization-controls visualization-controls--attention">
      <div className="visualization-presets">
        {[0.3, 1, 2].map((temperature) => (
          <button
            key={temperature}
            type="button"
            onClick={() => update({ temperature })}
            aria-pressed={state.temperature === temperature}
          >
            {text.temperature} {temperature}
          </button>
        ))}
      </div>
      <label>
        <span>查询 token</span>
        <select
          value={state.queryIndex}
          onChange={(event) => update({ queryIndex: Number(event.target.value) })}
        >
          {tokens.map((token, index) => (
            <option key={token} value={index}>
              {index + 1}. {token}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>softmax 温度</span>
        <input
          type="range"
          min="0.3"
          max="2"
          step="0.05"
          value={state.temperature}
          onChange={(event) => update({ temperature: Number(event.target.value) })}
        />
        <output>{state.temperature.toFixed(2)}</output>
      </label>
      <label className="visualization-toggle">
        <input
          type="checkbox"
          checked={state.causal}
          onChange={(event) => update({ causal: event.target.checked })}
        />
        <span>使用因果掩码</span>
      </label>
    </div>
  );

  const status = state.causal
    ? `启用因果掩码，被掩码的未来位置权重为零。查询“${tokens[state.queryIndex]}”只能读取当前位置及之前的 token。`
    : `当前是双向、非因果注意力。查询“${tokens[state.queryIndex]}”对“${tokens[strongestIndex]}”的权重最高，为 ${((selected[strongestIndex] ?? 0) * 100).toFixed(1)}%；`;
  const textAlternative = createAttentionAccessibilitySummary(
    computation,
    tokens,
    state.queryIndex,
  );
  const matrixLeft = 246;
  const matrixTop = 48;
  const cell = 48;

  return (
    <VisualizationFrame
      id="attention-weight-matrix"
      locale={locale}
      title={metadata.title}
      description={metadata.description}
      playback={playback}
      onReset={() => setState(initialState)}
      onSpeedChange={(speed) => setState((current) => ({ ...current, speed }))}
      shareUrl={shareUrl}
      exports={exports}
      controls={controls}
      textAlternative={textAlternative}
      notice={notice}
      status={status}
      metrics={
        <dl>
          <div>
            <dt>最大权重</dt>
            <dd>{((selected[strongestIndex] ?? 0) * 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt>熵</dt>
            <dd>{entropy.toFixed(3)}</dd>
          </div>
          <div>
            <dt>有效位置</dt>
            <dd>{selected.filter((weight) => weight > 0).length}</dd>
          </div>
          <div>
            <dt>缩放</dt>
            <dd>
              <StaticMath latex={`1/\\sqrt{${computation.keyDimension}}`} />
            </dd>
          </div>
          <div>
            <dt>输出维度</dt>
            <dd>
              {computation.output.length}×{computation.output[0]?.length ?? 0}
            </dd>
          </div>
        </dl>
      }
    >
      <>
        <svg
          ref={svgRef}
          className="visualization-canvas visualization-canvas--attention"
          viewBox="0 0 620 360"
          role="group"
          aria-label={textAlternative}
        >
          <rect className="visualization-plot-background" width="620" height="360" />
          <text x="30" y="30" className="visualization-annotation">
            查询 token 与当前输出
          </text>
          <rect x="30" y="54" width="150" height="44" rx="4" className="attention-query-box" />
          <text x="105" y="82" textAnchor="middle" className="attention-query-label">
            {tokens[state.queryIndex]}
          </text>
          {tokens.map((token, index) => {
            const y = 132 + index * 38;
            const weight = selected[index] ?? 0;
            return (
              <g key={token}>
                <line
                  x1="106"
                  y1="99"
                  x2="106"
                  y2={y - 10}
                  className="attention-relation"
                  strokeWidth={(1 + weight * 9).toFixed(8)}
                  opacity={(0.18 + weight * 0.82).toFixed(8)}
                />
                <text x="30" y={y} className="attention-token-label">
                  {token}
                </text>
                <rect
                  x="82"
                  y={y - 15}
                  width={(weight * 110).toFixed(8)}
                  height="10"
                  className="attention-weight-bar"
                />
                <text x="198" y={y - 6} textAnchor="end" className="visualization-annotation">
                  {(weight * 100).toFixed(1)}%
                </text>
              </g>
            );
          })}
          <text x={matrixLeft} y="30" className="visualization-annotation">
            softmax 权重矩阵
          </text>
          {tokens.map((token, column) => (
            <text
              key={`column-${token}`}
              x={matrixLeft + column * cell + cell / 2}
              y={matrixTop - 8}
              textAnchor="middle"
              className="attention-axis-label"
            >
              {token}
            </text>
          ))}
          {rows.map((row, rowIndex) => (
            <g
              key={`row-${tokens[rowIndex]}`}
              role="button"
              tabIndex={0}
              className="attention-select-row"
              aria-label={`${text.selectQuery} ${tokens[rowIndex]}`}
              aria-pressed={state.queryIndex === rowIndex}
              onClick={() => update({ queryIndex: rowIndex })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  update({ queryIndex: rowIndex });
                }
              }}
            >
              <text
                x={matrixLeft - 10}
                y={matrixTop + rowIndex * cell + 30}
                textAnchor="end"
                className="attention-axis-label"
              >
                {tokens[rowIndex]}
              </text>
              {row.map((weight, column) => (
                <g key={`${rowIndex}-${column}`}>
                  <rect
                    x={matrixLeft + column * cell}
                    y={matrixTop + rowIndex * cell}
                    width={cell - 2}
                    height={cell - 2}
                    className={
                      rowIndex === state.queryIndex ? "attention-cell is-current" : "attention-cell"
                    }
                    fillOpacity={(0.08 + weight * 0.92).toFixed(8)}
                  />
                  <text
                    x={matrixLeft + column * cell + (cell - 2) / 2}
                    y={matrixTop + rowIndex * cell + 29}
                    textAnchor="middle"
                    className={
                      weight > 0.34 ? "attention-cell-value is-strong" : "attention-cell-value"
                    }
                  >
                    {weight.toFixed(2)}
                  </text>
                </g>
              ))}
            </g>
          ))}
          <text x={matrixLeft} y="323" className="visualization-annotation">
            每一行的权重和为 1；行表示查询，列表示键。
          </text>
        </svg>
        <section className="attention-query-calculation" aria-label={text.attentionCalculation}>
          <header>
            <h3>
              {text.attentionCalculation} · {tokens[state.queryIndex]}
            </h3>
            <span>{text.attentionInput}</span>
          </header>
          <div className="attention-query-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">token</th>
                  <th scope="col">{text.score}</th>
                  <th scope="col">{text.weight}</th>
                  <th scope="col">{text.value}</th>
                  <th scope="col">{text.contribution}</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token, index) => (
                  <tr key={token} data-masked={state.causal && index > state.queryIndex}>
                    <th scope="row">{token}</th>
                    <td>
                      {formatMatrixValue(computation.maskedScores[state.queryIndex]?.[index] ?? 0)}
                    </td>
                    <td>{(selected[index] ?? 0).toFixed(3)}</td>
                    <td>
                      <StaticMath
                        latex={`\\begin{bmatrix}${(computation.value[index] ?? []).map((v) => v.toFixed(2)).join(" & ")}\\end{bmatrix}`}
                        plainText={(computation.value[index] ?? []).join(", ")}
                      />
                    </td>
                    <td>
                      <StaticMath
                        latex={`\\begin{bmatrix}${(computation.value[index] ?? []).map((v) => (v * (selected[index] ?? 0)).toFixed(3)).join(" & ")}\\end{bmatrix}`}
                        plainText={(computation.value[index] ?? [])
                          .map((v) => (v * (selected[index] ?? 0)).toFixed(3))
                          .join(", ")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="experiment-equation">
            <StaticMath
              display
              latex={`o_{${state.queryIndex + 1}}=\\sum_j a_{${state.queryIndex + 1}j}v_j=\\begin{bmatrix}${(computation.output[state.queryIndex] ?? []).map((v) => v.toFixed(3)).join(" & ")}\\end{bmatrix}`}
              plainText={`${text.output}: ${(computation.output[state.queryIndex] ?? []).map((v) => v.toFixed(3)).join(", ")}`}
            />
          </div>
        </section>
        <details className="attention-computation-trace" aria-label="缩放点积注意力完整计算">
          <summary>{text.attentionMatrices}</summary>
          <header>
            <h3>完整计算流程</h3>
            <p>
              <MathRichTextContent
                value={`$Q$ 与 $K$ 的特征维数为 $d_k=${computation.keyDimension}$，分数除以 $\\sqrt{d_k}$ 后再按温度缩放；注意力矩阵 $A$ 对 $V$ 加权得到输出。`}
              />
            </p>
          </header>
          <div className="attention-computation-grid">
            <MatrixTable
              title={"$Q$（查询）"}
              matrix={computation.query}
              rowLabels={tokens}
              highlightRow={state.queryIndex}
            />
            <MatrixTable title={"$K$（键）"} matrix={computation.key} rowLabels={tokens} />
            <MatrixTable title={"$V$（值）"} matrix={computation.value} rowLabels={tokens} />
            <MatrixTable
              title={"$QK^{\\mathsf T}$（原始分数）"}
              matrix={computation.rawScores}
              rowLabels={tokens}
              highlightRow={state.queryIndex}
            />
            <MatrixTable
              title={`$QK^{\\mathsf T}/\\sqrt{d_k}$（缩放分数，$d_k=${computation.keyDimension}$）`}
              matrix={computation.scaledScores}
              rowLabels={tokens}
              highlightRow={state.queryIndex}
            />
            <MatrixTable title={"Mask（$0$ 保留，$-\\infty$ 屏蔽）"} matrix={computation.mask} />
            <MatrixTable
              title="Mask 后 logits（缩放分数 / 温度）"
              matrix={computation.maskedScores}
              rowLabels={tokens}
              highlightRow={state.queryIndex}
            />
            <MatrixTable
              title="softmax（注意力权重）"
              matrix={computation.weights}
              rowLabels={tokens}
              highlightRow={state.queryIndex}
            />
            <MatrixTable
              title={"$\\operatorname{Output}=AV$"}
              matrix={computation.output}
              rowLabels={tokens}
            />
          </div>
          <p className="visualization-control-note">
            {state.causal
              ? "当前启用因果掩码：未来位置不可读取。"
              : "当前未启用掩码，是双向、非因果计算。"}
            注意力权重表示各值向量在本次输出中的加权比例。
          </p>
        </details>
      </>
    </VisualizationFrame>
  );
}
