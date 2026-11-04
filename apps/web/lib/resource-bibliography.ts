import type { ResourceRecord } from "@one-forth/content";

/** Combines the available bibliographic fields for resource lists and chapter references. */
export function formatResourceBibliography(resource: ResourceRecord): string {
  return [
    resource.metadataFields.authors === "complete" ? resource.authors?.join(", ") : undefined,
    resource.metadataFields.year === "complete" ? resource.year : undefined,
    resource.metadataFields.publication === "complete"
      ? (resource.publisher ?? resource.venue)
      : undefined,
  ]
    .filter((value) => value !== undefined && value !== "")
    .join(" · ");
}
