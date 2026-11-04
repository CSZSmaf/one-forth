export type WaveScenario = "traveling" | "standing" | "gaussian";
export const gaussianProfileHarmonicCount = 24 as const;

interface WaveModelBase {
  readonly scenario: WaveScenario;
  readonly amplitudeMetres: number;
  readonly waveSpeedMetresPerSecond: number;
  readonly intervalStartMetres: 0;
  readonly intervalLengthMetres: number;
  readonly solutionMethod: "analytical";
}

export interface TravelingWaveModel extends WaveModelBase {
  readonly scenario: "traveling";
  readonly frequencyHertz: number;
  readonly wavelengthMetres: number;
  readonly waveNumberRadiansPerMetre: number;
  readonly angularFrequencyRadiansPerSecond: number;
  readonly boundaryCondition: "unbounded-line-observation-window";
}

export interface StandingWaveModel extends WaveModelBase {
  readonly scenario: "standing";
  readonly frequencyHertz: number;
  readonly wavelengthMetres: number;
  readonly waveNumberRadiansPerMetre: number;
  readonly angularFrequencyRadiansPerSecond: number;
  readonly modeNumber: 1;
  readonly boundaryCondition: "fixed-dirichlet";
}

export interface GaussianWaveModel extends WaveModelBase {
  readonly scenario: "gaussian";
  readonly pulseCentreMetres: number;
  readonly pulseWidthMetres: number;
  readonly profileHarmonicCount: typeof gaussianProfileHarmonicCount;
  readonly boundaryCondition: "periodic";
}

export type AnalyticalWaveModel = TravelingWaveModel | StandingWaveModel | GaussianWaveModel;

type OscillatoryWaveInput = Readonly<{
  scenario: "traveling" | "standing";
  amplitudeMetres: number;
  frequencyHertz: number;
  waveSpeedMetresPerSecond: number;
}>;

type GaussianWaveInput = Readonly<{
  scenario: "gaussian";
  amplitudeMetres: number;
  waveSpeedMetresPerSecond: number;
  intervalLengthMetres?: number;
  pulseCentreMetres?: number;
  pulseWidthMetres?: number;
}>;

export type AnalyticalWaveInput = OscillatoryWaveInput | GaussianWaveInput;

export interface AnalyticalWaveSample {
  readonly xMetres: number;
  readonly displacementMetres: number;
}

export interface WaveEquationDiagnostics {
  readonly checkMethod: "centred-finite-difference-on-analytical-solution";
  readonly spatialIncrementMetres: number;
  readonly temporalIncrementSeconds: number;
  /** A diagnostic sampling ratio, not a solver stability condition. */
  readonly diagnosticCourantNumber: number;
  readonly maximumRelativePdeResidual: number;
  readonly boundaryValueMismatchMetres: number | null;
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number; received ${value}.`);
  }
}

export function createAnalyticalWaveModel(input: GaussianWaveInput): GaussianWaveModel;
export function createAnalyticalWaveModel(
  input: OscillatoryWaveInput & { readonly scenario: "traveling" },
): TravelingWaveModel;
export function createAnalyticalWaveModel(
  input: OscillatoryWaveInput & { readonly scenario: "standing" },
): StandingWaveModel;
export function createAnalyticalWaveModel(
  input: OscillatoryWaveInput,
): TravelingWaveModel | StandingWaveModel;
export function createAnalyticalWaveModel(input: AnalyticalWaveInput): AnalyticalWaveModel {
  assertPositiveFinite(input.amplitudeMetres, "amplitudeMetres");
  assertPositiveFinite(input.waveSpeedMetresPerSecond, "waveSpeedMetresPerSecond");

  if (input.scenario === "gaussian") {
    const intervalLengthMetres = input.intervalLengthMetres ?? 10;
    const requestedPulseCentreMetres = input.pulseCentreMetres ?? intervalLengthMetres * 0.3;
    const pulseWidthMetres = input.pulseWidthMetres ?? intervalLengthMetres * 0.065;
    assertPositiveFinite(intervalLengthMetres, "intervalLengthMetres");
    assertPositiveFinite(pulseWidthMetres, "pulseWidthMetres");
    if (!Number.isFinite(requestedPulseCentreMetres)) {
      throw new RangeError("pulseCentreMetres must be finite.");
    }
    if (pulseWidthMetres >= intervalLengthMetres / 2) {
      throw new RangeError("pulseWidthMetres must be smaller than half the periodic interval.");
    }
    const pulseCentreMetres =
      ((requestedPulseCentreMetres % intervalLengthMetres) + intervalLengthMetres) %
      intervalLengthMetres;
    return {
      scenario: "gaussian",
      amplitudeMetres: input.amplitudeMetres,
      waveSpeedMetresPerSecond: input.waveSpeedMetresPerSecond,
      intervalStartMetres: 0,
      intervalLengthMetres,
      pulseCentreMetres,
      pulseWidthMetres,
      profileHarmonicCount: gaussianProfileHarmonicCount,
      boundaryCondition: "periodic",
      solutionMethod: "analytical",
    };
  }

  assertPositiveFinite(input.frequencyHertz, "frequencyHertz");
  const wavelengthMetres = input.waveSpeedMetresPerSecond / input.frequencyHertz;
  const waveNumberRadiansPerMetre = (2 * Math.PI) / wavelengthMetres;
  const angularFrequencyRadiansPerSecond = 2 * Math.PI * input.frequencyHertz;

  if (input.scenario === "standing") {
    return {
      scenario: "standing",
      amplitudeMetres: input.amplitudeMetres,
      frequencyHertz: input.frequencyHertz,
      waveSpeedMetresPerSecond: input.waveSpeedMetresPerSecond,
      intervalStartMetres: 0,
      intervalLengthMetres: wavelengthMetres / 2,
      wavelengthMetres,
      waveNumberRadiansPerMetre,
      angularFrequencyRadiansPerSecond,
      modeNumber: 1,
      boundaryCondition: "fixed-dirichlet",
      solutionMethod: "analytical",
    };
  }

  return {
    scenario: "traveling",
    amplitudeMetres: input.amplitudeMetres,
    frequencyHertz: input.frequencyHertz,
    waveSpeedMetresPerSecond: input.waveSpeedMetresPerSecond,
    intervalStartMetres: 0,
    intervalLengthMetres: wavelengthMetres,
    wavelengthMetres,
    waveNumberRadiansPerMetre,
    angularFrequencyRadiansPerSecond,
    boundaryCondition: "unbounded-line-observation-window",
    solutionMethod: "analytical",
  };
}

function periodicGaussianTerms(model: GaussianWaveModel): readonly {
  readonly waveNumber: number;
  readonly coefficient: number;
}[] {
  return Array.from({ length: gaussianProfileHarmonicCount }, (_, index) => {
    const order = index + 1;
    const waveNumber = (2 * Math.PI * order) / model.intervalLengthMetres;
    return {
      waveNumber,
      coefficient: Math.exp(-0.5 * (waveNumber * model.pulseWidthMetres) ** 2),
    };
  });
}

function periodicGaussianProfile(model: GaussianWaveModel, offsetMetres: number): number {
  const terms = periodicGaussianTerms(model);
  const normalization = 1 + 2 * terms.reduce((sum, term) => sum + term.coefficient, 0);
  const series =
    1 +
    2 *
      terms.reduce(
        (sum, term) => sum + term.coefficient * Math.cos(term.waveNumber * offsetMetres),
        0,
      );
  return series / normalization;
}

function periodicGaussianDerivative(model: GaussianWaveModel, offsetMetres: number): number {
  const terms = periodicGaussianTerms(model);
  const normalization = 1 + 2 * terms.reduce((sum, term) => sum + term.coefficient, 0);
  return (
    (-2 *
      terms.reduce(
        (sum, term) =>
          sum + term.coefficient * term.waveNumber * Math.sin(term.waveNumber * offsetMetres),
        0,
      )) /
    normalization
  );
}

export function analyticalWaveDisplacement(
  model: AnalyticalWaveModel,
  xMetres: number,
  timeSeconds: number,
): number {
  if (model.scenario === "traveling") {
    return (
      model.amplitudeMetres *
      Math.sin(
        model.waveNumberRadiansPerMetre * xMetres -
          model.angularFrequencyRadiansPerSecond * timeSeconds,
      )
    );
  }
  if (model.scenario === "standing") {
    return (
      model.amplitudeMetres *
      Math.sin(model.waveNumberRadiansPerMetre * xMetres) *
      Math.cos(model.angularFrequencyRadiansPerSecond * timeSeconds)
    );
  }
  return (
    model.amplitudeMetres *
    periodicGaussianProfile(
      model,
      xMetres - model.pulseCentreMetres - model.waveSpeedMetresPerSecond * timeSeconds,
    )
  );
}

export function analyticalWaveInitialDisplacement(
  model: AnalyticalWaveModel,
  xMetres: number,
): number {
  return analyticalWaveDisplacement(model, xMetres, 0);
}

export function analyticalWaveInitialVelocity(model: AnalyticalWaveModel, xMetres: number): number {
  if (model.scenario === "traveling") {
    return (
      -model.amplitudeMetres *
      model.angularFrequencyRadiansPerSecond *
      Math.cos(model.waveNumberRadiansPerMetre * xMetres)
    );
  }
  if (model.scenario === "standing") return 0;
  return (
    -model.waveSpeedMetresPerSecond *
    model.amplitudeMetres *
    periodicGaussianDerivative(model, xMetres - model.pulseCentreMetres)
  );
}

export function sampleAnalyticalWave(
  model: AnalyticalWaveModel,
  timeSeconds: number,
  sampleCount = 161,
): readonly AnalyticalWaveSample[] {
  if (!Number.isInteger(sampleCount) || sampleCount < 2) {
    throw new RangeError(`sampleCount must be an integer of at least 2; received ${sampleCount}.`);
  }
  return Array.from({ length: sampleCount }, (_, index) => {
    const xMetres = (index / (sampleCount - 1)) * model.intervalLengthMetres;
    return {
      xMetres,
      displacementMetres: analyticalWaveDisplacement(model, xMetres, timeSeconds),
    };
  });
}

export function diagnoseAnalyticalWaveEquation(
  model: AnalyticalWaveModel,
  timeSeconds: number,
  checkPointCount = 81,
): WaveEquationDiagnostics {
  if (!Number.isInteger(checkPointCount) || checkPointCount < 5) {
    throw new RangeError("checkPointCount must be an integer of at least 5.");
  }
  const spatialIncrementMetres = model.intervalLengthMetres / 400;
  const temporalIncrementSeconds = spatialIncrementMetres / (4 * model.waveSpeedMetresPerSecond);
  const diagnosticCourantNumber =
    (model.waveSpeedMetresPerSecond * temporalIncrementSeconds) / spatialIncrementMetres;
  let maximumAbsoluteResidual = 0;
  const referenceAccelerationScale =
    model.scenario === "gaussian"
      ? (model.amplitudeMetres * model.waveSpeedMetresPerSecond ** 2) / model.pulseWidthMetres ** 2
      : model.amplitudeMetres * model.angularFrequencyRadiansPerSecond ** 2;

  for (let index = 0; index < checkPointCount; index += 1) {
    const fraction =
      model.scenario === "gaussian" ? index / checkPointCount : (index + 1) / (checkPointCount + 1);
    const xMetres = fraction * model.intervalLengthMetres;
    const u = analyticalWaveDisplacement(model, xMetres, timeSeconds);
    const uForwardTime = analyticalWaveDisplacement(
      model,
      xMetres,
      timeSeconds + temporalIncrementSeconds,
    );
    const uBackwardTime = analyticalWaveDisplacement(
      model,
      xMetres,
      timeSeconds - temporalIncrementSeconds,
    );
    const uForwardSpace = analyticalWaveDisplacement(
      model,
      xMetres + spatialIncrementMetres,
      timeSeconds,
    );
    const uBackwardSpace = analyticalWaveDisplacement(
      model,
      xMetres - spatialIncrementMetres,
      timeSeconds,
    );
    const temporalSecondDerivative =
      (uForwardTime - 2 * u + uBackwardTime) / temporalIncrementSeconds ** 2;
    const spatialSecondDerivative =
      (uForwardSpace - 2 * u + uBackwardSpace) / spatialIncrementMetres ** 2;
    const residual =
      temporalSecondDerivative - model.waveSpeedMetresPerSecond ** 2 * spatialSecondDerivative;
    maximumAbsoluteResidual = Math.max(maximumAbsoluteResidual, Math.abs(residual));
  }

  let boundaryValueMismatchMetres: number | null = null;
  if (model.scenario === "standing") {
    boundaryValueMismatchMetres = Math.max(
      Math.abs(analyticalWaveDisplacement(model, 0, timeSeconds)),
      Math.abs(analyticalWaveDisplacement(model, model.intervalLengthMetres, timeSeconds)),
    );
  } else if (model.scenario === "gaussian") {
    boundaryValueMismatchMetres = Math.abs(
      analyticalWaveDisplacement(model, 0, timeSeconds) -
        analyticalWaveDisplacement(model, model.intervalLengthMetres, timeSeconds),
    );
  }

  return {
    checkMethod: "centred-finite-difference-on-analytical-solution",
    spatialIncrementMetres,
    temporalIncrementSeconds,
    diagnosticCourantNumber,
    maximumRelativePdeResidual: maximumAbsoluteResidual / referenceAccelerationScale,
    boundaryValueMismatchMetres,
  };
}

export type FourierWaveform = "square" | "triangle" | "sawtooth";

export const fourierPeriodRadians = 2 * Math.PI;

export function fourierHarmonicOrder(waveform: FourierWaveform, termIndex: number): number {
  if (!Number.isInteger(termIndex) || termIndex < 0) {
    throw new RangeError(`termIndex must be a non-negative integer; received ${termIndex}.`);
  }
  return waveform === "sawtooth" ? termIndex + 1 : 2 * termIndex + 1;
}

export function fourierSineCoefficient(waveform: FourierWaveform, order: number): number {
  if (!Number.isInteger(order) || order < 1) {
    throw new RangeError(`order must be a positive integer; received ${order}.`);
  }
  if (waveform === "square") return order % 2 === 0 ? 0 : 4 / (Math.PI * order);
  if (waveform === "triangle") {
    if (order % 2 === 0) return 0;
    const alternatingSign = ((order - 1) / 2) % 2 === 0 ? 1 : -1;
    return (8 * alternatingSign) / (Math.PI ** 2 * order ** 2);
  }
  return (2 * (order % 2 === 0 ? -1 : 1)) / (Math.PI * order);
}

export function fourierHarmonicTerm(
  waveform: FourierWaveform,
  termIndex: number,
  xRadians: number,
): number {
  const order = fourierHarmonicOrder(waveform, termIndex);
  return fourierSineCoefficient(waveform, order) * Math.sin(order * xRadians);
}

export function fourierPartialSum(
  waveform: FourierWaveform,
  terms: number,
  xRadians: number,
): number {
  if (!Number.isInteger(terms) || terms < 1) {
    throw new RangeError(`terms must be a positive integer; received ${terms}.`);
  }
  let sum = 0;
  for (let index = 0; index < terms; index += 1) {
    sum += fourierHarmonicTerm(waveform, index, xRadians);
  }
  return sum;
}

function principalAngle(xRadians: number): number {
  return (
    ((((xRadians + Math.PI) % fourierPeriodRadians) + fourierPeriodRadians) %
      fourierPeriodRadians) -
    Math.PI
  );
}

export function fourierTargetValue(waveform: FourierWaveform, xRadians: number): number {
  const wrapped = principalAngle(xRadians);
  if (waveform === "triangle") return (2 / Math.PI) * Math.asin(Math.sin(xRadians));
  if (waveform === "square") {
    if (Math.abs(Math.sin(xRadians)) < 1e-12) return 0;
    return Math.sin(xRadians) > 0 ? 1 : -1;
  }
  if (Math.abs(Math.abs(wrapped) - Math.PI) < 1e-12) return 0;
  return wrapped / Math.PI;
}

export function fourierMidpointGridRmse(
  waveform: FourierWaveform,
  terms: number,
  phaseRadians = 0,
  sampleCount = 2048,
): number {
  if (!Number.isInteger(sampleCount) || sampleCount < 16) {
    throw new RangeError("sampleCount must be an integer of at least 16.");
  }
  let squaredError = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const xRadians = ((index + 0.5) / sampleCount) * fourierPeriodRadians + phaseRadians;
    const error =
      fourierTargetValue(waveform, xRadians) - fourierPartialSum(waveform, terms, xRadians);
    squaredError += error ** 2;
  }
  return Math.sqrt(squaredError / sampleCount);
}

export function estimateGibbsOvershootRatio(
  waveform: FourierWaveform,
  terms: number,
  sampleCount = 20_000,
): number {
  if (waveform === "triangle") return 0;
  let peak = Number.NEGATIVE_INFINITY;
  for (let index = 1; index <= sampleCount; index += 1) {
    const distance = (index / sampleCount) * (Math.PI / 2);
    const xRadians = waveform === "square" ? distance : Math.PI - distance;
    peak = Math.max(peak, fourierPartialSum(waveform, terms, xRadians));
  }
  const jumpMagnitude = 2;
  return Math.max(0, peak - 1) / jumpMagnitude;
}

export interface FourierSeriesPlotData {
  readonly target: readonly number[];
  readonly partialSum: readonly number[];
  readonly newestTerm: readonly number[];
  readonly midpointGridRmse: number;
  readonly highestHarmonicOrder: number;
  readonly gibbsOvershootRatio: number;
}

export function createFourierSeriesPlotData(
  options: Readonly<{
    waveform: FourierWaveform;
    terms: number;
    phaseRadians?: number;
    plotSampleCount?: number;
    rmseSampleCount?: number;
  }>,
): FourierSeriesPlotData {
  const phaseRadians = options.phaseRadians ?? 0;
  const plotSampleCount = options.plotSampleCount ?? 321;
  if (!Number.isInteger(plotSampleCount) || plotSampleCount < 2) {
    throw new RangeError("plotSampleCount must be an integer of at least 2.");
  }
  const target: number[] = [];
  const partialSum: number[] = [];
  const newestTerm: number[] = [];
  for (let index = 0; index < plotSampleCount; index += 1) {
    const xRadians = (index / (plotSampleCount - 1)) * fourierPeriodRadians + phaseRadians;
    target.push(fourierTargetValue(options.waveform, xRadians));
    partialSum.push(fourierPartialSum(options.waveform, options.terms, xRadians));
    newestTerm.push(fourierHarmonicTerm(options.waveform, options.terms - 1, xRadians));
  }
  return {
    target,
    partialSum,
    newestTerm,
    midpointGridRmse: fourierMidpointGridRmse(
      options.waveform,
      options.terms,
      phaseRadians,
      options.rmseSampleCount,
    ),
    highestHarmonicOrder: fourierHarmonicOrder(options.waveform, options.terms - 1),
    gibbsOvershootRatio: estimateGibbsOvershootRatio(options.waveform, options.terms),
  };
}
