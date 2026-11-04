import {
  conceptCatalog,
  chapterMathCoverage,
  curriculumRepository,
  editorialStatusValues,
  deriveConceptMaturity,
  equations,
  extractMathFragments,
  learningPathAliases,
  learningPaths,
  legacyLearningPathsV2,
  requiredRoundTwoConceptIds,
  requiredRoundTwoLearningPathIds,
  requiredSeriesLearningPathIds,
  requiredTopicalLearningPathIds,
  resolveMathFragmentAnchor,
  resources,
  symbols,
  type EditorialStatus,
  type ConceptEntity,
  type LearningPath,
} from "../packages/content/src/index.ts";
import {
  domainRegistry,
  subjectRegistry,
  type LocalizedText,
} from "../packages/registry/src/index.ts";
import { units } from "../packages/physics/src/index.ts";
import { visualizationManifest } from "../packages/visualization/src/index.ts";
import {
  errorMessage,
  isValidCalendarDate,
  loadContentDocuments,
  todayUtc,
  type LoadedContentDocument,
} from "./lib/content-files.ts";
import { collectAuthoredAnchors, validateCanonicalAnchorTarget } from "./lib/anchor-validation.ts";
import { hasDisallowedControlCharacter } from "./lib/control-characters.ts";
import { publicRevisionIssues } from "./lib/public-revision.ts";
import { isRecentUpdateRevision } from "../packages/content/src/maturity.ts";

interface ValidationError {
  readonly location: string;
  readonly message: string;
}

const disallowedContentControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function hasLocalizedText(value: LocalizedText): boolean {
  return (
    Boolean(value["zh-CN"]?.trim()) && Object.values(value).every((text) => Boolean(text?.trim()))
  );
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort((left, right) => left.localeCompare(right, "en"));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizedLatex(value: string): string {
  return value.replace(/\s+/gu, "").normalize("NFC");
}

function collectPrerequisiteCycles(
  concepts: readonly Pick<ConceptEntity, "id" | "prerequisites">[],
): readonly string[][] {
  const graph = new Map<string, Set<string>>();
  for (const concept of concepts) {
    const outgoing = graph.get(concept.id) ?? new Set<string>();
    concept.prerequisites.forEach((target) => outgoing.add(target));
    graph.set(concept.id, outgoing);
  }

  const state = new Map<string, "visiting" | "complete">();
  const stack: string[] = [];
  const cycles = new Map<string, string[]>();

  const visit = (node: string): void => {
    state.set(node, "visiting");
    stack.push(node);
    for (const target of graph.get(node) ?? []) {
      if (state.get(target) === "visiting") {
        const start = stack.lastIndexOf(target);
        const cycle = [...stack.slice(start), target];
        const unique = cycle.slice(0, -1);
        const rotations = unique.map((_, index) => [
          ...unique.slice(index),
          ...unique.slice(0, index),
        ]);
        rotations.sort((left, right) => left.join("\0").localeCompare(right.join("\0"), "en"));
        const canonical = rotations[0] ?? unique;
        cycles.set(canonical.join(" -> "), [...canonical, canonical[0] ?? target]);
      } else if (!state.has(target) && graph.has(target)) {
        visit(target);
      }
    }
    stack.pop();
    state.set(node, "complete");
  };

  for (const node of [...graph.keys()].sort((left, right) => left.localeCompare(right, "en"))) {
    if (!state.has(node)) visit(node);
  }
  return [...cycles.values()];
}

function validateDocument(
  document: LoadedContentDocument,
  conceptIds: ReadonlySet<string>,
  resourceIds: ReadonlySet<string>,
  visualizationIds: ReadonlySet<string>,
  symbolNamespaces: ReadonlySet<string>,
  baseConceptIds: ReadonlySet<string>,
  errors: ValidationError[],
): void {
  const { frontmatter } = document;
  const location = document.relativePath;
  for (const match of document.body.matchAll(disallowedContentControlCharacters)) {
    const offset = match.index ?? 0;
    const line = document.bodyStartLine + document.body.slice(0, offset).split("\n").length - 1;
    const code = `U+${(match[0]?.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;
    errors.push({ location: `${location}:${line}`, message: `Body contains ${code}` });
  }
  if (/^##\s+学习目标(?:\s|与|$).*$/mu.test(document.body)) {
    errors.push({
      location,
      message: "Body must not repeat frontmatter.learningObjectives under a 学习目标 heading",
    });
  }
  const domain = domainRegistry.get(frontmatter.domain);
  const subject = subjectRegistry.get(frontmatter.subject);
  const exerciseTags = [...document.body.matchAll(/<Exercise(?:\s[^>]*)?>/g)];
  const exerciseIds = exerciseTags.map(
    (match) => match[0].match(/\bid=["']([^"']+)["']/)?.[1] ?? "",
  );
  exerciseIds.forEach((exerciseId, index) => {
    if (!exerciseId) {
      errors.push({
        location,
        message: `Exercise ${index + 1} needs an explicit stable id for persisted completion`,
      });
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exerciseId)) {
      errors.push({
        location,
        message: `Exercise ID must use kebab-case: ${exerciseId}`,
      });
    }
  });
  for (const duplicate of duplicates(exerciseIds.filter(Boolean))) {
    errors.push({ location, message: `Duplicate document exercise ID: ${duplicate}` });
  }
  if (!domain) errors.push({ location, message: `Unknown domain: ${frontmatter.domain}` });
  if (!subject) {
    errors.push({ location, message: `Unknown subject: ${frontmatter.subject}` });
  } else {
    if (subject.domainId !== frontmatter.domain) {
      errors.push({
        location,
        message: `Subject ${frontmatter.subject} belongs to ${subject.domainId}, not ${frontmatter.domain}`,
      });
    }
    if (
      subject.supportedContentTypes &&
      !subject.supportedContentTypes.includes(frontmatter.kind)
    ) {
      errors.push({
        location,
        message: `Subject ${frontmatter.subject} does not support content kind ${frontmatter.kind}`,
      });
    }
  }

  if (!frontmatter.summary.trim()) {
    errors.push({ location, message: "summary must not be empty or whitespace" });
  }
  frontmatter.learningObjectives.forEach((objective, index) => {
    if (!objective.trim()) {
      errors.push({ location, message: `learningObjectives.${index} must not be empty` });
    }
  });
  frontmatter.tags.forEach((tag, index) => {
    if (!tag.trim()) errors.push({ location, message: `tags.${index} must not be empty` });
  });

  const revisionKeys = frontmatter.revisionHistory.map(
    (revision) => `${revision.date}\0${revision.type}\0${revision.summary}`,
  );
  for (const duplicate of duplicates(revisionKeys)) {
    errors.push({
      location,
      message: `Duplicate revision history entry: ${duplicate.replaceAll("\0", " / ")}`,
    });
  }
  for (const [index, revision] of frontmatter.revisionHistory.entries()) {
    if (isRecentUpdateRevision(revision)) {
      for (const category of publicRevisionIssues(revision.summary)) {
        errors.push({ location, message: `revisionHistory.${index} contains ${category}` });
      }
    }
    if (!isValidCalendarDate(revision.date) || revision.date > todayUtc()) {
      errors.push({
        location,
        message: `Invalid revisionHistory.${index}.date: ${revision.date}`,
      });
    }
  }
  if (
    (frontmatter.editorialStatus === "reviewed" || frontmatter.editorialStatus === "verified") &&
    frontmatter.review.humanReviewer === null
  ) {
    errors.push({
      location,
      message: `${frontmatter.editorialStatus} content requires a human reviewer`,
    });
  }
  if (
    frontmatter.editorialStatus === "verified" &&
    Object.entries(frontmatter.review)
      .filter(([field]) => field.endsWith("Status"))
      .some(([, status]) => status !== "checked")
  ) {
    errors.push({ location, message: "verified content requires every review status checked" });
  }

  for (const prerequisite of frontmatter.prerequisites) {
    if (!conceptIds.has(prerequisite)) {
      errors.push({ location, message: `Unknown prerequisite concept: ${prerequisite}` });
    }
  }
  for (const relation of frontmatter.relations) {
    if (!conceptIds.has(relation.target)) {
      errors.push({ location, message: `Unknown relation target: ${relation.target}` });
    }
  }
  for (const visualization of frontmatter.visualizations) {
    if (!visualizationIds.has(visualization)) {
      errors.push({ location, message: `Unknown visualization: ${visualization}` });
    }
  }
  for (const resource of frontmatter.resources) {
    if (!resourceIds.has(resource)) {
      errors.push({ location, message: `Unknown resource: ${resource}` });
    }
  }
  for (const namespace of frontmatter.symbolNamespaces) {
    if (!symbolNamespaces.has(namespace)) {
      errors.push({ location, message: `Unknown symbol namespace: ${namespace}` });
    }
  }

  if (document.locale === "zh-CN") {
    if (frontmatter.translationOf) {
      errors.push({
        location,
        message: "The canonical zh-CN document must not declare translationOf",
      });
    }
    if (frontmatter.translationEditorialStatus) {
      errors.push({
        location,
        message: "The canonical zh-CN document must not declare translationEditorialStatus",
      });
    }
  } else {
    if (!frontmatter.translationOf) {
      errors.push({ location, message: "Translated documents must declare translationOf" });
    } else if (
      frontmatter.translationOf !== frontmatter.conceptId &&
      !baseConceptIds.has(frontmatter.translationOf)
    ) {
      errors.push({
        location,
        message: `translationOf does not identify a canonical concept: ${frontmatter.translationOf}`,
      });
    }
    if (!baseConceptIds.has(frontmatter.conceptId)) {
      errors.push({
        location,
        message: `No canonical zh-CN document exists for concept ${frontmatter.conceptId}`,
      });
    }
    if (!frontmatter.translationEditorialStatus) {
      errors.push({
        location,
        message: "Translated documents must declare translationEditorialStatus",
      });
    }
    if (
      frontmatter.translationEditorialStatus === "reviewed" &&
      frontmatter.editorialStatus !== "reviewed" &&
      frontmatter.editorialStatus !== "verified"
    ) {
      errors.push({
        location,
        message: "translationEditorialStatus reviewed requires reviewed content",
      });
    }
    if (
      frontmatter.translationEditorialStatus === "verified" &&
      frontmatter.editorialStatus !== "verified"
    ) {
      errors.push({
        location,
        message: "translationEditorialStatus verified requires verified content",
      });
    }
  }
}

function validateConcept(
  concept: ConceptEntity,
  conceptIds: ReadonlySet<string>,
  pathIds: ReadonlySet<string>,
  documentsById: ReadonlyMap<string, LoadedContentDocument>,
  documentsByConcept: ReadonlyMap<string, readonly LoadedContentDocument[]>,
  authoredAnchorsByContentId: ReadonlyMap<string, ReadonlySet<string>>,
  requiredConceptIds: ReadonlySet<string>,
  errors: ValidationError[],
): void {
  const location = `concept:${concept.id}`;
  if (concept.maturity !== "checked") {
    errors.push({ location, message: `Public concept must be checked; found ${concept.maturity}` });
  }
  if (concept.documents.length === 0) {
    errors.push({
      location,
      message: "Public concept must reference an authored textbook document",
    });
  }
  const domain = domainRegistry.get(concept.domain);
  const subject = subjectRegistry.get(concept.subject);
  if (concept.schemaVersion !== 2) {
    errors.push({
      location,
      message: `Unsupported concept schemaVersion: ${concept.schemaVersion}`,
    });
  }
  const chapter = curriculumRepository.getChapter(concept.canonicalLocation.chapterId);
  if (!chapter) {
    errors.push({
      location,
      message: `Unknown canonical curriculum chapter: ${concept.canonicalLocation.chapterId}`,
    });
  } else {
    const authoredAnchors = chapter.contentId
      ? authoredAnchorsByContentId.get(chapter.contentId)
      : undefined;
    const targetError = validateCanonicalAnchorTarget({
      conceptId: concept.id,
      chapterId: chapter.id,
      chapterConceptIds: chapter.conceptIds,
      ...(concept.canonicalLocation.anchorId
        ? { anchorId: concept.canonicalLocation.anchorId }
        : {}),
      ...(chapter.contentId ? { chapterContentId: chapter.contentId } : {}),
      ...(authoredAnchors ? { authoredAnchors } : {}),
    });
    if (targetError) errors.push({ location, message: targetError.message });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(concept.id)) {
    errors.push({ location, message: "Concept ID must use kebab-case" });
  }
  if (!concept.title["zh-CN"].trim()) {
    errors.push({ location, message: "Chinese title must not be empty" });
  }
  if (concept.summary["zh-CN"].trim().length < 20) {
    errors.push({ location, message: "Chinese summary must contain at least 20 characters" });
  }
  if (concept.maturity === "planned" && concept.outline.length !== 0) {
    errors.push({ location, message: "Planned concepts must not carry a synthetic outline" });
  }
  if (concept.maturity === "outline" && concept.outline.length === 0) {
    errors.push({ location, message: "Outline maturity requires a topic-specific outline" });
  }
  concept.outline.forEach((section, index) => {
    if (!section["zh-CN"].trim()) {
      errors.push({ location, message: `outline.${index} must not be empty` });
    }
  });
  for (const duplicate of duplicates(concept.outline.map((section) => section["zh-CN"].trim()))) {
    errors.push({ location, message: `Duplicate outline section: ${duplicate}` });
  }
  for (const duplicate of duplicates(
    concept.aliases.map((alias) => alias["zh-CN"].trim().toLocaleLowerCase("zh-CN")),
  )) {
    errors.push({ location, message: `Duplicate alias: ${duplicate}` });
  }
  if (!domain) errors.push({ location, message: `Unknown domain: ${concept.domain}` });
  if (!subject) {
    errors.push({ location, message: `Unknown subject: ${concept.subject}` });
  } else if (subject.domainId !== concept.domain) {
    errors.push({
      location,
      message: `Subject ${concept.subject} belongs to ${subject.domainId}, not ${concept.domain}`,
    });
  }
  if (!concept.domains.includes(concept.domain) || !concept.subjects.includes(concept.subject)) {
    errors.push({
      location,
      message: "Compatibility domain/subject lists must contain the primary domain and subject",
    });
  }
  if (!Number.isInteger(concept.difficulty) || concept.difficulty < 1 || concept.difficulty > 5) {
    errors.push({ location, message: "difficulty must be an integer from 1 to 5" });
  }
  if (!Number.isInteger(concept.estimatedMinutes) || concept.estimatedMinutes <= 0) {
    errors.push({ location, message: "estimatedMinutes must be a positive integer" });
  }
  if (!pathIds.has(concept.recommendedPath)) {
    errors.push({ location, message: `Unknown recommendedPath: ${concept.recommendedPath}` });
  }

  for (const duplicate of duplicates(concept.prerequisites)) {
    errors.push({ location, message: `Duplicate prerequisite: ${duplicate}` });
  }
  for (const prerequisite of concept.prerequisites) {
    if (!conceptIds.has(prerequisite)) {
      errors.push({ location, message: `Unknown prerequisite: ${prerequisite}` });
    } else if (prerequisite === concept.id) {
      errors.push({ location, message: "A concept cannot require itself" });
    }
  }
  for (const duplicate of duplicates(concept.followUps)) {
    errors.push({ location, message: `Duplicate follow-up: ${duplicate}` });
  }
  for (const followUp of concept.followUps) {
    if (!conceptIds.has(followUp)) {
      errors.push({ location, message: `Unknown follow-up: ${followUp}` });
    }
  }

  const relationKeys = concept.relations.map(
    (relation) => `${relation.from}\0${relation.to}\0${relation.type}`,
  );
  for (const duplicate of duplicates(relationKeys)) {
    errors.push({ location, message: `Duplicate relation: ${duplicate.replaceAll("\0", " -> ")}` });
  }
  for (const relation of concept.relations) {
    if (!conceptIds.has(relation.from)) {
      errors.push({ location, message: `Unknown relation source: ${relation.from}` });
    }
    if (!conceptIds.has(relation.to)) {
      errors.push({ location, message: `Unknown relation target: ${relation.to}` });
    }
  }

  const documentReferences = new Set<string>();
  const referencedDocuments: LoadedContentDocument[] = [];
  for (const reference of concept.documents) {
    documentReferences.add(reference.documentId);
    const document = documentsById.get(reference.documentId);
    if (!document) {
      errors.push({ location, message: `Unknown document reference: ${reference.documentId}` });
      continue;
    }
    referencedDocuments.push(document);
    const curriculumChapter = curriculumRepository.getChapterForContent(document.frontmatter.id);
    if (
      document.frontmatter.conceptId !== concept.id &&
      !curriculumChapter?.conceptIds.includes(concept.id)
    ) {
      errors.push({
        location,
        message: `Document ${reference.documentId} does not contain concept ${concept.id}`,
      });
    }
    if (document.locale !== reference.locale) {
      errors.push({
        location,
        message: `Document ${reference.documentId} locale is ${document.locale}, not ${reference.locale}`,
      });
    }
  }
  const actualDocuments = documentsByConcept.get(concept.id) ?? [];
  for (const document of actualDocuments) {
    if (!documentReferences.has(document.documentId)) {
      errors.push({ location, message: `Missing catalog mapping for ${document.documentId}` });
    }
  }
  const expectedMaturity = deriveConceptMaturity(
    referencedDocuments.map((document) => document.frontmatter.editorialStatus),
    requiredConceptIds.has(concept.id) && referencedDocuments.length === 0,
  );
  if (concept.maturity !== expectedMaturity) {
    errors.push({
      location,
      message: `Derived maturity is ${expectedMaturity}, catalog declares ${concept.maturity}`,
    });
  }
  const expectedArticleStatus =
    concept.maturity === "reviewed" || concept.maturity === "verified"
      ? "reviewed"
      : concept.maturity === "checked"
        ? "checked"
        : concept.maturity === "draft"
          ? "draft"
          : "planned";
  if (concept.articleStatus !== expectedArticleStatus) {
    errors.push({
      location,
      message: `Legacy articleStatus must project maturity as ${expectedArticleStatus}`,
    });
  }
  const expectedReadiness =
    concept.maturity === "reviewed" || concept.maturity === "verified"
      ? "reviewed"
      : concept.maturity === "checked"
        ? "checked"
        : concept.maturity === "draft"
          ? "draft-available"
          : concept.maturity === "outline"
            ? "outlined"
            : "cataloged";
  if (concept.readiness !== expectedReadiness) {
    errors.push({
      location,
      message: `Legacy readiness must project maturity as ${expectedReadiness}`,
    });
  }

  if (requiredConceptIds.has(concept.id) && concept.maturity === "outline") {
    if (concept.outline.length < 6) {
      errors.push({
        location,
        message: "Outlined concepts need at least six topic-specific sections",
      });
    }
    concept.outline.forEach((section, index) => {
      if (section["zh-CN"].trim().length < 10) {
        errors.push({
          location,
          message: `outline.${index} must state a concrete section or question (at least 10 characters)`,
        });
      }
    });
    if (concept.readiness !== "outlined") {
      errors.push({ location, message: "Outlined concepts must preserve outlined readiness" });
    }
    if (concept.prerequisites.length === 0) {
      errors.push({ location, message: "Outlined concepts need an explicit prerequisite edge" });
    }
  }
}

function validateLearningPath(
  path: LearningPath,
  pathIds: ReadonlySet<string>,
  errors: ValidationError[],
): void {
  const location = `learning-path:${path.id}`;
  if (path.schemaVersion !== 4) {
    errors.push({ location, message: `Unsupported path schemaVersion: ${path.schemaVersion}` });
  }
  if (!path.title["zh-CN"].trim() || !path.summary["zh-CN"].trim()) {
    errors.push({ location, message: "Chinese title and summary must not be empty" });
  }
  if (!path.audience["zh-CN"].trim()) {
    errors.push({ location, message: "audience must not be empty" });
  }
  if (!Number.isFinite(path.estimatedHours) || path.estimatedHours <= 0) {
    errors.push({ location, message: "estimatedHours must be positive" });
  }
  if (path.stageGoals.length === 0 || path.stageGoals.some((goal) => !goal["zh-CN"].trim())) {
    errors.push({ location, message: "stageGoals must contain non-empty goals" });
  }
  if (path.chapterIds.length === 0) {
    errors.push({ location, message: "Learning route must contain canonical chapters" });
  }
  if (!path.routeKind || !path.sections || path.sections.length === 0) {
    errors.push({ location, message: "LearningPathV4 requires routeKind and non-empty sections" });
  } else {
    const sectionChapterIds = path.sections.flatMap((section) => section.chapterIds);
    if (sectionChapterIds.join("\0") !== path.chapterIds.join("\0")) {
      errors.push({
        location,
        message: "Section chapters must cover the route exactly once in canonical order",
      });
    }
    for (const section of path.sections) {
      if (!section.title["zh-CN"].trim() || !section.goal["zh-CN"].trim()) {
        errors.push({ location, message: `Section ${section.id} needs a title and goal` });
      }
      if (section.chapterIds.length === 0) {
        errors.push({ location, message: `Section ${section.id} must contain chapters` });
      }
    }
  }
  for (const duplicate of duplicates(path.chapterIds)) {
    errors.push({ location, message: `Duplicate route chapter: ${duplicate}` });
  }
  for (const duplicate of duplicates(path.prerequisiteChapterIds)) {
    errors.push({ location, message: `Duplicate prerequisite chapter: ${duplicate}` });
  }
  path.prerequisiteChapterIds.forEach((chapterId) => {
    if (!curriculumRepository.getChapter(chapterId)) {
      errors.push({ location, message: `Unknown prerequisite Chapter ID: ${chapterId}` });
    }
    if (path.chapterIds.includes(chapterId)) {
      errors.push({
        location,
        message: `Prerequisite also appears in the route: ${chapterId}`,
      });
    }
  });
  path.chapterIds.forEach((chapterId) => {
    if (!curriculumRepository.getChapter(chapterId)) {
      errors.push({ location, message: `Unknown canonical Chapter ID: ${chapterId}` });
    }
  });
  const availableChapterIds = new Set(path.prerequisiteChapterIds);
  path.chapterIds.forEach((chapterId) => {
    const chapter = curriculumRepository.getChapter(chapterId);
    chapter?.prerequisiteChapterIds.forEach((prerequisiteId) => {
      if (!availableChapterIds.has(prerequisiteId)) {
        errors.push({
          location,
          message: `${chapterId} requires ${prerequisiteId}, which is neither earlier in the route nor declared at the route boundary`,
        });
      }
    });
    availableChapterIds.add(chapterId);
  });

  for (const duplicate of duplicates(path.checkpoints.map((checkpoint) => checkpoint.id))) {
    errors.push({ location, message: `Duplicate checkpoint ID: ${duplicate}` });
  }
  path.checkpoints.forEach((checkpoint) => {
    if (!path.chapterIds.includes(checkpoint.afterChapterId)) {
      errors.push({
        location,
        message: `Checkpoint ${checkpoint.id} follows a chapter outside the route: ${checkpoint.afterChapterId}`,
      });
    }
    if (!checkpoint.prompt["zh-CN"].trim()) {
      errors.push({ location, message: `Checkpoint ${checkpoint.id} prompt must not be empty` });
    }
  });
  for (const duplicate of duplicates(path.exercises.map((exercise) => exercise.id))) {
    errors.push({ location, message: `Duplicate exercise ID: ${duplicate}` });
  }
  path.exercises.forEach((exercise) => {
    const exerciseLocation = `${location}:exercise:${exercise.id}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exercise.id)) {
      errors.push({
        location: exerciseLocation,
        message: "Exercise ID must be a stable lowercase kebab-case identifier",
      });
    }
    if (!hasLocalizedText(exercise.title) || exercise.chapterIds.length === 0) {
      errors.push({
        location: exerciseLocation,
        message: "Exercise needs a localized title and at least one canonical chapter",
      });
    }
    if (
      !Number.isInteger(exercise.difficulty) ||
      exercise.difficulty < 1 ||
      exercise.difficulty > 5
    ) {
      errors.push({
        location: exerciseLocation,
        message: "Exercise difficulty must be an integer from 1 to 5",
      });
    }
    const requiredExerciseText = [
      ["prompt", exercise.prompt, 35],
      ["hint", exercise.hint, 15],
      ["workedSolution", exercise.workedSolution, 30],
      ["verification", exercise.verification, 20],
    ] as const;
    requiredExerciseText.forEach(([field, value, minimumLength]) => {
      if (!hasLocalizedText(value) || value["zh-CN"].trim().length <= minimumLength) {
        errors.push({
          location: exerciseLocation,
          message: `${field} must be localized and contain more than ${minimumLength} Chinese characters`,
        });
      }
    });
    for (const duplicate of duplicates(exercise.chapterIds)) {
      errors.push({
        location: exerciseLocation,
        message: `Duplicate exercise chapter: ${duplicate}`,
      });
    }
    exercise.chapterIds.forEach((chapterId) => {
      if (!path.chapterIds.includes(chapterId)) {
        errors.push({
          location: exerciseLocation,
          message: `Exercise ${exercise.id} uses a chapter outside the route: ${chapterId}`,
        });
      }
    });
  });
  if (path.nextPath && !pathIds.has(path.nextPath)) {
    errors.push({ location, message: `Unknown nextPath: ${path.nextPath}` });
  }
}

function collectNextPathCycles(paths: readonly LearningPath[]): readonly string[][] {
  const byId = new Map(paths.map((path) => [path.id, path] as const));
  const cycles: string[][] = [];
  for (const path of paths) {
    const visited = new Map<string, number>();
    const chain: string[] = [];
    let current: LearningPath | undefined = path;
    while (current) {
      const seenAt = visited.get(current.id);
      if (seenAt !== undefined) {
        cycles.push([...chain.slice(seenAt), current.id]);
        break;
      }
      visited.set(current.id, chain.length);
      chain.push(current.id);
      current = current.nextPath ? byId.get(current.nextPath) : undefined;
    }
  }
  const unique = new Map(cycles.map((cycle) => [cycle.join(" -> "), cycle] as const));
  return [...unique.values()];
}

async function main(): Promise<void> {
  const loaded = await loadContentDocuments();
  const errors: ValidationError[] = loaded.diagnostics.map((diagnostic) => ({
    location: diagnostic.file,
    message: diagnostic.message,
  }));
  if (loaded.documents.length === 0) {
    errors.push({ location: "content", message: "No localized MDX documents were found" });
  }

  for (const duplicate of duplicates(loaded.documents.map((document) => document.documentId))) {
    errors.push({ location: duplicate, message: "Duplicate document ID" });
  }
  for (const duplicate of duplicates(
    loaded.documents.map((document) => `${document.locale}/${document.frontmatter.conceptId}`),
  )) {
    errors.push({
      location: duplicate,
      message: "A locale may only provide one primary document per concept",
    });
  }
  for (const duplicate of duplicates(loaded.documents.map((document) => document.url))) {
    errors.push({ location: duplicate, message: "Duplicate content URL" });
  }

  const conceptIds = new Set(conceptCatalog.map((concept) => concept.id));
  const conceptById = new Map(conceptCatalog.map((concept) => [concept.id, concept] as const));
  const pathIds = new Set(learningPaths.map((path) => path.id));
  const legacyPathIds = new Set(legacyLearningPathsV2.map((path) => path.id));
  const pathAliasIds = new Set(learningPathAliases.map((alias) => alias.id));
  const validPathRouteIds = new Set([...pathIds, ...pathAliasIds]);
  const requiredConceptIds = new Set<string>(requiredRoundTwoConceptIds);
  const documentsById = new Map(
    loaded.documents.map((document) => [document.documentId, document] as const),
  );
  const mutableDocumentsByConcept = new Map<string, LoadedContentDocument[]>();
  for (const document of loaded.documents) {
    const current = mutableDocumentsByConcept.get(document.frontmatter.conceptId) ?? [];
    current.push(document);
    mutableDocumentsByConcept.set(document.frontmatter.conceptId, current);
  }
  const documentsByConcept: ReadonlyMap<string, readonly LoadedContentDocument[]> =
    mutableDocumentsByConcept;
  const authoredAnchorsByContentId = new Map(
    loaded.documents.map((document) => [
      document.frontmatter.id,
      collectAuthoredAnchors(document.body, document.documentId).anchors,
    ]),
  );
  const baseConceptIds = new Set(
    loaded.documents
      .filter((document) => document.locale === "zh-CN")
      .map((document) => document.frontmatter.conceptId),
  );
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const visualizationIds = new Set(visualizationManifest.map((visualization) => visualization.id));
  const symbolNamespaces = new Set(
    domainRegistry.list().flatMap((domain) => domain.symbolNamespaces ?? []),
  );

  for (const duplicate of duplicates(resources.map((resource) => resource.id))) {
    errors.push({ location: `resource:${duplicate}`, message: "Duplicate resource ID" });
  }
  for (const duplicate of duplicates(visualizationManifest.map((entry) => entry.id))) {
    errors.push({ location: `visualization:${duplicate}`, message: "Duplicate visualization ID" });
  }
  for (const duplicate of duplicates(symbols.map((symbol) => symbol.id))) {
    errors.push({ location: `symbol:${duplicate}`, message: "Duplicate symbol ID" });
  }
  for (const duplicate of duplicates(equations.map((equation) => equation.id))) {
    errors.push({ location: `equation:${duplicate}`, message: "Duplicate equation ID" });
  }
  for (const duplicate of duplicates(learningPaths.map((path) => path.id))) {
    errors.push({ location: `learning-path:${duplicate}`, message: "Duplicate learning path ID" });
  }
  for (const duplicate of duplicates(legacyLearningPathsV2.map((path) => path.id))) {
    errors.push({
      location: `legacy-learning-path:${duplicate}`,
      message: "Duplicate legacy path ID",
    });
  }
  for (const duplicate of duplicates(learningPathAliases.map((alias) => alias.id))) {
    errors.push({
      location: `learning-path-alias:${duplicate}`,
      message: "Duplicate path alias ID",
    });
  }
  for (const duplicate of duplicates(
    learningPaths.flatMap((path) => path.exercises.map((exercise) => exercise.id)),
  )) {
    errors.push({
      location: `learning-path-exercise:${duplicate}`,
      message: "Duplicate learning path exercise ID",
    });
  }
  for (const duplicate of duplicates(conceptCatalog.map((concept) => concept.id))) {
    errors.push({ location: `concept:${duplicate}`, message: "Duplicate concept ID" });
  }
  for (const duplicate of duplicates(
    conceptCatalog.map((concept) => concept.title["zh-CN"].trim()),
  )) {
    errors.push({ location: "concept-catalog", message: `Duplicate Chinese title: ${duplicate}` });
  }
  for (const duplicate of duplicates(
    conceptCatalog.map((concept) => concept.summary["zh-CN"].trim()),
  )) {
    errors.push({
      location: "concept-catalog",
      message: `Duplicate Chinese summary: ${duplicate}`,
    });
  }
  if (conceptCatalog.length < 120) {
    errors.push({
      location: "concept-catalog",
      message: `At least 120 concepts are required; found ${conceptCatalog.length}`,
    });
  }
  const maturityCounts: Record<EditorialStatus, number> = {
    planned: 0,
    outline: 0,
    draft: 0,
    checked: 0,
    reviewed: 0,
    verified: 0,
  };
  conceptCatalog.forEach((concept) => {
    maturityCounts[concept.maturity] += 1;
  });
  for (const requiredId of requiredRoundTwoConceptIds) {
    if (!conceptIds.has(requiredId)) {
      errors.push({
        location: "concept-catalog",
        message: `Missing required concept: ${requiredId}`,
      });
    }
  }
  const expectedPublicPathCount =
    requiredTopicalLearningPathIds.length + requiredSeriesLearningPathIds.length;
  if (learningPaths.length !== expectedPublicPathCount) {
    errors.push({
      location: "learning-paths",
      message: `Expected ${expectedPublicPathCount} public routes; found ${learningPaths.length}`,
    });
  }
  for (const requiredId of requiredTopicalLearningPathIds) {
    if (!pathIds.has(requiredId)) {
      errors.push({ location: "learning-paths", message: `Missing topical route: ${requiredId}` });
    }
  }
  for (const requiredId of requiredSeriesLearningPathIds) {
    if (!pathIds.has(requiredId)) {
      errors.push({ location: "learning-paths", message: `Missing series route: ${requiredId}` });
    }
  }
  const seriesChapterIds = learningPaths
    .filter((path) => path.routeKind === "series")
    .flatMap((path) => path.chapterIds);
  const expectedCurriculumChapterIds = curriculumRepository
    .listChapters()
    .map((chapter) => chapter.id)
    .sort();
  if (
    [...new Set(seriesChapterIds)].sort().join("\0") !== expectedCurriculumChapterIds.join("\0") ||
    seriesChapterIds.length !== expectedCurriculumChapterIds.length
  ) {
    errors.push({
      location: "learning-paths",
      message: "Series routes must cover every curriculum chapter exactly once",
    });
  }
  if (legacyLearningPathsV2.length !== requiredRoundTwoLearningPathIds.length) {
    errors.push({
      location: "legacy-learning-paths",
      message: `Expected ${requiredRoundTwoLearningPathIds.length} legacy v2 paths; found ${legacyLearningPathsV2.length}`,
    });
  }
  for (const requiredId of requiredRoundTwoLearningPathIds) {
    if (!legacyPathIds.has(requiredId)) {
      errors.push({
        location: "legacy-learning-paths",
        message: `Missing preserved v2 path: ${requiredId}`,
      });
    }
  }
  const expectedAliasIds: string[] = requiredRoundTwoLearningPathIds.filter(
    (id) => !pathIds.has(id),
  );
  if (learningPathAliases.length !== expectedAliasIds.length) {
    errors.push({
      location: "learning-path-aliases",
      message: `Expected ${expectedAliasIds.length} foundation aliases; found ${learningPathAliases.length}`,
    });
  }
  for (const aliasId of expectedAliasIds) {
    if (!pathAliasIds.has(aliasId)) {
      errors.push({
        location: "learning-path-aliases",
        message: `Missing preserved route alias: ${aliasId}`,
      });
    }
  }
  for (const alias of learningPathAliases) {
    if (alias.schemaVersion !== 1) {
      errors.push({
        location: `learning-path-alias:${alias.id}`,
        message: `Unsupported alias schemaVersion: ${alias.schemaVersion}`,
      });
    }
    if (!expectedAliasIds.includes(alias.id)) {
      errors.push({
        location: `learning-path-alias:${alias.id}`,
        message: "Only displaced foundation-course IDs may be Book aliases",
      });
    }
    if (pathIds.has(alias.id)) {
      errors.push({
        location: `learning-path-alias:${alias.id}`,
        message: "Alias collides with an active topical route",
      });
    }
    if (!legacyPathIds.has(alias.id)) {
      errors.push({
        location: `learning-path-alias:${alias.id}`,
        message: "Alias has no preserved v2 source record",
      });
    }
    if (!curriculumRepository.getBook(alias.targetBookId)) {
      errors.push({
        location: `learning-path-alias:${alias.id}`,
        message: `Unknown target Book ID: ${alias.targetBookId}`,
      });
    }
  }

  for (const document of loaded.documents) {
    validateDocument(
      document,
      conceptIds,
      resourceIds,
      visualizationIds,
      symbolNamespaces,
      baseConceptIds,
      errors,
    );
  }

  for (const concept of conceptCatalog) {
    validateConcept(
      concept,
      conceptIds,
      validPathRouteIds,
      documentsById,
      documentsByConcept,
      authoredAnchorsByContentId,
      requiredConceptIds,
      errors,
    );
  }

  for (const document of loaded.documents) {
    if (!conceptIds.has(document.frontmatter.conceptId)) {
      errors.push({
        location: document.relativePath,
        message: `Document maps to unknown catalog concept: ${document.frontmatter.conceptId}`,
      });
    }
  }

  for (const cycle of collectPrerequisiteCycles(conceptCatalog)) {
    errors.push({ location: "prerequisites", message: `Cycle detected: ${cycle.join(" -> ")}` });
  }

  for (const concept of conceptCatalog) {
    for (const prerequisite of concept.prerequisites) {
      const source = conceptById.get(prerequisite);
      if (source && !source.followUps.includes(concept.id)) {
        errors.push({
          location: `concept:${concept.id}`,
          message: `Prerequisite ${prerequisite} does not list ${concept.id} as a follow-up`,
        });
      }
    }
    for (const followUp of concept.followUps) {
      const target = conceptById.get(followUp);
      if (target && !target.prerequisites.includes(concept.id)) {
        errors.push({
          location: `concept:${concept.id}`,
          message: `Follow-up ${followUp} does not list ${concept.id} as a prerequisite`,
        });
      }
    }
  }

  for (const resource of resources) {
    const fieldPresence = {
      authors: Boolean(resource.authors && resource.authors.length > 0),
      year: resource.year !== undefined,
      publication: Boolean(resource.publisher || resource.venue),
    } as const;
    for (const [field, isPresent] of Object.entries(fieldPresence) as readonly [
      keyof typeof fieldPresence,
      boolean,
    ][]) {
      const status = resource.metadataFields[field];
      if (isPresent && status !== "complete") {
        errors.push({
          location: `resource:${resource.id}`,
          message: `${field} is present but metadataFields.${field} is ${status}`,
        });
      }
      if (!isPresent && status === "complete") {
        errors.push({
          location: `resource:${resource.id}`,
          message: `${field} is missing but metadataFields.${field} is complete`,
        });
      }
    }
    const fieldStatuses = Object.values(resource.metadataFields);
    const expectedAggregate = fieldStatuses.includes("unavailable")
      ? "unavailable"
      : fieldStatuses.includes("not-applicable")
        ? "not-applicable"
        : "complete";
    if (resource.metadataStatus !== expectedAggregate) {
      errors.push({
        location: `resource:${resource.id}`,
        message: `metadataStatus must aggregate field states as ${expectedAggregate}, received ${resource.metadataStatus}`,
      });
    }
    if (expectedAggregate !== "complete" && !resource.metadataNote?.["zh-CN"].trim()) {
      errors.push({
        location: `resource:${resource.id}`,
        message: `${expectedAggregate} metadata requires a Chinese explanation`,
      });
    }
    if (
      resource.verifiedAt &&
      (!isValidCalendarDate(resource.verifiedAt) || resource.verifiedAt > todayUtc())
    ) {
      errors.push({
        location: `resource:${resource.id}`,
        message: `Invalid verifiedAt date: ${resource.verifiedAt}`,
      });
    }
    for (const topic of resource.topics) {
      if (!conceptIds.has(topic))
        errors.push({ location: `resource:${resource.id}`, message: `Unknown topic: ${topic}` });
    }
    for (const prerequisite of resource.prerequisites ?? []) {
      if (!conceptIds.has(prerequisite)) {
        errors.push({
          location: `resource:${resource.id}`,
          message: `Unknown prerequisite: ${prerequisite}`,
        });
      }
    }
  }

  const symbolIds = new Set(symbols.map((symbol) => symbol.id));
  const unitIds = new Set(units.map((unit) => unit.id));
  const authoredChapters = curriculumRepository
    .listChapters()
    .filter((chapter) => chapter.contentId);
  if (chapterMathCoverage.length !== authoredChapters.length) {
    errors.push({
      location: "math-index",
      message: `Expected chapter math coverage for ${authoredChapters.length} chapters; found ${chapterMathCoverage.length}`,
    });
  }
  const equationIds = new Set(equations.map((equation) => equation.id));
  for (const coverage of chapterMathCoverage) {
    if (coverage.status === "indexed") {
      if (coverage.equationIds.length < 1 || coverage.equationIds.length > 3) {
        errors.push({
          location: `math-index:${coverage.chapterId}`,
          message: "Indexed chapters require one to three canonical equations",
        });
      }
    } else if (!coverage.reason?.trim()) {
      errors.push({
        location: `math-index:${coverage.chapterId}`,
        message: "Not-applicable chapters require an explicit reason",
      });
    }
    for (const equationId of coverage.equationIds) {
      if (!equationIds.has(equationId)) {
        errors.push({
          location: `math-index:${coverage.chapterId}`,
          message: `Unknown equation record: ${equationId}`,
        });
      }
    }
  }
  const expectedCommandSymbols: Readonly<Record<string, string>> = {
    "unit-direction-u": "\\mathbf{u}",
    "vector-y": "\\mathbf{y}",
    "eigenvalue-lambda": "\\lambda",
    "eigenvector-v": "\\mathbf{v}",
    "model-parameters-theta": "\\boldsymbol{\\theta}",
    "learning-rate-eta": "\\eta",
  };
  for (const symbol of symbols) {
    const location = `symbol:${symbol.id}`;
    for (const conflictId of symbol.conflictsWith) {
      if (conflictId === symbol.id) {
        errors.push({ location, message: "Symbol conflicts with itself" });
      } else if (!symbolIds.has(conflictId)) {
        errors.push({ location, message: `Unknown conflicting symbol: ${conflictId}` });
      }
    }
    if (symbol.schemaVersion !== 2) {
      errors.push({
        location,
        message: `Unsupported symbol schemaVersion: ${symbol.schemaVersion}`,
      });
    }
    if (
      !symbol.latex.trim() ||
      !symbol.plainText.trim() ||
      !hasLocalizedText(symbol.accessibleLabel)
    ) {
      errors.push({
        location,
        message: "latex, plainText, and localized accessibleLabel must be non-empty",
      });
    }
    if (
      hasDisallowedControlCharacter(symbol.latex) ||
      hasDisallowedControlCharacter(symbol.plainText) ||
      Object.values(symbol.accessibleLabel).some(
        (label) => label && hasDisallowedControlCharacter(label),
      )
    ) {
      errors.push({ location, message: "Math accessibility fields contain a control character" });
    }
    if (!symbolNamespaces.has(symbol.namespace)) {
      errors.push({
        location,
        message: `Unknown namespace: ${symbol.namespace}`,
      });
    }
    if (symbol.unit && !unitIds.has(symbol.unit)) {
      errors.push({ location, message: `Unknown unit: ${symbol.unit}` });
    }
    if (symbol.unitKind === "physical" && !symbol.unit) {
      errors.push({ location, message: "Physical symbols require an explicit unit" });
    }
    if (symbol.locations.length === 0) {
      errors.push({ location, message: "Every public symbol must have a textbook location" });
    }
    for (const source of symbol.locations) {
      const sourceDocument = documentsById.get(source.documentId);
      const sourceChapter = curriculumRepository.getChapter(source.chapterId);
      if (!sourceDocument || sourceChapter?.contentId !== sourceDocument.frontmatter.id) {
        errors.push({ location, message: `Invalid symbol source: ${source.documentId}` });
      }
      if (
        !authoredAnchorsByContentId.get(sourceDocument?.frontmatter.id ?? "")?.has(source.anchorId)
      ) {
        errors.push({ location, message: `Unknown symbol anchor: ${source.anchorId}` });
      }
    }
    const expectedLatex = expectedCommandSymbols[symbol.id];
    if (expectedLatex && symbol.latex !== expectedLatex) {
      errors.push({ location, message: `Malformed LaTeX: expected ${expectedLatex}` });
    }
  }
  for (const equation of equations) {
    const location = `equation:${equation.id}`;
    if (equation.schemaVersion !== 2) {
      errors.push({
        location,
        message: `Unsupported equation schemaVersion: ${equation.schemaVersion}`,
      });
    }
    if (
      !equation.latex.trim() ||
      !equation.plainText.trim() ||
      !hasLocalizedText(equation.accessibleLabel)
    ) {
      errors.push({
        location,
        message: "latex, plainText, and localized accessibleLabel must be non-empty",
      });
    }
    if (
      hasDisallowedControlCharacter(equation.latex) ||
      hasDisallowedControlCharacter(equation.plainText) ||
      Object.values(equation.accessibleLabel).some(
        (label) => label && hasDisallowedControlCharacter(label),
      )
    ) {
      errors.push({ location, message: "Math accessibility fields contain a control character" });
    }
    if (equation.assumptions.length === 0) {
      errors.push({ location, message: "Equation conditions must not be empty" });
    }
    if (!equation.source) {
      errors.push({
        location,
        message: "Every public equation must have an exact textbook source",
      });
    } else {
      const sourceDocument = documentsById.get(equation.source.documentId);
      const sourceChapter = curriculumRepository.getChapter(equation.source.chapterId);
      if (!sourceDocument || sourceChapter?.contentId !== sourceDocument.frontmatter.id) {
        errors.push({
          location,
          message: `Invalid equation source: ${equation.source.documentId}`,
        });
      } else {
        const componentPattern = new RegExp(
          `<Equation\\b[^>]*\\bid=["']${escapeRegExp(equation.id)}["'][^>]*/?>`,
          "u",
        );
        const usesRegisteredEquationComponent =
          equation.source.anchorId === `equation-${equation.id}` &&
          componentPattern.test(sourceDocument.body);
        if (!usesRegisteredEquationComponent) {
          const matchingFragments = extractMathFragments(sourceDocument.body).filter(
            (fragment) =>
              fragment.closed &&
              normalizedLatex(fragment.latex) === normalizedLatex(equation.latex),
          );
          if (matchingFragments.length === 0) {
            errors.push({ location, message: "Equation LaTeX does not match its source document" });
          } else if (
            !matchingFragments.some(
              (fragment) =>
                resolveMathFragmentAnchor(sourceDocument.body, fragment.offset) ===
                equation.source?.anchorId,
            )
          ) {
            errors.push({
              location,
              message: `Equation LaTeX exists but not at source anchor ${equation.source.anchorId}`,
            });
          }
        }
        if (
          !authoredAnchorsByContentId
            .get(sourceDocument.frontmatter.id)
            ?.has(equation.source.anchorId)
        ) {
          errors.push({
            location,
            message: `Unknown equation anchor: ${equation.source.anchorId}`,
          });
        }
      }
    }
    if (equation.derivations.length === 0 || equation.applications.length === 0) {
      errors.push({
        location,
        message: "Equation derivation and application metadata are required",
      });
    }
    if (equation.limitingCases.length === 0) {
      errors.push({ location, message: "Equation limiting-case metadata is required" });
    }
    if (!domainRegistry.has(equation.domain)) {
      errors.push({
        location,
        message: `Unknown domain: ${equation.domain}`,
      });
    }
    equation.subjects.forEach((subject) => {
      const definition = subjectRegistry.get(subject);
      if (!definition) {
        errors.push({
          location,
          message: `Unknown subject: ${subject}`,
        });
      } else if (definition.domainId !== equation.domain) {
        errors.push({
          location,
          message: `Subject ${subject} belongs to ${definition.domainId}, not ${equation.domain}`,
        });
      }
    });
    equation.relatedTopics.forEach((topic) => {
      if (!conceptIds.has(topic)) errors.push({ location, message: `Unknown topic: ${topic}` });
    });
    equation.variables.forEach((variable) => {
      if (!symbolIds.has(variable.symbolId)) {
        errors.push({
          location,
          message: `Unknown symbol: ${variable.symbolId}`,
        });
      }
      if (variable.unit && !unitIds.has(variable.unit)) {
        errors.push({
          location,
          message: `Unknown unit: ${variable.unit}`,
        });
      }
    });
  }
  for (const path of learningPaths) validateLearningPath(path, pathIds, errors);
  for (const cycle of collectNextPathCycles(learningPaths)) {
    errors.push({ location: "learning-paths", message: `nextPath cycle: ${cycle.join(" -> ")}` });
  }

  errors.sort((left, right) =>
    `${left.location}\0${left.message}`.localeCompare(`${right.location}\0${right.message}`, "en"),
  );
  if (errors.length > 0) {
    errors.forEach((error) => console.error(`ERROR ${error.location}: ${error.message}`));
    throw new Error(`Content validation failed with ${errors.length} error(s)`);
  }
  console.log(
    `Content validation passed: ${loaded.documents.length} document(s), ${conceptCatalog.length} concept(s) (${editorialStatusValues.map((status) => `${maturityCounts[status]} ${status}`).join(", ")}), ${symbols.length} symbol(s), ${equations.length} equation(s), ${learningPaths.length} learning path(s), ${resources.length} resource(s), ${visualizationManifest.length} visualization(s).`,
  );
}

main().catch((error: unknown) => {
  console.error(`validate-content: ${errorMessage(error)}`);
  process.exitCode = 1;
});
