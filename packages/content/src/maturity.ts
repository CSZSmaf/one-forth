export const publicationStatusValues = ["hidden", "preview", "published"] as const;

export type PublicationStatus = (typeof publicationStatusValues)[number];

export const editorialStatusValues = [
  "planned",
  "outline",
  "draft",
  "checked",
  "reviewed",
  "verified",
] as const;

export type EditorialStatus = (typeof editorialStatusValues)[number];

export const reviewCheckStatusValues = ["pending", "checked"] as const;

export type ReviewCheckStatus = (typeof reviewCheckStatusValues)[number];

export interface ContentReviewState {
  readonly mathematicalStatus: ReviewCheckStatus;
  readonly numericalStatus: ReviewCheckStatus;
  readonly sourceStatus: ReviewCheckStatus;
  readonly accessibilityStatus: ReviewCheckStatus;
  readonly humanReviewer: string | null;
}

export const revisionTypeValues = [
  "substantive",
  "mathematical-correction",
  "citation-update",
  "style",
  "metadata-migration",
] as const;

export type RevisionType = (typeof revisionTypeValues)[number];

export interface RevisionHistoryEntry {
  readonly date: string;
  readonly type: RevisionType;
  readonly summary: string;
}

export interface PublicationAccessOptions {
  /** Preview content is available only to an explicit reader or editorial preview surface. */
  readonly includePreview?: boolean;
}

export interface PublicationPolicy {
  readonly searchable: boolean;
  readonly indexable: boolean;
  readonly recommendable: boolean;
}

const editorialRank: Readonly<Record<EditorialStatus, number>> = {
  planned: 0,
  outline: 1,
  draft: 2,
  checked: 3,
  reviewed: 4,
  verified: 5,
};

export function deriveConceptMaturity(
  documentStatuses: readonly EditorialStatus[],
  hasTopicSpecificOutline: boolean,
): EditorialStatus {
  if (documentStatuses.length === 0) {
    return hasTopicSpecificOutline ? "outline" : "planned";
  }
  return documentStatuses.reduce((leastMature, status) =>
    editorialRank[status] < editorialRank[leastMature] ? status : leastMature,
  );
}

function isPublicationVisible(
  publicationStatus: PublicationStatus,
  options: PublicationAccessOptions,
): boolean {
  return (
    publicationStatus === "published" ||
    (publicationStatus === "preview" && options.includePreview === true)
  );
}

/**
 * Reader-facing availability is deliberately broader than search-engine
 * indexability: published and preview documents are readable, while hidden
 * editorial records remain inaccessible.
 */
export function isContentReadable(publicationStatus: PublicationStatus): boolean {
  return isPublicationVisible(publicationStatus, { includePreview: true });
}

export function isContentSearchable(
  publicationStatus: PublicationStatus,
  options: PublicationAccessOptions = {},
): boolean {
  return isPublicationVisible(publicationStatus, options);
}

export function isContentIndexable(publicationStatus: PublicationStatus): boolean {
  return publicationStatus === "published";
}

export function isContentRecommendable(
  publicationStatus: PublicationStatus,
  options: PublicationAccessOptions = {},
): boolean {
  return isPublicationVisible(publicationStatus, options);
}

export function publicationPolicyFor(
  publicationStatus: PublicationStatus,
  options: PublicationAccessOptions = {},
): PublicationPolicy {
  return {
    searchable: isContentSearchable(publicationStatus, options),
    indexable: isContentIndexable(publicationStatus),
    recommendable: isContentRecommendable(publicationStatus, options),
  };
}

export function isRecentUpdateRevision(revision: Pick<RevisionHistoryEntry, "type">): boolean {
  return (
    revision.type === "substantive" ||
    revision.type === "mathematical-correction" ||
    revision.type === "citation-update"
  );
}

export function isContentRecentUpdateEligible(
  publicationStatus: PublicationStatus,
  revisionHistory: readonly RevisionHistoryEntry[],
  options: PublicationAccessOptions = {},
): boolean {
  return (
    isContentRecommendable(publicationStatus, options) &&
    revisionHistory.some(isRecentUpdateRevision)
  );
}

export function hasRecentUpdate(
  content: Readonly<{
    publicationStatus: PublicationStatus;
    revisionHistory: readonly RevisionHistoryEntry[];
  }>,
  options: PublicationAccessOptions = {},
): boolean {
  return isContentRecentUpdateEligible(content.publicationStatus, content.revisionHistory, options);
}
