import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateContentV2ToV3 } from "./v2-to-v3";

const checkedDraft = {
  schemaVersion: 2,
  id: "vectors",
  status: "draft",
  authors: ["one-forth-core"],
  translationStatus: "draft",
  review: {
    editorialStatus: "checked",
    mathematicalStatus: "checked",
    numericalStatus: "checked",
    sourceStatus: "checked",
    accessibilityStatus: "pending",
    humanReviewer: null,
  },
  revisionHistory: [],
};

describe("content schema v2 to v3 migration", () => {
  it("keeps authored content in preview until publication is explicitly approved", () => {
    const migrated = migrateContentV2ToV3.migrate(checkedDraft);
    assert.equal(migrated.schemaVersion, 3);
    assert.equal(migrated.publicationStatus, "preview");
    assert.equal(migrated.editorialStatus, "checked");
    assert.equal(migrated.translationEditorialStatus, "draft");
    assert.equal("status" in migrated, false);
    assert.equal("translationStatus" in migrated, false);
  });

  it("moves editorial state out of review without manufacturing a reviewer", () => {
    const migrated = migrateContentV2ToV3.migrate(checkedDraft);
    assert.deepEqual(migrated.review, {
      mathematicalStatus: "checked",
      numericalStatus: "checked",
      sourceStatus: "checked",
      accessibilityStatus: "pending",
      humanReviewer: null,
    });
  });

  it("hides plans and preserves their internal editorial state", () => {
    const migrated = migrateContentV2ToV3.migrate({
      ...checkedDraft,
      status: "outline",
      review: { ...checkedDraft.review, editorialStatus: "draft" },
    });
    assert.equal(migrated.publicationStatus, "hidden");
    assert.equal(migrated.editorialStatus, "outline");
  });

  it("records one metadata-only revision and is idempotent", () => {
    const migrated = migrateContentV2ToV3.migrate(checkedDraft);
    assert.deepEqual(migrated.revisionHistory, [
      {
        date: "2026-07-13",
        type: "metadata-migration",
        summary: "迁移至 Schema v3，分离公开发布状态与内部编辑状态；未改变正文或人工审阅证据。",
      },
    ]);
    assert.deepEqual(migrateContentV2ToV3.migrate(migrated), migrated);
  });
});
