import assert from "node:assert/strict";
import test from "node:test";
import {
  learningPathAliases,
  readerConceptById,
  readerContentRepository,
  readerCurriculumRedirects,
  readerCurriculumRepository,
  type CurriculumRedirect,
} from "../../packages/content/src/index.ts";
import {
  countRedirectArtifacts,
  describeRedirectArtifacts,
  serializeRedirectsJson,
  serializeRedirectsText,
} from "./artifacts.ts";

test("counts and describes redirect artifacts from the provided mappings", () => {
  const redirects: readonly CurriculumRedirect[] = [
    {
      sourcePath: "/zh-CN/learn/mathematics/foundations/logic-propositions",
      targetPath: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
      kind: "legacy-learn",
    },
    {
      sourcePath: "/zh-CN/concepts/logic-and-quantifiers",
      targetPath:
        "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions#definition-logic-and-quantifiers",
      kind: "legacy-concept",
    },
    {
      sourcePath: "/zh-CN/paths/calculus-foundations",
      targetPath: "/zh-CN/books/mathematics/single-variable-calculus",
      kind: "legacy-path",
    },
  ];

  assert.deepEqual(countRedirectArtifacts(redirects), {
    total: redirects.length,
    learn: 1,
    concept: 1,
    path: 1,
    books: 0,
  });
  assert.equal(
    describeRedirectArtifacts(redirects),
    `${redirects.length} reader-safe deterministic single-hop mappings (1 learn, 1 concept, 1 path, 0 books)`,
  );
});

test("serializes exactly the redirects derived from reader-safe repositories", async () => {
  const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
  const readerPathAliases = learningPathAliases.filter((alias) =>
    readerCurriculumRepository.getBook(alias.targetBookId),
  );
  const counts = countRedirectArtifacts();

  assert.equal(counts.learn, documents.length);
  assert.equal(counts.concept, readerConceptById.size);
  assert.equal(counts.path, readerPathAliases.length);
  assert.equal(counts.total, readerCurriculumRedirects.length);

  const json = JSON.parse(serializeRedirectsJson()) as {
    readonly schemaVersion: number;
    readonly permanent: boolean;
    readonly redirects: readonly CurriculumRedirect[];
  };
  assert.equal(json.schemaVersion, 1);
  assert.equal(json.permanent, true);
  assert.deepEqual(json.redirects, readerCurriculumRedirects);

  const textLines = serializeRedirectsText().trim().split("\n");
  assert.equal(textLines.length, readerCurriculumRedirects.length);
  assert.equal(
    textLines[0],
    readerCurriculumRedirects[0]
      ? `${readerCurriculumRedirects[0].sourcePath} ${readerCurriculumRedirects[0].targetPath} 301`
      : undefined,
  );
});

test("keeps published and preview aliases while excluding hidden content", () => {
  const text = serializeRedirectsText();
  assert.match(text, /^\/zh-CN\/learn\/mathematics\/foundations\/logic-propositions .* 301$/mu);
  assert.match(text, /^\/zh-CN\/learn\/mathematics\/linear-algebra\/vectors .* 301$/mu);
  assert.match(text, /^\/zh-CN\/learn\/mathematics\/probability\/probability-axioms .* 301$/mu);
  assert.match(text, /^\/zh-CN\/concepts\/vectors .* 301$/mu);
  assert.match(text, /^\/zh-CN\/concepts\/probability-axioms .* 301$/mu);
  assert.match(
    text,
    /^\/zh-CN\/learn\/mathematics\/mathematical-statistics\/sampling-distributions .* 301$/mu,
  );
  assert.match(text, /^\/zh-CN\/concepts\/sampling-distributions .* 301$/mu);
  assert.match(
    text,
    /^\/zh-CN\/learn\/mathematics\/discrete-mathematics\/counting-principles .* 301$/mu,
  );
  assert.match(text, /^\/zh-CN\/concepts\/counting-principles .* 301$/mu);
  assert.match(
    text,
    /^\/zh-CN\/learn\/mathematics\/differential-equations\/existence-uniqueness /mu,
  );
});
