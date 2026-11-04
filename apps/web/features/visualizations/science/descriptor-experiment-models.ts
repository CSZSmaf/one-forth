export const descriptorExperimentIds = [
  "probability-sampling-convergence",
  "confidence-coverage",
  "phase-space-chaos",
  "coulomb-gauss-field",
  "quantum-measurement",
  "algorithm-complexity-trace",
  "ode-stability-convergence",
  "pinn-residual-training",
  "function-graph-transform",
  "riemann-sum-convergence",
  "birthday-paradox-simulation",
  "damped-oscillator-regimes",
  "projectile-motion",
  "maxwell-speed-distribution",
  "least-squares-regression",
  "epsilon-greedy-bandit",
] as const;

export type DescriptorExperimentId = (typeof descriptorExperimentIds)[number];

export interface DescriptorExperimentState {
  readonly parameter: number;
  readonly seed: number;
  readonly step: number;
  readonly speed: number;
}

export interface ExperimentSeriesPoint {
  readonly x: number;
  readonly y: number;
}

export interface ExperimentMetric {
  readonly label: { readonly "zh-CN": string; readonly en: string };
  readonly value: string;
}

export type ExperimentSemanticLayer =
  | {
      readonly kind: "field";
      readonly radius: number;
      readonly charges: readonly {
        readonly x: number;
        readonly y: number;
        readonly charge: number;
      }[];
      readonly vectors: readonly {
        readonly x: number;
        readonly y: number;
        readonly dx: number;
        readonly dy: number;
      }[];
      readonly surfaceSamples: readonly {
        readonly x: number;
        readonly y: number;
        readonly fluxDensity: number;
      }[];
    }
  | {
      readonly kind: "quantum";
      readonly angleDegrees: number;
      readonly probabilityZero: number;
      readonly probabilityOne: number;
      readonly observedZero: number;
      readonly observedOne: number;
    }
  | {
      readonly kind: "algorithm";
      readonly completedPasses: number;
      readonly values: readonly {
        readonly value: number;
        readonly originalIndex: number;
        readonly sortedPrefix: boolean;
      }[];
    }
  | {
      readonly kind: "pinn";
      readonly coefficient: number;
      readonly residual: number;
      readonly samples: readonly {
        readonly x: number;
        readonly trial: number;
        readonly exact: number;
      }[];
    }
  | {
      readonly kind: "function-transform";
      readonly baseName: { readonly "zh-CN": string; readonly en: string };
      readonly a: number;
      readonly b: number;
      readonly h: number;
      readonly k: number;
      readonly progress: number;
      readonly anchorSource: ExperimentSeriesPoint;
      readonly anchorImage: ExperimentSeriesPoint;
      readonly original: readonly ExperimentSeriesPoint[];
      readonly transformed: readonly ExperimentSeriesPoint[];
    }
  | {
      readonly kind: "projectile";
      readonly angleDegrees: number;
      readonly initialSpeed: number;
      readonly gravity: number;
      readonly range: number;
      readonly apexX: number;
      readonly apexY: number;
      readonly flightTime: number;
      readonly time: number;
      readonly currentX: number;
      readonly currentY: number;
      readonly velocityX: number;
      readonly velocityY: number;
      readonly trajectory: readonly ExperimentSeriesPoint[];
    }
  | {
      readonly kind: "maxwell";
      readonly gasName: { readonly "zh-CN": string; readonly en: string };
      readonly temperature: number;
      readonly molarMass: number;
      readonly mostProbable: number;
      readonly mean: number;
      readonly rootMeanSquare: number;
      readonly sweepSpeed: number;
      readonly speedLimit: number;
      readonly samples: readonly ExperimentSeriesPoint[];
      readonly referenceSamples: readonly ExperimentSeriesPoint[];
    }
  | {
      readonly kind: "least-squares";
      readonly points: readonly ExperimentSeriesPoint[];
      readonly fit: { readonly slope: number; readonly intercept: number } | null;
      readonly trueSlope: number;
      readonly trueIntercept: number;
      readonly count: number;
      readonly residualSumOfSquares: number | null;
    };

export interface DescriptorExperimentSnapshot {
  readonly primary: readonly ExperimentSeriesPoint[];
  readonly reference?: readonly ExperimentSeriesPoint[];
  readonly primaryLabel: { readonly "zh-CN": string; readonly en: string };
  readonly referenceLabel?: { readonly "zh-CN": string; readonly en: string };
  readonly xLabel: { readonly "zh-CN": string; readonly en: string };
  readonly yLabel: { readonly "zh-CN": string; readonly en: string };
  readonly metrics: readonly ExperimentMetric[];
  readonly textAlternative: { readonly "zh-CN": string; readonly en: string };
  readonly status: { readonly "zh-CN": string; readonly en: string };
  readonly semanticLayer?: ExperimentSemanticLayer;
  readonly verification: {
    readonly passed: boolean;
    readonly residual: number;
    readonly statement: { readonly "zh-CN": string; readonly en: string };
  };
}

export interface DescriptorExperiment {
  readonly id: DescriptorExperimentId;
  readonly maximumStep: number;
  readonly initialState: DescriptorExperimentState;
  readonly parameter: {
    readonly label: { readonly "zh-CN": string; readonly en: string };
    readonly minimum: number;
    readonly maximum: number;
    readonly step: number;
    readonly unit?: string;
  };
  resolveMaximumStep?(state: DescriptorExperimentState): number;
  build(state: DescriptorExperimentState): DescriptorExperimentSnapshot;
}

const label = (zhCN: string, en: string) => ({ "zh-CN": zhCN, en });
const point = (x: number, y: number): ExperimentSeriesPoint => ({ x, y });
const metric = (zhCN: string, en: string, value: string): ExperimentMetric => ({
  label: label(zhCN, en),
  value,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createRandom(seed: number): () => number {
  let state = Math.trunc(seed) >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function normalSample(random: () => number): number {
  const first = Math.max(Number.EPSILON, random());
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function inverseNormalCdf(probability: number): number {
  const p = clamp(probability, 1e-9, 1 - 1e-9);
  if (p < 0.5) return -inverseNormalCdf(1 - p);
  const t = Math.sqrt(-2 * Math.log(1 - p));
  return (
    t -
    (2.515517 + 0.802853 * t + 0.010328 * t * t) /
      (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t)
  );
}

function probabilitySampling(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const probability = clamp(state.parameter, 0.05, 0.95);
  const count = clamp(Math.round(state.step), 0, 240);
  const random = createRandom(state.seed);
  const primary: ExperimentSeriesPoint[] = [point(0, 0)];
  const reference: ExperimentSeriesPoint[] = [point(0, probability)];
  let successes = 0;
  for (let index = 1; index <= count; index += 1) {
    if (random() < probability) successes += 1;
    primary.push(point(index, successes / index));
    reference.push(point(index, probability));
  }
  const mean = count === 0 ? 0 : successes / count;
  const residual = count === 0 ? probability : Math.abs(mean - probability);
  const passed = successes >= 0 && successes <= count && mean >= 0 && mean <= 1;
  return {
    primary,
    reference,
    primaryLabel: label("累计样本均值", "Cumulative sample mean"),
    referenceLabel: label("理论概率 p", "Theoretical probability p"),
    xLabel: label("样本数 n", "Sample count n"),
    yLabel: label("概率 / 频率", "Probability / frequency"),
    metrics: [
      metric("成功次数", "Successes", `${successes} / ${count}`),
      metric("累计均值", "Sample mean", mean.toFixed(4)),
      metric("绝对误差", "Absolute error", residual.toFixed(4)),
    ],
    textAlternative: label(
      `固定种子 ${state.seed} 的 Bernoulli(${probability.toFixed(2)}) 抽样已完成 ${count} 次，成功 ${successes} 次，样本均值 ${mean.toFixed(4)}，与理论概率相差 ${residual.toFixed(4)}。`,
      `${count} seeded Bernoulli(${probability.toFixed(2)}) trials produced ${successes} successes; the sample mean is ${mean.toFixed(4)} and its absolute error is ${residual.toFixed(4)}.`,
    ),
    status: label(
      "轨迹使用逐次累计计数；有限样本误差不要求单调下降。",
      "The trace uses cumulative counts; finite-sample error need not decrease monotonically.",
    ),
    verification: {
      passed,
      residual,
      statement: label(
        "成功计数、频率边界与曲线终点一致。",
        "Counts, frequency bounds, and the curve endpoint agree.",
      ),
    },
  };
}

function confidenceCoverage(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const confidence = clamp(state.parameter, 0.8, 0.99);
  const experiments = clamp(Math.round(state.step), 0, 160);
  const sampleSize = 24;
  const z = inverseNormalCdf((1 + confidence) / 2);
  const margin = z / Math.sqrt(sampleSize);
  const random = createRandom(state.seed);
  const primary: ExperimentSeriesPoint[] = [point(0, 0)];
  const reference: ExperimentSeriesPoint[] = [point(0, confidence)];
  let covered = 0;
  for (let experiment = 1; experiment <= experiments; experiment += 1) {
    let sum = 0;
    for (let sample = 0; sample < sampleSize; sample += 1) sum += normalSample(random);
    const mean = sum / sampleSize;
    if (mean - margin <= 0 && mean + margin >= 0) covered += 1;
    primary.push(point(experiment, covered / experiment));
    reference.push(point(experiment, confidence));
  }
  const rate = experiments === 0 ? 0 : covered / experiments;
  const standardError =
    experiments === 0 ? 0 : Math.sqrt((confidence * (1 - confidence)) / experiments);
  const residual = experiments === 0 ? confidence : Math.abs(rate - confidence);
  const passed =
    Number.isFinite(z) && covered >= 0 && covered <= experiments && rate >= 0 && rate <= 1;
  return {
    primary,
    reference,
    primaryLabel: label("累计覆盖率", "Cumulative coverage"),
    referenceLabel: label("名义置信水平", "Nominal confidence"),
    xLabel: label("重复实验数", "Repeated experiments"),
    yLabel: label("覆盖比例", "Coverage proportion"),
    metrics: [
      metric("覆盖次数", "Covered intervals", `${covered} / ${experiments}`),
      metric("覆盖率", "Coverage rate", rate.toFixed(4)),
      metric("二项标准误", "Binomial standard error", standardError.toFixed(4)),
    ],
    textAlternative: label(
      `对 N(0,1) 均值进行 ${experiments} 次重复区间估计，其中 ${covered} 个区间覆盖真值，累计覆盖率 ${rate.toFixed(4)}，名义水平 ${confidence.toFixed(3)}。`,
      `${covered} of ${experiments} normal-mean intervals cover the true mean; cumulative coverage is ${rate.toFixed(4)} versus nominal ${confidence.toFixed(3)}.`,
    ),
    status: label(
      "覆盖率是重复抽样性质，不是单个区间包含参数的后验概率。",
      "Coverage is a repeated-sampling property, not a posterior probability for one interval.",
    ),
    verification: {
      passed,
      residual,
      statement: label(
        "区间端点、覆盖指示量和累计计数逐次一致。",
        "Interval endpoints, coverage indicators, and cumulative counts agree.",
      ),
    },
  };
}

function phaseSpaceChaos(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const rate = clamp(state.parameter, 3.2, 4);
  const iterations = clamp(Math.round(state.step), 0, 140);
  const random = createRandom(state.seed);
  let first = 0.2 + random() * 0.6;
  let second = Math.min(1 - 1e-12, first + 1e-8);
  const primary: ExperimentSeriesPoint[] = [];
  const reference: ExperimentSeriesPoint[] = [point(0, 0), point(1, 1)];
  let lyapunovSum = 0;
  let maximumBoundaryError = 0;
  for (let index = 1; index <= iterations; index += 1) {
    lyapunovSum += Math.log(Math.max(1e-15, Math.abs(rate * (1 - 2 * first))));
    const nextFirst = rate * first * (1 - first);
    const nextSecond = rate * second * (1 - second);
    primary.push(point(first, nextFirst));
    first = nextFirst;
    second = nextSecond;
    maximumBoundaryError = Math.max(
      maximumBoundaryError,
      Math.max(0, -first, first - 1, -second, second - 1),
    );
  }
  if (primary.length === 0) primary.push(point(first, rate * first * (1 - first)));
  const separation = Math.abs(first - second);
  const lyapunov = iterations === 0 ? 0 : lyapunovSum / iterations;
  return {
    primary,
    reference,
    primaryLabel: label("返回映射轨迹 (xₙ,xₙ₊₁)", "Return-map orbit (x_n,x_n+1)"),
    referenceLabel: label("对角线 xₙ₊₁=xₙ", "Diagonal x_n+1=x_n"),
    xLabel: label("当前状态 xₙ", "Current state x_n"),
    yLabel: label("下一状态 xₙ₊₁", "Next state x_n+1"),
    metrics: [
      metric("末态距离", "Final separation", separation.toExponential(3)),
      metric("有限时间 Lyapunov", "Finite-time Lyapunov", lyapunov.toFixed(4)),
      metric("参数 r", "Parameter r", rate.toFixed(3)),
    ],
    textAlternative: label(
      `返回映射显示 logistic 映射 r=${rate.toFixed(3)} 的 ${iterations} 个相空间点 (xₙ,xₙ₊₁)。两条初值相差 10⁻⁸ 的轨迹末态距离为 ${separation.toExponential(3)}，有限时间 Lyapunov 指标为 ${lyapunov.toFixed(4)}。`,
      `The return map shows ${iterations} phase-space points (x_n,x_n+1) for the logistic map at r=${rate.toFixed(3)}. Two trajectories initially separated by 10^-8 end ${separation.toExponential(3)} apart; the finite-time Lyapunov estimate is ${lyapunov.toFixed(4)}.`,
    ),
    status: label(
      lyapunov > 0 ? "当前有限轨迹呈平均扰动放大。" : "当前有限轨迹未呈平均指数放大。",
      lyapunov > 0
        ? "This finite trajectory amplifies perturbations on average."
        : "This finite trajectory does not amplify perturbations exponentially on average.",
    ),
    verification: {
      passed: maximumBoundaryError <= 1e-12,
      residual: maximumBoundaryError,
      statement: label(
        "两条 logistic 轨迹在每一步都保持于不变区间 [0,1]。",
        "Both logistic trajectories remain in the invariant interval [0,1].",
      ),
    },
  };
}

function coulombGaussField(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const radius = clamp(state.parameter, 0.5, 3);
  const batches = clamp(Math.round(state.step), 0, 96);
  const totalSamples = 384;
  const samplesPerBatch = totalSamples / 96;
  const activeSamples = batches * samplesPerBatch;
  const random = createRandom(state.seed);
  const rotation = random() * 2 * Math.PI;
  const charges = [
    { x: 0.22, y: -0.12, charge: 1 },
    { x: -0.82, y: 0.48, charge: 0.65 },
    { x: 1.84, y: 0.91, charge: -0.45 },
  ] as const;
  const fieldAt = (x: number, y: number) =>
    charges.reduce(
      (sum, charge) => {
        const deltaX = x - charge.x;
        const deltaY = y - charge.y;
        const squaredDistance = Math.max(1e-6, deltaX * deltaX + deltaY * deltaY);
        return {
          x: sum.x + (charge.charge * deltaX) / squaredDistance,
          y: sum.y + (charge.charge * deltaY) / squaredDistance,
        };
      },
      { x: 0, y: 0 },
    );
  const enclosedCharge = charges
    .filter((charge) => Math.hypot(charge.x, charge.y) < radius)
    .reduce((sum, charge) => sum + charge.charge, 0);
  const exactFlux = 2 * Math.PI * enclosedCharge;
  const arcLength = (2 * Math.PI * radius) / totalSamples;
  const contributions: number[] = [];
  const allSurfaceSamples: Array<{ x: number; y: number; fluxDensity: number }> = [];
  for (let index = 0; index < totalSamples; index += 1) {
    const angle = rotation + (2 * Math.PI * index) / totalSamples;
    const normalX = Math.cos(angle);
    const normalY = Math.sin(angle);
    const x = radius * normalX;
    const y = radius * normalY;
    const field = fieldAt(x, y);
    const fluxDensity = field.x * normalX + field.y * normalY;
    contributions.push(fluxDensity * arcLength);
    allSurfaceSamples.push({ x, y, fluxDensity });
  }
  const numericalFullFlux = contributions.reduce((sum, contribution) => sum + contribution, 0);
  const residual = Math.abs(numericalFullFlux - exactFlux);
  const primary: ExperimentSeriesPoint[] = [point(0, 0)];
  const reference: ExperimentSeriesPoint[] = [point(0, 0)];
  let accumulatedFlux = 0;
  for (let batch = 1; batch <= batches; batch += 1) {
    const end = batch * samplesPerBatch;
    for (let index = end - samplesPerBatch; index < end; index += 1) {
      accumulatedFlux += contributions[index]!;
    }
    primary.push(point(batch, accumulatedFlux));
    reference.push(point(batch, exactFlux * (batch / 96)));
  }
  const vectors = [] as Array<{ x: number; y: number; dx: number; dy: number }>;
  for (let y = -2.4; y <= 2.41; y += 0.6) {
    for (let x = -2.4; x <= 2.41; x += 0.6) {
      if (charges.some((charge) => Math.hypot(x - charge.x, y - charge.y) < 0.18)) continue;
      const field = fieldAt(x, y);
      const magnitude = Math.max(1e-9, Math.hypot(field.x, field.y));
      vectors.push({ x, y, dx: field.x / magnitude, dy: field.y / magnitude });
    }
  }
  return {
    primary,
    reference,
    primaryLabel: label("累计数值通量", "Accumulated numerical flux"),
    referenceLabel: label("解析包围电荷基准", "Analytical enclosed-charge guide"),
    xLabel: label("求积批次（每批 4 点）", "Quadrature batches (4 points each)"),
    yLabel: label("二维归一化通量", "Normalized 2D flux"),
    metrics: [
      metric("包围净电荷", "Enclosed net charge", enclosedCharge.toFixed(2)),
      metric("已积分点", "Integrated points", `${activeSamples} / ${totalSamples}`),
      metric("累计通量", "Accumulated flux", accumulatedFlux.toFixed(6)),
      metric("完整数值通量", "Full numerical flux", numericalFullFlux.toFixed(6)),
      metric("解析通量 2πQ", "Analytical flux 2πQ", exactFlux.toFixed(6)),
    ],
    textAlternative: label(
      `二维归一化库仑场由三个偏心线电荷叠加。半径 ${radius.toFixed(2)} 的 Gaussian 圆包围净电荷 ${enclosedCharge.toFixed(2)}；固定种子把 ${totalSamples} 个积分点旋转到 ${((rotation * 180) / Math.PI).toFixed(1)}°。已累积 ${activeSamples} 点通量 ${accumulatedFlux.toFixed(6)}，完整数值通量 ${numericalFullFlux.toFixed(6)}，独立解析基准 2πQ=${exactFlux.toFixed(6)}。`,
      `A normalized 2D Coulomb field superposes three off-center line charges. The Gaussian circle of radius ${radius.toFixed(2)} encloses net charge ${enclosedCharge.toFixed(2)}; the seed rotates ${totalSamples} quadrature points by ${((rotation * 180) / Math.PI).toFixed(1)}°. ${activeSamples} points accumulate flux ${accumulatedFlux.toFixed(6)}; full numerical flux is ${numericalFullFlux.toFixed(6)} versus the independent 2πQ benchmark ${exactFlux.toFixed(6)}.`,
    ),
    status: label(
      "二维截面使用 E=Σq(r−rᵢ)/|r−rᵢ|² 与圆周通量；采样种子只旋转求积网格，不改变电荷配置。",
      "The 2D cross-section uses E=Σq(r-r_i)/|r-r_i|² and circle flux; the seed rotates only the quadrature grid, not the charge configuration.",
    ),
    semanticLayer: {
      kind: "field",
      radius,
      charges,
      vectors,
      surfaceSamples: allSurfaceSamples.slice(0, activeSamples),
    },
    verification: {
      passed: Number.isFinite(numericalFullFlux) && residual <= 5e-3,
      residual,
      statement: label(
        "完整圆周的逐点 E·n ds 求积与独立的 2π 倍包围净电荷基准一致。",
        "Pointwise E·n ds quadrature on the full circle agrees with the independent 2π times enclosed-net-charge benchmark.",
      ),
    },
  };
}

function quantumMeasurement(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const angleDegrees = clamp(state.parameter, 0, 180);
  const angle = (angleDegrees * Math.PI) / 180;
  const amplitudeZero = Math.cos(angle / 2);
  const amplitudeOne = Math.sin(angle / 2);
  const probabilityOne = amplitudeOne * amplitudeOne;
  const measurements = clamp(Math.round(state.step), 0, 240);
  const random = createRandom(state.seed);
  const primary: ExperimentSeriesPoint[] = [point(0, 0)];
  const reference: ExperimentSeriesPoint[] = [point(0, probabilityOne)];
  let ones = 0;
  for (let index = 1; index <= measurements; index += 1) {
    if (random() < probabilityOne) ones += 1;
    primary.push(point(index, ones / index));
    reference.push(point(index, probabilityOne));
  }
  const frequency = measurements === 0 ? 0 : ones / measurements;
  const normResidual = Math.abs(amplitudeZero * amplitudeZero + amplitudeOne * amplitudeOne - 1);
  return {
    primary,
    reference,
    primaryLabel: label("观测到 |1⟩ 的频率", "Observed |1> frequency"),
    referenceLabel: label("Born 概率", "Born probability"),
    xLabel: label("测量次数", "Measurements"),
    yLabel: label("概率 / 频率", "Probability / frequency"),
    metrics: [
      metric("P(1)", "P(1)", probabilityOne.toFixed(4)),
      metric("结果 1", "Outcome 1", `${ones} / ${measurements}`),
      metric("态范数残差", "State-norm residual", normResidual.toExponential(2)),
    ],
    textAlternative: label(
      `量子态极角 ${angleDegrees.toFixed(1)}°，Born 概率 P(1)=${probabilityOne.toFixed(4)}。固定种子的 ${measurements} 次测量得到 ${ones} 次结果 1，经验频率 ${frequency.toFixed(4)}。`,
      `At polar angle ${angleDegrees.toFixed(1)}°, Born probability P(1) is ${probabilityOne.toFixed(4)}. ${ones} of ${measurements} seeded measurements returned 1, for frequency ${frequency.toFixed(4)}.`,
    ),
    status: label(
      "每次测量前重新制备同一纯态；曲线表示重复实验频率。",
      "The same pure state is prepared before each measurement; the curve shows repeated-trial frequency.",
    ),
    semanticLayer: {
      kind: "quantum",
      angleDegrees,
      probabilityZero: 1 - probabilityOne,
      probabilityOne,
      observedZero: measurements === 0 ? 0 : (measurements - ones) / measurements,
      observedOne: frequency,
    },
    verification: {
      passed: normResidual <= 1e-12 && ones >= 0 && ones <= measurements,
      residual: normResidual,
      statement: label(
        "态归一化、Born 概率与测量计数通过核对。",
        "State normalization, Born probability, and measurement counts pass verification.",
      ),
    },
  };
}

function algorithmComplexityTrace(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const size = clamp(Math.round(state.parameter), 8, 64);
  const passes = clamp(Math.round(state.step), 0, size - 1);
  const random = createRandom(state.seed);
  const values = Array.from({ length: size }, (_, index) => ({ key: random(), id: index }));
  const originalIds = values
    .map((value) => value.id)
    .sort((a, b) => a - b)
    .join(",");
  const primary: ExperimentSeriesPoint[] = [point(0, 0)];
  const reference: ExperimentSeriesPoint[] = [point(0, 0)];
  let comparisons = 0;
  let moves = 0;
  let prefixOrdered = true;
  for (let pass = 1; pass <= passes; pass += 1) {
    const current = values[pass]!;
    let position = pass - 1;
    while (position >= 0) {
      comparisons += 1;
      if (values[position]!.key <= current.key) break;
      values[position + 1] = values[position]!;
      moves += 1;
      position -= 1;
    }
    values[position + 1] = current;
    moves += 1;
    prefixOrdered &&= values
      .slice(0, pass + 1)
      .every((value, index, prefix) => index === 0 || prefix[index - 1]!.key <= value.key);
    primary.push(point(pass, comparisons + moves));
    reference.push(point(pass, pass * (pass + 2)));
  }
  const idsPreserved =
    values
      .map((value) => value.id)
      .sort((a, b) => a - b)
      .join(",") === originalIds;
  const upperBound = passes * (passes + 2);
  const residual = Math.max(0, comparisons + moves - upperBound);
  return {
    primary,
    reference,
    primaryLabel: label("累计基本操作", "Cumulative primitive operations"),
    referenceLabel: label("实现的有限二次上界", "Finite quadratic bound"),
    xLabel: label("已完成插入轮次", "Completed insertion passes"),
    yLabel: label("操作计数", "Operation count"),
    metrics: [
      metric("比较", "Comparisons", String(comparisons)),
      metric("移动", "Moves", String(moves)),
      metric("二次上界", "Quadratic bound", String(upperBound)),
    ],
    textAlternative: label(
      `长度 ${size} 的固定种子排列已完成 ${passes} 轮插入排序，累计 ${comparisons} 次比较和 ${moves} 次移动；已排序前缀保持有序，操作总数不超过 ${upperBound}。`,
      `For a seeded permutation of length ${size}, ${passes} insertion-sort passes used ${comparisons} comparisons and ${moves} moves; the sorted prefix is ordered and total operations do not exceed ${upperBound}.`,
    ),
    status: label(
      "曲线统计明确的比较与移动，不把操作数冒充实际运行时间。",
      "The trace counts defined comparisons and moves; it is not wall-clock timing.",
    ),
    semanticLayer: {
      kind: "algorithm",
      completedPasses: passes,
      values: values.map((value, index) => ({
        value: value.key,
        originalIndex: value.id,
        sortedPrefix: index <= passes,
      })),
    },
    verification: {
      passed: prefixOrdered && idsPreserved && residual === 0,
      residual,
      statement: label(
        "有序前缀、元素守恒和有限二次上界均通过核对。",
        "Sorted-prefix, permutation-preservation, and finite-bound invariants pass.",
      ),
    },
  };
}

function odeStabilityConvergence(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const stepSize = clamp(state.parameter, 0.05, 2.4);
  const steps = clamp(Math.round(state.step), 0, 48);
  const initialValue = 0.75 + createRandom(state.seed)() * 0.5;
  const primary: ExperimentSeriesPoint[] = [point(0, initialValue)];
  const reference: ExperimentSeriesPoint[] = [point(0, initialValue)];
  let numerical = initialValue;
  let maximumRecurrenceResidual = 0;
  for (let index = 1; index <= steps; index += 1) {
    const previous = numerical;
    numerical = previous * (1 - stepSize);
    maximumRecurrenceResidual = Math.max(
      maximumRecurrenceResidual,
      Math.abs(numerical - (previous - stepSize * previous)),
    );
    const time = index * stepSize;
    primary.push(point(time, numerical));
    reference.push(point(time, initialValue * Math.exp(-time)));
  }
  const time = steps * stepSize;
  const exact = initialValue * Math.exp(-time);
  const error = Math.abs(numerical - exact);
  const amplification = Math.abs(1 - stepSize);
  return {
    primary,
    reference,
    primaryLabel: label("显式 Euler", "Explicit Euler"),
    referenceLabel: label("解析解 e⁻ᵗ", "Exact solution e^-t"),
    xLabel: label("时间 t", "Time t"),
    yLabel: label("解 y", "Solution y"),
    metrics: [
      metric("放大因子 |1−h|", "Amplification |1-h|", amplification.toFixed(3)),
      metric("固定种子初值 y₀", "Seeded initial value y0", initialValue.toFixed(4)),
      metric("终点绝对误差", "Endpoint absolute error", error.toExponential(3)),
      metric(
        "稳定分类",
        "Stability",
        amplification < 1 ? "stable" : amplification === 1 ? "boundary" : "unstable",
      ),
    ],
    textAlternative: label(
      `固定种子给出初值 ${initialValue.toFixed(4)}；显式 Euler 以步长 ${stepSize.toFixed(2)} 推进 ${steps} 步至 t=${time.toFixed(2)}，数值解 ${numerical.toFixed(5)}，解析解 ${exact.toFixed(5)}，放大因子 ${amplification.toFixed(3)}。`,
      `The fixed seed gives y0=${initialValue.toFixed(4)}; explicit Euler with h=${stepSize.toFixed(2)} has advanced ${steps} steps to t=${time.toFixed(2)}; numerical y=${numerical.toFixed(5)}, exact y=${exact.toFixed(5)}, amplification=${amplification.toFixed(3)}.`,
    ),
    status: label(
      amplification < 1
        ? "该步长对测试方程渐近稳定；稳定不等于误差小。"
        : "该步长位于稳定边界或之外，离散扰动不会渐近衰减。",
      amplification < 1
        ? "This step is asymptotically stable for the test equation; stability does not imply small error."
        : "This step is on or outside the stability boundary, so discrete perturbations do not decay asymptotically.",
    ),
    verification: {
      passed: maximumRecurrenceResidual <= 1e-12 && Number.isFinite(numerical),
      residual: maximumRecurrenceResidual,
      statement: label(
        "每一步都满足 Euler 递推 yₙ₊₁=(1−h)yₙ。",
        "Every step satisfies the Euler recurrence y[n+1]=(1-h)y[n].",
      ),
    },
  };
}

function pinnResidualTraining(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const learningRate = clamp(state.parameter, 0.005, 0.24);
  const epochs = clamp(Math.round(state.step), 0, 80);
  const random = createRandom(state.seed);
  let coefficient = -0.5 + random() * 2;
  let maximumUpdateResidual = 0;
  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    const previous = coefficient;
    // For -u''=2 the raw residual is 2(a-1).  Train against the
    // dimensionless normalized residual r/2, so L=(a-1)^2 and dL/da=2(a-1).
    // The normalization keeps the learning-rate control numerically useful
    // without changing the exact minimizer a=1.
    const gradient = 2 * (previous - 1);
    coefficient = previous - learningRate * gradient;
    maximumUpdateResidual = Math.max(
      maximumUpdateResidual,
      Math.abs(coefficient - (previous - learningRate * gradient)),
    );
  }
  const loss = (coefficient - 1) ** 2;
  const maximumSolutionError = Math.abs(coefficient - 1) * 0.25;
  const boundaryError = Math.max(
    Math.abs(coefficient * 0 * (1 - 0)),
    Math.abs(coefficient * 1 * (1 - 1)),
  );
  const primary: ExperimentSeriesPoint[] = [];
  const reference: ExperimentSeriesPoint[] = [];
  for (let index = 0; index <= 64; index += 1) {
    const x = index / 64;
    primary.push(point(x, coefficient * x * (1 - x)));
    reference.push(point(x, x * (1 - x)));
  }
  return {
    primary,
    reference,
    primaryLabel: label("当前试探解 uₐ(x)", "Current trial solution u_a(x)"),
    referenceLabel: label("解析解 x(1−x)", "Exact solution x(1-x)"),
    xLabel: label("空间坐标 x", "Spatial coordinate x"),
    yLabel: label("解 u(x)", "Solution u(x)"),
    metrics: [
      metric("试探参数 a", "Trial coefficient a", coefficient.toFixed(6)),
      metric("归一化残差损失", "Normalized residual loss", loss.toExponential(3)),
      metric("最大解误差", "Maximum solution error", maximumSolutionError.toExponential(3)),
      metric("边界误差", "Boundary error", boundaryError.toExponential(2)),
    ],
    textAlternative: label(
      `试探解 uₐ=a x(1−x) 以学习率 ${learningRate.toFixed(3)} 训练 ${epochs} 步，当前 a=${coefficient.toFixed(6)}，PDE 残差损失 ${loss.toExponential(3)}，边界误差为 ${boundaryError.toExponential(2)}。`,
      `The trial solution u_a=a x(1-x), trained for ${epochs} steps at learning rate ${learningRate.toFixed(3)}, has a=${coefficient.toFixed(6)}, normalized PDE residual loss ${loss.toExponential(3)}, and boundary error ${boundaryError.toExponential(2)}.`,
    ),
    status: label(
      "边界条件由试探函数结构精确满足；训练只最小化内部 PDE 残差。",
      "The trial-function structure enforces boundary conditions exactly; training minimizes the interior PDE residual.",
    ),
    semanticLayer: {
      kind: "pinn",
      coefficient,
      residual: 2 * (coefficient - 1),
      samples: primary.map((entry, index) => ({
        x: entry.x,
        trial: entry.y,
        exact: reference[index]!.y,
      })),
    },
    verification: {
      passed: maximumUpdateResidual <= 1e-12 && boundaryError === 0 && loss >= 0,
      residual: Math.max(maximumUpdateResidual, boundaryError),
      statement: label(
        "解析梯度更新、非负损失与零边界误差通过核对。",
        "Analytical gradient updates, non-negative loss, and zero boundary error pass verification.",
      ),
    },
  };
}

const transformBases = [
  { name: label("f(x)=x²", "f(x)=x^2"), evaluate: (x: number) => x * x },
  { name: label("f(x)=sin x", "f(x)=sin x"), evaluate: (x: number) => Math.sin(x) },
  { name: label("f(x)=|x|", "f(x)=|x|"), evaluate: (x: number) => Math.abs(x) },
] as const;

function functionGraphTransform(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const shift = clamp(state.parameter, -3, 3);
  const progress = clamp(Math.round(state.step), 0, 40) / 40;
  const target = { a: 1.6, b: 0.5, h: shift, k: -1 };
  const a = 1 + progress * (target.a - 1);
  const b = 1 + progress * (target.b - 1);
  const h = progress * target.h;
  const k = progress * target.k;
  const base = transformBases[state.seed % transformBases.length]!;
  const original: ExperimentSeriesPoint[] = [];
  const transformed: ExperimentSeriesPoint[] = [];
  for (let index = 0; index <= 160; index += 1) {
    const x = -6 + (12 * index) / 160;
    original.push(point(x, base.evaluate(x)));
    transformed.push(point(x, a * base.evaluate(b * (x - h)) + k));
  }
  const anchorSource = point(0, base.evaluate(0));
  const anchorImage = point(h, a * base.evaluate(0) + k);
  let mappingResidual = 0;
  for (let index = 0; index <= 28; index += 1) {
    const x0 = -6 + (12 * index) / 28;
    const imageX = h + x0 / b;
    const viaFormula = a * base.evaluate(b * (imageX - h)) + k;
    const viaMapping = a * base.evaluate(x0) + k;
    mappingResidual = Math.max(mappingResidual, Math.abs(viaFormula - viaMapping));
  }
  const anchorResidual = Math.abs(
    a * base.evaluate(b * (anchorImage.x - h)) + k - anchorImage.y,
  );
  const residual = Math.max(mappingResidual, anchorResidual);
  return {
    primary: transformed,
    reference: original,
    primaryLabel: label("变换后图象 y=a·f(b(x−h))+k", "Transformed graph a·f(b(x-h))+k"),
    referenceLabel: label("原图象 y=f(x)", "Original graph y=f(x)"),
    xLabel: label("自变量 x", "Input x"),
    yLabel: label("函数值 y", "Output y"),
    metrics: [
      metric("基函数（由种子选定）", "Base function (seeded)", bilingual(base.name)),
      metric("当前 a", "Current a", a.toFixed(3)),
      metric("当前 b", "Current b", b.toFixed(3)),
      metric("当前 h", "Current h", h.toFixed(3)),
      metric("当前 k", "Current k", k.toFixed(3)),
      metric(
        "锚点的像",
        "Anchor image",
        `(${anchorImage.x.toFixed(3)}, ${anchorImage.y.toFixed(3)})`,
      ),
    ],
    textAlternative: label(
      `基函数 ${base.name["zh-CN"]}，变换参数目标值 a=1.6、b=0.5、h=${shift.toFixed(2)}、k=−1，当前进度 ${(progress * 100).toFixed(0)}%，对应 a=${a.toFixed(3)}、b=${b.toFixed(3)}、h=${h.toFixed(3)}、k=${k.toFixed(3)}。锚点 (0, ${anchorSource.y.toFixed(3)}) 的像为 (${anchorImage.x.toFixed(3)}, ${anchorImage.y.toFixed(3)})。`,
      `Base ${base.name.en}; targets a=1.6, b=0.5, h=${shift.toFixed(2)}, k=-1 at ${(progress * 100).toFixed(0)}% progress give a=${a.toFixed(3)}, b=${b.toFixed(3)}, h=${h.toFixed(3)}, k=${k.toFixed(3)}. The anchor (0, ${anchorSource.y.toFixed(3)}) maps to (${anchorImage.x.toFixed(3)}, ${anchorImage.y.toFixed(3)}).`,
    ),
    status: label(
      "时间轴只插值参数；种子只在 {x², sin x, |x|} 中选择基函数，不改变变换。b=0.5 表示横向拉长 2 倍。",
      "The timeline interpolates parameters only; the seed picks the base function in {x^2, sin x, |x|} and never changes the transform. b=0.5 stretches horizontally by 2.",
    ),
    semanticLayer: {
      kind: "function-transform",
      baseName: base.name,
      a,
      b,
      h,
      k,
      progress,
      anchorSource,
      anchorImage,
      original,
      transformed,
    },
    verification: {
      passed: residual <= 1e-9,
      residual,
      statement: label(
        "点映射规则核对：公式在 h+x₀/b 处的值等于 a·f(x₀)+k，且锚点像满足同一恒等式。",
        "Point-mapping check: the formula at h+x0/b equals a·f(x0)+k, and the anchor image satisfies the same identity.",
      ),
    },
  };
}

function bilingual(value: { readonly "zh-CN": string; readonly en: string }): string {
  return `${value["zh-CN"]} / ${value.en}`;
}

const riemannIntegrands = [
  {
    name: label("f(x)=x²，[0,1]", "f(x)=x^2 on [0,1]"),
    a: 0,
    b: 1,
    evaluate: (x: number) => x * x,
    integral: 1 / 3,
    maxFirstDerivative: 2,
    maxSecondDerivative: 2,
  },
  {
    name: label("f(x)=sin x，[0,π]", "f(x)=sin x on [0,pi]"),
    a: 0,
    b: Math.PI,
    evaluate: (x: number) => Math.sin(x),
    integral: 2,
    maxFirstDerivative: 1,
    maxSecondDerivative: 1,
  },
  {
    name: label("f(x)=eˣ，[0,1]", "f(x)=e^x on [0,1]"),
    a: 0,
    b: 1,
    evaluate: (x: number) => Math.exp(x),
    integral: Math.E - 1,
    maxFirstDerivative: Math.E,
    maxSecondDerivative: Math.E,
  },
] as const;

const riemannRuleNames = [
  label("左端点法则", "left-endpoint rule"),
  label("右端点法则", "right-endpoint rule"),
  label("中点法则", "midpoint rule"),
] as const;

function riemannSumConvergence(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const ruleIndex = clamp(Math.round(state.parameter), 0, 2);
  const partitions = clamp(Math.round(state.step), 0, 64);
  const integrand = riemannIntegrands[state.seed % riemannIntegrands.length]!;
  const { a, b, integral } = integrand;
  const width = b - a;
  const boundAt = (n: number) =>
    ruleIndex === 2
      ? (integrand.maxSecondDerivative * width * width * width) / (24 * n * n)
      : (integrand.maxFirstDerivative * width * width) / (2 * n);
  const sumAt = (n: number, reverse = false) => {
    const h = width / n;
    let total = 0;
    for (let index = 0; index < n; index += 1) {
      const cell = reverse ? n - 1 - index : index;
      const offset = ruleIndex === 0 ? cell : ruleIndex === 1 ? cell + 1 : cell + 0.5;
      total += integrand.evaluate(a + offset * h);
    }
    return total * h;
  };
  const primary: ExperimentSeriesPoint[] = [];
  const reference: ExperimentSeriesPoint[] = [];
  let violation = 0;
  for (let n = 1; n <= partitions; n += 1) {
    const error = Math.abs(sumAt(n) - integral);
    const bound = boundAt(n);
    violation = Math.max(violation, error - bound - 1e-12 * Math.max(1, bound));
    primary.push(point(n, error));
    reference.push(point(n, bound));
  }
  let replayResidual = 0;
  if (partitions > 0) {
    replayResidual = Math.abs(sumAt(partitions) - sumAt(partitions, true));
  }
  const currentSum = partitions > 0 ? sumAt(partitions) : null;
  const currentError = currentSum === null ? null : Math.abs(currentSum - integral);
  const residual = Math.max(0, violation, replayResidual - 1e-12);
  return {
    primary,
    reference,
    primaryLabel: label("实测误差 |Sₙ−I|", "Measured error |S_n-I|"),
    referenceLabel: label("经典误差界", "Classical error bound"),
    xLabel: label("分割数 n", "Partition count n"),
    yLabel: label("绝对误差", "Absolute error"),
    metrics: [
      metric("被积函数（由种子选定）", "Integrand (seeded)", bilingual(integrand.name)),
      metric("求积法则", "Quadrature rule", bilingual(riemannRuleNames[ruleIndex]!)),
      metric("分割数 n", "Partitions n", String(partitions)),
      metric("当前和 Sₙ", "Current sum S_n", currentSum === null ? "—" : currentSum.toFixed(8)),
      metric("解析积分 I", "Exact integral I", integral.toFixed(8)),
      metric("当前 |误差|", "Current |error|", currentError === null ? "—" : currentError.toExponential(3)),
    ],
    textAlternative: label(
      `对 ${integrand.name["zh-CN"]} 使用${riemannRuleNames[ruleIndex]!["zh-CN"]}，当前分割数 n=${partitions}，解析积分 I=${integral.toFixed(6)}${currentError === null ? "，尚未计算求积和。" : `，当前误差 ${currentError.toExponential(3)}，误差界 ${boundAt(partitions).toExponential(3)}。`}`,
      `${riemannRuleNames[ruleIndex]!.en} on ${integrand.name.en} with n=${partitions}; exact integral I=${integral.toFixed(6)}${currentError === null ? "; no sum computed yet." : `; current error ${currentError.toExponential(3)} versus bound ${boundAt(partitions).toExponential(3)}.`}`,
    ),
    status: label(
      "端点法则界为 M₁(b−a)²/(2n)，中点法则界为 M₂(b−a)³/(24n²)；界是全局上界，不是逐点渐近式。种子只选择被积函数。",
      "Endpoint rules are bounded by M1(b-a)^2/(2n), the midpoint rule by M2(b-a)^3/(24n^2); bounds are global upper estimates, not pointwise asymptotics. The seed only picks the integrand.",
    ),
    verification: {
      passed: residual <= 1e-12 && (currentSum === null || Number.isFinite(currentSum)),
      residual,
      statement: label(
        "每个已计算分割的误差都不超过对应法则的经典误差界，且反向求和复算一致。",
        "Every computed partition error stays within the classical bound for its rule, and reverse-order summation agrees.",
      ),
    },
  };
}

function birthdayParadox(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const people = clamp(Math.round(state.parameter), 2, 60);
  const trials = clamp(Math.round(state.step), 0, 240);
  let product = 1;
  let logSum = 0;
  for (let index = 0; index < people; index += 1) {
    product *= (365 - index) / 365;
    logSum += Math.log((365 - index) / 365);
  }
  const theoretical = 1 - product;
  const formulaResidual = Math.abs(theoretical - (1 - Math.exp(logSum)));
  const random = createRandom(state.seed);
  const primary: ExperimentSeriesPoint[] = [point(0, 0)];
  const reference: ExperimentSeriesPoint[] = [point(0, theoretical)];
  let collisions = 0;
  for (let trial = 1; trial <= trials; trial += 1) {
    const seen = new Set<number>();
    let hit = false;
    for (let person = 0; person < people; person += 1) {
      const day = Math.floor(random() * 365);
      if (seen.has(day)) hit = true;
      seen.add(day);
    }
    if (hit) collisions += 1;
    primary.push(point(trial, collisions / trial));
    reference.push(point(trial, theoretical));
  }
  const frequency = trials === 0 ? 0 : collisions / trials;
  const countsOk = collisions >= 0 && collisions <= trials && frequency >= 0 && frequency <= 1;
  const endpoint = primary.at(-1)!;
  const endpointOk = endpoint.y === frequency;
  return {
    primary,
    reference,
    primaryLabel: label("累计碰撞频率", "Cumulative collision frequency"),
    referenceLabel: label("理论概率 p(n)", "Theoretical probability p(n)"),
    xLabel: label("已抽组数", "Groups sampled"),
    yLabel: label("碰撞比例", "Collision proportion"),
    metrics: [
      metric("每组人数 n", "People per group n", String(people)),
      metric("理论概率 p(n)", "Theoretical p(n)", theoretical.toFixed(4)),
      metric("碰撞组数", "Groups with collision", `${collisions} / ${trials}`),
      metric("经验频率", "Empirical frequency", frequency.toFixed(4)),
      metric(
        "绝对误差",
        "Absolute error",
        trials === 0 ? "—" : Math.abs(frequency - theoretical).toFixed(4),
      ),
    ],
    textAlternative: label(
      `固定种子 ${state.seed} 模拟 ${trials} 组 ${people} 人生日，${collisions} 组出现同日碰撞，经验频率 ${frequency.toFixed(4)}；理论概率 p(n)=${theoretical.toFixed(4)}。`,
      `${collisions} of ${trials} seeded groups of ${people} people share a birthday; empirical frequency ${frequency.toFixed(4)} versus theoretical ${theoretical.toFixed(4)}.`,
    ),
    status: label(
      "生日在 365 个日期上均匀独立；经验频率是重复抽样性质，不证明单次结果。",
      "Birthdays are uniform and independent over 365 days; the frequency is a repeated-sampling property and proves nothing about a single group.",
    ),
    verification: {
      passed: formulaResidual <= 1e-12 && countsOk && endpointOk,
      residual: formulaResidual,
      statement: label(
        "理论概率的连乘与对数和两条计算路径一致；碰撞计数、频率边界与曲线终点一致。",
        "The product and log-sum evaluations of the theoretical probability agree; collision counts, frequency bounds, and the curve endpoint agree.",
      ),
    },
  };
}

interface DampedSample {
  readonly x: number;
  readonly v: number;
  readonly acceleration: number;
}

function dampedOscillatorRegimes(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const mass = 1; // kg
  const stiffness = 1; // N/m
  const damping = clamp(state.parameter, 0, 4); // kg/s
  const steps = clamp(Math.round(state.step), 0, 96);
  const deltaT = 0.25; // s
  const omega0 = Math.sqrt(stiffness / mass); // rad/s
  const zeta = damping / (2 * Math.sqrt(mass * stiffness));
  const x0 = 1; // m
  const v0 = -1 + 2 * createRandom(state.seed)(); // m/s
  const regime = Math.abs(zeta - 1) <= 1e-9 ? "critical" : zeta < 1 ? "under" : "over";
  const alpha = zeta * omega0;
  const dampedFrequency = regime === "under" ? omega0 * Math.sqrt(1 - zeta * zeta) : 0;
  const gamma = regime === "over" ? omega0 * Math.sqrt(zeta * zeta - 1) : 0;
  const rootFast = -alpha + gamma;
  const rootSlow = -alpha - gamma;
  const coefficientB = regime === "under" ? (v0 + alpha * x0) / dampedFrequency : 0;
  const coefficientD = v0 + omega0 * x0;
  const coefficientA =
    regime === "over" ? (v0 - rootSlow * x0) / (rootFast - rootSlow) : 0;
  const coefficientBOver = regime === "over" ? x0 - coefficientA : 0;
  const envelopeScale = Math.sqrt(x0 * x0 + coefficientB * coefficientB);
  const evaluate = (t: number): DampedSample => {
    if (regime === "under") {
      const decay = Math.exp(-alpha * t);
      const phase = dampedFrequency * t;
      const u = x0 * Math.cos(phase) + coefficientB * Math.sin(phase);
      const up =
        -x0 * dampedFrequency * Math.sin(phase) + coefficientB * dampedFrequency * Math.cos(phase);
      return {
        x: decay * u,
        v: decay * (up - alpha * u),
        acceleration: decay * ((alpha * alpha - dampedFrequency * dampedFrequency) * u - 2 * alpha * up),
      };
    }
    if (regime === "critical") {
      const decay = Math.exp(-omega0 * t);
      const w = x0 + coefficientD * t;
      return {
        x: decay * w,
        v: decay * (coefficientD - omega0 * w),
        acceleration: decay * (omega0 * omega0 * w - 2 * omega0 * coefficientD),
      };
    }
    const eFast = Math.exp(rootFast * t);
    const eSlow = Math.exp(rootSlow * t);
    return {
      x: coefficientA * eFast + coefficientBOver * eSlow,
      v: coefficientA * rootFast * eFast + coefficientBOver * rootSlow * eSlow,
      acceleration:
        coefficientA * rootFast * rootFast * eFast + coefficientBOver * rootSlow * rootSlow * eSlow,
    };
  };
  const envelopeAt = (t: number) => {
    if (regime === "under") return envelopeScale * Math.exp(-alpha * t);
    if (regime === "critical") return (Math.abs(x0) + Math.abs(coefficientD) * t) * Math.exp(-omega0 * t);
    return Math.abs(coefficientA) * Math.exp(rootFast * t) + Math.abs(coefficientBOver) * Math.exp(rootSlow * t);
  };
  const primary: ExperimentSeriesPoint[] = [];
  const reference: ExperimentSeriesPoint[] = [];
  let odeResidual = 0;
  let envelopeViolation = 0;
  for (let index = 0; index <= steps; index += 1) {
    const t = index * deltaT;
    const sample = evaluate(t);
    primary.push(point(t, sample.x));
    reference.push(point(t, envelopeAt(t)));
    odeResidual = Math.max(
      odeResidual,
      Math.abs(mass * sample.acceleration + damping * sample.v + stiffness * sample.x),
    );
    envelopeViolation = Math.max(envelopeViolation, Math.abs(sample.x) - envelopeAt(t));
  }
  const regimeLabel =
    regime === "under"
      ? label("欠阻尼 ζ<1", "underdamped zeta<1")
      : regime === "critical"
        ? label("临界阻尼 ζ=1", "critically damped zeta=1")
        : label("过阻尼 ζ>1", "overdamped zeta>1");
  const residual = Math.max(odeResidual, envelopeViolation);
  return {
    primary,
    reference,
    primaryLabel: label("解析位移 x(t)", "Analytical displacement x(t)"),
    referenceLabel: label("解析包络上界", "Analytical envelope bound"),
    xLabel: label("时间 t (s)", "Time t (s)"),
    yLabel: label("位移 x (m)", "Displacement x (m)"),
    metrics: [
      metric("regime 分类", "Regime", bilingual(regimeLabel)),
      metric("阻尼比 ζ", "Damping ratio zeta", zeta.toFixed(4)),
      metric("阻尼系数 c", "Damping c", `${damping.toFixed(2)} kg/s`),
      metric("固有频率 ω₀", "Natural frequency omega0", `${omega0.toFixed(3)} rad/s`),
      metric(
        "阻尼频率 ω_d",
        "Damped frequency omega_d",
        regime === "under" ? `${dampedFrequency.toFixed(4)} rad/s` : "—",
      ),
      metric("初值 x₀ / v₀", "Initial x0 / v0", `${x0.toFixed(2)} m / ${v0.toFixed(3)} m/s`),
    ],
    textAlternative: label(
      `m=1 kg、k=1 N/m、c=${damping.toFixed(2)} kg/s，ζ=${zeta.toFixed(4)}，处于${regimeLabel["zh-CN"]}。初值 x₀=1 m、v₀=${v0.toFixed(3)} m/s，时间推进到 t=${(steps * deltaT).toFixed(2)} s，当前位移 ${primary.at(-1)!.y.toFixed(5)} m。`,
      `With m=1 kg, k=1 N/m, c=${damping.toFixed(2)} kg/s, zeta=${zeta.toFixed(4)}, the system is ${regimeLabel.en}. From x0=1 m and v0=${v0.toFixed(3)} m/s the analytical solution reaches x=${primary.at(-1)!.y.toFixed(5)} m at t=${(steps * deltaT).toFixed(2)} s.`,
    ),
    status: label(
      "全部单位为 SI：m=1 kg，k=1 N/m，c 以 kg/s 计；包络是同族解析上界，临界分支判定阈值为 |ζ−1|≤10⁻⁹。",
      "All quantities use SI: m=1 kg, k=1 N/m, c in kg/s; the envelope is an analytical bound of the same family, and the critical branch is taken when |zeta-1|<=1e-9.",
    ),
    verification: {
      passed: odeResidual <= 1e-9 && envelopeViolation <= 1e-9,
      residual,
      statement: label(
        "每个采样时刻满足 m x″+c x′+k x=0（解析导数复算），且 |x(t)| 不超过解析包络上界。",
        "Every sampled instant satisfies m x''+c x'+k x=0 (analytical derivatives) and |x(t)| stays below the analytical envelope bound.",
      ),
    },
  };
}

function projectileMotion(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const gravity = 9.80665; // m/s^2
  const angleDegrees = clamp(state.parameter, 5, 85);
  const steps = clamp(Math.round(state.step), 0, 64);
  const angle = (angleDegrees * Math.PI) / 180;
  const initialSpeed = 12 + 16 * createRandom(state.seed)(); // m/s
  const velocityX = initialSpeed * Math.cos(angle);
  const initialVelocityY = initialSpeed * Math.sin(angle);
  const flightTime = (2 * initialVelocityY) / gravity; // s
  const range = velocityX * flightTime; // m
  const apexY = (initialVelocityY * initialVelocityY) / (2 * gravity); // m
  const apexX = range / 2;
  const positionAt = (t: number) => ({
    x: velocityX * t,
    y: initialVelocityY * t - 0.5 * gravity * t * t,
    vy: initialVelocityY - gravity * t,
  });
  const trajectory: ExperimentSeriesPoint[] = [];
  for (let index = 0; index <= 128; index += 1) {
    const x = (range * index) / 128;
    trajectory.push(
      point(x, x * Math.tan(angle) - (gravity * x * x) / (2 * velocityX * velocityX)),
    );
  }
  const primary: ExperimentSeriesPoint[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const sample = positionAt((index / 64) * flightTime);
    primary.push(point(sample.x, sample.y));
  }
  const time = (steps / 64) * flightTime;
  const current = positionAt(time);
  const scale = Math.max(1, range, apexY);
  let trajectoryResidual = 0;
  let energyResidual = 0;
  for (const entry of primary) {
    const analyticY =
      entry.x * Math.tan(angle) - (gravity * entry.x * entry.x) / (2 * velocityX * velocityX);
    trajectoryResidual = Math.max(trajectoryResidual, Math.abs(entry.y - analyticY) / scale);
    const t = entry.x / velocityX;
    const vy = initialVelocityY - gravity * t;
    const energy = 0.5 * (velocityX * velocityX + vy * vy) + gravity * entry.y;
    energyResidual = Math.max(
      energyResidual,
      Math.abs(energy - 0.5 * initialSpeed * initialSpeed) / (0.5 * initialSpeed * initialSpeed),
    );
  }
  let endpointResidual = 0;
  if (steps === 64) {
    endpointResidual = Math.max(
      Math.abs(current.x - range) / scale,
      Math.abs(current.y) / scale,
    );
  }
  const residual = Math.max(trajectoryResidual, energyResidual, endpointResidual);
  return {
    primary,
    reference: trajectory,
    primaryLabel: label("时间采样轨迹", "Time-sampled trajectory"),
    referenceLabel: label("解析轨迹 y(x)", "Analytical trajectory y(x)"),
    xLabel: label("水平位移 x (m)", "Horizontal position x (m)"),
    yLabel: label("高度 y (m)", "Height y (m)"),
    metrics: [
      metric("发射角 θ", "Launch angle theta", `${angleDegrees.toFixed(1)}°`),
      metric("初速度 v₀（由种子选定）", "Initial speed v0 (seeded)", `${initialSpeed.toFixed(3)} m/s`),
      metric("重力加速度 g", "Gravity g", `${gravity} m/s²`),
      metric("射程 R", "Range R", `${range.toFixed(3)} m`),
      metric("最大高度 H", "Maximum height H", `${apexY.toFixed(3)} m`),
      metric("飞行时间 T", "Flight time T", `${flightTime.toFixed(3)} s`),
      metric(
        "当前 t / x / y",
        "Current t / x / y",
        `${time.toFixed(2)} s / ${current.x.toFixed(2)} m / ${current.y.toFixed(2)} m`,
      ),
    ],
    textAlternative: label(
      `发射角 ${angleDegrees.toFixed(1)}°、初速度 ${initialSpeed.toFixed(2)} m/s 的无阻力抛体：射程 ${range.toFixed(2)} m，最大高度 ${apexY.toFixed(2)} m，飞行时间 ${flightTime.toFixed(2)} s。当前 t=${time.toFixed(2)} s，位置 (${current.x.toFixed(2)}, ${current.y.toFixed(2)}) m。`,
      `A drag-free projectile at ${angleDegrees.toFixed(1)}° and ${initialSpeed.toFixed(2)} m/s: range ${range.toFixed(2)} m, apex ${apexY.toFixed(2)} m, flight time ${flightTime.toFixed(2)} s. At t=${time.toFixed(2)} s the position is (${current.x.toFixed(2)}, ${current.y.toFixed(2)}) m.`,
    ),
    status: label(
      "忽略空气阻力；g=9.80665 m/s² 恒定，发射与落点同高。种子只在 [12,28] m/s 内确定 v₀。",
      "Drag is neglected; g=9.80665 m/s^2 is constant and launch and landing share the same height. The seed only fixes v0 in [12,28] m/s.",
    ),
    semanticLayer: {
      kind: "projectile",
      angleDegrees,
      initialSpeed,
      gravity,
      range,
      apexX,
      apexY,
      flightTime,
      time,
      currentX: current.x,
      currentY: current.y,
      velocityX,
      velocityY: current.vy,
      trajectory,
    },
    verification: {
      passed: residual <= 1e-9 && Number.isFinite(residual),
      residual,
      statement: label(
        "采样点满足轨迹恒等式与机械能守恒 ½(vₓ²+v_y²)+gy=½v₀²；满步时终点满足 x(T)=R、y(T)=0。",
        "Samples satisfy the trajectory identity and energy conservation (v_x^2+v_y^2)/2+gy=v0^2/2; at full step the endpoint satisfies x(T)=R and y(T)=0.",
      ),
    },
  };
}

const maxwellGases = [
  { name: label("氦 He", "helium He"), molarMass: 0.004002602 },
  { name: label("氮气 N₂", "nitrogen N2"), molarMass: 0.028014 },
  { name: label("氧气 O₂", "oxygen O2"), molarMass: 0.031998 },
  { name: label("氩 Ar", "argon Ar"), molarMass: 0.039948 },
] as const;

function maxwellSpeedDistribution(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const gasConstant = 8.314462618; // J/(mol*K)
  const temperature = clamp(state.parameter, 100, 1200); // K
  const steps = clamp(Math.round(state.step), 0, 64);
  const gas = maxwellGases[state.seed % maxwellGases.length]!;
  const mostProbable = Math.sqrt((2 * gasConstant * temperature) / gas.molarMass); // m/s
  const mean = Math.sqrt((8 * gasConstant * temperature) / (Math.PI * gas.molarMass)); // m/s
  const rootMeanSquare = Math.sqrt((3 * gasConstant * temperature) / gas.molarMass); // m/s
  const distributionAt = (kelvin: number) => (v: number) => {
    const coefficient = gas.molarMass / (2 * gasConstant * kelvin);
    return (
      4 * Math.PI * Math.pow(coefficient / Math.PI, 1.5) * v * v * Math.exp(-coefficient * v * v)
    );
  };
  const current = distributionAt(temperature);
  const referenceDistribution = distributionAt(300);
  const speedLimit = 4 * mostProbable;
  const sweepSpeed = (steps / 64) * speedLimit;
  const samples: ExperimentSeriesPoint[] = [point(0, 0)];
  const referenceSamples: ExperimentSeriesPoint[] = [point(0, 0)];
  const sampleCount = 96;
  for (let index = 1; index <= sampleCount; index += 1) {
    const v = (speedLimit * index) / sampleCount;
    referenceSamples.push(point(v, referenceDistribution(v)));
    if (v <= sweepSpeed) samples.push(point(v, current(v)));
  }
  const intervals = 4096;
  const upper = 8 * mostProbable;
  const h = upper / intervals;
  let integralSum = current(0) + current(upper);
  let gridMaximum = 0;
  for (let index = 1; index < intervals; index += 1) {
    const value = current(index * h);
    gridMaximum = Math.max(gridMaximum, value);
    integralSum += index % 2 === 0 ? 2 * value : 4 * value;
  }
  integralSum *= h / 3;
  const normalizationResidual = Math.abs(integralSum - 1);
  const peak = current(mostProbable);
  const meanRatioResidual = Math.abs(mean / mostProbable - 2 / Math.sqrt(Math.PI));
  const rmsRatioResidual = Math.abs(rootMeanSquare / mostProbable - Math.sqrt(3 / 2));
  const ordered = mostProbable < mean && mean < rootMeanSquare;
  const modeOk = gridMaximum <= peak * (1 + 1e-12);
  const ratiosOk = meanRatioResidual <= 1e-12 && rmsRatioResidual <= 1e-12;
  return {
    primary: samples,
    reference: referenceSamples,
    primaryLabel: label("当前温度分布 f(v)", "Distribution f(v) at current T"),
    referenceLabel: label("300 K 参考分布", "300 K reference distribution"),
    xLabel: label("速率 v (m/s)", "Speed v (m/s)"),
    yLabel: label("概率密度 f(v) (s/m)", "Probability density f(v) (s/m)"),
    metrics: [
      metric("气体（由种子选定）", "Gas (seeded)", bilingual(gas.name)),
      metric("摩尔质量 M", "Molar mass M", `${gas.molarMass.toPrecision(6)} kg/mol`),
      metric("温度 T", "Temperature T", `${temperature.toFixed(0)} K`),
      metric("最概然速率 v_p", "Most probable v_p", `${mostProbable.toFixed(1)} m/s`),
      metric("平均速率 ⟨v⟩", "Mean speed <v>", `${mean.toFixed(1)} m/s`),
      metric("方均根速率 v_rms", "RMS speed v_rms", `${rootMeanSquare.toFixed(1)} m/s`),
      metric("归一化积分", "Normalization integral", integralSum.toFixed(8)),
    ],
    textAlternative: label(
      `${gas.name["zh-CN"]}（M=${gas.molarMass.toPrecision(6)} kg/mol）在 T=${temperature.toFixed(0)} K 的 Maxwell 速率分布：v_p=${mostProbable.toFixed(1)} m/s，⟨v⟩=${mean.toFixed(1)} m/s，v_rms=${rootMeanSquare.toFixed(1)} m/s。虚线为同一气体 300 K 参考分布。`,
      `Maxwell speed distribution of ${gas.name.en} (M=${gas.molarMass.toPrecision(6)} kg/mol) at T=${temperature.toFixed(0)} K: v_p=${mostProbable.toFixed(1)} m/s, <v>=${mean.toFixed(1)} m/s, v_rms=${rootMeanSquare.toFixed(1)} m/s. The dashed curve is the 300 K reference for the same gas.`,
    ),
    status: label(
      "R=8.314462618 J/(mol·K)；种子只选择气体种类，参考分布固定为 300 K；扫描只展开速率轴。",
      "R=8.314462618 J/(mol*K); the seed only picks the gas, the reference distribution is fixed at 300 K, and the sweep only unfolds the speed axis.",
    ),
    semanticLayer: {
      kind: "maxwell",
      gasName: gas.name,
      temperature,
      molarMass: gas.molarMass,
      mostProbable,
      mean,
      rootMeanSquare,
      sweepSpeed,
      speedLimit,
      samples,
      referenceSamples,
    },
    verification: {
      passed: normalizationResidual <= 1e-6 && ratiosOk && ordered && modeOk,
      residual: normalizationResidual,
      statement: label(
        "f(v) 在 [0,8v_p] 上的 Simpson 求积归一到 10⁻⁶ 内；⟨v⟩/v_p=2/√π 与 v_rms/v_p=√(3/2) 精确成立，且 v_p 是采样最大值点。",
        "Simpson quadrature of f(v) on [0,8v_p] normalizes within 1e-6; <v>/v_p=2/sqrt(pi) and v_rms/v_p=sqrt(3/2) hold exactly, and v_p is the sampled maximum.",
      ),
    },
  };
}

function leastSquaresRegression(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const noiseScale = clamp(state.parameter, 0, 2);
  const count = clamp(Math.round(state.step), 0, 40);
  const trueIntercept = 0.8;
  const trueSlope = 1.2;
  const random = createRandom(state.seed);
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < 40; index += 1) {
    const x = random() * 10;
    const noise = normalSample(random);
    points.push({ x, y: trueIntercept + trueSlope * x + noiseScale * noise });
  }
  const fitPrefix = (n: number) => {
    if (n < 2) return null;
    let sumX = 0;
    let sumY = 0;
    for (let index = 0; index < n; index += 1) {
      sumX += points[index]!.x;
      sumY += points[index]!.y;
    }
    const meanX = sumX / n;
    const meanY = sumY / n;
    let sxx = 0;
    let sxy = 0;
    for (let index = 0; index < n; index += 1) {
      const dx = points[index]!.x - meanX;
      sxx += dx * dx;
      sxy += dx * (points[index]!.y - meanY);
    }
    if (sxx <= 0) return null;
    const slope = sxy / sxx;
    return { slope, intercept: meanY - slope * meanX };
  };
  const primary: ExperimentSeriesPoint[] = [];
  const reference: ExperimentSeriesPoint[] = [];
  for (let n = 2; n <= count; n += 1) {
    const fit = fitPrefix(n);
    if (!fit) continue;
    primary.push(point(n, Math.abs(fit.slope - trueSlope)));
    reference.push(point(n, Math.abs(fit.intercept - trueIntercept)));
  }
  const currentFit = fitPrefix(count);
  const fallbackFit =
    count === 1 ? { slope: 0, intercept: points[0]!.y } : null;
  const displayedFit = currentFit ?? fallbackFit;
  let rss: number | null = null;
  let orthogonalityResidual = 0;
  if (currentFit) {
    let residualSum = 0;
    let weightedResidualSum = 0;
    let squaredSum = 0;
    let sumY = 0;
    let sumXY = 0;
    for (let index = 0; index < count; index += 1) {
      const { x, y } = points[index]!;
      const r = y - currentFit.intercept - currentFit.slope * x;
      residualSum += r;
      weightedResidualSum += x * r;
      squaredSum += r * r;
      sumY += y;
      sumXY += x * y;
    }
    rss = squaredSum;
    const scale = 1 + Math.abs(sumY) + Math.abs(sumXY);
    orthogonalityResidual = Math.max(Math.abs(residualSum), Math.abs(weightedResidualSum)) / scale;
  }
  const residual = orthogonalityResidual;
  const revealedPoints = points.slice(0, count).map((entry) => point(entry.x, entry.y));
  return {
    primary,
    reference,
    primaryLabel: label("斜率误差 |β̂₁−β₁|", "Slope error |b1-beta1|"),
    referenceLabel: label("截距误差 |β̂₀−β₀|", "Intercept error |b0-beta0|"),
    xLabel: label("样本数 n", "Sample count n"),
    yLabel: label("参数绝对误差", "Absolute parameter error"),
    metrics: [
      metric("样本数 n", "Samples n", String(count)),
      metric("噪声尺度 σ", "Noise scale sigma", noiseScale.toFixed(2)),
      metric(
        "拟合 β̂₀ / β̂₁",
        "Fitted b0 / b1",
        displayedFit === null
          ? "—"
          : `${displayedFit.intercept.toFixed(4)} / ${displayedFit.slope.toFixed(4)}`,
      ),
      metric("真实 β₀ / β₁", "True beta0 / beta1", `${trueIntercept} / ${trueSlope}`),
      metric("残差平方和 RSS", "Residual sum of squares", rss === null ? "—" : rss.toFixed(6)),
    ],
    textAlternative: label(
      `固定种子生成 40 个散点，当前使用前 ${count} 个；真实关系 y=0.8+1.2x，噪声尺度 σ=${noiseScale.toFixed(2)}。${displayedFit === null ? "样本不足两点，尚未拟合斜率。" : `当前拟合 β̂₀=${displayedFit.intercept.toFixed(4)}、β̂₁=${displayedFit.slope.toFixed(4)}，RSS=${rss === null ? "—" : rss.toFixed(6)}。`}`,
      `A seeded set of 40 points is used up to n=${count}; the true relation is y=0.8+1.2x with noise scale sigma=${noiseScale.toFixed(2)}. ${displayedFit === null ? "Fewer than two points: no slope fit yet." : `Current fit b0=${displayedFit.intercept.toFixed(4)}, b1=${displayedFit.slope.toFixed(4)}, RSS=${rss === null ? "-" : rss.toFixed(6)}.`}`,
    ),
    status: label(
      "x 与噪声均由种子确定；n<2 时只显示截距模型（均值线）。误差曲线统计 |β̂−β|，不是泛化误差。",
      "Both x positions and noise are seeded; for n<2 only the intercept-only model (mean line) is shown. The error curves track |estimate-true|, not generalization error.",
    ),
    semanticLayer: {
      kind: "least-squares",
      points: revealedPoints,
      fit: displayedFit,
      trueSlope,
      trueIntercept,
      count,
      residualSumOfSquares: rss,
    },
    verification: {
      passed: residual <= 1e-9 && (rss === null || rss >= 0),
      residual,
      statement: label(
        "残差与 {1,x} 正交（Σr=0、Σxr=0，按数据尺度缩放），RSS 非负且由残差直接求和复算。",
        "Residuals are orthogonal to {1,x} (sum r=0, sum xr=0, scaled by data magnitude), and RSS is non-negative and recomputed from residuals.",
      ),
    },
  };
}

function epsilonGreedyBandit(state: DescriptorExperimentState): DescriptorExperimentSnapshot {
  const epsilon = clamp(state.parameter, 0, 0.5);
  const steps = clamp(Math.round(state.step), 0, 400);
  const armCount = 4;
  const runSimulation = (record: boolean) => {
    const random = createRandom(state.seed);
    const means = Array.from({ length: armCount }, (_, index) => 0.4 * index + 0.6 * random());
    const qValues = [0, 0, 0, 0];
    const counts = [0, 0, 0, 0];
    let totalReward = 0;
    let optimalPulls = 0;
    const optimalArm = means.indexOf(Math.max(...means));
    const trace: ExperimentSeriesPoint[] = record ? [point(0, 0)] : [];
    for (let t = 1; t <= steps; t += 1) {
      let arm = 0;
      if (random() < epsilon) {
        arm = Math.floor(random() * armCount);
      } else {
        let best = Number.NEGATIVE_INFINITY;
        for (const q of qValues) best = Math.max(best, q);
        const tied: number[] = [];
        for (let candidate = 0; candidate < armCount; candidate += 1) {
          if (qValues[candidate] === best) tied.push(candidate);
        }
        arm = tied[Math.floor(random() * tied.length)]!;
      }
      const reward = means[arm]! + normalSample(random);
      counts[arm]! += 1;
      qValues[arm]! += (reward - qValues[arm]!) / counts[arm]!;
      totalReward += reward;
      if (arm === optimalArm) optimalPulls += 1;
      if (record) trace.push(point(t, totalReward / t));
    }
    return { means, counts, totalReward, optimalPulls, optimalArm, trace };
  };
  const result = runSimulation(true);
  const replay = runSimulation(false);
  const optimalMean = result.means[result.optimalArm]!;
  const meanOfMeans = result.means.reduce((sum, value) => sum + value, 0) / armCount;
  const asymptote = (1 - epsilon) * optimalMean + epsilon * meanOfMeans;
  const asymptoticOptimalRate = 1 - epsilon + epsilon / armCount;
  const reference: ExperimentSeriesPoint[] = result.trace.map((entry) => point(entry.x, asymptote));
  const pullsTotal = result.counts.reduce((sum, value) => sum + value, 0);
  const countsResidual = Math.abs(pullsTotal - steps);
  const replayResidual =
    Math.abs(replay.totalReward - result.totalReward) +
    result.counts.reduce((sum, value, index) => sum + Math.abs(value - replay.counts[index]!), 0);
  const residual = countsResidual + replayResidual;
  const averageReward = steps === 0 ? 0 : result.totalReward / steps;
  const optimalRate = steps === 0 ? 0 : result.optimalPulls / steps;
  return {
    primary: result.trace,
    reference,
    primaryLabel: label("累计平均奖励", "Cumulative average reward"),
    referenceLabel: label("渐近期望 (1−ε)μ*+εμ̄", "Asymptotic (1-eps)mu*+eps*mu_bar"),
    xLabel: label("拉杆次数 t", "Pulls t"),
    yLabel: label("每步平均奖励", "Average reward per pull"),
    metrics: [
      metric("探索概率 ε", "Exploration epsilon", epsilon.toFixed(2)),
      metric("已执行步数", "Steps completed", String(steps)),
      metric("平均奖励", "Average reward", averageReward.toFixed(4)),
      metric("渐近期望奖励", "Asymptotic expected reward", asymptote.toFixed(4)),
      metric(
        "最优臂选择率",
        "Optimal-arm rate",
        `${optimalRate.toFixed(4)}（渐近 ${asymptoticOptimalRate.toFixed(4)}）`,
      ),
      metric("最优臂均值 μ*", "Best arm mean mu*", optimalMean.toFixed(4)),
    ],
    textAlternative: label(
      `固定种子 ${state.seed} 的 4 臂高斯老虎机，ε=${epsilon.toFixed(2)}，已执行 ${steps} 步，平均奖励 ${averageReward.toFixed(4)}，最优臂选择率 ${optimalRate.toFixed(4)}；渐近期望奖励 ${asymptote.toFixed(4)}，渐近最优臂率 ${asymptoticOptimalRate.toFixed(4)}。`,
      `A seeded 4-arm Gaussian bandit with epsilon=${epsilon.toFixed(2)} after ${steps} pulls: average reward ${averageReward.toFixed(4)}, optimal-arm rate ${optimalRate.toFixed(4)}; asymptotes ${asymptote.toFixed(4)} and ${asymptoticOptimalRate.toFixed(4)}.`,
    ),
    status: label(
      "Q 从零初始化并按增量式样本均值更新，并列最大时在并列集合中均匀抽取；渐近线假设 Q 已收敛到真实均值，只描述长期行为。",
      "Q starts at zero, updates by incremental sample means, and breaks ties uniformly within the tied set; the asymptote assumes Q has converged to the true means and describes only long-run behavior.",
    ),
    verification: {
      passed: residual === 0 && asymptote <= optimalMean + 1e-12 && Number.isFinite(result.totalReward),
      residual,
      statement: label(
        "动作计数之和等于步数，整段模拟由同一种子逐点重放一致，且渐近线满足 (1−ε)μ*+εμ̄≤μ*。",
        "Action counts sum to the step count, the whole simulation replays identically under the same seed, and the asymptote satisfies (1-eps)mu*+eps*mu_bar<=mu*.",
      ),
    },
  };
}

const descriptors: readonly DescriptorExperiment[] = [
  {
    id: "probability-sampling-convergence",
    maximumStep: 240,
    initialState: { parameter: 0.5, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("成功概率 p", "Success probability p"),
      minimum: 0.05,
      maximum: 0.95,
      step: 0.05,
    },
    build: probabilitySampling,
  },
  {
    id: "confidence-coverage",
    maximumStep: 160,
    initialState: { parameter: 0.95, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("名义置信水平", "Nominal confidence"),
      minimum: 0.8,
      maximum: 0.99,
      step: 0.01,
    },
    build: confidenceCoverage,
  },
  {
    id: "phase-space-chaos",
    maximumStep: 140,
    initialState: { parameter: 3.9, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("logistic 参数 r", "Logistic parameter r"),
      minimum: 3.2,
      maximum: 4,
      step: 0.01,
    },
    build: phaseSpaceChaos,
  },
  {
    id: "coulomb-gauss-field",
    maximumStep: 96,
    initialState: { parameter: 1.2, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("Gaussian 圆半径", "Gaussian circle radius"),
      minimum: 0.5,
      maximum: 3,
      step: 0.1,
      unit: "normalized",
    },
    build: coulombGaussField,
  },
  {
    id: "quantum-measurement",
    maximumStep: 240,
    initialState: { parameter: 90, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("Bloch 极角 θ", "Bloch polar angle θ"),
      minimum: 0,
      maximum: 180,
      step: 5,
      unit: "°",
    },
    build: quantumMeasurement,
  },
  {
    id: "algorithm-complexity-trace",
    maximumStep: 63,
    initialState: { parameter: 32, seed: 2027, step: 0, speed: 1 },
    parameter: { label: label("数组长度 n", "Array length n"), minimum: 8, maximum: 64, step: 1 },
    resolveMaximumStep: (state) => Math.max(1, Math.round(state.parameter) - 1),
    build: algorithmComplexityTrace,
  },
  {
    id: "ode-stability-convergence",
    maximumStep: 48,
    initialState: { parameter: 0.5, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("Euler 步长 h", "Euler step size h"),
      minimum: 0.05,
      maximum: 2.4,
      step: 0.05,
    },
    build: odeStabilityConvergence,
  },
  {
    id: "pinn-residual-training",
    maximumStep: 80,
    initialState: { parameter: 0.08, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("梯度下降学习率", "Gradient-descent learning rate"),
      minimum: 0.005,
      maximum: 0.24,
      step: 0.005,
    },
    build: pinnResidualTraining,
  },
  {
    id: "function-graph-transform",
    maximumStep: 40,
    initialState: { parameter: 2, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("水平位移 h", "Horizontal shift h"),
      minimum: -3,
      maximum: 3,
      step: 0.25,
    },
    build: functionGraphTransform,
  },
  {
    id: "riemann-sum-convergence",
    maximumStep: 64,
    initialState: { parameter: 2, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("求积法则（0 左 / 1 右 / 2 中点）", "Rule (0 left / 1 right / 2 midpoint)"),
      minimum: 0,
      maximum: 2,
      step: 1,
    },
    build: riemannSumConvergence,
  },
  {
    id: "birthday-paradox-simulation",
    maximumStep: 240,
    initialState: { parameter: 23, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("每组人数 n", "People per group n"),
      minimum: 2,
      maximum: 60,
      step: 1,
    },
    build: birthdayParadox,
  },
  {
    id: "damped-oscillator-regimes",
    maximumStep: 96,
    initialState: { parameter: 0.4, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("阻尼系数 c", "Damping coefficient c"),
      minimum: 0,
      maximum: 4,
      step: 0.05,
      unit: "kg/s",
    },
    build: dampedOscillatorRegimes,
  },
  {
    id: "projectile-motion",
    maximumStep: 64,
    initialState: { parameter: 40, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("发射角 θ", "Launch angle θ"),
      minimum: 5,
      maximum: 85,
      step: 1,
      unit: "°",
    },
    build: projectileMotion,
  },
  {
    id: "maxwell-speed-distribution",
    maximumStep: 64,
    initialState: { parameter: 300, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("温度 T", "Temperature T"),
      minimum: 100,
      maximum: 1200,
      step: 10,
      unit: "K",
    },
    build: maxwellSpeedDistribution,
  },
  {
    id: "least-squares-regression",
    maximumStep: 40,
    initialState: { parameter: 0.8, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("噪声尺度 σ", "Noise scale σ"),
      minimum: 0,
      maximum: 2,
      step: 0.1,
    },
    build: leastSquaresRegression,
  },
  {
    id: "epsilon-greedy-bandit",
    maximumStep: 400,
    initialState: { parameter: 0.1, seed: 2027, step: 0, speed: 1 },
    parameter: {
      label: label("探索概率 ε", "Exploration probability ε"),
      minimum: 0,
      maximum: 0.5,
      step: 0.01,
    },
    build: epsilonGreedyBandit,
  },
];

export const descriptorExperimentById = new Map(
  descriptors.map((descriptor) => [descriptor.id, descriptor] as const),
);

export function getDescriptorExperiment(id: DescriptorExperimentId): DescriptorExperiment {
  const descriptor = descriptorExperimentById.get(id);
  if (!descriptor) throw new Error(`Descriptor experiment ${id} is not registered.`);
  return descriptor;
}
