import type { ComponentPropsWithoutRef, ReactNode } from "react";

export { BookCover } from "./book-cover";
export { TeachingFigureView } from "./teaching-figure";
export { PaperFigureView } from "./paper-figure";
export { StaticMath } from "./static-math";
export { MathRichText, MathRichTextContent, parseMathRichText } from "./math-rich-text";
export type { MathRichTextSegment } from "./math-rich-text";
export { MathLabel } from "./math-label";
export { SvgMath, SvgMathText } from "./svg-math";
export { useMathOverflow } from "./use-math-overflow";

export function BrandMark({
  src,
  className,
}: {
  readonly src: string;
  readonly className?: string;
}) {
  return <img src={src} className={className} width={32} height={32} alt="" aria-hidden="true" />;
}

export interface SemanticBlockProps extends Omit<ComponentPropsWithoutRef<"section">, "title"> {
  readonly kind:
    | "intuition"
    | "definition"
    | "theorem"
    | "lemma"
    | "proof"
    | "derivation"
    | "example"
    | "counterexample"
    | "misconception"
    | "callout"
    | "exercise"
    | "checkpoint";
  readonly title?: ReactNode;
  readonly number?: string;
  readonly children: ReactNode;
}

export function SemanticBlock({
  kind,
  title,
  number,
  children,
  className,
  ...props
}: SemanticBlockProps) {
  const heading = title ?? semanticTitles[kind];
  return (
    <section
      className={["semantic-block", `semantic-${kind}`, className].filter(Boolean).join(" ")}
      data-kind={kind}
      {...props}
    >
      <div className="semantic-block__heading">
        <span>{heading}</span>
        {number ? <span className="semantic-block__number">{number}</span> : null}
      </div>
      <div className="semantic-block__body">{children}</div>
    </section>
  );
}

const semanticTitles: Readonly<Record<SemanticBlockProps["kind"], string>> = {
  intuition: "直觉",
  definition: "定义",
  theorem: "定理",
  lemma: "引理",
  proof: "证明",
  derivation: "推导",
  example: "例",
  counterexample: "反例",
  misconception: "常见误区",
  callout: "说明",
  exercise: "练习",
  checkpoint: "检查点",
};

export interface EquationViewProps {
  readonly id?: string;
  readonly label?: string;
  readonly children: ReactNode;
}

export function EquationView({ id, label, children }: EquationViewProps) {
  return (
    <figure className="equation" id={id} aria-label={label ?? "数学公式"}>
      <div className="equation__content">{children}</div>
      {label ? <figcaption>{label}</figcaption> : null}
    </figure>
  );
}

export { CopyTextButton } from "./copy-text-button";

export interface SymbolViewProps {
  readonly symbol: ReactNode;
  readonly meaning: string;
  readonly unit?: string;
}

export function SymbolView({ symbol, meaning, unit }: SymbolViewProps) {
  return (
    <span
      className="symbol"
      role="definition"
      aria-label={`${meaning}${unit ? `，单位 ${unit}` : ""}`}
    >
      <span aria-hidden="true">{symbol}</span>
    </span>
  );
}
export { useCanvasViewport, zoomCanvas, constrainCanvas } from "./canvas-viewport";
export { DirectoryNavigation } from "./directory-navigation";
