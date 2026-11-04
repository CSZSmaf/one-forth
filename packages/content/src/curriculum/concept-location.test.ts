import { describe, expect, it } from "vitest";
import { conceptById, curriculumRepository } from "../index";

const authoredTeachingLocations = {
  "vector-operations": ["m04-vectors-coordinates", "definition-vector-space"],
  "linear-combinations": ["m04-vectors-coordinates", "definition-linear-combination-span"],
  "vector-spaces": ["m04-vectors-coordinates", "definition-vector-space"],
  "span-and-basis": ["m04-vectors-coordinates", "definition-basis-coordinates"],
  "matrix-operations": ["m04-matrices-operations", "definition-matrix-operations"],
  "matrix-multiplication": ["m04-matrices-operations", "definition-matrix-multiplication"],
  orthogonality: ["m04-vectors-coordinates", "definition-inner-product-orthogonality"],
  "orthogonal-projection": ["m04-vectors-coordinates", "definition-orthogonal-projection"],
  "gaussian-elimination": ["m04-linear-systems", "definition-gaussian-elimination"],
  "matrix-rank": ["m04-linear-systems", "definition-matrix-rank"],
  "null-space": ["m04-linear-systems", "definition-null-space"],
  "least-squares": ["m04-linear-systems", "definition-least-squares"],
  "positive-definite-matrices": ["m04-eigenstructure-review", "theorem-real-spectral-theorem"],
  "quadratic-forms": ["m04-eigenstructure-review", "definition-quadratic-form"],
  "partial-derivatives": ["m03-partials-gradient", "从导数到方向导数"],
  "directional-derivative": ["m03-partials-gradient", "从导数到方向导数"],
  "jacobian-matrix": ["m03-partials-gradient", "多变量链式法则与-jacobian"],
  "hessian-matrix": ["m03-partials-gradient", "definition-hessian-matrix"],
  "combinatorial-probability": ["m05-axioms-counting", "definition-combinatorial-probability"],
  "bayes-theorem": ["m05-conditional-bayes", "theorem-bayes"],
  "discrete-distributions": ["m05-random-variables-distributions", "离散分布与概率质量函数"],
  "continuous-distributions": ["m05-random-variables-distributions", "连续分布与概率密度"],
  "joint-distributions": ["m05-random-variables-distributions", "definition-joint-distributions"],
  "central-limit-theorem": ["m05-laws-large-numbers-clt", "theorem-central-limit-theorem"],
  "maximum-likelihood-estimation": [
    "m06-point-estimation",
    "definition-maximum-likelihood-estimation",
  ],
  "bayesian-inference": ["m06-statistics-review", "definition-bayesian-inference"],
  "boundary-conditions-waves": ["p03-wave-equation", "方程还不够初始与边界条件"],
  "self-attention": ["a07-attention-mechanism", "自注意力交叉注意力与多头结构"],
  "binary-classification": ["a01-logistic-regression", "分类需要怎样的输出"],
} as const;

const chapterOnlyTeachingLocations = {
  "gram-schmidt-process": ["m09-orthogonal-expansions"],
  "singular-value-decomposition": ["a03-pca-manifolds"],
  "partial-differential-equations": ["m09-heat-wave-laplace"],
  "green-functions": ["m09-fourier-pde-review"],
} as const;

describe("secondary concept teaching locations", () => {
  it("pins all 33 audited concepts to verified semantic targets", () => {
    expect(
      Object.keys(authoredTeachingLocations).length +
        Object.keys(chapterOnlyTeachingLocations).length,
    ).toBe(33);

    for (const [conceptId, [chapterId, anchorId]] of Object.entries(authoredTeachingLocations)) {
      expect(conceptById.get(conceptId)?.canonicalLocation, conceptId).toEqual({
        chapterId,
        anchorId,
      });
      expect(curriculumRepository.getChapter(chapterId)?.conceptIds, conceptId).toContain(
        conceptId,
      );
    }

    for (const [conceptId, [chapterId]] of Object.entries(chapterOnlyTeachingLocations)) {
      expect(conceptById.get(conceptId)?.canonicalLocation, conceptId).toEqual({
        chapterId,
        anchorId: "article-overview",
      });
      expect(curriculumRepository.getChapter(chapterId)?.conceptIds, conceptId).toContain(
        conceptId,
      );
    }
  });

  it("uses verified body anchors and the stable article overview when needed", () => {
    for (const [conceptId, [chapterId]] of Object.entries(authoredTeachingLocations)) {
      expect(curriculumRepository.getChapter(chapterId)?.contentId, conceptId).toBeTruthy();
    }
    for (const [conceptId, [chapterId]] of Object.entries(chapterOnlyTeachingLocations)) {
      expect(curriculumRepository.getChapter(chapterId)?.contentId, conceptId).toBeTruthy();
      expect(conceptById.get(conceptId)?.canonicalLocation.anchorId, conceptId).toBe(
        "article-overview",
      );
    }
  });
});
