import { siteConfig, type SupportedLocale } from "@one-forth/config";
import type { ContentDocument, CurriculumChapterContext } from "@one-forth/content";
import { localize } from "@one-forth/registry";
import { ArticleShell } from "@/components/article-shell";
import { mdxComponents } from "@/components/mdx-components";
import { mdxComponentRegistry } from "@/generated/mdx-registry";
import { extractTableOfContents } from "@/lib/content-utils";
import { resolveAuthorLabel, resolveConceptLabel, resolveContentKindLabel } from "@/lib/labels";
import { latestRevisionDate } from "@/lib/metadata";
import { serializeJsonLd } from "@/lib/serialize-json-ld";

interface AuthoredChapterBoundaryProps {
  readonly context: CurriculumChapterContext;
  readonly document: ContentDocument;
  readonly locale: SupportedLocale;
}

export function AuthoredChapterBoundary({
  context,
  document,
  locale,
}: AuthoredChapterBoundaryProps) {
  const MdxContent = mdxComponentRegistry[document.documentId];
  if (!MdxContent) {
    throw new Error(`Compiled MDX component is missing for ${document.documentId}`);
  }
  const tableOfContents = extractTableOfContents(document.body);
  const canonicalUrl = new URL(context.canonicalPath, `${siteConfig.url}/`).toString();
  const modifiedTime = latestRevisionDate(document.frontmatter.revisionHistory);
  const authorNames = [
    ...new Set(document.frontmatter.authors.map((author) => resolveAuthorLabel(author, locale))),
  ];
  const breadcrumbEntries = [
    { name: siteConfig.name, item: `${siteConfig.url}/${locale}` },
    { name: "教材", item: `${siteConfig.url}/${locale}/books` },
    {
      name: localize(context.series.title, locale),
      item: `${siteConfig.url}/${locale}/books/${context.series.slug}`,
    },
    {
      name: localize(context.book.title, locale),
      item: `${siteConfig.url}/${locale}/books/${context.series.slug}/${context.book.slug}`,
    },
    { name: document.frontmatter.title, item: canonicalUrl },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        headline: document.frontmatter.title,
        description: document.frontmatter.summary,
        ...(modifiedTime ? { dateModified: modifiedTime } : {}),
        inLanguage: locale,
        mainEntityOfPage: canonicalUrl,
        author: authorNames.map((name) => ({ "@type": "Organization", name })),
        publisher: { "@type": "Organization", name: siteConfig.organization.name },
        ...(document.frontmatter.review.humanReviewer
          ? {
              reviewedBy: {
                "@type": "Person",
                name: document.frontmatter.review.humanReviewer,
              },
            }
          : {}),
        isPartOf: {
          "@type": "Book",
          name: localize(context.book.title, locale),
          url: `${siteConfig.url}/${locale}/books/${context.series.slug}/${context.book.slug}`,
        },
      },
      {
        "@type": "LearningResource",
        "@id": `${canonicalUrl}#learning-resource`,
        name: document.frontmatter.title,
        description: document.frontmatter.summary,
        url: canonicalUrl,
        inLanguage: locale,
        learningResourceType: resolveContentKindLabel(document.frontmatter.kind, locale),
        timeRequired: `PT${document.frontmatter.estimatedMinutes}M`,
        about: context.chapter.conceptIds.map((conceptId) =>
          resolveConceptLabel(conceptId, locale),
        ),
        author: authorNames.map((name) => ({ "@type": "Organization", name })),
        position: context.chapterNumber,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumbs`,
        itemListElement: breadcrumbEntries.map((entry, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: entry.name,
          item: entry.item,
        })),
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ArticleShell document={document} tableOfContents={tableOfContents}>
        <MdxContent components={mdxComponents} />
      </ArticleShell>
    </>
  );
}
