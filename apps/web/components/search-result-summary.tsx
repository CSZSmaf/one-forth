import type { SearchDocumentKind } from "@one-forth/search/client";
import { MathRichTextContent } from "@/components/math-rich-text";
import { StaticMath } from "@/components/static-math";

interface SearchResultSummaryProps {
  readonly kind: SearchDocumentKind;
  readonly summary: string;
}

export function SearchResultSummary({ kind, summary }: SearchResultSummaryProps) {
  if (kind === "equation" || kind === "symbol") {
    return (
      <StaticMath latex={summary} className="static-math--search-result" plainText={summary} />
    );
  }

  return <MathRichTextContent value={summary} mathClassName="static-math--search-result" />;
}
