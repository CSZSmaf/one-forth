import assert from "node:assert/strict";
import test from "node:test";
import { findForbiddenContentPackageImports } from "./lib/public-repository-boundary.ts";
import { publicRevisionIssues } from "./lib/public-revision.ts";

test("public revision summaries reject editorial instructions and private data", () => {
  for (const value of [
    "根据用户要求修改",
    "同步 frontmatter 与资源 ID",
    "文件 C:\\Users\\reader\\notes.txt",
    "联系 test@example.org",
    "access_token=example",
  ]) {
    assert.ok(publicRevisionIssues(value).length > 0);
  }
  assert.deepEqual(publicRevisionIssues("补充 MIT 课程链接和 Newton 定律例题。"), []);
  assert.deepEqual(publicRevisionIssues("补充提示注入、回归测试与内部对称性的定义。"), []);
});

test("public repository boundary rejects complete editorial repositories", () => {
  const source = `
    import {
      contentRepository as content,
      curriculumRepository,
      conceptById,
    } from "@one-forth/content";
  `;

  assert.deepEqual(
    findForbiddenContentPackageImports(source).map((entry) => entry.binding),
    ["contentRepository", "curriculumRepository", "conceptById"],
  );
});

test("public repository boundary permits indexable and reader-safe facades", () => {
  const source = `
    import {
      publicContentRepository,
      publicCurriculumRepository,
      publicConceptById,
      readerContentRepository,
      readerCurriculumRepository,
      readerConceptById,
      type ContentDocument,
    } from "@one-forth/content";
  `;

  assert.deepEqual(findForbiddenContentPackageImports(source), []);
});

test("public repository boundary rejects namespace and dynamic imports", () => {
  const source = `
    import * as content from "@one-forth/content";
    const contentPackage = await import("@one-forth/content");
  `;

  assert.deepEqual(
    findForbiddenContentPackageImports(source).map((entry) => entry.binding),
    ["content", "dynamic-import"],
  );
});

test("public repository boundary isolates adjacent imports and rejects re-exports", () => {
  const source = `
    import { siteConfig } from "@one-forth/config";
    import { publicContentRepository } from "@one-forth/content";
    export { contentRepository as legacyRepository } from "@one-forth/content";
  `;

  assert.deepEqual(findForbiddenContentPackageImports(source), [
    { binding: "contentRepository", match: "contentRepository as legacyRepository" },
  ]);
});
