"use client";

import { MathLabel } from "@one-forth/ui";
import { experimentNotation, uiText } from "@one-forth/config";

import { useCallback, useId, useMemo, useRef } from "react";
import { useSvgExportHandlers } from "./export";
import { visualizationMetadata } from "./metadata";
import { usePlayback } from "./playback";
import {
  getDescriptorExperiment,
  type DescriptorExperimentId,
  type DescriptorExperimentState,
  type ExperimentSeriesPoint,
} from "./science/descriptor-experiment-models";
import { SemanticDescriptorLayer } from "./semantic-descriptor-layer";
import {
  isRecord,
  readInteger,
  readNumber,
  readPlaybackSpeed,
  useUrlBackedVisualizationState,
} from "./state";
import type { VisualizationComponentProps } from "./types";
import { VisualizationFrame } from "./visualization-frame";

interface DescriptorVisualizationProps extends VisualizationComponentProps {
  readonly id: DescriptorExperimentId;
}

const plot = { left: 64, top: 42, right: 696, bottom: 326 };

function toRecord(state: DescriptorExperimentState): Readonly<Record<string, unknown>> {
  return { ...state };
}

function pathFrom(
  points: readonly ExperimentSeriesPoint[],
  scaleX: (value: number) => number,
  scaleY: (value: number) => number,
): string {
  return points
    .filter((entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y))
    .map(
      (entry, index) =>
        `${index === 0 ? "M" : "L"} ${scaleX(entry.x).toFixed(2)} ${scaleY(entry.y).toFixed(2)}`,
    )
    .join(" ");
}

function tick(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude >= 10_000 || magnitude < 0.001)) return value.toExponential(1);
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function DescriptorVisualization({ id, locale }: DescriptorVisualizationProps) {
  const descriptor = getDescriptorExperiment(id);
  const svgRef = useRef<SVGSVGElement>(null);
  const uniqueId = useId().replaceAll(":", "");
  const clipId = `descriptor-plot-${uniqueId}`;
  const markerId = `descriptor-arrow-${uniqueId}`;
  const validate = useCallback(
    (value: unknown): DescriptorExperimentState => {
      if (!isRecord(value)) return descriptor.initialState;
      const parameter = readNumber(value, "parameter", descriptor.initialState.parameter, {
        minimum: descriptor.parameter.minimum,
        maximum: descriptor.parameter.maximum,
      });
      const state: DescriptorExperimentState = {
        parameter,
        seed: readInteger(value, "seed", descriptor.initialState.seed, {
          minimum: 1,
          maximum: 2_147_483_647,
        }),
        step: readInteger(value, "step", descriptor.initialState.step, {
          minimum: 0,
          maximum: descriptor.maximumStep,
        }),
        speed: readPlaybackSpeed(value, "speed", descriptor.initialState.speed),
      };
      const maximumStep = descriptor.resolveMaximumStep?.(state) ?? descriptor.maximumStep;
      return { ...state, step: Math.min(state.step, maximumStep) };
    },
    [descriptor],
  );
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    id,
    descriptor.initialState,
    validate,
    toRecord,
    locale,
  );
  const maximumStep = descriptor.resolveMaximumStep?.(state) ?? descriptor.maximumStep;
  const setStep = useCallback(
    (step: number) => setState((current) => ({ ...current, step })),
    [setState],
  );
  const playback = usePlayback({
    step: Math.min(state.step, maximumStep),
    maximumStep,
    speed: state.speed,
    onStepChange: setStep,
  });
  const exports = useSvgExportHandlers(svgRef);
  const metadata = visualizationMetadata(id, locale);
  const snapshot = useMemo(() => descriptor.build(state), [descriptor, state]);
  const zh = locale === "zh-CN";
  const localize = (value: { readonly "zh-CN": string; readonly en: string }) =>
    value[locale] ?? value["zh-CN"];

  const allPoints = snapshot.reference
    ? [...snapshot.primary, ...snapshot.reference]
    : [...snapshot.primary];
  const finitePoints = allPoints.filter(
    (entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y),
  );
  const rawMinimumX = Math.min(...finitePoints.map((entry) => entry.x), 0);
  const rawMaximumX = Math.max(...finitePoints.map((entry) => entry.x), 1);
  const rawMinimumY = Math.min(...finitePoints.map((entry) => entry.y), 0);
  const rawMaximumY = Math.max(...finitePoints.map((entry) => entry.y), 1);
  const xPadding = Math.max(1e-9, (rawMaximumX - rawMinimumX) * 0.03);
  const yPadding = Math.max(1e-9, (rawMaximumY - rawMinimumY) * 0.08);
  const minimumX = rawMinimumX - xPadding;
  const maximumX = rawMaximumX + xPadding;
  const minimumY = rawMinimumY - yPadding;
  const maximumY = rawMaximumY + yPadding;
  const scaleX = (value: number) =>
    plot.left + ((value - minimumX) / (maximumX - minimumX)) * (plot.right - plot.left);
  const scaleY = (value: number) =>
    plot.bottom - ((value - minimumY) / (maximumY - minimumY)) * (plot.bottom - plot.top);
  const primaryPath = pathFrom(snapshot.primary, scaleX, scaleY);
  const referencePath = snapshot.reference ? pathFrom(snapshot.reference, scaleX, scaleY) : "";
  const gridTicks = [0, 1, 2, 3, 4];

  function update(patch: Partial<DescriptorExperimentState>): void {
    playback.pause();
    setState((current) => ({ ...current, ...patch, step: patch.step ?? 0 }));
  }

  const controls = (
    <div className="visualization-controls visualization-controls--descriptor">
      <label>
        <MathLabel
          label={localize(descriptor.parameter.label)}
          value={experimentNotation(localize(descriptor.parameter.label))}
        />
        <input
          type="range"
          min={descriptor.parameter.minimum}
          max={descriptor.parameter.maximum}
          step={descriptor.parameter.step}
          value={state.parameter}
          onChange={(event) => update({ parameter: Number(event.target.value) })}
        />
        <output>
          {state.parameter.toFixed(
            descriptor.parameter.step < 0.01 ? 3 : descriptor.parameter.step < 1 ? 2 : 0,
          )}
          {descriptor.parameter.unit ? ` ${descriptor.parameter.unit}` : ""}
        </output>
      </label>
      <label>
        <span>{zh ? "确定性种子" : "Deterministic seed"}</span>
        <input
          type="number"
          min="1"
          max="2147483647"
          step="1"
          value={state.seed}
          onChange={(event) =>
            update({
              seed: Math.min(
                2_147_483_647,
                Math.max(1, Math.round(Number(event.target.value) || 1)),
              ),
            })
          }
        />
      </label>
    </div>
  );

  // Workerd and browser V8 can differ by a few ulps for long trigonometric
  // reductions. Treat machine-zero residuals consistently so SSR text and the
  // hydrated client do not disagree while preserving meaningful error values.
  const reportedResidual =
    Math.abs(snapshot.verification.residual) < 1e-12 ? 0 : snapshot.verification.residual;
  const residualParts = reportedResidual.toExponential(2).split("e");
  const residualLatex =
    reportedResidual === 0 ? "0" : `${residualParts[0]}\\times 10^{${Number(residualParts[1])}}`;
  const labels = uiText[locale].readerInterface;
  const verificationStatus = `${snapshot.verification.passed ? labels.experimentVerified : labels.experimentMismatch} · ${labels.experimentResidual} $${residualLatex}$`;

  return (
    <VisualizationFrame
      id={id}
      locale={locale}
      title={metadata.title}
      description={metadata.description}
      playback={playback}
      onReset={() => setState(descriptor.initialState)}
      onSpeedChange={(speed) => setState((current) => ({ ...current, speed }))}
      shareUrl={shareUrl}
      exports={exports}
      controls={controls}
      textAlternative={localize(snapshot.textAlternative)}
      notice={notice}
      status={verificationStatus}
      metrics={
        <dl>
          {snapshot.metrics.map((entry) => (
            <div key={`${localize(entry.label)}:${entry.value}`}>
              <dt>
                <MathLabel
                  label={localize(entry.label)}
                  value={experimentNotation(localize(entry.label))}
                />
              </dt>
              <dd>
                <MathLabel label={entry.value} value={experimentNotation(entry.value)} />
              </dd>
            </div>
          ))}
          <div>
            <dt>{zh ? "核验" : "Verification"}</dt>
            <dd>{snapshot.verification.passed ? (zh ? "通过" : "Pass") : zh ? "失败" : "Fail"}</dd>
          </div>
        </dl>
      }
    >
      <svg
        ref={svgRef}
        className="visualization-canvas visualization-canvas--descriptor"
        viewBox="0 0 740 370"
        role="img"
        aria-label={localize(snapshot.textAlternative)}
      >
        <title>{metadata.title}</title>
        <desc>{localize(snapshot.textAlternative)}</desc>
        <defs>
          <clipPath id={clipId}>
            <rect
              x={plot.left}
              y={plot.top}
              width={plot.right - plot.left}
              height={plot.bottom - plot.top}
            />
          </clipPath>
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
        <rect className="visualization-plot-background" width="740" height="370" />
        {snapshot.semanticLayer ? (
          <SemanticDescriptorLayer
            layer={snapshot.semanticLayer}
            locale={locale}
            markerId={markerId}
          />
        ) : (
          <>
            {gridTicks.map((index) => {
              const progress = index / 4;
              const x = plot.left + progress * (plot.right - plot.left);
              const y = plot.bottom - progress * (plot.bottom - plot.top);
              return (
                <g key={index}>
                  <line
                    x1={x}
                    y1={plot.top}
                    x2={x}
                    y2={plot.bottom}
                    className="visualization-grid-line"
                  />
                  <line
                    x1={plot.left}
                    y1={y}
                    x2={plot.right}
                    y2={y}
                    className="visualization-grid-line"
                  />
                  <text
                    x={x}
                    y={plot.bottom + 18}
                    textAnchor="middle"
                    className="visualization-axis-label"
                  >
                    {tick(minimumX + progress * (maximumX - minimumX))}
                  </text>
                  <text
                    x={plot.left - 10}
                    y={y + 3}
                    textAnchor="end"
                    className="visualization-axis-label"
                  >
                    {tick(minimumY + progress * (maximumY - minimumY))}
                  </text>
                </g>
              );
            })}
            <line
              x1={plot.left}
              y1={plot.bottom}
              x2={plot.right}
              y2={plot.bottom}
              className="visualization-axis"
            />
            <line
              x1={plot.left}
              y1={plot.top}
              x2={plot.left}
              y2={plot.bottom}
              className="visualization-axis"
            />
            <text
              x={(plot.left + plot.right) / 2}
              y="362"
              textAnchor="middle"
              className="visualization-axis-label"
            >
              {localize(snapshot.xLabel)}
            </text>
            <text
              x="18"
              y={(plot.top + plot.bottom) / 2}
              textAnchor="middle"
              transform={`rotate(-90 18 ${(plot.top + plot.bottom) / 2})`}
              className="visualization-axis-label"
            >
              {localize(snapshot.yLabel)}
            </text>
            <g clipPath={`url(#${clipId})`}>
              {referencePath ? (
                <path d={referencePath} className="gradient-field__direction" />
              ) : null}
              <path d={primaryPath} className="visualization-trajectory" />
            </g>
            <text x={plot.left + 8} y="18" className="visualization-annotation">
              {localize(snapshot.primaryLabel)}
              {snapshot.referenceLabel ? ` · ${localize(snapshot.referenceLabel)}` : ""}
            </text>
          </>
        )}
      </svg>
    </VisualizationFrame>
  );
}
