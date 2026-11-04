import { experimentNotation, type SupportedLocale } from "@one-forth/config";
import { SvgMath, SvgMathText } from "@one-forth/ui";
import type { ExperimentSemanticLayer } from "./science/descriptor-experiment-models";

interface SemanticDescriptorLayerProps {
  readonly layer: ExperimentSemanticLayer;
  readonly locale: SupportedLocale;
  readonly markerId: string;
}

function FieldLayer({
  layer,
  markerId,
  locale,
}: SemanticDescriptorLayerProps & {
  readonly layer: Extract<ExperimentSemanticLayer, { readonly kind: "field" }>;
}) {
  const center = { x: 370, y: 185 };
  const scale = 88;
  const map = (x: number, y: number) => ({ x: center.x + x * scale, y: center.y - y * scale });
  const zh = locale === "zh-CN";
  return (
    <g>
      <line x1="90" y1={center.y} x2="650" y2={center.y} className="visualization-axis" />
      <line x1={center.x} y1="28" x2={center.x} y2="342" className="visualization-axis" />
      {layer.vectors.map((vector) => {
        const start = map(vector.x, vector.y);
        return (
          <line
            key={`${vector.x}:${vector.y}`}
            x1={start.x - vector.dx * 7}
            y1={start.y + vector.dy * 7}
            x2={start.x + vector.dx * 7}
            y2={start.y - vector.dy * 7}
            className="gradient-field__vector"
            markerEnd={`url(#${markerId})`}
          />
        );
      })}
      <circle
        cx={center.x}
        cy={center.y}
        r={layer.radius * scale}
        fill="none"
        className="gradient-field__direction"
      />
      {layer.surfaceSamples.map((sample, index) => {
        const location = map(sample.x, sample.y);
        return (
          <circle
            key={`${index}:${sample.x.toFixed(4)}`}
            cx={location.x}
            cy={location.y}
            r={sample.fluxDensity >= 0 ? 2.5 : 3.4}
            className={
              sample.fluxDensity >= 0
                ? "visualization-point visualization-point--current"
                : "visualization-point"
            }
          />
        );
      })}
      {layer.charges.map((charge, index) => {
        const location = map(charge.x, charge.y);
        return (
          <g key={`${charge.x}:${charge.y}`}>
            <circle
              cx={location.x}
              cy={location.y}
              r="11"
              className={
                charge.charge >= 0
                  ? "visualization-drag-handle visualization-drag-handle--primary"
                  : "visualization-drag-handle visualization-drag-handle--secondary"
              }
            />
            <text
              x={location.x}
              y={location.y + 4}
              textAnchor="middle"
              className="visualization-annotation"
            >
              {charge.charge >= 0 ? "+" : "−"}
            </text>
            <SvgMath
              x={location.x + 15}
              y={location.y - 27}
              width={115}
              height={25}
              fontSize={12}
              latex={`q_{${index + 1}}=${charge.charge.toFixed(2)}`}
              label={`q${index + 1}=${charge.charge.toFixed(2)}`}
            />
          </g>
        );
      })}
      <SvgMathText
        x={78}
        y={5}
        width={620}
        height={36}
        fontSize={11}
        value={
          zh
            ? "箭头：叠加电场；圆点：已积分 $\\mathbf E\\cdot\\mathbf n\\,ds$；+ / −：电荷符号"
            : "Arrows: superposed field; dots: integrated $\\mathbf E\\cdot\\mathbf n\\,ds$; + / −: charge sign"
        }
        label={
          zh
            ? "箭头：叠加电场；圆点：已积分 E·n ds；+ / −：电荷符号"
            : "Arrows: superposed field; dots: integrated E·n ds; + / −: charge sign"
        }
      />
    </g>
  );
}

function QuantumLayer({
  layer,
  locale,
  markerId,
}: SemanticDescriptorLayerProps & {
  readonly layer: Extract<ExperimentSemanticLayer, { readonly kind: "quantum" }>;
}) {
  const zh = locale === "zh-CN";
  const center = { x: 210, y: 188 };
  const radius = 118;
  const angle = (layer.angleDegrees * Math.PI) / 180;
  const end = {
    x: center.x + radius * Math.sin(angle),
    y: center.y - radius * Math.cos(angle),
  };
  const bars = [
    { x: 446, label: "|0⟩", theory: layer.probabilityZero, observed: layer.observedZero },
    { x: 566, label: "|1⟩", theory: layer.probabilityOne, observed: layer.observedOne },
  ];
  return (
    <g>
      <circle cx={center.x} cy={center.y} r={radius} fill="none" className="visualization-axis" />
      <line
        x1={center.x}
        y1={center.y - radius - 12}
        x2={center.x}
        y2={center.y + radius + 12}
        className="visualization-axis"
      />
      <line
        x1={center.x - radius - 12}
        y1={center.y}
        x2={center.x + radius + 12}
        y2={center.y}
        className="visualization-axis"
      />
      <line
        x1={center.x}
        y1={center.y}
        x2={end.x}
        y2={end.y}
        className="visualization-vector visualization-vector--primary"
        markerEnd={`url(#${markerId})`}
      />
      <circle
        cx={end.x}
        cy={end.y}
        r="5"
        className="visualization-point visualization-point--current"
      />
      <SvgMath
        x={center.x + 8}
        y={center.y - radius - 22}
        width={48}
        height={28}
        latex={"\\lvert0\\rangle"}
        label={"|0⟩"}
      />
      <SvgMath
        x={center.x + 8}
        y={center.y + radius - 3}
        width={48}
        height={28}
        latex={"\\lvert1\\rangle"}
        label={"|1⟩"}
      />
      <SvgMathText
        x={82}
        y={5}
        width={350}
        height={38}
        fontSize={11}
        value={
          zh
            ? `Bloch 子午面状态向量，$\\theta=${layer.angleDegrees.toFixed(1)}^\\circ$`
            : `Bloch meridian state vector, $\\theta=${layer.angleDegrees.toFixed(1)}^\\circ$`
        }
        label={
          zh
            ? `Bloch 子午面状态向量，θ=${layer.angleDegrees.toFixed(1)}°`
            : `Bloch meridian state vector, θ=${layer.angleDegrees.toFixed(1)}°`
        }
      />
      {bars.map((bar) => {
        const theoryHeight = bar.theory * 220;
        const observedHeight = bar.observed * 220;
        return (
          <g key={bar.label}>
            <rect
              x={bar.x}
              y={318 - theoryHeight}
              width="34"
              height={theoryHeight}
              className="attention-query-box"
            />
            <rect
              x={bar.x + 40}
              y={318 - observedHeight}
              width="34"
              height={observedHeight}
              className="vanishing-gradient-node"
            />
            <SvgMath
              x={bar.x + 12}
              y={325}
              width={50}
              height={30}
              align="center"
              latex={bar.label === "|0⟩" ? "\\lvert0\\rangle" : "\\lvert1\\rangle"}
              label={bar.label}
            />
            <SvgMath
              x={bar.x - 15}
              y={Math.max(27, 294 - theoryHeight)}
              width={64}
              height={28}
              align="center"
              fontSize={11}
              latex={`P=${bar.theory.toFixed(2)}`}
              label={`P ${bar.theory.toFixed(2)}`}
            />
            <SvgMath
              x={bar.x + 25}
              y={Math.max(27, 294 - observedHeight)}
              width={64}
              height={28}
              align="center"
              fontSize={11}
              latex={`f=${bar.observed.toFixed(2)}`}
              label={`f ${bar.observed.toFixed(2)}`}
            />
          </g>
        );
      })}
      <SvgMathText
        x={458}
        y={5}
        width={264}
        height={38}
        fontSize={11}
        value={
          zh
            ? "实框 $P$：Born 概率；描边 $f$：观测频率"
            : "Filled $P$: Born probability; outlined $f$: observed frequency"
        }
        label={
          zh
            ? "实框 P：Born 概率；描边 f：观测频率"
            : "Filled P: Born probability; outlined f: observed frequency"
        }
      />
    </g>
  );
}

function AlgorithmLayer({
  layer,
  locale,
}: SemanticDescriptorLayerProps & {
  readonly layer: Extract<ExperimentSemanticLayer, { readonly kind: "algorithm" }>;
}) {
  const zh = locale === "zh-CN";
  const left = 52;
  const right = 704;
  const bottom = 322;
  const barWidth = (right - left) / layer.values.length;
  const separatorX = left + Math.min(layer.values.length, layer.completedPasses + 1) * barWidth;
  return (
    <g>
      <line x1={left} y1={bottom} x2={right} y2={bottom} className="visualization-axis" />
      {layer.values.map((entry, index) => {
        const height = Math.max(3, entry.value * 250);
        return (
          <g key={entry.originalIndex}>
            <rect
              x={left + index * barWidth + 1}
              y={bottom - height}
              width={Math.max(1, barWidth - 2)}
              height={height}
              className={entry.sortedPrefix ? "attention-query-box" : "vanishing-gradient-node"}
            />
            {layer.values.length <= 32 ? (
              <text
                x={left + (index + 0.5) * barWidth}
                y="341"
                textAnchor="middle"
                className="visualization-axis-label"
              >
                {entry.originalIndex}
              </text>
            ) : null}
          </g>
        );
      })}
      {layer.completedPasses + 1 < layer.values.length ? (
        <line
          x1={separatorX}
          y1="48"
          x2={separatorX}
          y2={bottom}
          className="gradient-field__direction"
        />
      ) : null}
      <text x={left} y="24" className="visualization-annotation">
        {zh
          ? `插入排序第 ${layer.completedPasses} 轮；左侧实框为已验证有序前缀，横轴标签为原始位置`
          : `Insertion-sort pass ${layer.completedPasses}; filled bars form the verified sorted prefix, labels are original positions`}
      </text>
    </g>
  );
}

function PinnLayer({
  layer,
  locale,
}: SemanticDescriptorLayerProps & {
  readonly layer: Extract<ExperimentSemanticLayer, { readonly kind: "pinn" }>;
}) {
  const zh = locale === "zh-CN";
  const left = 72;
  const right = 682;
  const top = 48;
  const bottom = 310;
  const values = layer.samples.flatMap((sample) => [sample.trial, sample.exact, 0]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values, 0.25);
  const padding = Math.max(0.02, (maximum - minimum) * 0.12);
  const scaleX = (x: number) => left + x * (right - left);
  const scaleY = (y: number) =>
    bottom - ((y - (minimum - padding)) / (maximum - minimum + 2 * padding)) * (bottom - top);
  const path = (key: "trial" | "exact") =>
    layer.samples
      .map(
        (sample, index) =>
          `${index === 0 ? "M" : "L"} ${scaleX(sample.x).toFixed(2)} ${scaleY(sample[key]).toFixed(2)}`,
      )
      .join(" ");
  return (
    <g>
      <line x1={left} y1={scaleY(0)} x2={right} y2={scaleY(0)} className="visualization-axis" />
      <line x1={left} y1={top} x2={left} y2={bottom} className="visualization-axis" />
      <path d={path("exact")} className="gradient-field__direction" />
      <path d={path("trial")} className="visualization-trajectory" />
      {layer.samples
        .filter((_, index) => index % 8 === 0)
        .map((sample) => (
          <circle
            key={sample.x}
            cx={scaleX(sample.x)}
            cy={scaleY(sample.trial)}
            r="3"
            className="visualization-point visualization-point--current"
          />
        ))}
      <circle cx={scaleX(0)} cy={scaleY(0)} r="7" className="attention-query-box" />
      <circle cx={scaleX(1)} cy={scaleY(0)} r="7" className="attention-query-box" />
      <SvgMath
        x={left - 30}
        y={325}
        width={60}
        height={30}
        align="center"
        latex={"x=0"}
        label={"x=0"}
      />
      <SvgMath
        x={right - 30}
        y={325}
        width={60}
        height={30}
        align="center"
        latex={"x=1"}
        label={"x=1"}
      />
      <SvgMathText
        x={78}
        y={3}
        width={630}
        height={40}
        fontSize={11}
        value={
          zh
            ? `实线：$u_a(x)$，虚线：解析解；圆点：残差配点；端点锁定 $u=0$；$-u_a''-2=${layer.residual.toExponential(2).replace(/e\+?(-?\d+)/, "\\times10^{$1}")}$`
            : `Solid: $u_a(x)$, dashed: exact solution; dots: residual points; endpoints lock $u=0$; $-u_a''-2=${layer.residual.toExponential(2).replace(/e\+?(-?\d+)/, "\\times10^{$1}")}$`
        }
        label={
          zh
            ? `实线：uₐ(x)，虚线：解析解；圆点：残差配点；端点锁定 u=0；−uₐ″−2=${layer.residual.toExponential(2)}`
            : `Solid: u_a(x), dashed: exact solution; dots: residual points; endpoints lock u=0; -u_a''-2=${layer.residual.toExponential(2)}`
        }
      />
      <SvgMath
        x={right - 128}
        y={34}
        width={120}
        height={28}
        align="right"
        fontSize={11}
        latex={`a=${layer.coefficient.toFixed(5)}`}
        label={`a=${layer.coefficient.toFixed(5)}`}
      />
    </g>
  );
}

function FunctionTransformLayer({
  layer,
  locale,
  markerId,
}: SemanticDescriptorLayerProps & {
  readonly layer: Extract<ExperimentSemanticLayer, { readonly kind: "function-transform" }>;
}) {
  const zh = locale === "zh-CN";
  const left = 56;
  const right = 716;
  const top = 40;
  const bottom = 316;
  const allPoints = [
    ...layer.original,
    ...layer.transformed,
    layer.anchorSource,
    layer.anchorImage,
  ];
  const minimumX = Math.min(...allPoints.map((entry) => entry.x));
  const maximumX = Math.max(...allPoints.map((entry) => entry.x));
  const rawMinimumY = Math.min(...allPoints.map((entry) => entry.y), 0);
  const rawMaximumY = Math.max(...allPoints.map((entry) => entry.y), 0);
  const paddingY = Math.max(0.5, (rawMaximumY - rawMinimumY) * 0.1);
  const minimumY = rawMinimumY - paddingY;
  const maximumY = rawMaximumY + paddingY;
  const scaleX = (x: number) => left + ((x - minimumX) / (maximumX - minimumX)) * (right - left);
  const scaleY = (y: number) => bottom - ((y - minimumY) / (maximumY - minimumY)) * (bottom - top);
  const path = (points: readonly { readonly x: number; readonly y: number }[]) =>
    points
      .map(
        (entry, index) =>
          `${index === 0 ? "M" : "L"} ${scaleX(entry.x).toFixed(2)} ${scaleY(entry.y).toFixed(2)}`,
      )
      .join(" ");
  const source = { x: scaleX(layer.anchorSource.x), y: scaleY(layer.anchorSource.y) };
  const image = { x: scaleX(layer.anchorImage.x), y: scaleY(layer.anchorImage.y) };
  return (
    <g>
      <line x1={left} y1={scaleY(0)} x2={right} y2={scaleY(0)} className="visualization-axis" />
      <line x1={scaleX(0)} y1={top} x2={scaleX(0)} y2={bottom} className="visualization-axis" />
      <path d={path(layer.original)} className="gradient-field__direction" />
      <path d={path(layer.transformed)} className="visualization-trajectory" />
      {layer.progress > 0 ? (
        <line
          x1={source.x}
          y1={source.y}
          x2={image.x}
          y2={image.y}
          className="visualization-vector visualization-vector--primary"
          markerEnd={`url(#${markerId})`}
        />
      ) : null}
      <circle cx={source.x} cy={source.y} r="4" className="visualization-point" />
      <circle
        cx={image.x}
        cy={image.y}
        r="5"
        className="visualization-point visualization-point--current"
      />
      <SvgMathText
        x={left}
        y={3}
        width={650}
        height={28}
        fontSize={11}
        value={
          zh
            ? `虚线：${experimentNotation(layer.baseName["zh-CN"])}；实线：$a f(b(x-h))+k$；箭头：锚点 $(0,f(0))$ 的像`
            : `Dashed: ${experimentNotation(layer.baseName.en)}; solid: $a f(b(x-h))+k$; arrow: image of $(0,f(0))$`
        }
        label={
          zh
            ? `虚线：${layer.baseName["zh-CN"]}；实线：a·f(b(x−h))+k；箭头：锚点 (0,f(0)) 的像`
            : `Dashed: ${layer.baseName.en}; solid: a·f(b(x-h))+k; arrow: image of the anchor (0,f(0))`
        }
      />
      <SvgMath
        x={right - 370}
        y={25}
        width={370}
        height={26}
        align="right"
        fontSize={11}
        latex={`a=${layer.a.toFixed(2)},\\quad b=${layer.b.toFixed(2)},\\quad h=${layer.h.toFixed(2)},\\quad k=${layer.k.toFixed(2)}`}
        label={`a=${layer.a.toFixed(2)} b=${layer.b.toFixed(2)} h=${layer.h.toFixed(2)} k=${layer.k.toFixed(2)}`}
      />
      <text x={scaleX(-6)} y={bottom + 20} textAnchor="middle" className="visualization-axis-label">
        −6
      </text>
      <text x={scaleX(0)} y={bottom + 20} textAnchor="middle" className="visualization-axis-label">
        0
      </text>
      <text x={scaleX(6)} y={bottom + 20} textAnchor="middle" className="visualization-axis-label">
        6
      </text>
      <SvgMath
        x={Math.min(620, image.x + 8)}
        y={Math.max(16, image.y - 24)}
        width={130}
        height={28}
        fontSize={12}
        latex={`(${layer.anchorImage.x.toFixed(2)},${layer.anchorImage.y.toFixed(2)})`}
        label={`(${layer.anchorImage.x.toFixed(2)}, ${layer.anchorImage.y.toFixed(2)})`}
      />
    </g>
  );
}

function ProjectileLayer({
  layer,
  locale,
  markerId,
}: SemanticDescriptorLayerProps & {
  readonly layer: Extract<ExperimentSemanticLayer, { readonly kind: "projectile" }>;
}) {
  const zh = locale === "zh-CN";
  const left = 64;
  const right = 700;
  const top = 36;
  const ground = 318;
  const xMaximum = layer.range * 1.06;
  const yMaximum = Math.max(layer.apexY * 1.18, layer.range * 0.12);
  const scaleX = (x: number) => left + (x / xMaximum) * (right - left);
  const scaleY = (y: number) => ground - (y / yMaximum) * (ground - top);
  const trajectoryPath = layer.trajectory
    .map(
      (entry, index) =>
        `${index === 0 ? "M" : "L"} ${scaleX(entry.x).toFixed(2)} ${scaleY(entry.y).toFixed(2)}`,
    )
    .join(" ");
  const launch = { x: scaleX(0), y: scaleY(0) };
  const apex = { x: scaleX(layer.apexX), y: scaleY(layer.apexY) };
  const landing = { x: scaleX(layer.range), y: scaleY(0) };
  const current = { x: scaleX(layer.currentX), y: scaleY(layer.currentY) };
  const angleEnd = {
    x: launch.x + 34 * Math.cos((layer.angleDegrees * Math.PI) / 180),
    y: launch.y - 34 * Math.sin((layer.angleDegrees * Math.PI) / 180),
  };
  const speed = Math.hypot(layer.velocityX, layer.velocityY);
  const velocityLength = speed === 0 ? 0 : Math.min(46, 400 / Math.max(speed, 1));
  const velocityEnd = {
    x: current.x + (speed === 0 ? 0 : (layer.velocityX / speed) * velocityLength),
    y: current.y - (speed === 0 ? 0 : (layer.velocityY / speed) * velocityLength),
  };
  return (
    <g>
      <line x1={left - 8} y1={ground} x2={right + 8} y2={ground} className="visualization-axis" />
      <line x1={launch.x} y1={top - 8} x2={launch.x} y2={ground} className="visualization-axis" />
      <path d={trajectoryPath} className="visualization-trajectory" />
      <line
        x1={launch.x}
        y1={launch.y}
        x2={angleEnd.x}
        y2={angleEnd.y}
        className="gradient-field__direction"
      />
      <line x1={apex.x} y1={apex.y} x2={apex.x} y2={ground} className="gradient-field__direction" />
      <circle cx={apex.x} cy={apex.y} r="4.5" className="attention-query-box" />
      <rect
        x={landing.x - 4}
        y={landing.y - 4}
        width="8"
        height="8"
        className="vanishing-gradient-node"
      />
      <line
        x1={current.x}
        y1={current.y}
        x2={velocityEnd.x}
        y2={velocityEnd.y}
        className="visualization-vector visualization-vector--primary"
        markerEnd={`url(#${markerId})`}
      />
      <circle
        cx={current.x}
        cy={current.y}
        r="5.5"
        className="visualization-point visualization-point--current"
      />
      <SvgMathText
        x={left + 4}
        y={3}
        width={650}
        height={36}
        fontSize={11}
        value={
          zh
            ? `$v_0=${layer.initialSpeed.toFixed(2)}\\,\\mathrm{m/s}$，$\\theta=${layer.angleDegrees.toFixed(1)}^\\circ$；圆点：当前位置与速度；空心圆：最高点；方块：落点`
            : `$v_0=${layer.initialSpeed.toFixed(2)}\\,\\mathrm{m/s}$, $\\theta=${layer.angleDegrees.toFixed(1)}^\\circ$; dot: current position and velocity; ring: apex; square: landing`
        }
        label={
          zh
            ? `v₀=${layer.initialSpeed.toFixed(2)} m/s，θ=${layer.angleDegrees.toFixed(1)}°；圆点：当前位置与速度；空心圆：最高点；方块：落点`
            : `v0=${layer.initialSpeed.toFixed(2)} m/s, theta=${layer.angleDegrees.toFixed(1)} deg; dot: current position and velocity; ring: apex; square: landing`
        }
      />
      <SvgMath
        x={apex.x + 8}
        y={apex.y - 12}
        width={140}
        height={28}
        fontSize={12}
        latex={`H=${layer.apexY.toFixed(2)}\\,\\mathrm m`}
        label={`H=${layer.apexY.toFixed(2)} m`}
      />
      <SvgMath
        x={(launch.x + landing.x) / 2 - 235}
        y={ground + 6}
        width={470}
        height={30}
        align="center"
        fontSize={12}
        latex={`R=${layer.range.toFixed(2)}\\,\\mathrm m,\\quad T=${layer.flightTime.toFixed(2)}\\,\\mathrm s,\\quad t=${layer.time.toFixed(2)}\\,\\mathrm s`}
        label={`R=${layer.range.toFixed(2)} m · T=${layer.flightTime.toFixed(2)} s · t=${layer.time.toFixed(2)} s`}
      />
    </g>
  );
}

function MaxwellLayer({
  layer,
  locale,
}: SemanticDescriptorLayerProps & {
  readonly layer: Extract<ExperimentSemanticLayer, { readonly kind: "maxwell" }>;
}) {
  const zh = locale === "zh-CN";
  const left = 64;
  const right = 700;
  const top = 36;
  const bottom = 318;
  const peakValue = Math.max(
    ...layer.samples.map((entry) => entry.y),
    ...layer.referenceSamples.map((entry) => entry.y),
  );
  const yMaximum = peakValue * 1.12;
  const scaleX = (v: number) => left + (v / layer.speedLimit) * (right - left);
  const scaleY = (value: number) => bottom - (value / yMaximum) * (bottom - top);
  const path = (points: readonly { readonly x: number; readonly y: number }[]) =>
    points
      .map(
        (entry, index) =>
          `${index === 0 ? "M" : "L"} ${scaleX(entry.x).toFixed(2)} ${scaleY(entry.y).toFixed(2)}`,
      )
      .join(" ");
  const markers = [
    { speed: layer.mostProbable, dash: undefined, name: "v_p" },
    { speed: layer.mean, dash: "6 3", name: "⟨v⟩" },
    { speed: layer.rootMeanSquare, dash: "2 3", name: "v_rms" },
  ] as const;
  return (
    <g>
      <line x1={left} y1={bottom} x2={right} y2={bottom} className="visualization-axis" />
      <line x1={left} y1={top} x2={left} y2={bottom} className="visualization-axis" />
      <path d={path(layer.referenceSamples)} className="gradient-field__direction" />
      <path d={path(layer.samples)} className="visualization-trajectory" />
      {layer.sweepSpeed < layer.speedLimit ? (
        <line
          x1={scaleX(layer.sweepSpeed)}
          y1={top}
          x2={scaleX(layer.sweepSpeed)}
          y2={bottom}
          className="visualization-grid-line"
        />
      ) : null}
      {markers.map((marker, index) => (
        <g key={marker.name}>
          <line
            x1={scaleX(marker.speed)}
            y1={bottom}
            x2={scaleX(marker.speed)}
            y2={top}
            className="visualization-axis"
            strokeDasharray={marker.dash}
          />
          <SvgMath
            x={scaleX(marker.speed) - 25}
            y={bottom + (index === 1 ? 22 : 4)}
            width={50}
            height={30}
            align="center"
            fontSize={12}
            latex={
              marker.name === "v_p"
                ? "v_p"
                : marker.name === "⟨v⟩"
                  ? "\\langle v\\rangle"
                  : "v_{\\mathrm{rms}}"
            }
            label={marker.name}
          />
        </g>
      ))}
      <SvgMathText
        x={left + 4}
        y={3}
        width={650}
        height={36}
        fontSize={11}
        value={
          zh
            ? `${layer.gasName["zh-CN"]}，$M=${layer.molarMass.toPrecision(6)}\\,\\mathrm{kg/mol}$，$T=${layer.temperature.toFixed(0)}\\,\\mathrm K$；实线：当前分布；虚线：$300\\,\\mathrm K$ 参考；竖线：$v_p$、$\\langle v\\rangle$、$v_{\\mathrm{rms}}$`
            : `${layer.gasName.en}, $M=${layer.molarMass.toPrecision(6)}\\,\\mathrm{kg/mol}$, $T=${layer.temperature.toFixed(0)}\\,\\mathrm K$; solid: current distribution; dashed: $300\\,\\mathrm K$ reference; verticals: $v_p$, $\\langle v\\rangle$, $v_{\\mathrm{rms}}$`
        }
        label={
          zh
            ? `${layer.gasName["zh-CN"]}，M=${layer.molarMass.toPrecision(6)} kg/mol，T=${layer.temperature.toFixed(0)} K；实线：当前分布；虚线：300 K 参考；竖线：v_p、⟨v⟩、v_rms`
            : `${layer.gasName.en}, M=${layer.molarMass.toPrecision(6)} kg/mol, T=${layer.temperature.toFixed(0)} K; solid: current distribution; dashed: 300 K reference; verticals: v_p, <v>, v_rms`
        }
      />
    </g>
  );
}

function LeastSquaresLayer({
  layer,
  locale,
}: SemanticDescriptorLayerProps & {
  readonly layer: Extract<ExperimentSemanticLayer, { readonly kind: "least-squares" }>;
}) {
  const zh = locale === "zh-CN";
  const left = 64;
  const right = 700;
  const top = 36;
  const bottom = 318;
  const lineY = (slope: number, intercept: number, x: number) => intercept + slope * x;
  const candidateY = [
    ...layer.points.map((entry) => entry.y),
    lineY(layer.trueSlope, layer.trueIntercept, 0),
    lineY(layer.trueSlope, layer.trueIntercept, 10),
    ...(layer.fit
      ? [
          lineY(layer.fit.slope, layer.fit.intercept, 0),
          lineY(layer.fit.slope, layer.fit.intercept, 10),
        ]
      : []),
  ];
  const rawMinimumY = Math.min(...candidateY);
  const rawMaximumY = Math.max(...candidateY);
  const paddingY = Math.max(0.5, (rawMaximumY - rawMinimumY) * 0.12);
  const minimumY = rawMinimumY - paddingY;
  const maximumY = rawMaximumY + paddingY;
  const scaleX = (x: number) => left + (x / 10) * (right - left);
  const scaleY = (y: number) => bottom - ((y - minimumY) / (maximumY - minimumY)) * (bottom - top);
  const linePath = (slope: number, intercept: number) =>
    `M ${scaleX(0).toFixed(2)} ${scaleY(lineY(slope, intercept, 0)).toFixed(2)} L ${scaleX(10).toFixed(2)} ${scaleY(lineY(slope, intercept, 10)).toFixed(2)}`;
  const fit = layer.fit;
  return (
    <g>
      <line x1={left} y1={bottom} x2={right} y2={bottom} className="visualization-axis" />
      <line x1={left} y1={top} x2={left} y2={bottom} className="visualization-axis" />
      {fit
        ? layer.points.map((entry) => (
            <line
              key={`${entry.x.toFixed(5)}`}
              x1={scaleX(entry.x)}
              y1={scaleY(entry.y)}
              x2={scaleX(entry.x)}
              y2={scaleY(lineY(fit.slope, fit.intercept, entry.x))}
              className="visualization-grid-line"
            />
          ))
        : null}
      <path
        d={linePath(layer.trueSlope, layer.trueIntercept)}
        className="gradient-field__direction"
      />
      {fit ? (
        <path d={linePath(fit.slope, fit.intercept)} className="visualization-trajectory" />
      ) : null}
      {layer.points.map((entry) => (
        <circle
          key={`${entry.x.toFixed(5)}:${entry.y.toFixed(5)}`}
          cx={scaleX(entry.x)}
          cy={scaleY(entry.y)}
          r="3"
          className="visualization-point"
        />
      ))}
      <SvgMathText
        x={left + 4}
        y={3}
        width={650}
        height={26}
        fontSize={11}
        value={
          zh
            ? `$n=${layer.count}$；圆点：样本；实线：当前拟合；虚线：真实 $y=0.8+1.2x$；细线：残差`
            : `$n=${layer.count}$; dots: samples; solid: current fit; dashed: true $y=0.8+1.2x$; thin lines: residuals`
        }
        label={
          zh
            ? `n=${layer.count}；圆点：样本；实线：当前拟合；虚线：真实 y=0.8+1.2x；细线：残差`
            : `n=${layer.count}; dots: samples; solid: current fit; dashed: true y=0.8+1.2x; thin lines: residuals`
        }
      />
      <SvgMathText
        x={right - 400}
        y={24}
        width={400}
        height={28}
        align="right"
        fontSize={11}
        value={
          fit
            ? `$\\hat\\beta_0=${fit.intercept.toFixed(3)},\\quad \\hat\\beta_1=${fit.slope.toFixed(3)},\\quad \\mathrm{RSS}=${layer.residualSumOfSquares?.toFixed(4) ?? "—"}$`
            : zh
              ? "样本不足两点"
              : "fewer than two samples"
        }
        label={
          fit
            ? `β̂₀=${fit.intercept.toFixed(3)} β̂₁=${fit.slope.toFixed(3)} RSS=${layer.residualSumOfSquares?.toFixed(4) ?? "—"}`
            : zh
              ? "样本不足两点"
              : "fewer than two samples"
        }
      />
    </g>
  );
}

export function SemanticDescriptorLayer(props: SemanticDescriptorLayerProps) {
  if (props.layer.kind === "field") {
    return <FieldLayer layer={props.layer} locale={props.locale} markerId={props.markerId} />;
  }
  if (props.layer.kind === "quantum") {
    return <QuantumLayer layer={props.layer} locale={props.locale} markerId={props.markerId} />;
  }
  if (props.layer.kind === "algorithm") {
    return <AlgorithmLayer layer={props.layer} locale={props.locale} markerId={props.markerId} />;
  }
  if (props.layer.kind === "function-transform") {
    return (
      <FunctionTransformLayer layer={props.layer} locale={props.locale} markerId={props.markerId} />
    );
  }
  if (props.layer.kind === "projectile") {
    return <ProjectileLayer layer={props.layer} locale={props.locale} markerId={props.markerId} />;
  }
  if (props.layer.kind === "maxwell") {
    return <MaxwellLayer layer={props.layer} locale={props.locale} markerId={props.markerId} />;
  }
  if (props.layer.kind === "least-squares") {
    return (
      <LeastSquaresLayer layer={props.layer} locale={props.locale} markerId={props.markerId} />
    );
  }
  return <PinnLayer layer={props.layer} locale={props.locale} markerId={props.markerId} />;
}
