import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateContentV1ToV2 } from "./v1-to-v2";

const fixture = {
  schemaVersion: 1,
  id: "wave-equation-1d",
  conceptId: "wave-equation",
  status: "reviewed",
  reviewers: ["unverified-name"],
  lastReviewed: "2026-07-11",
  prerequisites: ["partial-derivatives"],
  relations: [
    { type: "used-in", target: "boundary-conditions-waves" },
    { type: "depends-on", target: "fourier-series" },
  ],
};

describe("content schema v1 to v2 migration", () => {
  it("canonicalizes aliases and converts depends-on into a prerequisite", () => {
    const migrated = migrateContentV1ToV2.migrate(fixture);
    assert.deepEqual(migrated.relations, [
      { type: "applied-to", target: "boundary-conditions-waves" },
    ]);
    assert.deepEqual(migrated.prerequisites, ["partial-derivatives", "fourier-series"]);
  });

  it("does not manufacture review evidence", () => {
    const migrated = migrateContentV1ToV2.migrate(fixture);
    assert.equal(migrated.status, "draft");
    assert.equal("reviewers" in migrated, false);
    assert.equal("lastReviewed" in migrated, false);
    assert.deepEqual(migrated.review, {
      editorialStatus: "draft",
      mathematicalStatus: "pending",
      numericalStatus: "pending",
      sourceStatus: "pending",
      accessibilityStatus: "pending",
      humanReviewer: null,
    });
  });

  it("records one metadata-only revision and is idempotent", () => {
    const migrated = migrateContentV1ToV2.migrate(fixture);
    assert.deepEqual(migrated.revisionHistory, [
      {
        date: "2026-07-11",
        type: "metadata-migration",
        summary: "迁移至 Schema v2，初始化待检查状态并规范关系类型；未改变正文内容。",
      },
    ]);
    assert.deepEqual(migrateContentV1ToV2.migrate(migrated), migrated);
  });
});
