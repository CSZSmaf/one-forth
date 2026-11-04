import { collectHeadingAnchors, slugifyHeading } from "@one-forth/content/heading-slug";

export interface TableOfContentsItem {
  readonly id: string;
  readonly title: string;
  readonly level: 2 | 3;
}

export { slugifyHeading };

export function extractTableOfContents(markdown: string): readonly TableOfContentsItem[] {
  return collectHeadingAnchors(markdown).map(({ id, title, level }) => ({ id, title, level }));
}
