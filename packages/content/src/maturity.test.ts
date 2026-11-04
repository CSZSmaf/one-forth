import { describe, expect, it } from "vitest";
import {
  contentFrontmatterSchema,
  deriveConceptMaturity,
  hasRecentUpdate,
  isContentIndexable,
  isContentReadable,
  isContentRecommendable,
  isContentSearchable,
  isRecentUpdateRevision,
  publicationPolicyFor,
  type RevisionHistoryEntry,
} from "./index";
import { generatedDocuments } from "./generated";

describe("content maturity and publication policy", () => {
  it("derives concept maturity from documents before outline metadata", () => {
    expect(deriveConceptMaturity([], false)).toBe("planned");
    expect(deriveConceptMaturity([], true)).toBe("outline");
    expect(deriveConceptMaturity(["draft"], true)).toBe("draft");
    expect(deriveConceptMaturity(["checked"], true)).toBe("checked");
    expect(deriveConceptMaturity(["verified", "reviewed"], true)).toBe("reviewed");
  });

  it("publishes only content with an explicit published state", () => {
    expect(publicationPolicyFor("published")).toEqual({
      searchable: true,
      indexable: true,
      recommendable: true,
    });
  });

  it("requires an explicit preview surface and never indexes preview or hidden content", () => {
    expect(isContentSearchable("preview")).toBe(false);
    expect(isContentIndexable("preview")).toBe(false);
    expect(isContentRecommendable("preview")).toBe(false);
    expect(isContentSearchable("preview", { includePreview: true })).toBe(true);
    expect(isContentIndexable("preview")).toBe(false);
    expect(isContentRecommendable("preview", { includePreview: true })).toBe(true);
    expect(isContentSearchable("hidden", { includePreview: true })).toBe(false);
    expect(isContentIndexable("hidden")).toBe(false);
  });

  it("keeps reader access separate from publication approval", () => {
    expect(isContentReadable("published")).toBe(true);
    expect(isContentReadable("preview")).toBe(true);
    expect(isContentReadable("hidden")).toBe(false);
  });

  it("excludes style and metadata-only changes from recent updates", () => {
    const substantive: RevisionHistoryEntry = {
      date: "2026-07-11",
      type: "substantive",
      summary: "补充了定义的适用条件与可核查反例。",
    };
    const migration: RevisionHistoryEntry = {
      date: "2026-07-11",
      type: "metadata-migration",
      summary: "迁移到新的内容元数据结构，正文没有变化。",
    };
    expect(isRecentUpdateRevision(substantive)).toBe(true);
    expect(isRecentUpdateRevision(migration)).toBe(false);
    expect(
      hasRecentUpdate(
        { publicationStatus: "preview", revisionHistory: [substantive] },
        { includePreview: true },
      ),
    ).toBe(true);
    expect(
      hasRecentUpdate(
        { publicationStatus: "preview", revisionHistory: [migration] },
        { includePreview: true },
      ),
    ).toBe(false);
  });

  it("rejects legacy status fields instead of silently stripping them", () => {
    const frontmatter = generatedDocuments[0]?.frontmatter;
    expect(frontmatter).toBeDefined();
    const result = contentFrontmatterSchema.safeParse({
      ...frontmatter,
      status: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("rejects edge-level direction that can contradict the relation registry", () => {
    const frontmatter = generatedDocuments[0]?.frontmatter;
    expect(frontmatter).toBeDefined();
    const result = contentFrontmatterSchema.safeParse({
      ...frontmatter,
      relations: [
        {
          type: "applied-to",
          target: "gradient",
          bidirectional: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
