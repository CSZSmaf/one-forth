"use client";

import { SvgMath, MathLabel, StaticMath } from "@one-forth/ui";
import { experimentMathText } from "@one-forth/config";

import { units } from "@one-forth/physics";
import { useCallback, useMemo, useRef } from "react";
import { useSvgExportHandlers } from "./export";
import { visualizationMetadata } from "./metadata";
import { usePlayback } from "./playback";
import {
  createAnalyticalWaveModel,
  diagnoseAnalyticalWaveEquation,
  sampleAnalyticalWave,
  type WaveScenario,
} from "./science/wave-fourier-models";
import {
  isRecord,
  readEnum,
  readInteger,
  readNumber,
  readPlaybackSpeed,
  useUrlBackedVisualizationState,
} from "./state";
import type { VisualizationComponentProps } from "./types";
import { VisualizationFrame } from "./visualization-frame";

interface WaveState {
  readonly amplitudeMetres: number;
  readonly frequencyHertz: number;
  readonly waveSpeedMetresPerSecond: number;
  readonly initialCondition: WaveScenario;
  readonly step: number;
  readonly animationSpeed: number;
}

const initialConditions: readonly WaveScenario[] = ["traveling", "standing", "gaussian"];
const maximumStep = 200;
const secondsPerStep = 0.04;
const initialState: WaveState = {
  amplitudeMetres: 0.65,
  frequencyHertz: 0.55,
  waveSpeedMetresPerSecond: 1.8,
  initialCondition: "traveling",
  step: 0,
  animationSpeed: 1,
};

function validateState(value: unknown): WaveState {
  if (!isRecord(value)) return initialState;
  return {
    amplitudeMetres: readNumber(value, "amplitudeMetres", initialState.amplitudeMetres, {
      minimum: 0.05,
      maximum: 1.5,
    }),
    frequencyHertz: readNumber(value, "frequencyHertz", initialState.frequencyHertz, {
      minimum: 0.1,
      maximum: 2,
    }),
    waveSpeedMetresPerSecond: readNumber(
      value,
      "waveSpeedMetresPerSecond",
      initialState.waveSpeedMetresPerSecond,
      { minimum: 0.2, maximum: 5 },
    ),
    initialCondition: readEnum(
      value,
      "initialCondition",
      initialConditions,
      initialState.initialCondition,
    ),
    step: readInteger(value, "step", initialState.step, { minimum: 0, maximum: maximumStep }),
    animationSpeed: readPlaybackSpeed(value, "animationSpeed", initialState.animationSpeed),
  };
}

function toRecord(state: WaveState): Readonly<Record<string, unknown>> {
  if (state.initialCondition === "gaussian") {
    return {
      amplitudeMetres: state.amplitudeMetres,
      waveSpeedMetresPerSecond: state.waveSpeedMetresPerSecond,
      initialCondition: state.initialCondition,
      step: state.step,
      animationSpeed: state.animationSpeed,
    };
  }
  return { ...state };
}

function unitSymbol(id: string, fallback: string): string {
  return units.find((unit) => unit.id === id)?.symbol ?? fallback;
}

export function WaveEquation1D({ locale }: VisualizationComponentProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    "wave-equation-1d",
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
    speed: state.animationSpeed,
    onStepChange: setStep,
  });
  const model = useMemo(
    () =>
      state.initialCondition === "gaussian"
        ? createAnalyticalWaveModel({
            scenario: "gaussian",
            amplitudeMetres: state.amplitudeMetres,
            waveSpeedMetresPerSecond: state.waveSpeedMetresPerSecond,
            intervalLengthMetres: 10,
            pulseWidthMetres: 0.65,
          })
        : createAnalyticalWaveModel({
            scenario: state.initialCondition,
            amplitudeMetres: state.amplitudeMetres,
            frequencyHertz: state.frequencyHertz,
            waveSpeedMetresPerSecond: state.waveSpeedMetresPerSecond,
          }),
    [
      state.amplitudeMetres,
      state.frequencyHertz,
      state.initialCondition,
      state.waveSpeedMetresPerSecond,
    ],
  );
  const timeSeconds = state.step * secondsPerStep;
  const samples = useMemo(
    () => sampleAnalyticalWave(model, timeSeconds, 161),
    [model, timeSeconds],
  );
  const path = samples
    .map((sample, index) => {
      const x = 45 + (sample.xMetres / model.intervalLengthMetres) * 650;
      const y = 170 - sample.displacementMetres * 82;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const exports = useSvgExportHandlers(svgRef);
  const metadata = visualizationMetadata("wave-equation-1d", locale);
  const diagnostics = useMemo(
    () => diagnoseAnalyticalWaveEquation(model, timeSeconds),
    [model, timeSeconds],
  );
  const displacementValues = samples.map((sample) => sample.displacementMetres);
  const maximumDisplacement = Math.max(...displacementValues.map(Math.abs));

  function updateParameter(patch: Partial<WaveState>): void {
    playback.pause();
    setState((current) => ({ ...current, ...patch, step: 0 }));
  }

  const conditionDescription: Readonly<Record<WaveScenario, string>> = {
    traveling:
      "无限直线上的解析行波 u=A sin(kx−ωt)；图中区间只是一个波长的观察窗，不施加有限端点边界。初值为 u(x,0)=A sin(kx)、uₜ(x,0)=−Aω cos(kx)。",
    standing:
      "固定端区间上的基频解析驻波 u=A sin(πx/L)cos(2πft)，其中 L=c/(2f)；两端位移恒为零，初速度为零。",
    gaussian:
      "长度 10 m 的周期区间上，以 24 个空间谐波表示的周期高斯轮廓按波速 c 解析平移；初速度由 uₜ(x,0)=−c uₓ(x,0) 确定。脉冲宽度固定为 σ=0.65 m，不使用频率参数。",
  };

  const controls = (
    <div className="visualization-controls visualization-controls--wave">
      <label>
        <span>
          振幅 <StaticMath latex="A" label="A" /> ({unitSymbol("metre", "m")})
        </span>
        <input
          type="range"
          min="0.05"
          max="1.5"
          step="0.05"
          value={state.amplitudeMetres}
          onChange={(event) => updateParameter({ amplitudeMetres: Number(event.target.value) })}
        />
        <output>{state.amplitudeMetres.toFixed(2)} m</output>
      </label>
      {state.initialCondition === "gaussian" ? null : (
        <label>
          <span>
            频率 <StaticMath latex="f" label="f" /> ({unitSymbol("hertz", "Hz")})
          </span>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.05"
            value={state.frequencyHertz}
            onChange={(event) => updateParameter({ frequencyHertz: Number(event.target.value) })}
          />
          <output>{state.frequencyHertz.toFixed(2)} Hz</output>
        </label>
      )}
      <label>
        <span>
          波速 <StaticMath latex="c" label="c" /> ({unitSymbol("metre-per-second", "m·s⁻¹")})
        </span>
        <input
          type="range"
          min="0.2"
          max="5"
          step="0.1"
          value={state.waveSpeedMetresPerSecond}
          onChange={(event) =>
            updateParameter({ waveSpeedMetresPerSecond: Number(event.target.value) })
          }
        />
        <output>{state.waveSpeedMetresPerSecond.toFixed(1)} m·s⁻¹</output>
      </label>
      <label>
        <span>初始条件 / 解析解族</span>
        <select
          value={state.initialCondition}
          onChange={(event) =>
            updateParameter({
              initialCondition: readEnum(
                { initialCondition: event.target.value },
                "initialCondition",
                initialConditions,
                "traveling",
              ),
            })
          }
        >
          <option value="traveling">正向行波</option>
          <option value="standing">驻波</option>
          <option value="gaussian">高斯脉冲</option>
        </select>
      </label>
      <p className="visualization-control-note">
        解析公式直接在 161 个空间点取样；{secondsPerStep.toFixed(2)} s 是动画取样间隔，
        不是数值积分时间步，因此没有 CFL 稳定性限制。
      </p>
    </div>
  );

  const frequencyDescription =
    model.scenario === "gaussian"
      ? "该脉冲模型没有频率参数"
      : `频率 ${model.frequencyHertz.toFixed(2)} 赫兹，波长 ${model.wavelengthMetres.toFixed(2)} 米`;
  const boundaryDescription =
    model.scenario === "traveling"
      ? "无限直线观察窗"
      : model.scenario === "standing"
        ? "两端固定为零"
        : "周期端点相接";
  const boundaryCheckDescription =
    diagnostics.boundaryValueMismatchMetres === null
      ? "有限端点边界核验不适用"
      : `端点条件误差 ${diagnostics.boundaryValueMismatchMetres.toExponential(2)} 米`;
  const textAlternative = `一维波动方程解析解。时间 ${timeSeconds.toFixed(2)} 秒，区间 0 至 ${model.intervalLengthMetres.toFixed(2)} 米，边界解释为${boundaryDescription}；振幅参数 ${state.amplitudeMetres.toFixed(2)} 米，${frequencyDescription}，波速 ${state.waveSpeedMetresPerSecond.toFixed(2)} 米每秒。当前最大位移绝对值 ${maximumDisplacement.toFixed(3)} 米。有限差分只复核解析公式：空间增量 ${diagnostics.spatialIncrementMetres.toExponential(2)} 米、时间增量 ${diagnostics.temporalIncrementSeconds.toExponential(2)} 秒、诊断比 cΔt/Δx=${diagnostics.diagnosticCourantNumber.toFixed(2)}，归一化 PDE 残差 ${diagnostics.maximumRelativePdeResidual.toExponential(2)}，${boundaryCheckDescription}；这些增量不用于推进解。${conditionDescription[state.initialCondition]}`;

  return (
    <VisualizationFrame
      id="wave-equation-1d"
      locale={locale}
      title={metadata.title}
      description={metadata.description}
      playback={playback}
      onReset={() => setState(initialState)}
      onSpeedChange={(animationSpeed) => setState((current) => ({ ...current, animationSpeed }))}
      shareUrl={shareUrl}
      exports={exports}
      controls={controls}
      textAlternative={textAlternative}
      notice={notice}
      status={conditionDescription[state.initialCondition]}
      metrics={
        <dl>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].time} />
            </dt>
            <dd>{timeSeconds.toFixed(2)} s</dd>
          </div>
          <div>
            <dt>区间</dt>
            <dd>0–{model.intervalLengthMetres.toFixed(2)} m</dd>
          </div>
          <div>
            <dt>
              <MathLabel
                label={model.scenario === "gaussian" ? "脉冲宽度 σ" : "λ = c/f"}
                value={model.scenario === "gaussian" ? "脉冲宽度 $\\sigma$" : "$\\lambda=c/f$"}
              />
            </dt>
            <dd>
              {model.scenario === "gaussian"
                ? `${model.pulseWidthMetres.toFixed(2)} m`
                : `${model.wavelengthMetres.toFixed(2)} m`}
            </dd>
          </div>
          <div>
            <dt>解析式 PDE 复核</dt>
            <dd>
              残差 {diagnostics.maximumRelativePdeResidual.toExponential(1)} · 边界{" "}
              {diagnostics.boundaryValueMismatchMetres === null
                ? "不适用"
                : diagnostics.boundaryValueMismatchMetres.toExponential(1)}
            </dd>
          </div>
        </dl>
      }
    >
      <svg
        ref={svgRef}
        className="visualization-canvas visualization-canvas--wave"
        viewBox="0 0 740 340"
        role="img"
        aria-label={textAlternative}
      >
        <rect className="visualization-plot-background" x="0" y="0" width="740" height="340" />
        {Array.from({ length: 11 }, (_, index) => {
          const x = 45 + index * 65;
          return (
            <line
              key={`x-${index}`}
              x1={x}
              y1="40"
              x2={x}
              y2="290"
              className={index === 0 ? "visualization-axis" : "visualization-grid-line"}
            />
          );
        })}
        {[-1, -0.5, 0, 0.5, 1].map((value) => {
          const y = 170 - value * 82;
          return (
            <line
              key={value}
              x1="45"
              y1={y}
              x2="695"
              y2={y}
              className={value === 0 ? "visualization-axis" : "visualization-grid-line"}
            />
          );
        })}
        <path d={path} className="visualization-wave-path" />
        <SvgMath
          x={45}
          y={1}
          width={380}
          height={48}
          latex={"\\frac{\\partial^2u}{\\partial t^2}=c^2\\frac{\\partial^2u}{\\partial x^2}"}
          label="∂²u/∂t² = c² ∂²u/∂x²"
        />
        <text x="45" y="318" className="visualization-axis-label">
          x (m)，0 ≤ x ≤ {model.intervalLengthMetres.toFixed(2)}
        </text>
        <text x="605" y="24" className="visualization-annotation">
          t = {timeSeconds.toFixed(2)} s
        </text>
      </svg>
    </VisualizationFrame>
  );
}
