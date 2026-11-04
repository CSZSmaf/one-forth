import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const closeTo = (actual: number, expected: number, tolerance = 1e-10): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

const assertProbability = (value: number): number => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`Expected a finite probability in [0, 1], received ${value}.`);
  }
  return value;
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

const conditionalProbability = (intersection: number, condition: number): number => {
  assertProbability(intersection);
  assertProbability(condition);
  if (condition === 0) {
    throw new RangeError("Elementary conditional probability requires a positive denominator.");
  }
  if (intersection > condition) {
    throw new RangeError("An intersection cannot be more probable than its conditioning event.");
  }
  return intersection / condition;
};

const binomialPmf = (n: number, p: number, k: number): number => {
  assertProbability(p);
  return assertProbability(choose(n, k) * p ** k * (1 - p) ** (n - k));
};

const binomialRange = (n: number, p: number, lower: number, upper: number): number => {
  if (lower > upper) throw new RangeError("A probability range must be ordered.");
  let total = 0;
  for (let k = Math.max(0, lower); k <= Math.min(n, upper); k += 1) {
    total += binomialPmf(n, p, k);
  }
  return assertProbability(total);
};

const expectation = (values: readonly number[], probabilities: readonly number[]): number => {
  if (values.length === 0 || values.length !== probabilities.length) {
    throw new RangeError(
      "A finite distribution needs equally sized, nonempty value and mass arrays.",
    );
  }
  probabilities.forEach(assertProbability);
  closeTo(
    probabilities.reduce((sum, probability) => sum + probability, 0),
    1,
  );
  return values.reduce((sum, value, index) => sum + value * (probabilities[index] ?? 0), 0);
};

const variance = (values: readonly number[], probabilities: readonly number[]): number => {
  const mean = expectation(values, probabilities);
  return values.reduce(
    (sum, value, index) => sum + (value - mean) ** 2 * (probabilities[index] ?? 0),
    0,
  );
};

const covariance = (
  left: readonly number[],
  right: readonly number[],
  probabilities: readonly number[],
): number => {
  if (left.length !== right.length) {
    throw new RangeError("Covariance pairs must have the same length.");
  }
  const leftMean = expectation(left, probabilities);
  const rightMean = expectation(right, probabilities);
  return left.reduce(
    (sum, value, index) =>
      sum + (value - leftMean) * ((right[index] ?? 0) - rightMean) * (probabilities[index] ?? 0),
    0,
  );
};

const correlation = (
  covarianceValue: number,
  leftVariance: number,
  rightVariance: number,
): number => {
  if (
    !Number.isFinite(covarianceValue) ||
    !Number.isFinite(leftVariance) ||
    !Number.isFinite(rightVariance) ||
    leftVariance <= 0 ||
    rightVariance <= 0
  ) {
    throw new RangeError("Correlation requires two finite, strictly positive variances.");
  }
  return covarianceValue / Math.sqrt(leftVariance * rightVariance);
};

// Numerical Recipes' complementary-error-function approximation; error is below 1.5e-7.
const erf = (value: number): number => {
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value);
  const t = 1 / (1 + 0.5 * absolute);
  const tau =
    t *
    Math.exp(
      -absolute * absolute -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return sign * (1 - tau);
};

const normalCdf = (value: number): number => assertProbability(0.5 * (1 + erf(value / Math.SQRT2)));

const hypergeometricPmf = (
  population: number,
  successes: number,
  draws: number,
  observed: number,
): number => {
  if (successes > population || draws > population) {
    throw new RangeError("Hypergeometric counts cannot exceed the population.");
  }
  const probability =
    (choose(successes, observed) * choose(population - successes, draws - observed)) /
    choose(population, draws);
  return assertProbability(probability);
};

const probabilityContentRoot = resolve(
  process.cwd(),
  "../../content/zh-CN/mathematics/probability",
);

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const authoredExamples = [
  {
    chapterId: "m05-axioms-counting",
    file: "probability-axioms.mdx",
    exampleIds: ["example-probability-axioms-dice-cards", "example-probability-axioms-committee"],
  },
  {
    chapterId: "m05-conditional-bayes",
    file: "conditional-probability.mdx",
    exampleIds: [
      "example-conditional-probability-factory",
      "example-conditional-probability-pairwise",
    ],
  },
  {
    chapterId: "m05-random-variables-distributions",
    file: "random-variables-distributions.mdx",
    exampleIds: [
      "example-random-variables-pmf-density",
      "example-random-variables-transform",
      "example-random-variables-joint",
    ],
  },
  {
    chapterId: "m05-expectation-covariance",
    file: "expectation-variance-covariance.mdx",
    exampleIds: [
      "example-expectation-moments",
      "example-expectation-linear-cost",
      "example-expectation-total-variance",
    ],
  },
  {
    chapterId: "m05-laws-large-numbers-clt",
    file: "law-large-numbers.mdx",
    exampleIds: [
      "example-limit-theorems-chebyshev",
      "example-limit-theorems-binomial-normal",
      "example-limit-theorems-small-np",
    ],
  },
  {
    chapterId: "m05-probability-review",
    file: "probability-review.mdx",
    exampleIds: [
      "example-probability-review-hypergeometric",
      "example-probability-review-factory",
      "example-probability-review-clt",
      "example-probability-review-shared-source",
    ],
  },
] as const;

describe("M05 authored-example bindings", () => {
  for (const exampleCase of authoredExamples) {
    it(`${exampleCase.chapterId} keeps its independently checked example IDs in the MDX source`, () => {
      const source = readFileSync(join(probabilityContentRoot, exampleCase.file), "utf8");
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

describe("M05 probability calculations and boundaries", () => {
  it("checks dice inclusion-exclusion and committee counting", () => {
    const dice = Array.from({ length: 6 }, (_, first) =>
      Array.from({ length: 6 }, (_, second) => [first + 1, second + 1] as const),
    ).flat();
    const sumEight = dice.filter(([first, second]) => first + second === 8);
    const atLeastOneSix = dice.filter(([first, second]) => first === 6 || second === 6);
    const intersection = dice.filter(
      ([first, second]) => first + second === 8 && (first === 6 || second === 6),
    );
    closeTo(sumEight.length / dice.length, 5 / 36);
    closeTo(atLeastOneSix.length / dice.length, 11 / 36);
    closeTo(intersection.length / dice.length, 2 / 36);
    closeTo((sumEight.length + atLeastOneSix.length - intersection.length) / dice.length, 7 / 18);

    expect(choose(10, 3)).toBe(120);
    closeTo(choose(9, 2) / choose(10, 3), 3 / 10);
    expect(choose(10, -1)).toBe(0);
    expect(choose(10, 11)).toBe(0);
  });

  it("checks total probability, Bayes, and pairwise independence without mutual independence", () => {
    const defectProbability = 0.6 * 0.02 + 0.4 * 0.05;
    closeTo(defectProbability, 0.032);
    closeTo(conditionalProbability(0.4 * 0.05, defectProbability), 0.625);
    expect(() => conditionalProbability(0, 0)).toThrow(RangeError);
    expect(() => conditionalProbability(0.4, 0.3)).toThrow(RangeError);

    const outcomes = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ] as const;
    const eventA = ([first]: readonly number[]): boolean => first === 0;
    const eventB = ([, second]: readonly number[]): boolean => second === 0;
    const eventC = ([first, second]: readonly number[]): boolean => first === second;
    const probabilityOf = (predicate: (outcome: readonly number[]) => boolean): number =>
      outcomes.filter(predicate).length / outcomes.length;
    const events = [eventA, eventB, eventC] as const;
    for (let left = 0; left < events.length; left += 1) {
      for (let right = left + 1; right < events.length; right += 1) {
        const leftEvent = events[left];
        const rightEvent = events[right];
        if (!leftEvent || !rightEvent) throw new Error("Missing event in pairwise check.");
        closeTo(
          probabilityOf((outcome) => leftEvent(outcome) && rightEvent(outcome)),
          probabilityOf(leftEvent) * probabilityOf(rightEvent),
        );
      }
    }
    const tripleIntersection = probabilityOf(
      (outcome) => eventA(outcome) && eventB(outcome) && eventC(outcome),
    );
    const productOfMarginals = events
      .map((event) => probabilityOf(event))
      .reduce((product, probability) => product * probability, 1);
    closeTo(tripleIntersection, 1 / 4);
    closeTo(productOfMarginals, 1 / 8);
    expect(tripleIntersection).not.toBe(productOfMarginals);
  });

  it("checks PMFs, a triangular density, a many-to-one transform, and a joint table", () => {
    const values = [0, 1, 2] as const;
    const masses = [0.25, 0.5, 0.25] as const;
    closeTo(expectation(values, masses), 1);
    closeTo(variance(values, masses), 0.5);
    closeTo(
      masses.slice(0, 2).reduce((sum, mass) => sum + mass, 0),
      0.75,
    );

    const triangularCdf = (x: number): number => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return 2 * x - x * x;
    };
    closeTo(1 - triangularCdf(0.5), 0.25);
    expect(triangularCdf(-1)).toBe(0);
    expect(triangularCdf(2)).toBe(1);

    const squareTransformCdf = (y: number): number => {
      if (y <= 0) return 0;
      if (y >= 1) return 1;
      return Math.sqrt(y);
    };
    closeTo(squareTransformCdf(0.25), 0.5);

    const joint = [
      [0.1, 0.2],
      [0.3, 0.4],
    ] as const;
    closeTo(
      joint.flat().reduce((sum, mass) => sum + mass, 0),
      1,
    );
    const probabilityXOne = joint[1].reduce((sum, mass) => sum + mass, 0);
    const probabilityYOne = joint.reduce((sum, row) => sum + row[1], 0);
    closeTo(probabilityXOne, 0.7);
    closeTo(probabilityYOne, 0.6);
    closeTo(conditionalProbability(joint[1][1], probabilityYOne), 2 / 3);
    expect(joint[1][1]).not.toBe(probabilityXOne * probabilityYOne);
  });

  it("checks moments, units-preserving affine rules, covariance, and total variance", () => {
    const demand = [0, 1, 2, 3] as const;
    const demandMass = [0.1, 0.3, 0.4, 0.2] as const;
    closeTo(expectation(demand, demandMass), 1.7);
    closeTo(
      expectation(
        demand.map((value) => value * value),
        demandMass,
      ),
      3.7,
    );
    closeTo(variance(demand, demandMass), 0.81);
    closeTo(50 * expectation(demand, demandMass) + 200, 285);
    closeTo(50 ** 2 * variance(demand, demandMass), 2025);

    const left = [-1, 0, 1] as const;
    const right = [1, 0, 1] as const;
    const symmetricMass = [0.25, 0.5, 0.25] as const;
    closeTo(covariance(left, right, symmetricMass), 0);
    expect(right.every((value, index) => value === (left[index] ?? Number.NaN) ** 2)).toBe(true);
    const linearCombinationVariance = 4 * 4 + 9 - 4 * -3;
    expect(linearCombinationVariance).toBe(37);

    const withinFactoryVariance = 0.6 * 0.02 * 0.98 + 0.4 * 0.05 * 0.95;
    const betweenFactoryVariance = 0.6 * (0.02 - 0.032) ** 2 + 0.4 * (0.05 - 0.032) ** 2;
    closeTo(withinFactoryVariance, 0.03076);
    closeTo(betweenFactoryVariance, 0.000216);
    closeTo(withinFactoryVariance + betweenFactoryVariance, 0.032 * 0.968);
    closeTo(withinFactoryVariance + betweenFactoryVariance, 0.030976);
    closeTo(correlation(-3, 4, 9), -0.5);
    expect(() => correlation(0, 0, 1)).toThrow(RangeError);
    expect(() => correlation(0, 1, 0)).toThrow(RangeError);
  });

  it("checks Chebyshev, the CLT continuity correction, and a small-np failure case", () => {
    const exactBernoulliTail = binomialRange(100, 0.4, 0, 20) + binomialRange(100, 0.4, 60, 100);
    const chebyshevBound = (0.4 * 0.6) / (100 * 0.2 ** 2);
    closeTo(exactBernoulliTail, 0.00005887826495941705, 1e-15);
    closeTo(chebyshevBound, 0.06);
    expect(exactBernoulliTail).toBeLessThan(chebyshevBound);

    const exactCentralBinomial = binomialRange(100, 0.5, 40, 60);
    const continuityCorrected = normalCdf(2.1) - normalCdf(-2.1);
    closeTo(exactCentralBinomial, 0.9647997998, 3e-11);
    closeTo(continuityCorrected, 0.9642711589, 2e-7);
    expect(Math.abs(exactCentralBinomial - continuityCorrected)).toBeLessThan(0.001);

    const exactZero = binomialPmf(20, 0.01, 0);
    const mean = 0.2;
    const standardDeviation = Math.sqrt(0.198);
    const poorNormalApproximation =
      normalCdf((0.5 - mean) / standardDeviation) - normalCdf((-0.5 - mean) / standardDeviation);
    closeTo(exactZero, 0.8179069376, 3e-11);
    closeTo(poorNormalApproximation, 0.6920638603, 2e-7);
    expect(Math.abs(exactZero - poorNormalApproximation)).toBeGreaterThan(0.12);
  });

  it("checks the review model, factory variance audit, and corrected CLT tail", () => {
    const hypergeometricMass = [0, 1, 2, 3].map((observed) =>
      hypergeometricPmf(10, 4, 3, observed),
    );
    [1 / 6, 1 / 2, 3 / 10, 1 / 30].forEach((expected, index) =>
      closeTo(hypergeometricMass[index] ?? Number.NaN, expected),
    );
    closeTo(
      hypergeometricMass.reduce((sum, mass) => sum + mass, 0),
      1,
    );
    closeTo(expectation([0, 1, 2, 3], hypergeometricMass), 1.2);
    closeTo(variance([0, 1, 2, 3], hypergeometricMass), 0.56);
    closeTo(3 * 0.4 * 0.6, 0.72);
    expect(0.56).toBeLessThan(0.72);
    closeTo(0.6 * 0.02 + 0.4 * 0.05, 0.032);
    closeTo(0.032 * 0.968, 0.030976);

    const batchSize = 1000;
    const sharedSourceCovariance = 0.000216;
    const independentSourceVariance = batchSize * 0.030976;
    const sharedSourceVariance = batchSize * 0.03076 + batchSize ** 2 * sharedSourceCovariance;
    closeTo(independentSourceVariance, 30.976);
    closeTo(sharedSourceVariance, 246.76);
    closeTo(0.6 * 0.02 ** 2 + 0.4 * 0.05 ** 2 - 0.032 ** 2, sharedSourceCovariance);
    closeTo(
      independentSourceVariance + batchSize * (batchSize - 1) * sharedSourceCovariance,
      sharedSourceVariance,
    );
    closeTo(Math.sqrt(sharedSourceVariance), 15.708596372687154);
    closeTo(sharedSourceVariance / batchSize ** 2, 0.03076 / batchSize + 0.000216);

    const defectProbability = 0.032;
    const exactDefectTail = binomialRange(1000, defectProbability, 40, 1000);
    const defectVariance = 1000 * defectProbability * (1 - defectProbability);
    const defectStandardDeviation = Math.sqrt(defectVariance);
    const correctedThreshold = (39.5 - 1000 * defectProbability) / defectStandardDeviation;
    const correctedNormalTail = 1 - normalCdf(correctedThreshold);
    const defectRateStandardError = Math.sqrt((defectProbability * (1 - defectProbability)) / 1000);
    closeTo(exactDefectTail, 0.0920642648273366, 2e-14);
    closeTo(correctedThreshold, 1.3475615029, 2e-11);
    closeTo(correctedNormalTail, 0.08889972976792282, 2e-7);
    closeTo(defectRateStandardError, 0.0055656086819, 2e-13);
    closeTo(Math.abs(exactDefectTail - correctedNormalTail), 0.00316453505941378, 2e-7);
    expect(() => hypergeometricPmf(10, 11, 3, 1)).toThrow(RangeError);
  });
});
