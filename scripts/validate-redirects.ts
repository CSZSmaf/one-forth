import { siteConfig, normalizeCurriculumPath } from "../packages/config/src/index.ts";
import {
  learningPathAliases,
  learningPathById,
  isContentIndexable,
  publicCurriculumRepository,
  readerConceptById,
  readerContentRepository,
  readerCurriculumRedirects,
  readerCurriculumRepository,
} from "../packages/content/src/index.ts";
import sitemap from "../apps/web/app/sitemap.ts";
import { collectAuthoredAnchors, validateCanonicalAnchorTarget } from "./lib/anchor-validation.ts";
import { redirectArtifactsMatch } from "./redirects/artifacts.ts";

const errors: string[] = [];
const sourcePaths = new Set<string>();
const redirectBySource = new Map(
  readerCurriculumRedirects.map((redirect) => [redirect.sourcePath, redirect] as const),
);
const sitemapUrls = new Set((await sitemap()).map((entry) => entry.url));
const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
const documentById = new Map(
  documents.map((document) => [document.frontmatter.id, document] as const),
);
const authoredAnchorsByContentId = new Map(
  documents.map((document) => [
    document.frontmatter.id,
    collectAuthoredAnchors(document.body, document.documentId).anchors,
  ]),
);

function targetChapter(targetPath: string) {
  const target = new URL(targetPath, `${siteConfig.url}/`);
  const [locale, books, series, book, chapter, ...extra] = target.pathname
    .split("/")
    .filter(Boolean);
  if (locale !== "zh-CN" || books !== "books" || !series || !book || !chapter || extra.length > 0) {
    return null;
  }
  return readerCurriculumRepository.getChapterByRoute(series, book, chapter);
}

const learnCount = readerCurriculumRedirects.filter(
  (entry) => entry.kind === "legacy-learn",
).length;
const conceptCount = readerCurriculumRedirects.filter(
  (entry) => entry.kind === "legacy-concept",
).length;
const pathCount = readerCurriculumRedirects.filter((entry) => entry.kind === "legacy-path").length;
const expectedLearnCount = documents.length;
const expectedConceptCount = readerConceptById.size;
const expectedPathCount = learningPathAliases.filter((alias) =>
  readerCurriculumRepository.getBook(alias.targetBookId),
).length;
const bookCount = readerCurriculumRedirects.filter((entry) => entry.kind === "legacy-books").length;
if (bookCount !== 128) errors.push(`Expected 128 migrated book/path routes, received ${bookCount}`);
const expectedTotal = expectedLearnCount + expectedConceptCount + expectedPathCount + bookCount;
if (readerCurriculumRedirects.length !== expectedTotal) {
  errors.push(
    `expected ${expectedTotal} reader redirects, received ${readerCurriculumRedirects.length}`,
  );
}
if (learnCount !== expectedLearnCount) {
  errors.push(`expected ${expectedLearnCount} legacy learn redirects, received ${learnCount}`);
}
if (conceptCount !== expectedConceptCount) {
  errors.push(
    `expected ${expectedConceptCount} legacy concept redirects, received ${conceptCount}`,
  );
}
if (pathCount !== expectedPathCount) {
  errors.push(`expected ${expectedPathCount} legacy path redirects, received ${pathCount}`);
}

for (const redirect of readerCurriculumRedirects) {
  if (sourcePaths.has(redirect.sourcePath)) {
    errors.push(`${redirect.sourcePath}: duplicate redirect source`);
  }
  sourcePaths.add(redirect.sourcePath);
  if (!redirect.sourcePath.startsWith("/zh-CN/")) {
    errors.push(`${redirect.sourcePath}: source must be a localized site-relative path`);
  }
  if (redirect.kind === "legacy-books") {
    if (normalizeCurriculumPath(redirect.sourcePath) !== redirect.targetPath) {
      errors.push(`${redirect.sourcePath}: migration differs from the runtime path mapping`);
    }
    const segments = redirect.targetPath.split("/").filter(Boolean);
    const validTarget =
      redirect.targetPath === "/zh-CN/books" ||
      (segments[1] === "paths" && learningPathById.has(segments[2] ?? "")) ||
      (segments.length === 4 &&
        Boolean(readerCurriculumRepository.getBookByRoute(segments[2] ?? "", segments[3] ?? ""))) ||
      Boolean(targetChapter(redirect.targetPath));
    if (!validTarget) errors.push(`${redirect.sourcePath}: migrated target does not exist`);
    if (redirectBySource.has(redirect.targetPath))
      errors.push(`${redirect.sourcePath}: migrated target creates a chain`);
    continue;
  }
  if (!redirect.targetPath.startsWith("/zh-CN/books/")) {
    errors.push(`${redirect.sourcePath}: target is not a canonical books route`);
  }
  if (redirectBySource.has(new URL(redirect.targetPath, `${siteConfig.url}/`).pathname)) {
    errors.push(`${redirect.sourcePath}: redirect chain targets another legacy source`);
  }
  const targetUrl = new URL(redirect.targetPath, `${siteConfig.url}/`);
  const targetSegments = targetUrl.pathname.split("/").filter(Boolean);
  const targetBook =
    redirect.kind === "legacy-path"
      ? readerCurriculumRepository.getBookByRoute(targetSegments[2] ?? "", targetSegments[3] ?? "")
      : null;
  const chapter = redirect.kind === "legacy-path" ? null : targetChapter(redirect.targetPath);
  if (redirect.kind === "legacy-path" ? !targetBook : !chapter) {
    errors.push(
      `${redirect.sourcePath}: target ${redirect.kind === "legacy-path" ? "Book" : "Chapter"} does not exist (${redirect.targetPath})`,
    );
    continue;
  }
  const document = chapter?.contentId ? documentById.get(chapter.contentId) : undefined;
  const targetWithoutHash = new URL(redirect.targetPath, `${siteConfig.url}/`);
  targetWithoutHash.hash = "";
  const indexableTargetBook =
    redirect.kind === "legacy-path"
      ? publicCurriculumRepository.getBookByRoute(targetSegments[2] ?? "", targetSegments[3] ?? "")
      : null;
  const targetIsIndexable =
    redirect.kind === "legacy-path"
      ? Boolean(indexableTargetBook)
      : Boolean(document && isContentIndexable(document.frontmatter.publicationStatus));
  if (!targetIsIndexable && sitemapUrls.has(targetWithoutHash.toString())) {
    errors.push(`${redirect.sourcePath}: non-published target leaked into sitemap`);
  }
  if (redirect.kind === "legacy-concept" && chapter) {
    const conceptId = decodeURIComponent(redirect.sourcePath.split("/").at(-1) ?? "");
    const anchorId = decodeURIComponent(targetUrl.hash.slice(1));
    const authoredAnchors = chapter.contentId
      ? authoredAnchorsByContentId.get(chapter.contentId)
      : undefined;
    const anchorError = validateCanonicalAnchorTarget({
      conceptId,
      chapterId: chapter.id,
      chapterConceptIds: chapter.conceptIds,
      ...(anchorId ? { anchorId } : {}),
      ...(chapter.contentId ? { chapterContentId: chapter.contentId } : {}),
      ...(authoredAnchors ? { authoredAnchors } : {}),
    });
    if (anchorError) errors.push(`${redirect.sourcePath}: ${anchorError.message}`);
  }
}

for (const source of sourcePaths) {
  const visited = new Set<string>();
  let current: string | undefined = source;
  while (current && redirectBySource.has(current)) {
    if (visited.has(current)) {
      errors.push(`${source}: redirect loop detected at ${current}`);
      break;
    }
    visited.add(current);
    const nextTarget: string | undefined = redirectBySource.get(current)?.targetPath;
    current = nextTarget ? new URL(nextTarget, `${siteConfig.url}/`).pathname : undefined;
  }
  if (visited.size > 1) errors.push(`${source}: redirect chain has ${visited.size} hops`);
}

if (!(await redirectArtifactsMatch())) {
  errors.push("generated redirect artifacts are missing or stale; run pnpm generate:redirects");
}

if (errors.length > 0) {
  console.error(`Redirect validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(
    `Redirects valid: ${learnCount} legacy learn + ${conceptCount} legacy concept + ${pathCount} legacy path + ${bookCount} migrated book/path = ${readerCurriculumRedirects.length} reader-safe unique single-hop mappings.`,
  );
}
