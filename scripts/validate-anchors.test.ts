import assert from "node:assert/strict";
import test from "node:test";
import { collectAuthoredAnchors, validateCanonicalAnchorTarget } from "./lib/anchor-validation.ts";

test("preserves legacy heading links and rejects duplicate alias anchors", () => {
  const body = '## <span id="old-heading" data-heading-alias="" aria-hidden="true" />新标题';
  const collected = collectAuthoredAnchors(body, "renamed-heading");
  assert.deepEqual(collected.errors, []);
  assert.ok(collected.anchors.has("old-heading"));
  assert.ok(collected.anchors.has("新标题"));
  const duplicate = collectAuthoredAnchors(`${body}\n${body}`, "duplicate-alias");
  assert.ok(
    duplicate.errors.some(({ message }) => message.includes("Duplicate anchor ID: old-heading")),
  );
});

test("collects the same heading and semantic-block anchors that authored MDX renders", () => {
  const collected = collectAuthoredAnchors(
    [
      "## 多变量链式法则与 Jacobian",
      '<Definition id="definition-gradient-1">正文</Definition>',
      '<InteractiveFigure id="gradient-field" />',
      '<TeachingFigure id="gradient-contours" />',
    ].join("\n"),
    "zh-CN/gradient",
  );

  assert.deepEqual(collected.errors, []);
  assert.deepEqual(
    [...collected.anchors],
    [
      "article-overview",
      "多变量链式法则与-jacobian",
      "definition-gradient-1",
      "figure-gradient-field",
      "figure-gradient-contours",
    ],
  );
});

test("rejects an authored canonical anchor that exists only in the chapter reverse index", () => {
  const error = validateCanonicalAnchorTarget({
    conceptId: "hessian-matrix",
    chapterId: "m03-partials-gradient",
    anchorId: "definition-hessian-matrix",
    chapterContentId: "gradient",
    chapterConceptIds: ["hessian-matrix"],
    authoredAnchors: new Set(["definition-gradient-1"]),
  });

  assert.deepEqual(error, {
    documentId: "concept:hessian-matrix",
    message:
      "Authored chapter canonical anchor does not exist in body: m03-partials-gradient#definition-hessian-matrix",
  });
});

test("accepts real authored semantic anchors for related spectral concepts", () => {
  const authoredAnchors = new Set(["theorem-real-spectral-theorem", "definition-quadratic-form"]);
  for (const [conceptId, anchorId] of [
    ["positive-definite-matrices", "theorem-real-spectral-theorem"],
    ["quadratic-forms", "definition-quadratic-form"],
  ] as const) {
    assert.equal(
      validateCanonicalAnchorTarget({
        conceptId,
        chapterId: "m04-eigenstructure-review",
        anchorId,
        chapterContentId: "eigenvalues-eigenvectors",
        chapterConceptIds: ["positive-definite-matrices", "quadratic-forms"],
        authoredAnchors,
      }),
      null,
    );
  }
});

test("accepts planned page anchors only when PlannedChapterPage can generate them", () => {
  assert.equal(
    validateCanonicalAnchorTarget({
      conceptId: "gram-schmidt-process",
      chapterId: "m09-orthogonal-expansions",
      anchorId: "definition-gram-schmidt-process",
      chapterConceptIds: ["gram-schmidt-process"],
    }),
    null,
  );

  assert.deepEqual(
    validateCanonicalAnchorTarget({
      conceptId: "gram-schmidt-process",
      chapterId: "m09-orthogonal-expansions",
      anchorId: "definition-gram-schmidt-process",
      chapterConceptIds: [],
    }),
    {
      documentId: "concept:gram-schmidt-process",
      message:
        "Planned chapter canonical anchor is not generated: m09-orthogonal-expansions#definition-gram-schmidt-process",
    },
  );
});

test("requires semantic prefixes only for planned chapter canonical anchors", () => {
  assert.deepEqual(
    validateCanonicalAnchorTarget({
      conceptId: "quadratic-forms",
      chapterId: "m09-orthogonal-expansions",
      anchorId: "实对称矩阵的谱定理",
      chapterConceptIds: ["quadratic-forms"],
    }),
    {
      documentId: "concept:quadratic-forms",
      message:
        "Planned chapter canonical anchor must use a semantic prefix: m09-orthogonal-expansions#实对称矩阵的谱定理",
    },
  );
});
