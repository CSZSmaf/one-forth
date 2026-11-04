import { siteConfig } from "@one-forth/config";
import { isContentIndexable, type PublicationStatus } from "@one-forth/content";
import type { Metadata } from "next";

export const socialImagePath = "/og-one-forth-v3.png";

export function latestRevisionDate(
  revisions: readonly Readonly<{ date: string }>[],
): string | undefined {
  return revisions.reduce<string | undefined>(
    (latest, revision) => (!latest || revision.date > latest ? revision.date : latest),
    undefined,
  );
}

interface PageMetadataOptions {
  readonly title: string;
  readonly description: string;
  /** Absolute site-relative pathname. Query strings are intentionally excluded from canonicals. */
  readonly path: string;
  readonly robots?: Metadata["robots"];
  /** Applies the shared publication policy for an explicitly status-aware route. */
  readonly publicationStatus?: PublicationStatus;
  readonly article?: {
    readonly modifiedTime?: string;
    readonly authors: readonly string[];
  };
}

function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`Metadata path must be site-relative and start with "/": ${path}`);
  }
  return new URL(path, `${siteConfig.url}/`).toString();
}

/**
 * Builds route-owned metadata so nested layouts cannot accidentally lend a
 * canonical or Open Graph URL to a different page.
 */
export function createPageMetadata({
  title,
  description,
  path,
  robots,
  publicationStatus,
  article,
}: PageMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(socialImagePath);
  const image = {
    url: imageUrl,
    width: 1200,
    height: 630,
    alt: `${siteConfig.name} 科学知识平台`,
  };
  const resolvedRobots =
    publicationStatus === undefined ? robots : robotsForPublicationStatus(publicationStatus);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: article
      ? {
          type: "article",
          locale: "zh_CN",
          siteName: siteConfig.name,
          title,
          description,
          url,
          images: [image],
          authors: [...article.authors],
          ...(article.modifiedTime ? { modifiedTime: article.modifiedTime } : {}),
        }
      : {
          type: "website",
          locale: "zh_CN",
          siteName: siteConfig.name,
          title,
          description,
          url,
          images: [image],
        },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    ...(resolvedRobots ? { robots: resolvedRobots } : {}),
  };
}

export function robotsForPublicationStatus(status: PublicationStatus): Metadata["robots"] {
  return {
    index: isContentIndexable(status),
    follow: true,
  };
}
