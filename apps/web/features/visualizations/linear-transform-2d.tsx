"use client";

import { SvgMath, MathLabel, StaticMath } from "@one-forth/ui";
import { experimentMathText, learningToolsText } from "@one-forth/config";

import { clamp } from "@one-forth/math-core";
import type { Matrix2, Vector2 } from "@one-forth/math-core";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useSvgExportHandlers } from "./export";
import { visualizationMetadata } from "./metadata";
import { usePlayback } from "./playback";
import {
  isRecord,
  readInputNumber,
  readInteger,
  readNumber,
  readPlaybackSpeed,
  useUrlBackedVisualizationState,
} from "./state";
import type { VisualizationComponentProps } from "./types";
import { VisualizationFrame } from "./visualization-frame";
import { applyMatrix2, linearTransformSnapshot } from "./science/math-experiment-models";

interface LinearTransformState {
  readonly matrix: Matrix2;
  readonly step: number;
  readonly speed: number;
  readonly inputX: number;
  readonly inputY: number;
}

const maximumStep = 60;
const initialState: LinearTransformState = {
  matrix: [1.25, 0.55, -0.2, 1.05],
  step: maximumStep,
  speed: 1,
  inputX: 1,
  inputY: 1,
};

const presets: readonly {
  readonly id: string;
  readonly label: string;
  readonly matrix: Matrix2;
}[] = [
  { id: "identity", label: "单位", matrix: [1, 0, 0, 1] },
  {
    id: "rotation",
    label: "旋转 45°",
    matrix: [Math.SQRT1_2, -Math.SQRT1_2, Math.SQRT1_2, Math.SQRT1_2],
  },
  { id: "scale", label: "非均匀缩放", matrix: [1.65, 0, 0, 0.7] },
  { id: "shear", label: "剪切", matrix: [1, 0.9, 0, 1] },
  { id: "projection", label: "投影", matrix: [1, 0, 0, 0] },
  { id: "reflection", label: "方向翻转", matrix: [-1, 0, 0, 1] },
  { id: "rank-one", label: "秩一压缩", matrix: [1, 0.5, 2, 1] },
  { id: "zero", label: "零变换", matrix: [0, 0, 0, 0] },
];

function validateState(value: unknown): LinearTransformState {
  if (!isRecord(value)) return initialState;
  const rawMatrix = value.matrix;
  const matrix: Matrix2 =
    Array.isArray(rawMatrix) && rawMatrix.length === 4
      ? [
          typeof rawMatrix[0] === "number" && Number.isFinite(rawMatrix[0])
            ? clamp(rawMatrix[0], -3, 3)
            : initialState.matrix[0],
          typeof rawMatrix[1] === "number" && Number.isFinite(rawMatrix[1])
            ? clamp(rawMatrix[1], -3, 3)
            : initialState.matrix[1],
          typeof rawMatrix[2] === "number" && Number.isFinite(rawMatrix[2])
            ? clamp(rawMatrix[2], -3, 3)
            : initialState.matrix[2],
          typeof rawMatrix[3] === "number" && Number.isFinite(rawMatrix[3])
            ? clamp(rawMatrix[3], -3, 3)
            : initialState.matrix[3],
        ]
      : initialState.matrix;
  return {
    matrix,
    step: readInteger(value, "step", initialState.step, { minimum: 0, maximum: maximumStep }),
    speed: readPlaybackSpeed(value, "speed", initialState.speed),
    inputX: readNumber(value, "inputX", 1, { minimum: -2, maximum: 2 }),
    inputY: readNumber(value, "inputY", 1, { minimum: -2, maximum: 2 }),
  };
}

function toRecord(state: LinearTransformState): Readonly<Record<string, unknown>> {
  return { ...state, matrix: [...state.matrix] };
}

const centre = { x: 250, y: 170 };
function matrixWithCell(matrix: Matrix2, index: number, value: number): Matrix2 {
  if (index === 0) return [value, matrix[1], matrix[2], matrix[3]];
  if (index === 1) return [matrix[0], value, matrix[2], matrix[3]];
  if (index === 2) return [matrix[0], matrix[1], value, matrix[3]];
  return [matrix[0], matrix[1], matrix[2], value];
}

export function LinearTransform2D({ locale }: VisualizationComponentProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerId = `linear-arrow-${useId().replaceAll(":", "")}`;
  const [draggingBasis, setDraggingBasis] = useState<0 | 1 | null>(null);
  const [showArea, setShowArea] = useState(true);
  const [showVector, setShowVector] = useState(true);
  const text = learningToolsText[locale];
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    "linear-transform-2d",
    initialState,
    validateState,
    toRecord,
    locale,
  );
  const setStep = useCallback(
    (step: number) => {
      setState((current) => ({ ...current, step }));
    },
    [setState],
  );
  const playback = usePlayback({
    step: state.step,
    maximumStep,
    speed: state.speed,
    onStepChange: setStep,
  });
  const exports = useSvgExportHandlers(svgRef);
  const progress = state.step / maximumStep;
  const current = useMemo(
    () => linearTransformSnapshot(state.matrix, progress),
    [progress, state.matrix],
  );
  const target = useMemo(() => linearTransformSnapshot(state.matrix, 1), [state.matrix]);
  const currentMatrix = current.matrix;
  const determinant = current.determinant;
  const firstBasis = current.firstBasis;
  const secondBasis = current.secondBasis;
  const metadata = visualizationMetadata("linear-transform-2d", locale);
  const input = { x: state.inputX, y: state.inputY };
  const output = applyMatrix2(currentMatrix, input);
  const targetOutput = applyMatrix2(state.matrix, input);
  const extent = [
    input,
    targetOutput,
    target.firstBasis,
    target.secondBasis,
    {
      x: target.firstBasis.x + target.secondBasis.x,
      y: target.firstBasis.y + target.secondBasis.y,
    },
    { x: target.firstBasis.x * input.x, y: target.firstBasis.y * input.x },
  ];
  const pixelsPerUnit = Math.min(
    48,
    225 / (Math.max(1, ...extent.map((point) => Math.abs(point.x))) + 0.5),
    140 / (Math.max(1, ...extent.map((point) => Math.abs(point.y))) + 0.5),
  );
  const screenPoint = useCallback(
    (vector: Vector2): Vector2 => ({
      x: centre.x + vector.x * pixelsPerUnit,
      y: centre.y - vector.y * pixelsPerUnit,
    }),
    [pixelsPerUnit],
  );
  const pathBetween = useCallback(
    (start: Vector2, end: Vector2): string => {
      const a = screenPoint(start);
      const b = screenPoint(end);
      return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
    },
    [screenPoint],
  );
  const firstComponent = { x: firstBasis.x * input.x, y: firstBasis.y * input.x };
  const square = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const polygon = (points: readonly Vector2[]) =>
    points
      .map((point) => {
        const screen = screenPoint(point);
        return `${screen.x},${screen.y}`;
      })
      .join(" ");

  const gridPaths = useMemo(() => {
    const paths: { key: string; path: string; major: boolean }[] = [];
    for (let value = -4; value <= 4; value += 1) {
      paths.push({
        key: `vertical-${value}`,
        path: pathBetween(
          applyMatrix2(currentMatrix, { x: value, y: -4 }),
          applyMatrix2(currentMatrix, { x: value, y: 4 }),
        ),
        major: value === 0,
      });
      paths.push({
        key: `horizontal-${value}`,
        path: pathBetween(
          applyMatrix2(currentMatrix, { x: -4, y: value }),
          applyMatrix2(currentMatrix, { x: 4, y: value }),
        ),
        major: value === 0,
      });
    }
    return paths;
  }, [currentMatrix, pathBetween]);

  function updateMatrix(matrix: Matrix2): void {
    playback.pause();
    setState((current) => ({ ...current, matrix, step: maximumStep }));
  }

  function pointerToVector(event: ReactPointerEvent<SVGSVGElement>): Vector2 {
    const bounds = event.currentTarget.getBoundingClientRect();
    const matrix = event.currentTarget.getScreenCTM?.();
    const point = matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      : null;
    const x = point?.x ?? ((event.clientX - bounds.left) / bounds.width) * 500;
    const y = point?.y ?? ((event.clientY - bounds.top) / bounds.height) * 340;
    return {
      x: Math.round(clamp((x - centre.x) / pixelsPerUnit, -3, 3) * 100) / 100,
      y: Math.round(clamp((centre.y - y) / pixelsPerUnit, -3, 3) * 100) / 100,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    if (draggingBasis === null) return;
    const vector = pointerToVector(event);
    const matrix = state.matrix;
    updateMatrix(
      draggingBasis === 0
        ? [vector.x, matrix[1], vector.y, matrix[3]]
        : [matrix[0], vector.x, matrix[2], vector.y],
    );
  }

  function handleBasisKey(event: ReactKeyboardEvent<SVGCircleElement>, basis: 0 | 1): void {
    const delta = event.shiftKey ? 0.25 : 0.1;
    const movement =
      event.key === "ArrowLeft"
        ? { x: -delta, y: 0 }
        : event.key === "ArrowRight"
          ? { x: delta, y: 0 }
          : event.key === "ArrowUp"
            ? { x: 0, y: delta }
            : event.key === "ArrowDown"
              ? { x: 0, y: -delta }
              : null;
    if (!movement) return;
    event.preventDefault();
    event.stopPropagation();
    const matrix = state.matrix;
    updateMatrix(
      basis === 0
        ? [
            clamp(matrix[0] + movement.x, -3, 3),
            matrix[1],
            clamp(matrix[2] + movement.y, -3, 3),
            matrix[3],
          ]
        : [
            matrix[0],
            clamp(matrix[1] + movement.x, -3, 3),
            matrix[2],
            clamp(matrix[3] + movement.y, -3, 3),
          ],
    );
  }

  const direction =
    determinant < -1e-6
      ? "方向已翻转"
      : Math.abs(determinant) <= 1e-6
        ? "空间被压缩到低维"
        : "方向保持";
  const textAlternative = `当前插值矩阵为 [${currentMatrix.map((value) => value.toFixed(2)).join(", ")}], 行列式与单位正方形的有向面积倍率均为 ${determinant.toFixed(3)}，普通面积倍率为 ${current.areaScale.toFixed(3)}，秩为 ${current.rank}，${direction}。第一基向量终点 (${firstBasis.x.toFixed(2)}, ${firstBasis.y.toFixed(2)})，第二基向量终点 (${secondBasis.x.toFixed(2)}, ${secondBasis.y.toFixed(2)})。`;

  const targetStatus = target.singular
    ? target.rank === 0
      ? "目标是零变换：所有向量都映到原点，面积为零。"
      : target.targetIsProjection
        ? "目标是秩一投影：A²=A，二维面积压缩为零。"
        : "目标是秩一奇异变换：平面压缩到一条直线，面积为零。"
    : `目标矩阵行列式为 ${target.determinant.toFixed(3)}；${target.determinant < 0 ? "有向面积变号，方向翻转。" : "有向面积保持正号。"}`;

  const controls = (
    <div className="visualization-controls visualization-controls--matrix">
      <fieldset>
        <legend>
          <MathLabel {...experimentMathText[locale].matrix} />
        </legend>
        <div className="matrix-control" role="group" aria-label="二乘二矩阵">
          {state.matrix.map((value, index) => (
            <label key={index} className="matrix-control__cell">
              <MathLabel
                label={`a${Math.floor(index / 2) + 1}${(index % 2) + 1}`}
                value={`$a_{${Math.floor(index / 2) + 1}${(index % 2) + 1}}$`}
              />
              <input
                type="number"
                min={-3}
                max={3}
                step={0.05}
                value={value}
                onChange={(event) =>
                  updateMatrix(
                    matrixWithCell(
                      state.matrix,
                      index,
                      readInputNumber(event.target.value, value, { minimum: -3, maximum: 3 }),
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>预设</legend>
        <div className="visualization-presets">
          {presets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => updateMatrix(preset.matrix)}>
              {preset.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{text.inputVector}</legend>
        {(["inputX", "inputY"] as const).map((key, index) => (
          <label key={key}>
            <MathLabel value={`$v_${index + 1}$`} label={`v${index + 1}`} />
            <input
              type="range"
              min={-2}
              max={2}
              step={0.25}
              value={state[key]}
              onChange={(event) =>
                setState((value) => ({ ...value, [key]: Number(event.target.value) }))
              }
            />
            <output>{state[key]}</output>
          </label>
        ))}
      </fieldset>
      <label className="visualization-toggle">
        <input
          type="checkbox"
          checked={showArea}
          onChange={(event) => setShowArea(event.target.checked)}
        />
        <span>{text.showArea}</span>
      </label>
      <label className="visualization-toggle">
        <input
          type="checkbox"
          checked={showVector}
          onChange={(event) => setShowVector(event.target.checked)}
        />
        <span>{text.showVector}</span>
      </label>
      <p className="visualization-control-note">{text.basisHint}</p>
    </div>
  );

  return (
    <VisualizationFrame
      id="linear-transform-2d"
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
      status={targetStatus}
      metrics={
        <dl>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].determinant} />
            </dt>
            <dd>{determinant.toFixed(3)}</dd>
          </div>
          <div>
            <dt>面积缩放</dt>
            <dd>{current.areaScale.toFixed(3)}×</dd>
          </div>
          <div>
            <dt>有向面积</dt>
            <dd>{current.orientedAreaScale.toFixed(3)}×</dd>
          </div>
          <div>
            <dt>秩</dt>
            <dd>{current.rank}</dd>
          </div>
        </dl>
      }
    >
      <div className="experiment-stage">
        <svg
          ref={svgRef}
          className="visualization-canvas visualization-canvas--linear-transform"
          viewBox="0 0 500 340"
          role="group"
          aria-label={textAlternative}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDraggingBasis(null)}
          onPointerCancel={() => setDraggingBasis(null)}
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="visualization-arrowhead" />
            </marker>
          </defs>
          <rect className="visualization-plot-background" x="0" y="0" width="500" height="340" />
          {Array.from({ length: 9 }, (_, i) => i - 4).map((value) => (
            <g key={`original-${value}`} className="linear-original-grid">
              <path d={pathBetween({ x: value, y: -4 }, { x: value, y: 4 })} />
              <path d={pathBetween({ x: -4, y: value }, { x: 4, y: value })} />
            </g>
          ))}
          {gridPaths.map((line) => (
            <path
              key={line.key}
              d={line.path}
              className={line.major ? "visualization-axis" : "visualization-grid-line"}
            />
          ))}
          {showArea ? (
            <g>
              <polygon points={polygon(square)} className="linear-unit-square" />
              <polygon
                points={polygon(square.map((point) => applyMatrix2(currentMatrix, point)))}
                className="linear-area"
                data-area={current.areaScale}
              />
            </g>
          ) : null}
          {showVector ? (
            <g>
              <path d={pathBetween({ x: 0, y: 0 }, input)} className="linear-input-vector" />
              <path
                d={pathBetween({ x: 0, y: 0 }, firstComponent)}
                className="linear-component linear-component--first"
              />
              <path
                d={pathBetween(firstComponent, output)}
                className="linear-component linear-component--second"
              />
              <path
                d={pathBetween({ x: 0, y: 0 }, output)}
                className="linear-output-vector"
                markerEnd={`url(#${markerId})`}
              />
              <circle
                cx={screenPoint(output).x}
                cy={screenPoint(output).y}
                r={4}
                className="linear-output-point"
              />
            </g>
          ) : null}
          <path
            d={pathBetween({ x: 0, y: 0 }, firstBasis)}
            className="visualization-vector visualization-vector--primary"
            markerEnd={`url(#${markerId})`}
          />
          <path
            d={pathBetween({ x: 0, y: 0 }, secondBasis)}
            className="visualization-vector visualization-vector--secondary"
            markerEnd={`url(#${markerId})`}
          />
          <circle
            cx={screenPoint(firstBasis).x}
            cy={screenPoint(firstBasis).y}
            r="9"
            className="visualization-drag-handle visualization-drag-handle--primary"
            role="slider"
            aria-label="拖动第一基向量"
            aria-valuemin={-3}
            aria-valuemax={3}
            aria-valuenow={state.matrix[0]}
            aria-valuetext={`(${state.matrix[0].toFixed(2)}, ${state.matrix[2].toFixed(2)})`}
            tabIndex={0}
            onKeyDown={(event) => handleBasisKey(event, 0)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDraggingBasis(0);
            }}
          />
          <circle
            cx={screenPoint(secondBasis).x}
            cy={screenPoint(secondBasis).y}
            r="9"
            className="visualization-drag-handle visualization-drag-handle--secondary"
            role="slider"
            aria-label="拖动第二基向量"
            aria-valuemin={-3}
            aria-valuemax={3}
            aria-valuenow={state.matrix[1]}
            aria-valuetext={`(${state.matrix[1].toFixed(2)}, ${state.matrix[3].toFixed(2)})`}
            tabIndex={0}
            onKeyDown={(event) => handleBasisKey(event, 1)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDraggingBasis(1);
            }}
          />
          <SvgMath x={16} y={5} width={340} latex="A(t)=(1-t)I+tA" label="A(t) = (1 − t)I + tA" />
        </svg>
        <div className="experiment-legend" aria-label={text.vectorResult}>
          <span className="legend-primary">
            <StaticMath latex="A(t)e_1" plainText="Ae1" />
          </span>
          <span className="legend-secondary">
            <StaticMath latex="A(t)e_2" plainText="Ae2" />
          </span>
          {showVector ? (
            <span className="legend-result">
              <StaticMath latex="A(t)v" plainText="Av" />
            </span>
          ) : null}
          {showArea ? (
            <span>
              {text.transformedArea} {current.areaScale.toFixed(2)}
            </span>
          ) : null}
        </div>
        <div className="experiment-equation" aria-live="off">
          <StaticMath
            display
            latex={`A(t)\\begin{bmatrix}${input.x}\\\\${input.y}\\end{bmatrix}=${input.x}A(t)e_1+${input.y}A(t)e_2=\\begin{bmatrix}${output.x.toFixed(2)}\\\\${output.y.toFixed(2)}\\end{bmatrix}`}
            plainText={`A(t)v = (${output.x.toFixed(2)}, ${output.y.toFixed(2)})`}
          />
        </div>
      </div>
    </VisualizationFrame>
  );
}
