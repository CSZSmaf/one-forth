import katex from "katex";

interface StaticMathProps {
  readonly latex: string;
  readonly display?: boolean;
  readonly label?: string;
  readonly plainText?: string;
  readonly className?: string;
}

export function StaticMath({
  latex,
  display = false,
  label,
  plainText,
  className,
}: StaticMathProps) {
  const html = katex.renderToString(latex, {
    displayMode: display,
    output: "htmlAndMathml",
    strict: "warn",
    throwOnError: false,
    trust: false,
  });

  const Element = display ? "div" : "span";
  const classes = ["static-math", display ? "static-math--display" : undefined, className]
    .filter(Boolean)
    .join(" ");
  return (
    <Element
      className={classes}
      role={label || plainText ? "group" : undefined}
      aria-label={label ?? plainText}
      data-latex={latex}
      data-plain-text={plainText}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
