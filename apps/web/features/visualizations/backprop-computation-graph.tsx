"use client";

import { SvgMath, MathLabel } from "@one-forth/ui";
import { experimentMathText } from "@one-forth/config";

import type { ActivationName } from "@one-forth/numerical";
import { useCallback, useRef } from "react";
import { useSvgExportHandlers } from "./export";
import { visualizationMetadata } from "./metadata";
import { usePlayback } from "./playback";
import {
  isRecord,
  readBoolean,
  readEnum,
  readInputNumber,
  readInteger,
  readNumber,
  readPlaybackSpeed,
  useUrlBackedVisualizationState,
} from "./state";
import type { VisualizationComponentProps } from "./types";
import { VisualizationFrame } from "./visualization-frame";
import {
  repeatedLocalDerivativeProduct,
  smallBackprop,
  validateBackpropWithFiniteDifferences,
} from "./science/math-experiment-models";

interface BackpropState {
  readonly x: number;
  readonly weight: number;
  readonly bias: number;
  readonly target: number;
  readonly activation: ActivationName;
  readonly l2: number;
  readonly chainDepth: number;
  readonly showVanishing: boolean;
  readonly step: number;
  readonly speed: number;
}

const maximumStep = 8;
const activationNames: readonly ActivationName[] = ["tanh", "sigmoid", "relu"];
const initialState: BackpropState = {
  x: 1.2,
  weight: 0.8,
  bias: -0.15,
  target: 0.4,
  activation: "tanh",
  l2: 0.1,
  chainDepth: 5,
  showVanishing: true,
  step: maximumStep,
  speed: 1,
};

function validateState(value: unknown): BackpropState {
  if (!isRecord(value)) return initialState;
  return {
    x: readNumber(value, "x", initialState.x, { minimum: -4, maximum: 4 }),
    weight: readNumber(value, "weight", initialState.weight, { minimum: -4, maximum: 4 }),
    bias: readNumber(value, "bias", initialState.bias, { minimum: -4, maximum: 4 }),
    target: readNumber(value, "target", initialState.target, { minimum: -2, maximum: 2 }),
    activation: readEnum(value, "activation", activationNames, initialState.activation),
    l2: readNumber(value, "l2", initialState.l2, { minimum: 0, maximum: 1 }),
    chainDepth: readInteger(value, "chainDepth", initialState.chainDepth, {
      minimum: 1,
      maximum: 8,
    }),
    showVanishing: readBoolean(value, "showVanishing", initialState.showVanishing),
    step: readInteger(value, "step", initialState.step, { minimum: 0, maximum: maximumStep }),
    speed: readPlaybackSpeed(value, "speed", initialState.speed),
  };
}

function toRecord(state: BackpropState): Readonly<Record<string, unknown>> {
  return { ...state };
}

function nodeClass(stage: number, currentStep: number): string {
  return stage === currentStep
    ? "computation-node computation-node--active"
    : stage < currentStep
      ? "computation-node computation-node--visited"
      : "computation-node";
}

function edgeClass(stage: number, currentStep: number, reverse = false): string {
  const base = reverse ? "computation-edge computation-edge--gradient" : "computation-edge";
  return stage <= currentStep ? `${base} computation-edge--active` : base;
}

function format(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  return Math.abs(value) < 0.001 && value !== 0 ? value.toExponential(2) : value.toFixed(3);
}

export function BackpropComputationGraph({ locale }: VisualizationComponentProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { state, setState, shareUrl, notice } = useUrlBackedVisualizationState(
    "backprop-computation-graph",
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
  const result = smallBackprop({
    x: state.x,
    weight: state.weight,
    bias: state.bias,
    target: state.target,
    activation: state.activation,
    l2: state.l2,
  });
  const finiteDifferenceValidation = validateBackpropWithFiniteDifferences({
    x: state.x,
    weight: state.weight,
    bias: state.bias,
    target: state.target,
    activation: state.activation,
    l2: state.l2,
  });
  const exports = useSvgExportHandlers(svgRef);
  const metadata = visualizationMetadata("backprop-computation-graph", locale);
  const vanishingFactor = repeatedLocalDerivativeProduct(
    result.localActivationDerivative,
    state.chainDepth,
  );

  function updateParameter(patch: Partial<BackpropState>): void {
    playback.pause();
    setState((current) => ({ ...current, ...patch, step: 0 }));
  }

  const controls = (
    <div className="visualization-controls visualization-controls--backprop">
      <label>
        <span>
          <MathLabel {...experimentMathText[locale].input} />
        </span>
        <input
          type="number"
          min="-4"
          max="4"
          step="0.1"
          value={state.x}
          onChange={(event) =>
            updateParameter({
              x: readInputNumber(event.target.value, state.x, { minimum: -4, maximum: 4 }),
            })
          }
        />
      </label>
      <label>
        <span>
          <MathLabel {...experimentMathText[locale].weight} />
        </span>
        <input
          type="number"
          min="-4"
          max="4"
          step="0.1"
          value={state.weight}
          onChange={(event) =>
            updateParameter({
              weight: readInputNumber(event.target.value, state.weight, {
                minimum: -4,
                maximum: 4,
              }),
            })
          }
        />
      </label>
      <label>
        <span>
          <MathLabel {...experimentMathText[locale].bias} />
        </span>
        <input
          type="number"
          min="-4"
          max="4"
          step="0.1"
          value={state.bias}
          onChange={(event) =>
            updateParameter({
              bias: readInputNumber(event.target.value, state.bias, { minimum: -4, maximum: 4 }),
            })
          }
        />
      </label>
      <label>
        <span>
          <MathLabel {...experimentMathText[locale].target} />
        </span>
        <input
          type="number"
          min="-2"
          max="2"
          step="0.1"
          value={state.target}
          onChange={(event) =>
            updateParameter({
              target: readInputNumber(event.target.value, state.target, {
                minimum: -2,
                maximum: 2,
              }),
            })
          }
        />
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
        <span>
          <MathLabel {...experimentMathText[locale].regularization} />
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={state.l2}
          onChange={(event) => updateParameter({ l2: Number(event.target.value) })}
        />
        <output>{state.l2.toFixed(2)}</output>
      </label>
      <label className="visualization-toggle">
        <input
          type="checkbox"
          checked={state.showVanishing}
          onChange={(event) => updateParameter({ showVanishing: event.target.checked })}
        />
        <span>显示重复相同局部因子的假设诊断</span>
      </label>
      {state.showVanishing ? (
        <label>
          <span>重复激活深度</span>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={state.chainDepth}
            onChange={(event) => updateParameter({ chainDepth: Number(event.target.value) })}
          />
          <output>{state.chainDepth}</output>
        </label>
      ) : null}
    </div>
  );

  const stageDescriptions = [
    "读取输入、权重、偏置和目标。",
    "计算仿射值 z = wx + b。",
    `应用 ${state.activation} 得到输出 ŷ。`,
    "计算数据损失与 L2 正则项，并相加得到总损失。",
    "从数据损失得到输出的上游梯度 ∂Ldata/∂ŷ。",
    "乘以激活函数的局部导数，得到 z 的上游梯度。",
    "沿仿射分支计算权重、偏置和输入的梯度贡献。",
    "将权重的数据分支与正则分支贡献相加。",
    "用中心有限差分核对 x、w、b 三个解析梯度。",
  ] as const;
  const stageDescription = stageDescriptions[state.step] ?? stageDescriptions[0];
  const finiteDifferenceErrorLabel =
    finiteDifferenceValidation.maximumRelativeError === null
      ? "折点不适用"
      : finiteDifferenceValidation.maximumRelativeError < 1e-8
        ? "< 1e-8"
        : finiteDifferenceValidation.maximumRelativeError.toExponential(2);
  const finiteDifferenceStatus = finiteDifferenceValidation.validAtPoint
    ? `中心有限差分核对 x、w、b，最大相对误差为 ${finiteDifferenceErrorLabel}。`
    : "当前点位于 ReLU 不可微折点；此处不把中心差分误差作为解析梯度验证。";
  const repeatedFactorStatus = state.showVanishing
    ? `连续 ${state.chainDepth} 层取相同局部导数时，其绝对值乘积为 ${vanishingFactor.toExponential(2)}。`
    : "";
  const textAlternative = `当前在第 ${state.step} 步：${stageDescription} 前向值 z=${format(result.preActivation)}，输出=${format(result.output)}，数据损失=${format(result.dataLoss)}，正则损失=${format(result.regularizationLoss)}，总损失=${format(result.loss)}。局部导数 φ′(z)=${format(result.localActivationDerivative)}，z 的上游梯度=${format(result.preActivationUpstreamGradient)}。权重数据分支梯度=${format(result.weightDataGradient)}，正则分支梯度=${format(result.weightRegularizationGradient)}，累计权重梯度=${format(result.weightGradient)}，偏置梯度=${format(result.biasGradient)}，输入梯度=${format(result.inputGradient)}。${finiteDifferenceStatus}${repeatedFactorStatus}`;

  return (
    <VisualizationFrame
      id="backprop-computation-graph"
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
      status={`${state.step === maximumStep ? "" : stageDescription} ${finiteDifferenceStatus} ${repeatedFactorStatus}`.trim()}
      metrics={
        <dl>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].prediction} />
            </dt>
            <dd>{format(result.output)}</dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].lossLabel} />
            </dt>
            <dd>{format(result.loss)}</dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].weightDerivative} />
            </dt>
            <dd>{format(result.weightGradient)}</dd>
          </div>
          <div>
            <dt>
              <MathLabel {...experimentMathText[locale].biasDerivative} />
            </dt>
            <dd>{format(result.biasGradient)}</dd>
          </div>
          <div>
            <dt>差分最大误差</dt>
            <dd>{finiteDifferenceErrorLabel}</dd>
          </div>
        </dl>
      }
    >
      <svg
        ref={svgRef}
        className="visualization-canvas visualization-canvas--backprop"
        viewBox="0 0 760 360"
        role="img"
        aria-label={textAlternative}
      >
        <rect className="visualization-plot-background" x="0" y="0" width="760" height="360" />
        <g className="computation-graph computation-graph--forward">
          <line x1="100" y1="140" x2="220" y2="140" className={edgeClass(1, state.step)} />
          <line x1="275" y1="140" x2="385" y2="140" className={edgeClass(2, state.step)} />
          <line x1="445" y1="140" x2="555" y2="140" className={edgeClass(3, state.step)} />
          <line x1="620" y1="140" x2="700" y2="140" className={edgeClass(3, state.step)} />
          <g className={nodeClass(0, state.step)} transform="translate(70 140)">
            <circle r="34" />
            <SvgMath x={-38} y={-24} width={76} align="center" latex="x" label="x" fontSize={12} />
            <text textAnchor="middle" y="16">
              {format(state.x)}
            </text>
          </g>
          <g className={nodeClass(1, state.step)} transform="translate(250 140)">
            <circle r="38" />
            <SvgMath
              x={-60}
              y={-24}
              width={120}
              align="center"
              latex="z=wx+b"
              label="z=wx+b"
              fontSize={12}
            />
            <text textAnchor="middle" y="16">
              {format(result.preActivation)}
            </text>
          </g>
          <g className={nodeClass(2, state.step)} transform="translate(415 140)">
            <circle r="38" />
            <text textAnchor="middle" y="-4">
              {state.activation}
            </text>
            <text textAnchor="middle" y="16">
              {format(result.output)}
            </text>
          </g>
          <g className={nodeClass(3, state.step)} transform="translate(590 140)">
            <circle r="38" />
            <SvgMath
              x={-38}
              y={-24}
              width={76}
              align="center"
              latex="L"
              label="L 总"
              fontSize={12}
            />
            <text textAnchor="middle" y="16">
              {format(result.loss)}
            </text>
          </g>
          <g className={nodeClass(0, state.step)} transform="translate(250 45)">
            <rect x="-48" y="-25" width="96" height="50" rx="3" />
            <SvgMath
              x={-48}
              y={-24}
              width={96}
              align="center"
              fontSize={12}
              latex={`w=${format(state.weight)}`}
              label={`w=${format(state.weight)}`}
            />
            <SvgMath
              x={-48}
              y={-5}
              width={96}
              align="center"
              fontSize={12}
              latex={`b=${format(state.bias)}`}
              label={`b=${format(state.bias)}`}
            />
          </g>
          <line x1="250" y1="70" x2="250" y2="100" className={edgeClass(1, state.step)} />
          <g className={nodeClass(0, state.step)} transform="translate(590 45)">
            <rect x="-42" y="-25" width="84" height="50" rx="3" />
            <SvgMath
              x={-42}
              y={-15}
              width={84}
              align="center"
              fontSize={12}
              latex={`y^*=${format(state.target)}`}
              label={`y*=${format(state.target)}`}
            />
          </g>
          <line x1="590" y1="70" x2="590" y2="100" className={edgeClass(3, state.step)} />
          <g className={nodeClass(0, state.step)} transform="translate(465 45)">
            <rect x="-45" y="-25" width="90" height="50" rx="3" />
            <SvgMath
              x={-45}
              y={-24}
              width={90}
              align="center"
              fontSize={12}
              latex={`\\lambda=${format(state.l2)}`}
              label={`λ=${format(state.l2)}`}
            />
            <SvgMath
              x={-45}
              y={-5}
              width={90}
              align="center"
              fontSize={12}
              latex={`L_2=${format(result.regularizationLoss)}`}
              label={`L₂=${format(result.regularizationLoss)}`}
            />
          </g>
          <path d="M 500 65 C 545 78, 565 88, 575 103" className={edgeClass(3, state.step)} />
        </g>
        <g className="computation-graph computation-graph--backward">
          <path
            d="M 590 190 C 500 245, 350 245, 250 190"
            className={edgeClass(4, state.step, true)}
          />
          <SvgMath
            x={70}
            y={227}
            width={280}
            latex={`\\partial L_{\\mathrm{data}}/\\partial\\hat y=${format(result.outputUpstreamGradient)}`}
            label={`∂Ldata/∂ŷ = ${format(result.outputUpstreamGradient)}`}
            fontSize={12}
          />
          <SvgMath
            x={380}
            y={235}
            width={365}
            latex={`\\varphi^{\\prime}(z)=${format(result.localActivationDerivative)},\\quad\\partial L/\\partial z=${format(result.preActivationUpstreamGradient)}`}
            label={`φ′(z) = ${format(result.localActivationDerivative)}; ∂L/∂z = ${format(result.preActivationUpstreamGradient)}`}
            fontSize={12}
          />
          <SvgMath
            x={70}
            y={251}
            width={685}
            latex={`\\partial L_{\\mathrm{data}}/\\partial w=(\\partial L/\\partial z)x=${format(result.weightDataGradient)}`}
            label={`∂Ldata/∂w = ∂L/∂z · x = ${format(result.weightDataGradient)}`}
            fontSize={12}
          />
          <SvgMath
            x={70}
            y={274}
            width={685}
            latex={`\\lambda w=${format(result.weightRegularizationGradient)},\\quad\\partial L/\\partial w=${format(result.weightGradient)}`}
            label={`λw = ${format(result.weightRegularizationGradient)}; ∂L/∂w = ${format(result.weightGradient)}`}
            fontSize={12}
          />
          <SvgMath
            x={70}
            y={297}
            width={685}
            latex={`\\partial L/\\partial b=${format(result.biasGradient)},\\quad\\partial L/\\partial x=${format(result.inputGradient)}`}
            label={`∂L/∂b = ${format(result.biasGradient)}; ∂L/∂x = ${format(result.inputGradient)}`}
            fontSize={12}
          />
        </g>
        {state.showVanishing ? (
          <g className="vanishing-gradient-chain" aria-label="重复激活层的梯度乘积">
            {Array.from({ length: state.chainDepth }, (_, index) => (
              <circle
                key={index}
                cx={250 + index * 42}
                cy="338"
                r="11"
                className={
                  index < state.step
                    ? "vanishing-gradient-node vanishing-gradient-node--active"
                    : "vanishing-gradient-node"
                }
              />
            ))}
            <text x="20" y="343" className="visualization-annotation">
              相同局部因子假设：
            </text>
            <text x="610" y="343" className="visualization-annotation">
              乘积 {vanishingFactor.toExponential(2)}
            </text>
          </g>
        ) : null}
      </svg>
    </VisualizationFrame>
  );
}
