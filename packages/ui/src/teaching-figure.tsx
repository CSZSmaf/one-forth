import type { DiagramElement, DiagramTone, TeachingFigureData } from "@one-forth/registry";
import { SvgMath } from "./svg-math";

const tones: readonly DiagramTone[] = [
  "ink",
  "muted",
  "input",
  "output",
  "positive",
  "negative",
  "gradient",
  "wave",
];

function DiagramMark({
  element,
  markerPrefix,
}: {
  readonly element: DiagramElement;
  readonly markerPrefix: string;
}) {
  const tone = element.tone ?? "ink";
  const className = `teaching-figure__mark teaching-figure__tone--${tone}`;
  if (element.kind === "text") {
    return (
      <text
        className={className}
        x={element.x}
        y={element.y}
        textAnchor={element.anchor ?? "middle"}
        fontSize={element.size ?? 20}
        fontWeight={element.weight ?? "normal"}
      >
        {element.text}
      </text>
    );
  }
  if (element.kind === "math") {
    return (
      <g className={className}>
        <SvgMath
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height ?? 40}
          latex={element.latex}
          label={element.label}
          align={element.align ?? "center"}
          fontSize={element.size ?? 20}
        />
      </g>
    );
  }
  const props = {
    className: `${className} teaching-figure__shape teaching-figure__fill--${element.fill ?? "none"}`,
    strokeWidth: element.strokeWidth ?? 2,
    strokeDasharray: element.dashed ? "6 5" : undefined,
  };
  switch (element.kind) {
    case "line":
      return (
        <line
          {...props}
          x1={element.x1}
          y1={element.y1}
          x2={element.x2}
          y2={element.y2}
          markerEnd={element.arrow ? `url(#${markerPrefix}-${tone})` : undefined}
        />
      );
    case "path":
      return (
        <path
          {...props}
          d={element.d}
          markerEnd={element.arrow ? `url(#${markerPrefix}-${tone})` : undefined}
        />
      );
    case "rect":
      return (
        <rect
          {...props}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
        />
      );
    case "circle":
      return <circle {...props} cx={element.cx} cy={element.cy} r={element.r} />;
    case "ellipse":
      return <ellipse {...props} cx={element.cx} cy={element.cy} rx={element.rx} ry={element.ry} />;
  }
}

/** A static figure: semantic data comes from the content package, without client JavaScript. */
export function TeachingFigureView({ figure }: { readonly figure: TeachingFigureData }) {
  const figureId = `figure-${figure.id}`;
  return (
    <figure
      className="teaching-figure"
      id={figureId}
      aria-labelledby={`${figureId}-caption`}
      data-teaching-figure={figure.id}
    >
      <div className="teaching-figure__panels">
        {figure.panels.map((panel, index) => {
          const panelId = `${figureId}-panel-${index}`;
          return (
            <svg
              key={panelId}
              className="teaching-figure__panel"
              viewBox={`0 0 ${panel.width} ${panel.height}`}
              role="img"
              aria-labelledby={`${panelId}-title`}
              aria-describedby={`${panelId}-description`}
            >
              <title id={`${panelId}-title`}>{panel.title}</title>
              <desc id={`${panelId}-description`}>{panel.description}</desc>
              <defs>
                {tones.map((tone) => (
                  <marker
                    key={tone}
                    id={`${panelId}-${tone}`}
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                    markerUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 1 1 L 9 5 L 1 9"
                      className={`teaching-figure__arrow teaching-figure__tone--${tone}`}
                    />
                  </marker>
                ))}
              </defs>
              {panel.elements.map((element, elementIndex) => (
                <DiagramMark key={elementIndex} element={element} markerPrefix={panelId} />
              ))}
            </svg>
          );
        })}
      </div>
      <figcaption id={`${figureId}-caption`}>
        <strong>{figure.title}</strong>
        <span>{figure.caption}</span>
        {figure.source ? (
          <a className="teaching-figure__source" href={figure.source.url}>
            {figure.source.label}
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}
