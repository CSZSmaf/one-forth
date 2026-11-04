import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const closeTo = (actual: number, expected: number, tolerance = 1e-10): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

const mean = (values: readonly number[]): number => {
  if (values.length === 0) throw new RangeError("A mean requires at least one observation.");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const sampleVariance = (values: readonly number[]): number => {
  if (values.length < 2) throw new RangeError("A sample variance requires at least two values.");
  const center = mean(values);
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1);
};

const choose = (n: number, k: number): number => {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0) {
    throw new RangeError("Binomial coefficients require integer n >= 0 and integer k.");
  }
  if (k < 0 || k > n) return 0;
  const shortK = Math.min(k, n - k);
  let result = 1;
  for (let index = 1; index <= shortK; index += 1) {
    result = (result * (n - shortK + index)) / index;
  }
  return result;
};

const binomialPmf = (n: number, p: number, k: number): number => {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new RangeError("A binomial probability must lie in [0, 1].");
  }
  return choose(n, k) * p ** k * (1 - p) ** (n - k);
};

const wilsonInterval = (
  successes: number,
  trials: number,
  z: number,
): { center: number; halfWidth: number; lower: number; upper: number } => {
  if (
    !Number.isInteger(successes) ||
    !Number.isInteger(trials) ||
    successes < 0 ||
    trials <= 0 ||
    successes > trials ||
    !Number.isFinite(z) ||
    z <= 0
  ) {
    throw new RangeError("Wilson inputs require 0 <= successes <= positive trials and z > 0.");
  }
  const estimate = successes / trials;
  const denominator = 1 + z ** 2 / trials;
  const center = (estimate + z ** 2 / (2 * trials)) / denominator;
  const halfWidth =
    (z / denominator) *
    Math.sqrt((estimate * (1 - estimate)) / trials + z ** 2 / (4 * trials ** 2));
  return { center, halfWidth, lower: center - halfWidth, upper: center + halfWidth };
};

type SimpleLinearFit = {
  intercept: number;
  slope: number;
  fitted: number[];
  residuals: number[];
  sxx: number;
  sse: number;
  ssr: number;
  sst: number;
  residualVariance: number;
  leverage: number[];
};

const fitSimpleLinearRegression = (
  predictors: readonly number[],
  responses: readonly number[],
): SimpleLinearFit => {
  if (predictors.length !== responses.length || predictors.length < 3) {
    throw new RangeError("Simple regression requires at least three paired observations.");
  }
  const predictorMean = mean(predictors);
  const responseMean = mean(responses);
  const sxx = predictors.reduce((sum, value) => sum + (value - predictorMean) ** 2, 0);
  if (sxx === 0) throw new RangeError("Simple regression requires varying predictors.");
  const sxy = predictors.reduce(
    (sum, value, index) =>
      sum + (value - predictorMean) * ((responses[index] ?? Number.NaN) - responseMean),
    0,
  );
  const slope = sxy / sxx;
  const intercept = responseMean - slope * predictorMean;
  const fitted = predictors.map((value) => intercept + slope * value);
  const residuals = responses.map((value, index) => value - (fitted[index] ?? Number.NaN));
  const sse = residuals.reduce((sum, value) => sum + value ** 2, 0);
  const sst = responses.reduce((sum, value) => sum + (value - responseMean) ** 2, 0);
  const ssr = fitted.reduce((sum, value) => sum + (value - responseMean) ** 2, 0);
  const residualVariance = sse / (predictors.length - 2);
  const leverage = predictors.map(
    (value) => 1 / predictors.length + (value - predictorMean) ** 2 / sxx,
  );
  return {
    intercept,
    slope,
    fitted,
    residuals,
    sxx,
    sse,
    ssr,
    sst,
    residualVariance,
    leverage,
  };
};

const statisticsContentRoot = resolve(
  process.cwd(),
  "../../content/zh-CN/mathematics/mathematical-statistics",
);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const authoredExamples = [
  {
    chapterId: "m06-samples-statistics",
    file: "sampling-distributions.mdx",
    exampleIds: [
      "example-empirical-distribution",
      "example-uniform-maximum",
      "example-normal-sample-t",
    ],
  },
  {
    chapterId: "m06-point-estimation",
    file: "statistical-estimation.mdx",
    exampleIds: [
      "example-estimation-bernoulli-seven",
      "example-estimation-poisson",
      "example-estimation-uniform-upper-bound",
      "example-rao-blackwell-bernoulli",
    ],
  },
  {
    chapterId: "m06-confidence-intervals",
    file: "confidence-intervals.mdx",
    exampleIds: [
      "example-confidence-z-calibration",
      "example-confidence-normal-mean-variance",
      "example-confidence-one-sided-specification",
      "example-confidence-wilson-one-of-ten",
      "example-confidence-sample-size",
    ],
  },
  {
    chapterId: "m06-hypothesis-testing",
    file: "hypothesis-testing.mdx",
    exampleIds: [
      "example-testing-normal-mean",
      "example-testing-interval-inversion",
      "example-testing-exact-binomial",
      "example-testing-holm",
    ],
  },
  {
    chapterId: "m06-linear-model-inference",
    file: "linear-model-inference.mdx",
    exampleIds: [
      "example-linear-model-inference-four-points",
      "example-linear-model-inference-anova",
      "example-linear-model-inference-diagnostics",
      "example-linear-model-inference-two-intervals",
    ],
  },
  {
    chapterId: "m06-statistics-review",
    file: "statistics-review.mdx",
    exampleIds: [
      "example-statistics-review-wilson",
      "example-statistics-review-three-tests",
      "example-statistics-review-power",
      "example-statistics-review-loss-decision",
      "example-statistics-review-linear-prediction",
    ],
  },
] as const;

describe("M06 authored-example bindings", () => {
  for (const exampleCase of authoredExamples) {
    it(`${exampleCase.chapterId} keeps its independently checked example IDs in the MDX source`, () => {
      const source = readFileSync(join(statisticsContentRoot, exampleCase.file), "utf8");
      for (const exampleId of exampleCase.exampleIds) {
        const exampleTag = new RegExp(
          `<Example\\b(?=[^>]*\\bid="${escapeRegExp(exampleId)}")[^>]*>`,
          "u",
        );
        expect(source, `${exampleCase.chapterId}:${exampleId}`).toMatch(exampleTag);
      }
    });
  }
});

describe("M06 statistical calculations and boundaries", () => {
  it("recomputes an empirical CDF, a uniform maximum, and a normal-sample t statistic", () => {
    const empiricalSample = [2.1, 1.4, 2.1, 3.0, 0.9] as const;
    const empiricalCdf = (threshold: number): number =>
      empiricalSample.filter((value) => value <= threshold).length / empiricalSample.length;
    closeTo(empiricalCdf(1.4), 2 / 5);
    closeTo(empiricalCdf(2.1), 4 / 5);
    closeTo(empiricalCdf(3.0) - empiricalCdf(1.4), 3 / 5);

    const uniformMaximumCdf = (value: number, upperBound: number, sampleSize: number): number => {
      if (value <= 0) return 0;
      if (value >= upperBound) return 1;
      return (value / upperBound) ** sampleSize;
    };
    closeTo(uniformMaximumCdf(0.5, 1, 4), 1 / 16);
    closeTo((4 * 1) / 5, 0.8);

    const normalReadings = [8.2, 9.1, 10.0, 10.7, 12.0] as const;
    closeTo(mean(normalReadings), 10);
    closeTo(sampleVariance(normalReadings), 2.135);
    closeTo(
      (Math.sqrt(normalReadings.length) * (mean(normalReadings) - 9)) /
        Math.sqrt(sampleVariance(normalReadings)),
      1.5303334194571,
      1e-12,
    );
  });

  it("recomputes Bernoulli, Poisson, and support-dependent uniform estimators", () => {
    const bernoulli = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0] as const;
    const bernoulliEstimate = mean(bernoulli);
    closeTo(bernoulliEstimate, 0.7);
    closeTo(bernoulliEstimate ** 7 * (1 - bernoulliEstimate) ** 3, 0.0022235661, 1e-12);
    closeTo(
      Math.sqrt((bernoulliEstimate * (1 - bernoulliEstimate)) / bernoulli.length),
      0.14491376746189438,
      1e-14,
    );

    const poissonCounts = [2, 0, 3, 1, 4] as const;
    const poissonEstimate = mean(poissonCounts);
    closeTo(poissonEstimate, 2);
    closeTo(
      (Math.exp(-5 * poissonEstimate) * poissonEstimate ** 10) / 288,
      0.000161421972488835,
      1e-16,
    );

    const boundedSample = [1.2, 0.9, 1.8, 1.5, 2.0] as const;
    const maximum = Math.max(...boundedSample);
    closeTo(maximum, 2);
    closeTo(((boundedSample.length + 1) / boundedSample.length) * maximum, 2.4);
  });

  it("recomputes calibrated z and Wilson confidence intervals", () => {
    const meanEstimate = 72.4;
    const standardError = 8 / Math.sqrt(64);
    const z90 = 1.644854;
    closeTo(standardError, 1);
    closeTo(meanEstimate - z90 * standardError, 70.755146);
    closeTo(meanEstimate + z90 * standardError, 74.044854);

    const z95 = 1.959964;
    const waldHalfWidth = z95 * Math.sqrt((0.1 * 0.9) / 10);
    closeTo(0.1 - waldHalfWidth, -0.08593851115802773, 1e-14);
    closeTo(0.1 + waldHalfWidth, 0.2859385111580277, 1e-14);
    const wilson = wilsonInterval(1, 10, z95);
    closeTo(wilson.center, 0.2110131212104231, 1e-14);
    closeTo(wilson.halfWidth, 0.19313690831434907, 1e-14);
    closeTo(wilson.lower, 0.017876212896074023, 1e-14);
    closeTo(wilson.upper, 0.4041500295247722, 1e-14);
    expect(wilson.lower).toBeGreaterThanOrEqual(0);
    expect(wilson.upper).toBeLessThanOrEqual(1);
  });

  it("recomputes an exact-binomial ordering and the Holm stopping rule", () => {
    const observedMass = binomialPmf(10, 0.2, 0);
    const masses = Array.from({ length: 11 }, (_, successes) => binomialPmf(10, 0.2, successes));
    const includedCounts = masses
      .map((mass, successes) => ({ mass, successes }))
      .filter(({ mass }) => mass <= observedMass + Number.EPSILON)
      .map(({ successes }) => successes);
    expect(includedCounts).toEqual([0, 4, 5, 6, 7, 8, 9, 10]);
    const probabilityMassOrderedPValue = includedCounts.reduce(
      (sum, successes) => sum + binomialPmf(10, 0.2, successes),
      0,
    );
    closeTo(observedMass, 0.1073741824, 1e-15);
    closeTo(probabilityMassOrderedPValue, 0.228248064, 1e-15);
    closeTo(2 * observedMass, 0.2147483648, 1e-15);

    const orderedPValues = [0.006, 0.015, 0.021, 0.2] as const;
    const alpha = 0.05;
    const holmRejected: number[] = [];
    for (let index = 0; index < orderedPValues.length; index += 1) {
      const pValue = orderedPValues[index];
      if (pValue === undefined || pValue > alpha / (orderedPValues.length - index)) break;
      holmRejected.push(index);
    }
    expect(orderedPValues.filter((pValue) => pValue <= alpha / orderedPValues.length)).toEqual([
      0.006,
    ]);
    expect(holmRejected).toEqual([0, 1, 2]);
  });

  it("recomputes the four-point regression, ANOVA, leverage, and prediction scales", () => {
    const fit = fitSimpleLinearRegression([0, 1, 2, 3], [1, 2, 2, 4]);
    closeTo(fit.intercept, 0.9);
    closeTo(fit.slope, 0.9);
    [0.9, 1.8, 2.7, 3.6].forEach((expected, index) =>
      closeTo(fit.fitted[index] ?? Number.NaN, expected),
    );
    [0.1, 0.2, -0.7, 0.4].forEach((expected, index) =>
      closeTo(fit.residuals[index] ?? Number.NaN, expected),
    );
    closeTo(fit.sse, 0.7);
    closeTo(fit.ssr, 4.05);
    closeTo(fit.sst, 4.75);
    closeTo(fit.ssr + fit.sse, fit.sst);
    closeTo(fit.residualVariance, 0.35);

    const slopeStandardError = Math.sqrt(fit.residualVariance / fit.sxx);
    const slopeT = fit.slope / slopeStandardError;
    const regressionF = fit.ssr / fit.residualVariance;
    closeTo(slopeStandardError, 0.2645751311064591, 1e-14);
    closeTo(slopeT, 3.401680257083045, 1e-14);
    closeTo(regressionF, 11.571428571428571, 1e-14);
    closeTo(slopeT ** 2, regressionF, 1e-14);
    [0.7, 0.3, 0.3, 0.7].forEach((expected, index) =>
      closeTo(fit.leverage[index] ?? Number.NaN, expected),
    );
    closeTo(
      fit.leverage.reduce((sum, value) => sum + value, 0),
      2,
    );

    const centerLeverage = 1 / 4;
    const meanResponseStandardError = Math.sqrt(fit.residualVariance * centerLeverage);
    const predictionStandardError = Math.sqrt(fit.residualVariance * (1 + centerLeverage));
    closeTo(meanResponseStandardError, 0.2958039891549808, 1e-14);
    closeTo(predictionStandardError, 0.6614378277661477, 1e-14);
    expect(predictionStandardError).toBeGreaterThan(meanResponseStandardError);
  });

  it("recomputes review statistics and two explicit Bayesian loss decisions", () => {
    const estimate = 60 / 100;
    const nullProportion = 0.5;
    const wald = (estimate - nullProportion) ** 2 / ((estimate * (1 - estimate)) / 100);
    const score =
      (estimate - nullProportion) ** 2 / ((nullProportion * (1 - nullProportion)) / 100);
    const likelihoodRatio = 2 * (60 * Math.log(1.2) + 40 * Math.log(0.8));
    closeTo(wald, 4.166666666666665, 1e-14);
    closeTo(score, 4, 1e-14);
    closeTo(likelihoodRatio, 4.027102710137775, 1e-14);
    expect(wald).not.toBe(score);
    expect(score).not.toBe(likelihoodRatio);

    const posteriorMeanMainExample = (1 + 60) / (1 + 1 + 60 + 40);
    const launchLoss = 100 * (1 - posteriorMeanMainExample);
    const delayLoss = 20;
    closeTo(posteriorMeanMainExample, 61 / 102);
    closeTo(launchLoss, 4100 / 102);
    expect(delayLoss).toBeLessThan(launchLoss);

    const posteriorMeanExercise = (2 + 8) / (2 + 2 + 8 + 2);
    const adoptLoss = 10 * (1 - posteriorMeanExercise);
    const deferLoss = 3;
    closeTo(posteriorMeanExercise, 5 / 7);
    closeTo(adoptLoss, 20 / 7);
    expect(adoptLoss).toBeLessThan(deferLoss);
  });
});
