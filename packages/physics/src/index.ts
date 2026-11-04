export type DimensionVector = Readonly<{
  length: number;
  mass: number;
  time: number;
  electricCurrent: number;
  temperature: number;
  amount: number;
  luminousIntensity: number;
}>;

export interface UnitDefinition {
  readonly id: string;
  readonly symbol: string;
  readonly name: Readonly<{ "zh-CN": string; en?: string }>;
  readonly dimension: DimensionVector;
  readonly conversionToSI: number;
}

export interface PhysicalConstant {
  readonly id: string;
  readonly symbol: string;
  readonly name: Readonly<{ "zh-CN": string; en?: string }>;
  readonly value: number;
  readonly unit: string;
  readonly uncertainty?: number;
  readonly source?: string;
}

const dimensionless: DimensionVector = {
  length: 0,
  mass: 0,
  time: 0,
  electricCurrent: 0,
  temperature: 0,
  amount: 0,
  luminousIntensity: 0,
};

export const units: readonly UnitDefinition[] = [
  {
    id: "metre",
    symbol: "m",
    name: { "zh-CN": "米", en: "metre" },
    dimension: { ...dimensionless, length: 1 },
    conversionToSI: 1,
  },
  {
    id: "second",
    symbol: "s",
    name: { "zh-CN": "秒", en: "second" },
    dimension: { ...dimensionless, time: 1 },
    conversionToSI: 1,
  },
  {
    id: "kilogram",
    symbol: "kg",
    name: { "zh-CN": "千克", en: "kilogram" },
    dimension: { ...dimensionless, mass: 1 },
    conversionToSI: 1,
  },
  {
    id: "ampere",
    symbol: "A",
    name: { "zh-CN": "安培", en: "ampere" },
    dimension: { ...dimensionless, electricCurrent: 1 },
    conversionToSI: 1,
  },
  {
    id: "kelvin",
    symbol: "K",
    name: { "zh-CN": "开尔文", en: "kelvin" },
    dimension: { ...dimensionless, temperature: 1 },
    conversionToSI: 1,
  },
  {
    id: "mole",
    symbol: "mol",
    name: { "zh-CN": "摩尔", en: "mole" },
    dimension: { ...dimensionless, amount: 1 },
    conversionToSI: 1,
  },
  {
    id: "hertz",
    symbol: "Hz",
    name: { "zh-CN": "赫兹", en: "hertz" },
    dimension: { ...dimensionless, time: -1 },
    conversionToSI: 1,
  },
  {
    id: "metre-per-second",
    symbol: "m·s⁻¹",
    name: { "zh-CN": "米每秒", en: "metres per second" },
    dimension: { ...dimensionless, length: 1, time: -1 },
    conversionToSI: 1,
  },
  {
    id: "metre-per-second-squared",
    symbol: "m·s⁻²",
    name: { "zh-CN": "米每二次方秒", en: "metres per second squared" },
    dimension: { ...dimensionless, length: 1, time: -2 },
    conversionToSI: 1,
  },
  {
    id: "cubic-metre",
    symbol: "m³",
    name: { "zh-CN": "立方米", en: "cubic metre" },
    dimension: { ...dimensionless, length: 3 },
    conversionToSI: 1,
  },
  {
    id: "newton",
    symbol: "N",
    name: { "zh-CN": "牛顿", en: "newton" },
    dimension: { ...dimensionless, length: 1, mass: 1, time: -2 },
    conversionToSI: 1,
  },
  {
    id: "pascal",
    symbol: "Pa",
    name: { "zh-CN": "帕斯卡", en: "pascal" },
    dimension: { ...dimensionless, length: -1, mass: 1, time: -2 },
    conversionToSI: 1,
  },
  {
    id: "joule",
    symbol: "J",
    name: { "zh-CN": "焦耳", en: "joule" },
    dimension: { ...dimensionless, length: 2, mass: 1, time: -2 },
    conversionToSI: 1,
  },
  {
    id: "coulomb",
    symbol: "C",
    name: { "zh-CN": "库仑", en: "coulomb" },
    dimension: { ...dimensionless, electricCurrent: 1, time: 1 },
    conversionToSI: 1,
  },
  {
    id: "volt",
    symbol: "V",
    name: { "zh-CN": "伏特", en: "volt" },
    dimension: { ...dimensionless, length: 2, mass: 1, time: -3, electricCurrent: -1 },
    conversionToSI: 1,
  },
  {
    id: "tesla",
    symbol: "T",
    name: { "zh-CN": "特斯拉", en: "tesla" },
    dimension: { ...dimensionless, mass: 1, time: -2, electricCurrent: -1 },
    conversionToSI: 1,
  },
  {
    id: "newton-per-coulomb",
    symbol: "N·C⁻¹",
    name: { "zh-CN": "牛顿每库仑", en: "newtons per coulomb" },
    dimension: { ...dimensionless, length: 1, mass: 1, time: -3, electricCurrent: -1 },
    conversionToSI: 1,
  },
  {
    id: "kilogram-metre-per-second",
    symbol: "kg·m·s⁻¹",
    name: { "zh-CN": "千克米每秒", en: "kilogram metres per second" },
    dimension: { ...dimensionless, length: 1, mass: 1, time: -1 },
    conversionToSI: 1,
  },
  {
    id: "joule-second",
    symbol: "J·s",
    name: { "zh-CN": "焦耳秒", en: "joule second" },
    dimension: { ...dimensionless, length: 2, mass: 1, time: -1 },
    conversionToSI: 1,
  },
  {
    id: "kilogram-per-cubic-metre",
    symbol: "kg·m⁻³",
    name: { "zh-CN": "千克每立方米", en: "kilograms per cubic metre" },
    dimension: { ...dimensionless, length: -3, mass: 1 },
    conversionToSI: 1,
  },
  {
    id: "pascal-second",
    symbol: "Pa·s",
    name: { "zh-CN": "帕斯卡秒", en: "pascal second" },
    dimension: { ...dimensionless, length: -1, mass: 1, time: -1 },
    conversionToSI: 1,
  },
  {
    id: "square-metre-per-second",
    symbol: "m²·s⁻¹",
    name: { "zh-CN": "平方米每秒", en: "square metres per second" },
    dimension: { ...dimensionless, length: 2, time: -1 },
    conversionToSI: 1,
  },
  {
    id: "inverse-metre",
    symbol: "m⁻¹",
    name: { "zh-CN": "每米", en: "inverse metre" },
    dimension: { ...dimensionless, length: -1 },
    conversionToSI: 1,
  },
  {
    id: "inverse-joule",
    symbol: "J⁻¹",
    name: { "zh-CN": "每焦耳", en: "inverse joule" },
    dimension: { ...dimensionless, length: -2, mass: -1, time: 2 },
    conversionToSI: 1,
  },
  {
    id: "joule-per-kelvin",
    symbol: "J·K⁻¹",
    name: { "zh-CN": "焦耳每开尔文", en: "joules per kelvin" },
    dimension: { ...dimensionless, length: 2, mass: 1, time: -2, temperature: -1 },
    conversionToSI: 1,
  },
  {
    id: "joule-per-mole-kelvin",
    symbol: "J·mol⁻¹·K⁻¹",
    name: { "zh-CN": "焦耳每摩尔开尔文", en: "joules per mole kelvin" },
    dimension: {
      ...dimensionless,
      length: 2,
      mass: 1,
      time: -2,
      temperature: -1,
      amount: -1,
    },
    conversionToSI: 1,
  },
  {
    id: "volt-metre",
    symbol: "V·m",
    name: { "zh-CN": "伏特米", en: "volt metre" },
    dimension: { ...dimensionless, length: 3, mass: 1, time: -3, electricCurrent: -1 },
    conversionToSI: 1,
  },
  {
    id: "weber",
    symbol: "Wb",
    name: { "zh-CN": "韦伯", en: "weber" },
    dimension: { ...dimensionless, length: 2, mass: 1, time: -2, electricCurrent: -1 },
    conversionToSI: 1,
  },
];

export type WaveInitialCondition = "traveling" | "standing" | "gaussian";

export interface WaveParameters {
  readonly amplitudeMetres: number;
  readonly frequencyHertz: number;
  readonly waveSpeedMetresPerSecond: number;
  readonly initialCondition: WaveInitialCondition;
}

export interface WaveSample {
  readonly xMetres: number;
  readonly displacementMetres: number;
}

export function waveNumber(parameters: WaveParameters): number {
  return (2 * Math.PI * parameters.frequencyHertz) / parameters.waveSpeedMetresPerSecond;
}

export function sampleWave(
  parameters: WaveParameters,
  timeSeconds: number,
  sampleCount = 121,
  lengthMetres = 10,
): readonly WaveSample[] {
  const k = waveNumber(parameters);
  const omega = 2 * Math.PI * parameters.frequencyHertz;
  return Array.from({ length: sampleCount }, (_, index) => {
    const xMetres = (index / (sampleCount - 1)) * lengthMetres;
    let displacementMetres: number;
    if (parameters.initialCondition === "standing") {
      displacementMetres =
        parameters.amplitudeMetres * Math.sin(k * xMetres) * Math.cos(omega * timeSeconds);
    } else if (parameters.initialCondition === "gaussian") {
      const centre = 3 + parameters.waveSpeedMetresPerSecond * timeSeconds;
      const wrapped = ((centre % lengthMetres) + lengthMetres) % lengthMetres;
      const distance = Math.min(
        Math.abs(xMetres - wrapped),
        lengthMetres - Math.abs(xMetres - wrapped),
      );
      displacementMetres = parameters.amplitudeMetres * Math.exp(-(distance * distance) / 0.45);
    } else {
      displacementMetres = parameters.amplitudeMetres * Math.sin(k * xMetres - omega * timeSeconds);
    }
    return { xMetres, displacementMetres };
  });
}

export function satisfiesWaveDispersion(parameters: WaveParameters): boolean {
  const k = waveNumber(parameters);
  const omega = 2 * Math.PI * parameters.frequencyHertz;
  return Math.abs(omega - parameters.waveSpeedMetresPerSecond * k) < 1e-10;
}
