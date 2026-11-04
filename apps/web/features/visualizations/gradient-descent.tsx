"use client";

import { SvgMath, MathLabel, StaticMath } from "@one-forth/ui";
import { experimentMathText, learningToolsText } from "@one-forth/config";

import { clamp } from "@one-forth/math-core";
import { useCallback, useMemo, useRef, useState } from "react";
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
import {
  classifyQuadraticDescentStability,
  experimentQuadraticLoss,
  quadraticEigenvalues,
  runExperimentQuadraticDescent,
} from "./science/math-experiment-models";

interface GradientDescentState {
  readonly learningRate: number;
  readonly momentum: number;
  readonly initialX: number;
  readonly initialY: number;
  readonly iterations: number;
  readonly step: number;
  readonly speed: number;
}

const initialState: GradientDescentState = {
  learningRate: 0.22,
  momentum: 0,
  initialX: -4,
  initialY: 2.8,
  iterations: 45,
  step: 45,
  speed: 1,
};

function validateState(value: unknown): GradientDescentState {
  if (!isRecord(value)) return initialState;
  return {
    learningRate: readNumber(value, "learningRate", initialState.learningRate, {
      minimum: 0.01,
      maximum: 1.8,
    }),
    momentum: readNumber(value, "momentum", initialState.momentum, { minimum: 0, maximum: 0.95 }),
    initialX: readNumber(value, "initialX", initialState.initialX, { minimum: -5, maximum: 5 }),
    initialY: readNumber(value, "initialY", initialState.initialY, { minimum: -4, maximum: 4 }),
    iterations: readInteger(value, "iterations", initialState.iterations, {
      minimum: 8,
      maximum: 80,
    }),
    step: readInteger(value, "step", initialState.step, { minimum: 0, maximum: 80 }),
    speed: readPlaybackSpeed(value, "speed", initialState.speed),
  };
}

function toRecord(state: GradientDescentState): Readonly<Record<string, unknown>> {
  return { ...state };
}

const plot = { left: 20, top: 20, width: 480, height: 300 };

function plotPoint(point: Readonly<{ x: number; y: number }>): Readonly<{ x: number; y: number }> {
  const visibleX = clamp(point.x, -5.5, 5.5);
  const visibleY = clamp(point.y, -4.4, 4.4);
  return {
    x: plot.left + ((visibleX + 5) / 10) * plot.width,
    y: plot.top + ((4 - visibleY) / 8) * plot.height,
  };
}

function contourPath(level: number): string {
  return (
    Array.from({ length: 81 }, (_, index) => {
      const angle = (index / 80) * Math.PI * 2;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      const radius = Math.sqrt(level / experimentQuadraticLoss(direction));
      const point = plotPoint({ x: direction.x * radius, y: direction.y * radius });
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }).join(" ") + " Z"
  );
}

export function GradientDescent({ locale }: VisualizationComponentProps) {
  const text = learningToolsText[locale];
  const [compare, setCompare] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    "gradient-descent",
    initialState,
    validateState,
    toRecord,
    locale,
  );
  const steps = useMemo(
    () =>
      runExperimentQuadraticDescent({
        learningRate: state.learningRate,
        momentum: state.momentum,
        iterations: state.iterations,
        initialPoint: { x: state.initialX, y: state.initialY },
      }),
    [state.initialX, state.initialY, state.iterations, state.learningRate, state.momentum],
  );
  const maximumStep = Math.max(0, steps.length - 1);
  const baseline = useMemo(
    () =>
      runExperimentQuadraticDescent({
        learningRate: state.learningRate,
        momentum: 0,
        iterations: state.iterations,
        initialPoint: { x: state.initialX, y: state.initialY },
      }),
    [state.learningRate, state.iterations, state.initialX, state.initialY],
  );
  const effectiveStep = Math.min(state.step, maximumStep);
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
  const exports = useSvgExportHandlers(svgRef);
  const metadata = visualizationMetadata("gradient-descent", locale);
  const visibleSteps = steps.slice(0, effectiveStep + 1);
  const current = steps[effectiveStep] ?? steps[0];
  if (!current) throw new Error("梯度下降没有生成可用步骤。");
  const currentPoint = plotPoint(current.point);
  const gradientEnd = plotPoint({
    x: current.point.x - current.gradient.x * 0.28,
    y: current.point.y - current.gradient.y * 0.28,
  });
  const trajectory = visibleSteps
    .map((step, index) => {
      const point = plotPoint(step.point);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
  const finiteLosses = steps.map((step) => step.loss).filter(Number.isFinite);
  const maximumLoss = Math.max(
    1,
    ...finiteLosses,
    ...(compare ? baseline.map((step) => step.loss).filter(Number.isFinite) : []),
  );
  const baselineVisible = baseline.slice(0, effectiveStep + 1);
  const baselineTrajectory = baselineVisible
    .map((step, index) => {
      const point = plotPoint(step.point);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
  const baselineLossPath = baselineVisible
    .map(
      (step, index) =>
        `${index === 0 ? "M" : "L"} ${535 + (index / Math.max(1, maximumStep)) * 205} ${305 - clamp(Math.log1p(Math.max(0, step.loss)) / Math.log1p(maximumLoss), 0, 1) * 255}`,
    )
    .join(" ");
  const lossPath = visibleSteps
    .map((step, index) => {
      const x = 535 + (index / Math.max(1, maximumStep)) * 205;
      const y =
        305 - clamp(Math.log1p(Math.max(0, step.loss)) / Math.log1p(maximumLoss), 0, 1) * 255;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const initialLoss = steps[0]?.loss ?? current.loss;
  const stability = classifyQuadraticDescentStability(state.learningRate, state.momentum);
  const explanation =
    stability.classification === "unstable"
      ? `学习率超过该二次模型的解析稳定上界 ${stability.criticalLearningRate.toFixed(3)}；最大曲率模态最终会放大。`
      : stability.classification === "critical"
        ? `学习率位于该二次模型的临界边界 ${stability.criticalLearningRate.toFixed(3)}；最大曲率模态不会渐近衰减。`
        : state.momentum > 0 && current.loss > initialLoss
          ? `参数仍位于该二次模型的解析稳定区间内，但动量造成了暂时的损失上升；稳定不等于逐步单调。`
          : `当前参数满足此正定二次模型的收敛条件。`;

  function updateParameter(patch: Partial<GradientDescentState>): void {
    playback.pause();
    setState((currentState) => ({ ...currentState, ...patch, step: 0 }));
  }

  const controls = (
    <div className="visualization-controls visualization-controls--optimization">
      <div className="visualization-presets">
        <button
          type="button"
          onClick={() => updateParameter({ learningRate: 0.22, momentum: 0.5 })}
        >
          {text.momentumPreset}
        </button>
        <button type="button" onClick={() => updateParameter({ learningRate: 0.8, momentum: 0.5 })}>
          {text.stabilityPreset}
        </button>
      </div>
      <label className="visualization-toggle">
        <input
          type="checkbox"
          checked={compare}
          onChange={(event) => setCompare(event.target.checked)}
        />
        <span>{text.gdCompare}</span>
      </label>
      <label>
        <span>
          <MathLabel {...experimentMathText[locale].learningRate} />
        </span>
        <input
          type="range"
          min="0.01"
          max="1.8"
          step="0.01"
          value={state.learningRate}
          onChange={(event) => updateParameter({ learningRate: Number(event.target.value) })}
        />
        <output>{state.learningRate.toFixed(2)}</output>
      </label>
      <label>
        <span>
          <MathLabel {...experimentMathText[locale].momentum} />
        </span>
        <input
          type="range"
          min="0"
          max="0.95"
          step="0.05"
          value={state.momentum}
          onChange={(event) => updateParameter({ momentum: Number(event.target.value) })}
        />
        <output>{state.momentum.toFixed(2)}</output>
      </label>
      <label className="optimization-coordinate">
        <span>
          <MathLabel {...experimentMathText[locale].initialX} />
        </span>
        <input
          type="number"
          min="-5"
          max="5"
          step="0.1"
          value={state.initialX}
          onChange={(event) =>
            updateParameter({
              initialX: readInputNumber(event.target.value, state.initialX, {
                minimum: -5,
                maximum: 5,
              }),
            })
          }
        />
      </label>
      <label className="optimization-coordinate">
        <span>
          <MathLabel {...experimentMathText[locale].initialY} />
        </span>
        <input
          type="number"
          min="-4"
          max="4"
          step="0.1"
          value={state.initialY}
          onChange={(event) =>
            updateParameter({
              initialY: readInputNumber(event.target.value, state.initialY, {
                minimum: -4,
                maximum: 4,
              }),
            })
          }
        />
      </label>
      <label>
        <span>迭代次数</span>
        <input
          type="number"
          min="8"
          max="80"
          step="1"
          value={state.iterations}
          onChange={(event) =>
            updateParameter({
              iterations: Math.round(
                readInputNumber(event.target.value, state.iterations, { minimum: 8, maximum: 80 }),
              ),
            })
          }
        />
      </label>
      <button
        type="button"
        onClick={() => updateParameter({ momentum: state.momentum > 0 ? 0 : 0.8 })}
      >
        {state.momentum > 0 ? "切换为普通梯度下降" : "切换为动量法"}
      </button>
      <fieldset>
        <legend>解析稳定性预设</legend>
        <div className="visualization-presets">
          <button
            type="button"
            onClick={() => updateParameter({ learningRate: stability.criticalLearningRate * 0.5 })}
          >
            稳定区间
          </button>
          <button
            type="button"
            onClick={() => updateParameter({ learningRate: stability.criticalLearningRate })}
          >
            临界边界
          </button>
          <button
            type="button"
            onClick={() => updateParameter({ learningRate: stability.criticalLearningRate * 1.08 })}
          >
            不稳定区间
          </button>
        </div>
      </fieldset>
    </div>
  );

  const textAlternative = `从固定初值 (${state.initialX.toFixed(2)}, ${state.initialY.toFixed(2)}) 确定性计算。第 ${effectiveStep} 次迭代位于 (${current.point.x.toFixed(3)}, ${current.point.y.toFixed(3)})，损失 ${current.loss.toExponential(3)}，梯度 (${current.gradient.x.toFixed(3)}, ${current.gradient.y.toFixed(3)})，速度 (${current.velocity.x.toFixed(3)}, ${current.velocity.y.toFixed(3)})。Hessian 特征值范围为 ${quadraticEigenvalues().minimum.toFixed(3)} 至 ${quadraticEigenvalues().maximum.toFixed(3)}。${explanation}`;

  return (
    <VisualizationFrame
      id="gradient-descent"
      locale={locale}
      title={metadata.title}
      description={metadata.description}
      playback={playback}
      onReset={() => {
        playback.pause();
        setState(initialState);
      }}
      onSpeedChange={(speed) => setState((current) => ({ ...current, speed }))}
      shareUrl={shareUrl}
      exports={exports}
      controls={controls}
      textAlternative={textAlternative}
      notice={notice}
      status={explanation}
      metrics={
        <dl>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].loss} />
            </dt>
            <dd>{Number.isFinite(current.loss) ? current.loss.toExponential(3) : "∞"}</dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].gradientNorm} />
            </dt>
            <dd>{Math.hypot(current.gradient.x, current.gradient.y).toFixed(3)}</dd>
          </div>
          <div>
            <dt>解析稳定性</dt>
            <dd>
              {stability.classification === "stable"
                ? "稳定"
                : stability.classification === "critical"
                  ? "临界"
                  : "不稳定"}
            </dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].criticalRate} />
            </dt>
            <dd>{stability.criticalLearningRate.toFixed(3)}</dd>
          </div>
        </dl>
      }
    >
      <div className="experiment-stage">
        <svg
          ref={svgRef}
          className="visualization-canvas visualization-canvas--gradient-descent"
          viewBox="0 0 760 340"
          role="img"
          aria-label={textAlternative}
        >
          <rect className="visualization-plot-background" x="0" y="0" width="760" height="340" />
          {[0.8, 2, 4.5, 8, 14].map((level, index) => (
            <path
              key={level}
              d={contourPath(level)}
              className={`visualization-contour visualization-contour--${index + 1}`}
            />
          ))}
          <line
            x1={plot.left}
            y1={plot.top + plot.height / 2}
            x2={plot.left + plot.width}
            y2={plot.top + plot.height / 2}
            className="visualization-axis"
          />
          <line
            x1={plot.left + plot.width / 2}
            y1={plot.top}
            x2={plot.left + plot.width / 2}
            y2={plot.top + plot.height}
            className="visualization-axis"
          />
          {compare ? <path d={baselineTrajectory} className="optimization-baseline" /> : null}
          <path d={trajectory} className="visualization-trajectory" />
          {visibleSteps.map((step) => {
            const point = plotPoint(step.point);
            return (
              <circle
                key={step.index}
                cx={point.x}
                cy={point.y}
                r={step.index === effectiveStep ? 5 : 2.5}
                className={
                  step.index === effectiveStep
                    ? "visualization-point visualization-point--current"
                    : "visualization-point"
                }
              />
            );
          })}
          <line
            x1={currentPoint.x}
            y1={currentPoint.y}
            x2={gradientEnd.x}
            y2={gradientEnd.y}
            className="visualization-vector visualization-vector--gradient"
          />
          <SvgMath
            x={28}
            y={15}
            width={450}
            latex="L(x,y)=0.4x^2+1.25y^2+0.25xy"
            label="L(x,y) = 0.4x² + 1.25y² + 0.25xy"
          />
          <g className="visualization-loss-chart" aria-label="损失曲线">
            <line x1="530" y1="305" x2="745" y2="305" className="visualization-axis" />
            <line x1="530" y1="35" x2="530" y2="305" className="visualization-axis" />
            {compare ? <path d={baselineLossPath} className="optimization-baseline" /> : null}
            <path d={lossPath} className="visualization-loss-path" />
            <SvgMath x={535} y={10} width={200} latex={"\\log(1+L)"} label="log(1 + L)" />
          </g>
        </svg>
        <div className="experiment-legend">
          <span className="legend-gradient">
            {text.currentMethod} · {current.loss.toExponential(2)}
          </span>
          {compare ? (
            <span className="legend-secondary legend-dashed">
              {text.baselineMethod} · {(baselineVisible.at(-1)?.loss ?? 0).toExponential(2)}
            </span>
          ) : null}
        </div>
        <div className="experiment-equation">
          <StaticMath
            display
            latex={"v_{k+1}=\\beta v_k-\\eta\\nabla L(x_k),\\qquad x_{k+1}=x_k+v_{k+1}"}
          />
          <StaticMath
            display
            latex={`x_{${effectiveStep}}=\\begin{bmatrix}${current.point.x.toFixed(3)}\\\\${current.point.y.toFixed(3)}\\end{bmatrix},\\quad \\nabla L(x_{${effectiveStep}})=\\begin{bmatrix}${current.gradient.x.toFixed(3)}\\\\${current.gradient.y.toFixed(3)}\\end{bmatrix}`}
          />
        </div>
      </div>
    </VisualizationFrame>
  );
}
