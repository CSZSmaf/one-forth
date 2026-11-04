import assert from "node:assert/strict";
import test from "node:test";
import { addSemanticAnchorIds } from "./semantic-anchors.ts";

const sample = `---
conceptId: vectors
---

<Definition title="向量">正文</Definition>
<Definition>第二个定义</Definition>
<Theorem title="结论">正文</Theorem>
<Example id="example-custom">正文</Example>
`;

test("adds deterministic prefixed semantic anchors and is idempotent", () => {
  const migrated = addSemanticAnchorIds(sample);
  assert.match(migrated, /id="definition-vectors-1"/);
  assert.match(migrated, /id="definition-vectors-2"/);
  assert.match(migrated, /id="theorem-vectors-1"/);
  assert.match(migrated, /id="example-custom"/);
  assert.equal(addSemanticAnchorIds(migrated), migrated);
});
