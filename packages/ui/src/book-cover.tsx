import type { CSSProperties } from "react";

interface BookCoverProps {
  readonly code: string;
  readonly title: string;
  readonly series: string;
  readonly publisher: string;
  readonly color: string;
  readonly variant?: number;
  readonly titleAs?: "h1" | "h2" | "h3" | "h4" | "span";
}

/** Typographic cover; the caller owns links, curriculum data and localization. */
export function BookCover({
  code,
  title,
  series,
  publisher,
  color,
  variant = 0,
  titleAs: Title = "span",
}: BookCoverProps) {
  const style: CSSProperties & { "--book-color": string } = { "--book-color": color };
  return (
    <div className="book-cover" data-cover-variant={variant % 3} style={style}>
      <div className="book-cover__top">
        <span className="book-cover__code">{code}</span>
        <span className="book-cover__series">{series}</span>
      </div>
      <Title className="book-cover__title">{title}</Title>
      <span className="book-cover__folio" aria-hidden="true">
        {code.replace(/^\D+/, "")}
      </span>
      <span className="book-cover__publisher">{publisher}</span>
    </div>
  );
}
