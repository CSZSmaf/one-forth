"use client";

import { SvgMath, MathLabel } from "@one-forth/ui";
import { experimentMathText } from "@one-forth/config";

import { clamp } from "@one-forth/math-core";
import { useCallback, useId, useMemo, useRef } from "react";
import { useSvgExportHandlers } from "./export";
import { visualizationMetadata } from "./metadata";
import { usePlayback } from "./playback";
import {
  isRecord,
  readInputNumber,
  readInteger,
  readPlaybackSpeed,
  useUrlBackedVisualizationState,
} from "./state";
import type { VisualizationComponentProps } from "./types";
import { VisualizationFrame } from "./visualization-frame";
import {
  directionalDerivativeSnapshot,
  gradientSurfaceModels,
} from "./science/math-experiment-models";
import type { GradientSurfaceId } from "./science/math-experiment-models";

type SurfaceId = GradientSurfaceId;

interface GradientFieldState {
  readonly surface: SurfaceId;
  readonly pointX: number;
  readonly pointY: number;
  readonly directionDegrees: number;
  readonly step: number;
  readonly speed: number;
}

const maximumStep = 72;
const initialState: GradientFieldState = {
  surface: "coupled",
  pointX: 1.4,
  pointY: -0.8,
  directionDegrees: 25,
  step: 0,
  speed: 1,
};

const surfaceLabels: Readonly<Record<SurfaceId, string>> = {
  bowl: "椭圆碗面",
  saddle: "鞍面",
  coupled: "耦合二次面",
};

function validateState(value: unknown): GradientFieldState {
  if (!isRecord(value)) return initialState;
  const surface =
    value.surface === "bowl" || value.surface === "saddle" || value.surface === "coupled"
      ? value.surface
      : initialState.surface;
  return {
    surface,
    pointX:
      typeof value.pointX === "number" && Number.isFinite(value.pointX)
        ? clamp(value.pointX, -3, 3)
        : initialState.pointX,
    pointY:
      typeof value.pointY === "number" && Number.isFinite(value.pointY)
        ? clamp(value.pointY, -2.4, 2.4)
        : initialState.pointY,
    directionDegrees:
      typeof value.directionDegrees === "number" && Number.isFinite(value.directionDegrees)
        ? clamp(value.directionDegrees, -180, 180)
        : initialState.directionDegrees,
    step: readInteger(value, "step", initialState.step, { minimum: 0, maximum: maximumStep }),
    speed: readPlaybackSpeed(value, "speed", initialState.speed),
  };
}

function toRecord(state: GradientFieldState): Readonly<Record<string, unknown>> {
  return { ...state };
}

const plot = { left: 34, top: 28, width: 552, height: 304 };

function screenPoint(x: number, y: number) {
  return {
    x: plot.left + ((x + 3) / 6) * plot.width,
    y: plot.top + ((2.4 - y) / 4.8) * plot.height,
  };
}

function vectorEnd(x: number, y: number, dx: number, dy: number, length = 20) {
  const magnitude = Math.max(0.001, Math.hypot(dx, dy));
  const start = screenPoint(x, y);
  return {
    start,
    end: { x: start.x + (dx / magnitude) * length, y: start.y - (dy / magnitude) * length },
    magnitude,
  };
}

export function GradientField({ locale }: VisualizationComponentProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerId = `gradient-field-arrow-${useId().replaceAll(":", "")}`;
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    "gradient-field",
    initialState,
    validateState,
    toRecord,
    locale,
  );
  const setStep = useCallback(
    (step: number) => setState((current) => ({ ...current, step })),
    [setState],
  );
  const playback = usePlayback({
    step: state.step,
    maximumStep,
    speed: state.speed,
    onStepChange: setStep,
  });
  const exports = useSvgExportHandlers(svgRef);
  const metadata = visualizationMetadata("gradient-field", locale);
  const surface = gradientSurfaceModels[state.surface];
  const animatedAngle =
    ((state.directionDegrees + (state.step / maximumStep) * 360) * Math.PI) / 180;
  const direction = { x: Math.cos(animatedAngle), y: Math.sin(animatedAngle) };
  const derivativeCheck = directionalDerivativeSnapshot(
    state.surface,
    { x: state.pointX, y: state.pointY },
    direction,
  );
  const gradient = derivativeCheck.gradient;
  const derivative = derivativeCheck.analyticDerivative;
  const gradientMagnitude = Math.hypot(gradient.x, gradient.y);
  const selectedPoint = screenPoint(state.pointX, state.pointY);
  const selectedGradient = vectorEnd(state.pointX, state.pointY, gradient.x, gradient.y, 58);
  const selectedDirection = vectorEnd(
    state.pointX,
    state.pointY,
    derivativeCheck.unitDirection.x,
    derivativeCheck.unitDirection.y,
    46,
  );

  const field = useMemo(() => {
    const vectors: Array<ReturnType<typeof vectorEnd> & { readonly key: string }> = [];
    for (let y = -2; y <= 2.01; y += 0.67) {
      for (let x = -2.75; x <= 2.76; x += 0.69) {
        const gradientAtPoint = surface.gradient(x, y);
        vectors.push({
          ...vectorEnd(x, y, gradientAtPoint.x, gradientAtPoint.y, 13),
          key: `${x.toFixed(2)}:${y.toFixed(2)}`,
        });
      }
    }
    return vectors;
  }, [surface]);

  function update(patch: Partial<GradientFieldState>) {
    playback.pause();
    setState((current) => ({ ...current, ...patch, step: 0 }));
  }

  const controls = (
    <div className="visualization-controls visualization-controls--gradient-field">
      <label>
        <span>曲面</span>
        <select
          value={state.surface}
          onChange={(event) => update({ surface: event.target.value as SurfaceId })}
        >
          {(Object.keys(gradientSurfaceModels) as SurfaceId[]).map((id) => (
            <option key={id} value={id}>
              {surfaceLabels[id]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>
          <MathLabel {...experimentMathText[locale].pointX} />
        </span>
        <input
          type="range"
          min="-3"
          max="3"
          step="0.1"
          value={state.pointX}
          onChange={(event) => update({ pointX: Number(event.target.value) })}
        />
        <output>{state.pointX.toFixed(1)}</output>
      </label>
      <label>
        <span>
          <MathLabel {...experimentMathText[locale].pointY} />
        </span>
        <input
          type="range"
          min="-2.4"
          max="2.4"
          step="0.1"
          value={state.pointY}
          onChange={(event) => update({ pointY: Number(event.target.value) })}
        />
        <output>{state.pointY.toFixed(1)}</output>
      </label>
      <label>
        <span>方向角</span>
        <input
          type="number"
          min="-180"
          max="180"
          step="5"
          value={state.directionDegrees}
          onChange={(event) =>
            update({
              directionDegrees: readInputNumber(event.target.value, state.directionDegrees, {
                minimum: -180,
                maximum: 180,
              }),
            })
          }
        />
        <span>度</span>
      </label>
    </div>
  );

  const directionRelation =
    gradientMagnitude < 1e-8
      ? "该点为驻点，所有单位方向的一阶方向导数都为零。"
      : derivative > gradientMagnitude * 0.9
        ? "当前方向接近梯度方向，增长率接近最大值。"
        : derivative < -gradientMagnitude * 0.9
          ? "当前方向接近负梯度方向，函数下降最快。"
          : Math.abs(derivative) < gradientMagnitude * 0.12
            ? "当前方向近似垂直于梯度，一阶变化接近零。"
            : derivative > 0
              ? "沿当前方向移动时函数值上升。"
              : "沿当前方向移动时函数值下降。";
  const textAlternative = `曲面 ${surface.formula}。观察点 (${state.pointX.toFixed(1)}, ${state.pointY.toFixed(1)}) 的梯度向量为 (${gradient.x.toFixed(2)}, ${gradient.y.toFixed(2)})，模长 ${gradientMagnitude.toFixed(2)}。当前单位方向向量为 (${derivativeCheck.unitDirection.x.toFixed(2)}, ${derivativeCheck.unitDirection.y.toFixed(2)})。两向量的内积 ∇f·u 是标量方向导数 ${derivative.toFixed(4)}，中心差分为 ${derivativeCheck.centralDifferenceDerivative.toFixed(4)}，绝对误差 ${derivativeCheck.absoluteError.toExponential(2)}。${directionRelation}`;

  return (
    <VisualizationFrame
      id="gradient-field"
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
      status={`∇f 与 u 是向量，内积 ∇f·u 是标量方向导数。${directionRelation} 中心差分核对的绝对误差为 ${derivativeCheck.absoluteError.toExponential(2)}。`}
      metrics={
        <dl>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].directionalDerivative} />
            </dt>
            <dd>{derivative.toFixed(3)}</dd>
          </div>
          <div>
            <dt>中心差分</dt>
            <dd>{derivativeCheck.centralDifferenceDerivative.toFixed(3)}</dd>
          </div>
          <div>
            <dt>绝对误差</dt>
            <dd>{derivativeCheck.absoluteError.toExponential(2)}</dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].fieldGradientNorm} />
            </dt>
            <dd>{gradientMagnitude.toFixed(3)}</dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].gradientVector} />
            </dt>
            <dd>
              ({gradient.x.toFixed(2)}, {gradient.y.toFixed(2)})
            </dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].unitVector} />
            </dt>
            <dd>
              ({derivativeCheck.unitDirection.x.toFixed(2)},{" "}
              {derivativeCheck.unitDirection.y.toFixed(2)})
            </dd>
          </div>
          <div>
            <dt>当前角度</dt>
            <dd>{Math.round((animatedAngle * 180) / Math.PI)}°</dd>
          </div>
        </dl>
      }
    >
      <svg
        ref={svgRef}
        className="visualization-canvas visualization-canvas--gradient-field"
        viewBox="0 0 620 360"
        role="img"
        aria-label={textAlternative}
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="visualization-arrowhead" />
          </marker>
        </defs>
        <rect className="visualization-plot-background" width="620" height="360" />
        <line
          x1={plot.left}
          y1={180}
          x2={plot.left + plot.width}
          y2={180}
          className="visualization-axis"
        />
        <line
          x1={310}
          y1={plot.top}
          x2={310}
          y2={plot.top + plot.height}
          className="visualization-axis"
        />
        {field.map((vector) => (
          <line
            key={vector.key}
            x1={vector.start.x}
            y1={vector.start.y}
            x2={vector.end.x}
            y2={vector.end.y}
            className="gradient-field__vector"
            markerEnd={`url(#${markerId})`}
          />
        ))}
        <line
          x1={selectedGradient.start.x}
          y1={selectedGradient.start.y}
          x2={selectedGradient.end.x}
          y2={selectedGradient.end.y}
          className="visualization-vector visualization-vector--gradient"
          markerEnd={`url(#${markerId})`}
        />
        <line
          x1={selectedDirection.start.x}
          y1={selectedDirection.start.y}
          x2={selectedDirection.end.x}
          y2={selectedDirection.end.y}
          className="gradient-field__direction"
          markerEnd={`url(#${markerId})`}
        />
        <circle
          cx={selectedPoint.x}
          cy={selectedPoint.y}
          r="6"
          className="visualization-point visualization-point--current"
        />
        <SvgMath
          x={22}
          y={3}
          width={570}
          latex={surface.formula.replaceAll("²", "^2").replaceAll("−", "-")}
          label={surface.formula}
        />
        <text
          x={selectedPoint.x + 10}
          y={selectedPoint.y - 10}
          className="visualization-annotation"
        >
          p
        </text>
      </svg>
    </VisualizationFrame>
  );
}
