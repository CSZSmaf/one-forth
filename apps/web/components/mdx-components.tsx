import {
  equations,
  readerConceptById,
  readerCurriculumRepository,
  resources,
  symbols,
} from "@one-forth/content";
import { EquationView, SemanticBlock, SymbolView } from "@one-forth/ui";
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { CodeCell } from "./code-cell";
import { ExerciseBlock, type ExerciseBlockProps } from "./exercise-block";
import { MathRichTextContent } from "./math-rich-text";
import { StaticMath } from "./static-math";
import { TeachingFigure } from "./teaching-figure";
import { PaperFigure } from "./paper-figure";
import { CurriculumInteractiveFigure } from "@/features/visualizations/curriculum-interactive-figure";
import { parseLegacyExerciseInline } from "@/lib/legacy-exercise-inline";
import { resolveUnitLabel } from "@/lib/labels";
import { formatResourceBibliography } from "@/lib/resource-bibliography";

type BlockProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
  readonly title?: string;
  readonly number?: string;
  readonly children: ReactNode;
};

type CodeProps = ComponentPropsWithoutRef<"code">;

function isMathCode(className: CodeProps["className"]): boolean {
  return typeof className === "string" && className.split(/\s+/).includes("language-math");
}

function mathSource(children: ReactNode): string | undefined {
  const parts = Children.toArray(children);
  if (!parts.every((part) => typeof part === "string" || typeof part === "number")) {
    return undefined;
  }
  return parts.join("");
}

export function MdxCode({ className, children, ...props }: CodeProps) {
  const latex = isMathCode(className) ? mathSource(children) : undefined;
  if (latex !== undefined) {
    return (
      <StaticMath
        latex={latex}
        display={className?.split(/\s+/).includes("math-display") ?? false}
        className="static-math--authored"
      />
    );
  }
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

export function MdxPre({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const parts = Children.toArray(children);
  if (
    parts.length === 1 &&
    isValidElement<CodeProps>(parts[0]) &&
    isMathCode(parts[0].props.className)
  ) {
    const className = parts[0].props.className ?? "";
    const hasExplicitMathMode = /(?:^|\s)math-(?:inline|display)(?:\s|$)/.test(className);
    return (
      <>
        {hasExplicitMathMode
          ? parts[0]
          : cloneElement(parts[0], { className: `${className} math-display` })}
      </>
    );
  }
  return <pre {...props}>{children}</pre>;
}

function block(kind: ComponentPropsWithoutRef<typeof SemanticBlock>["kind"]) {
  return function MdxBlock({ title, number, children, ...props }: BlockProps) {
    return (
      <SemanticBlock
        kind={kind}
        {...(title ? { title: <MathRichTextContent value={title} /> } : {})}
        {...(number ? { number } : {})}
        {...props}
      >
        {children}
      </SemanticBlock>
    );
  };
}

export const Intuition = block("intuition");
export const Definition = block("definition");
export const Theorem = block("theorem");
export const Lemma = block("lemma");
export const Proof = block("proof");
export const Derivation = block("derivation");
export const Example = block("example");
export const CounterExample = block("counterexample");
export const Misconception = block("misconception");
export const Callout = block("callout");
export const Checkpoint = block("checkpoint");

interface ExerciseSlotProps {
  readonly children: ReactNode;
}

/**
 * Authoring-only marker consumed by the server-side Exercise wrapper.
 * Keeping rich hint content in MDX children lets remark-math compile it before
 * the client ExerciseBlock receives the resulting React nodes.
 */
export function ExerciseHint({ children }: ExerciseSlotProps) {
  return <>{children}</>;
}

/** See ExerciseHint. */
export function ExerciseSolution({ children }: ExerciseSlotProps) {
  return <>{children}</>;
}

function LegacyExerciseInline({ value }: { readonly value: string }) {
  return (
    <>
      {parseLegacyExerciseInline(value).map((segment, index) => {
        const key = `${segment.kind}-${index}`;
        if (segment.kind === "math") {
          return (
            <StaticMath
              key={key}
              latex={segment.latex}
              className="static-math--authored static-math--legacy-exercise"
            />
          );
        }
        if (segment.kind === "code") {
          return (
            <code key={key} className="legacy-exercise-code">
              {segment.code}
            </code>
          );
        }
        return <Fragment key={key}>{segment.text}</Fragment>;
      })}
    </>
  );
}

function renderLegacyExerciseInline(value: ReactNode): ReactNode {
  return typeof value === "string" ? <LegacyExerciseInline value={value} /> : value;
}

export function Exercise({
  children,
  hint: legacyHint,
  solution: legacySolution,
  ...props
}: ExerciseBlockProps) {
  const prompt: ReactNode[] = [];
  let richHint: ReactNode;
  let richSolution: ReactNode;

  for (const child of Children.toArray(children)) {
    if (isValidElement<ExerciseSlotProps>(child) && child.type === ExerciseHint) {
      if (richHint !== undefined) {
        throw new Error(`Exercise ${props.id ?? "without an id"} has more than one ExerciseHint.`);
      }
      richHint = child.props.children;
      continue;
    }
    if (isValidElement<ExerciseSlotProps>(child) && child.type === ExerciseSolution) {
      if (richSolution !== undefined) {
        throw new Error(
          `Exercise ${props.id ?? "without an id"} has more than one ExerciseSolution.`,
        );
      }
      richSolution = child.props.children;
      continue;
    }
    prompt.push(child);
  }

  return (
    <ExerciseBlock
      {...props}
      hint={richHint ?? renderLegacyExerciseInline(legacyHint)}
      solution={richSolution ?? renderLegacyExerciseInline(legacySolution)}
    >
      {prompt}
    </ExerciseBlock>
  );
}

export function Solution({ children }: { readonly children: ReactNode }) {
  return (
    <details className="solution">
      <summary>查看解答</summary>
      <div>{children}</div>
    </details>
  );
}

export function Quiz({
  question,
  children,
}: {
  readonly question: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="quiz">
      <h3>{question}</h3>
      {children}
    </section>
  );
}

export function Citation({
  children,
  source,
}: {
  readonly children: ReactNode;
  readonly source?: string;
}) {
  return (
    <cite className="citation">
      {children}
      {source ? <small>{source}</small> : null}
    </cite>
  );
}

export function ConceptLink({
  id,
  children,
}: {
  readonly id: string;
  readonly children: ReactNode;
}) {
  const concept = readerConceptById.get(id);
  const href = concept
    ? readerCurriculumRepository.resolveCanonicalLocation(concept.canonicalLocation, "zh-CN")
    : null;
  return (
    <a
      className="concept-link"
      href={href ?? `/zh-CN/search?q=${encodeURIComponent(id)}`}
      {...(!concept ? { "data-missing-concept-id": id } : {})}
    >
      {children}
    </a>
  );
}

export function ResourceCard({ id }: { readonly id: string }) {
  const resource = resources.find((candidate) => candidate.id === id);
  if (!resource) {
    return (
      <span className="resource-missing" data-missing-resource-id={id}>
        此资源记录尚未登记，请报告页面错误。
      </span>
    );
  }
  const bibliography = formatResourceBibliography(resource);
  return (
    <article className="resource-entry">
      <h3>{resource.title}</h3>
      {bibliography ? <p>{bibliography}</p> : null}
      {resource.links.official ? (
        <a
          href={resource.links.official}
          rel="noreferrer"
          aria-label={`打开 ${resource.title} 的官方来源`}
        >
          打开官方来源
        </a>
      ) : null}
    </article>
  );
}

export function Equation({
  id,
  label,
  children,
}: {
  readonly id?: string;
  readonly label?: string;
  readonly children?: ReactNode;
}) {
  const equation = id ? equations.find((candidate) => candidate.id === id) : undefined;
  const accessibleLabel = equation?.accessibleLabel["zh-CN"] ?? label;
  const content = id ? (
    equation ? (
      <StaticMath
        latex={equation.latex}
        plainText={equation.plainText}
        label={equation.accessibleLabel["zh-CN"]}
        display
      />
    ) : (
      <span data-missing-equation-id={id}>此公式记录尚未登记，请报告页面错误。</span>
    )
  ) : (
    (children ?? <span>未提供公式内容。</span>)
  );
  return (
    <EquationView
      {...(id ? { id: `equation-${id}` } : {})}
      {...(accessibleLabel ? { label: accessibleLabel } : {})}
    >
      {content}
    </EquationView>
  );
}

export function Symbol({ id, children }: { readonly id: string; readonly children?: ReactNode }) {
  const symbol = symbols.find((candidate) => candidate.id === id);
  return symbol ? (
    <SymbolView
      symbol={
        children ?? (
          <StaticMath
            latex={symbol.latex}
            plainText={symbol.plainText}
            label={symbol.accessibleLabel["zh-CN"]}
          />
        )
      }
      meaning={symbol.meaning["zh-CN"]}
      {...(symbol.unit ? { unit: resolveUnitLabel(symbol.unit, "zh-CN") } : {})}
    />
  ) : (
    <span data-missing-symbol-id={id}>{children ?? "此符号记录尚未登记，请报告页面错误。"}</span>
  );
}

export function ParameterPanel({ children }: { readonly children: ReactNode }) {
  return <aside className="parameter-panel">{children}</aside>;
}

export function Tabs({ children }: { readonly children: ReactNode }) {
  return (
    <div className="tabs" role="group">
      {children}
    </div>
  );
}

export function Details({
  summary,
  children,
}: {
  readonly summary: string;
  readonly children: ReactNode;
}) {
  return (
    <details className="details">
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

export const mdxComponents = {
  code: MdxCode,
  pre: MdxPre,
  Intuition,
  Definition,
  Theorem,
  Lemma,
  Proof,
  Derivation,
  Example,
  CounterExample,
  Misconception,
  Callout,
  Exercise,
  ExerciseHint,
  ExerciseSolution,
  Solution,
  Quiz,
  Checkpoint,
  ResourceCard,
  Citation,
  ConceptLink,
  Equation,
  Symbol,
  InteractiveFigure: CurriculumInteractiveFigure,
  TeachingFigure,
  PaperFigure,
  ParameterPanel,
  CodeCell,
  Tabs,
  Details,
};
