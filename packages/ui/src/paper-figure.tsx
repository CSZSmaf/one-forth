import type { PaperFigureData } from "@one-forth/registry";

export function PaperFigureView({
  figure,
  openLabel,
  paperLabel,
}: {
  readonly figure: PaperFigureData;
  readonly openLabel: string;
  readonly paperLabel: string;
}) {
  const id = `figure-${figure.id}`;
  return (
    <figure
      className="paper-figure"
      id={id}
      aria-labelledby={`${id}-caption`}
      data-paper-figure={figure.id}
    >
      <a
        className="paper-figure__image-link"
        href={figure.src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${openLabel}：${figure.title}`}
      >
        <img
          src={figure.src}
          alt={figure.alt}
          width={figure.width}
          height={figure.height}
          loading="lazy"
          decoding="async"
        />
      </a>
      <figcaption id={`${id}-caption`}>
        <strong>{figure.title}</strong>
        <span>{figure.caption}</span>
        <span className="paper-figure__credit">{figure.credit}</span>
        <span className="paper-figure__links">
          <a href={figure.src} target="_blank" rel="noopener noreferrer">
            {openLabel}
          </a>
          <a href={figure.paperUrl} target="_blank" rel="noopener noreferrer">
            {paperLabel}
          </a>
          <a href={figure.licenseUrl} target="_blank" rel="noopener noreferrer">
            {figure.licenseName}
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
