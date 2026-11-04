import { canonicalRelationType } from "../../packages/registry/src/index.ts";
import type { ContentMigration } from "./index.ts";

const migrationDate = "2026-07-11";
const migrationSummary = "迁移至 Schema v2，初始化待检查状态并规范关系类型；未改变正文内容。";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`${field} must be an array of strings before migration`);
  }
  return [...value];
}

function migrateRelations(
  value: unknown,
  prerequisites: string[],
): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error("relations must be an array before migration");
  const migrated: Record<string, unknown>[] = [];
  for (const [index, relation] of value.entries()) {
    if (!isRecord(relation)) throw new Error(`relations.${index} must be an object`);
    const type = relation.type;
    const target = relation.target;
    if (typeof type !== "string") throw new Error(`relations.${index}.type must be a string`);
    if (typeof target !== "string" || !target.trim()) {
      throw new Error(`relations.${index}.target must be a non-empty string`);
    }
    if (type === "depends-on") {
      if (!prerequisites.includes(target)) prerequisites.push(target);
      continue;
    }
    const canonical = canonicalRelationType(type);
    if (!canonical) throw new Error(`relations.${index}.type is not recognized: ${type}`);
    migrated.push({ ...relation, type: canonical });
  }
  return migrated;
}

export const migrateContentV1ToV2: ContentMigration = {
  from: 1,
  to: 2,
  description: "add explicit maturity reviews and revision history; canonicalize relation aliases",
  migrate(frontmatter) {
    if (frontmatter.schemaVersion === 2) return structuredClone(frontmatter);
    if (frontmatter.schemaVersion !== 1) {
      throw new Error(
        `v1 -> v2 migration received schemaVersion ${String(frontmatter.schemaVersion)}`,
      );
    }
    if (frontmatter.status !== "draft" && frontmatter.status !== "reviewed") {
      throw new Error(`Cannot safely migrate unknown v1 status: ${String(frontmatter.status)}`);
    }

    const prerequisites = stringArray(frontmatter.prerequisites, "prerequisites");
    const relations = migrateRelations(frontmatter.relations, prerequisites);
    const translationStatus = frontmatter.translationStatus === undefined ? undefined : "draft";
    const {
      reviewers: _reviewers,
      lastReviewed: _lastReviewed,
      review: _oldReview,
      revisionHistory: _oldRevisionHistory,
      ...preserved
    } = frontmatter;

    return {
      ...preserved,
      schemaVersion: 2,
      // A metadata migration cannot establish independent human review.
      status: "draft",
      review: {
        editorialStatus: "draft",
        mathematicalStatus: "pending",
        numericalStatus: "pending",
        sourceStatus: "pending",
        accessibilityStatus: "pending",
        humanReviewer: null,
      },
      revisionHistory: [
        {
          date: migrationDate,
          type: "metadata-migration",
          summary: migrationSummary,
        },
      ],
      prerequisites,
      relations,
      ...(translationStatus ? { translationStatus } : {}),
    };
  },
};
