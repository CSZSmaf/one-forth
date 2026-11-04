import type { ContentMigration } from "./index.ts";

const migrationDate = "2026-07-13";
const migrationSummary =
  "迁移至 Schema v3，分离公开发布状态与内部编辑状态；未改变正文或人工审阅证据。";

const legacyStatusValues = ["planned", "outline", "draft", "reviewed", "verified"] as const;
type LegacyStatus = (typeof legacyStatusValues)[number];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function legacyStatus(value: unknown): LegacyStatus {
  if (typeof value !== "string" || !legacyStatusValues.includes(value as LegacyStatus)) {
    throw new Error(`Cannot safely migrate unknown v2 status: ${String(value)}`);
  }
  return value as LegacyStatus;
}

function editorialStatusFor(
  status: LegacyStatus,
  review: Readonly<Record<string, unknown>>,
): LegacyStatus | "checked" {
  if (status === "planned" || status === "outline") return status;
  if (status === "reviewed" || status === "verified") return status;
  const reviewStatus = review.editorialStatus;
  if (reviewStatus !== "draft" && reviewStatus !== "checked") {
    throw new Error(
      `Cannot safely migrate unknown v2 review.editorialStatus: ${String(reviewStatus)}`,
    );
  }
  return reviewStatus;
}

function publicationStatusFor(status: LegacyStatus): "hidden" | "preview" {
  return status === "planned" || status === "outline" ? "hidden" : "preview";
}

export const migrateContentV2ToV3: ContentMigration = {
  from: 2,
  to: 3,
  description: "separate public publication state from the internal editorial workflow",
  migrate(frontmatter) {
    if (frontmatter.schemaVersion === 3) return structuredClone(frontmatter);
    if (frontmatter.schemaVersion !== 2) {
      throw new Error(
        `v2 -> v3 migration received schemaVersion ${String(frontmatter.schemaVersion)}`,
      );
    }
    const status = legacyStatus(frontmatter.status);
    if (!isRecord(frontmatter.review)) throw new Error("review must be an object before migration");
    if (!Array.isArray(frontmatter.revisionHistory)) {
      throw new Error("revisionHistory must be an array before migration");
    }

    const publicationStatus = publicationStatusFor(status);
    const editorialStatus = editorialStatusFor(status, frontmatter.review);
    const review = Object.fromEntries(
      Object.entries(frontmatter.review).filter(([field]) => field !== "editorialStatus"),
    );
    const revisionHistory = [
      ...structuredClone(frontmatter.revisionHistory),
      {
        date: migrationDate,
        type: "metadata-migration",
        summary: migrationSummary,
      },
    ];
    const migrated: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(frontmatter)) {
      if (field === "schemaVersion") {
        migrated.schemaVersion = 3;
      } else if (field === "status") {
        migrated.publicationStatus = publicationStatus;
        migrated.editorialStatus = editorialStatus;
      } else if (field === "review") {
        migrated.review = review;
      } else if (field === "revisionHistory") {
        migrated.revisionHistory = revisionHistory;
      } else if (field === "translationStatus") {
        migrated.translationEditorialStatus = structuredClone(value);
      } else {
        migrated[field] = structuredClone(value);
      }
    }
    return migrated;
  },
};
