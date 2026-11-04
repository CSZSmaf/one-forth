"use client";

import { clamp } from "@one-forth/math-core";
import { learningToolsText } from "@one-forth/config";
import { StaticMath } from "@one-forth/ui";
import { useCallback, useMemo, useRef } from "react";
import { useSvgExportHandlers } from "./export";
import { visualizationMetadata } from "./metadata";
import { usePlayback } from "./playback";
import {
  createFourierSeriesPlotData,
  fourierHarmonicOrder,
  fourierHarmonicTerm,
  fourierSineCoefficient,
  type FourierWaveform,
} from "./science/wave-fourier-models";
import { isRecord, readInteger, readPlaybackSpeed, useUrlBackedVisualizationState } from "./state";
import type { VisualizationComponentProps } from "./types";
import { VisualizationFrame } from "./visualization-frame";

interface FourierState {
  readonly waveform: FourierWaveform;
  readonly terms: number;
  readonly phaseDegrees: number;
  readonly step: number;
  readonly speed: number;
  readonly selectedTerm: number;
}

const maximumTerms = 15;
const initialState: FourierState = {
  waveform: "square",
  terms: 7,
  phaseDegrees: 0,
  step: 7,
  speed: 1,
  selectedTerm: -1,
};

const waveformLabels: Readonly<Record<FourierWaveform, string>> = {
  square: "方波",
  triangle: "三角波",
  sawtooth: "锯齿波",
};

function validateState(value: unknown): FourierState {
  if (!isRecord(value)) return initialState;
  const waveform =
    value.waveform === "square" || value.waveform === "triangle" || value.waveform === "sawtooth"
      ? value.waveform
      : initialState.waveform;
  const terms = readInteger(value, "terms", initialState.terms, {
    minimum: 1,
    maximum: maximumTerms,
  });
  return {
    waveform,
    terms,
    phaseDegrees:
      typeof value.phaseDegrees === "number" && Number.isFinite(value.phaseDegrees)
        ? clamp(value.phaseDegrees, -180, 180)
        : initialState.phaseDegrees,
    step: readInteger(value, "step", Math.min(initialState.step, terms), {
      minimum: 1,
      maximum: terms,
    }),
    speed: readPlaybackSpeed(value, "speed", initialState.speed),
    selectedTerm: readInteger(value, "selectedTerm", -1, {
      minimum: -1,
      maximum: maximumTerms - 1,
    }),
  };
}

function toRecord(state: FourierState): Readonly<Record<string, unknown>> {
  return { ...state };
}

const plot = { left: 22, top: 24, width: 716, height: 250 };

function toPoint(index: number, value: number, samples: number) {
  return {
    x: plot.left + (index / (samples - 1)) * plot.width,
    y: plot.top + ((1.45 - clamp(value, -1.45, 1.45)) / 2.9) * plot.height,
  };
}

function makePath(values: readonly number[]): string {
  return values
    .map((value, index) => {
      const point = toPoint(index, value, values.length);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

export function FourierHarmonicSuperposition({ locale }: VisualizationComponentProps) {
  const text = learningToolsText[locale];
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    "fourier-harmonic-superposition",
    initialState,
    validateState,
    toRecord,
    locale,
  );
  const activeTerms = Math.min(state.terms, Math.max(1, state.step));
  const setStep = useCallback(
    (step: number) => setState((current) => ({ ...current, step })),
    [setState],
  );
  const playback = usePlayback({
    step: activeTerms,
    maximumStep: state.terms,
    minimumStep: 1,
    speed: state.speed,
    onStepChange: setStep,
  });
  const exports = useSvgExportHandlers(svgRef);
  const metadata = visualizationMetadata("fourier-harmonic-superposition", locale);
  const phase = (state.phaseDegrees * Math.PI) / 180;
  const data = useMemo(
    () =>
      createFourierSeriesPlotData({
        waveform: state.waveform,
        terms: activeTerms,
        phaseRadians: phase,
        plotSampleCount: 321,
        rmseSampleCount: 2048,
      }),
    [activeTerms, phase, state.waveform],
  );
  const selectedTerm =
    state.selectedTerm < 0 ? activeTerms - 1 : Math.min(state.selectedTerm, activeTerms - 1);
  const selectedOrder = fourierHarmonicOrder(state.waveform, selectedTerm);
  const selectedCoefficient = fourierSineCoefficient(state.waveform, selectedOrder);
  const component = data.partialSum.map((_, index) =>
    fourierHarmonicTerm(
      state.waveform,
      selectedTerm,
      (index / (data.partialSum.length - 1)) * 2 * Math.PI + phase,
    ),
  );

  function update(patch: Partial<FourierState>) {
    playback.pause();
    setState((current) => {
      const terms = patch.terms ?? current.terms;
      return { ...current, ...patch, step: terms };
    });
  }

  const controls = (
    <div className="visualization-controls visualization-controls--fourier">
      <label>
        <span>目标波形</span>
        <select
          value={state.waveform}
          onChange={(event) => update({ waveform: event.target.value as FourierWaveform })}
        >
          {Object.entries(waveformLabels).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>谐波项数</span>
        <input
          type="range"
          min="1"
          max={maximumTerms}
          step="1"
          value={state.terms}
          onChange={(event) => update({ terms: Number(event.target.value) })}
        />
        <output>{state.terms}</output>
      </label>
      <label>
        <span>相位</span>
        <input
          type="range"
          min="-180"
          max="180"
          step="5"
          value={state.phaseDegrees}
          onChange={(event) => update({ phaseDegrees: Number(event.target.value) })}
        />
        <output>{state.phaseDegrees}°</output>
      </label>
      <div className="visualization-presets">
        {[1, 3, 7, 15].map((terms) => (
          <button
            key={terms}
            type="button"
            aria-pressed={state.terms === terms}
            onClick={() => update({ terms, selectedTerm: -1 })}
          >
            {terms}
          </button>
        ))}
      </div>
      <label>
        <span>{text.selectedHarmonic}</span>
        <select
          value={selectedTerm}
          onChange={(event) =>
            setState((current) => ({ ...current, selectedTerm: Number(event.target.value) }))
          }
        >
          {Array.from({ length: activeTerms }, (_, index) => (
            <option key={index} value={index}>
              n = {fourierHarmonicOrder(state.waveform, index)}
            </option>
          ))}
        </select>
      </label>
      <p className="visualization-control-note">{text.fourierNote}</p>
    </div>
  );

  const status =
    state.waveform === "square" || state.waveform === "sawtooth"
      ? `已叠加 ${activeTerms} 个非零正弦项，最高谐波阶数 n=${data.highestHarmonicOrder}。跳跃点处部分和收敛到左右极限的中点；当前采样过冲约为跳跃幅度的 ${(data.gibbsOvershootRatio * 100).toFixed(2)}%。增加项数会缩窄振荡区域，但极限峰值约为跳跃幅度的 8.95%，不会趋于零。`
      : `已叠加 ${activeTerms} 个奇数阶正弦项，最高谐波阶数 n=${data.highestHarmonicOrder}。三角波连续且系数按 n⁻² 衰减，不存在由跳跃间断导致的 Gibbs 过冲。`;
  const coefficientDescription =
    state.waveform === "square"
      ? "偶数阶系数为零，奇数阶 b_n=4/(πn)"
      : state.waveform === "triangle"
        ? "偶数阶系数为零，奇数阶 b_n=8(-1)^((n-1)/2)/(π²n²)"
        : "所有正整数阶 b_n=2(-1)^(n+1)/(πn)";
  const textAlternative = `${waveformLabels[state.waveform]}的傅里叶部分和。目标是周期 2π 的奇函数，仅含正弦项；${coefficientDescription}。当前显示 ${activeTerms} 项，设定上限 ${state.terms} 项，最高谐波阶数 ${data.highestHarmonicOrder}，相位 ${state.phaseDegrees} 度。2048 点半开周期中点网格 RMSE 为 ${data.midpointGridRmse.toFixed(3)}。${status}`;

  return (
    <VisualizationFrame
      id="fourier-harmonic-superposition"
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
            <dt>当前项数</dt>
            <dd>{activeTerms}</dd>
          </div>
          <div>
            <dt>最高谐波阶数</dt>
            <dd>n = {data.highestHarmonicOrder}</dd>
          </div>
          <div>
            <dt>中点网格 RMSE</dt>
            <dd>{data.midpointGridRmse.toFixed(3)}</dd>
          </div>
          <div>
            <dt>周期</dt>
            <dd>2π</dd>
          </div>
        </dl>
      }
    >
      <div className="experiment-stage">
        <svg
          ref={svgRef}
          className="visualization-canvas visualization-canvas--fourier"
          viewBox="0 0 760 500"
          role="group"
          aria-label={textAlternative}
        >
          <rect className="visualization-plot-background" width="760" height="500" />
          <line
            x1={plot.left}
            y1="149"
            x2={plot.left + plot.width}
            y2="149"
            className="visualization-axis"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1={plot.left + fraction * plot.width}
                y1={plot.top}
                x2={plot.left + fraction * plot.width}
                y2={plot.top + plot.height}
                className="visualization-grid-line"
              />
              <text
                x={plot.left + fraction * plot.width}
                y="300"
                textAnchor="middle"
                className="visualization-annotation"
              >
                {fraction === 0 ? "0" : fraction === 0.5 ? "π" : fraction === 1 ? "2π" : ""}
              </text>
            </g>
          ))}
          <path d={makePath(data.target)} className="fourier-wave fourier-wave--target" />
          <path d={makePath(component)} className="fourier-wave fourier-wave--harmonic" />
          <path d={makePath(data.partialSum)} className="fourier-wave fourier-wave--sum" />
          <text x="30" y="344" className="visualization-annotation">
            {text.spectrum}
          </text>
          <line x1="30" y1="414" x2="730" y2="414" className="visualization-axis" />
          {Array.from({ length: state.terms }, (_, index) => {
            const order = fourierHarmonicOrder(state.waveform, index);
            const coefficient = fourierSineCoefficient(state.waveform, order);
            const x = 50 + (index / Math.max(1, state.terms - 1)) * 650;
            const y = 414 - coefficient * 44;
            const active = index < activeTerms;
            return (
              <g
                key={index}
                role="button"
                tabIndex={active ? 0 : -1}
                aria-disabled={!active}
                aria-pressed={index === selectedTerm}
                aria-label={`${text.harmonic} ${order}, ${text.coefficient} ${coefficient.toFixed(3)}`}
                className="fourier-spectrum-line"
                data-active={active}
                data-selected={index === selectedTerm}
                onClick={() => {
                  if (active) setState((current) => ({ ...current, selectedTerm: index }));
                }}
                onKeyDown={(event) => {
                  if (active && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    event.stopPropagation();
                    setState((current) => ({ ...current, selectedTerm: index }));
                  }
                }}
              >
                <rect x={x - 20} y="352" width="40" height="116" fill="transparent" />
                <line x1={x} y1="414" x2={x} y2={y} />
                <circle cx={x} cy={y} r={index === selectedTerm ? 5 : 3} />
                <text x={x} y="482" textAnchor="middle" className="visualization-annotation">
                  {order}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="experiment-legend">
          <span className="legend-target legend-dashed">{text.target}</span>
          <span className="legend-secondary">{text.component}</span>
          <span className="legend-wave">{text.synthesis}</span>
        </div>
        <div className="experiment-equation">
          <StaticMath
            display
            latex={`b_{${selectedOrder}}\\sin(${selectedOrder}(x+\\phi)),\\quad b_{${selectedOrder}}=${selectedCoefficient.toFixed(4)}`}
            plainText={`b${selectedOrder} = ${selectedCoefficient.toFixed(4)}`}
          />
        </div>
      </div>
    </VisualizationFrame>
  );
}
