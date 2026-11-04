import type { SupportedLocale } from "@one-forth/config";
import { knowledgeRelationTypeValues, type ContentKind } from "@one-forth/registry";
import { z } from "zod";
import {
  editorialStatusValues,
  publicationStatusValues,
  reviewCheckStatusValues,
  revisionTypeValues,
} from "./maturity";

export const contentKindValues = [
  "concept",
  "theorem",
  "method",
  "derivation",
  "experiment",
  "proof",
  "problem-set",
  "reference",
  "paper-guide",
  "biography",
  "historical-note",
  "dataset",
  "software-tool",
] as const satisfies readonly ContentKind[];

export const relationTypeValues = knowledgeRelationTypeValues;

const relationSchema = z
  .object({
    type: z.enum(relationTypeValues),
    target: z.string().min(1),
    note: z.string().min(1).optional(),
    strength: z.enum(["primary", "secondary"]).optional(),
  })
  .strict();

const reviewSchema = z
  .object({
    mathematicalStatus: z.enum(reviewCheckStatusValues),
    numericalStatus: z.enum(reviewCheckStatusValues),
    sourceStatus: z.enum(reviewCheckStatusValues),
    accessibilityStatus: z.enum(reviewCheckStatusValues),
    humanReviewer: z.string().trim().min(1).nullable(),
  })
  .strict();

const revisionHistoryEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(revisionTypeValues),
  summary: z.string().trim().min(10),
});

export const contentFrontmatterSchema = z
  .object({
    schemaVersion: z.literal(3),
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    conceptId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    kind: z.enum(contentKindValues),
    title: z.string().min(1),
    shortTitle: z.string().min(1),
    summary: z.string().min(20),
    domain: z.string().min(1),
    subject: z.string().min(1),
    level: z.enum(["foundational", "high-school", "undergraduate", "graduate", "research"]),
    difficulty: z.number().int().min(1).max(5),
    estimatedMinutes: z.number().int().positive(),
    publicationStatus: z.enum(publicationStatusValues),
    editorialStatus: z.enum(editorialStatusValues),
    authors: z.array(z.string().min(1)).min(1),
    review: reviewSchema,
    revisionHistory: z.array(revisionHistoryEntrySchema).default([]),
    prerequisites: z.array(z.string().min(1)).default([]),
    relations: z.array(relationSchema).default([]),
    learningObjectives: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string().min(1)).min(1),
    aliases: z.array(z.string().min(1)).default([]),
    visualizations: z.array(z.string().min(1)).default([]),
    resources: z.array(z.string().min(1)).default([]),
    symbolNamespaces: z.array(z.string().min(1)).default([]),
    translationOf: z.string().min(1).optional(),
    translationEditorialStatus: z.enum(editorialStatusValues).optional(),
  })
  .strict()
  .superRefine((frontmatter, context) => {
    if (
      (frontmatter.editorialStatus === "reviewed" || frontmatter.editorialStatus === "verified") &&
      frontmatter.review.humanReviewer === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["review", "humanReviewer"],
        message: `${frontmatter.editorialStatus} content requires a traceable human reviewer`,
      });
    }
    if (
      frontmatter.editorialStatus === "verified" &&
      Object.entries(frontmatter.review)
        .filter(([field]) => field.endsWith("Status"))
        .some(([, value]) => value !== "checked")
    ) {
      context.addIssue({
        code: "custom",
        path: ["review"],
        message: "verified content requires every review check to be checked",
      });
    }
    if (
      frontmatter.publicationStatus === "published" &&
      (frontmatter.editorialStatus === "planned" ||
        frontmatter.editorialStatus === "outline" ||
        frontmatter.editorialStatus === "draft")
    ) {
      context.addIssue({
        code: "custom",
        path: ["publicationStatus"],
        message: "published content must have reached the checked editorial state",
      });
    }
  });

export type ContentFrontmatter = z.infer<typeof contentFrontmatterSchema>;

export interface ContentDocument {
  readonly documentId: string;
  readonly locale: SupportedLocale;
  readonly slug: readonly string[];
  readonly url: string;
  readonly hash: string;
  readonly frontmatter: ContentFrontmatter;
  readonly body: string;
}
