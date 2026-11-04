"use client";

import { Check, Circle } from "lucide-react";
import {
  isValidElement,
  useEffect,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useChapterLearningContext } from "./chapter-learning-context";
import {
  getExerciseLearningState,
  learningStateEvent,
  writeExerciseLearningState,
} from "@/lib/learning-state";

export interface ExerciseBlockProps extends Omit<ComponentPropsWithoutRef<"section">, "title"> {
  readonly title?: string;
  readonly number?: string;
  /** Display-ready topic label supplied by the author, not a registry ID. */
  readonly topic?: string;
  readonly difficulty?: 1 | 2 | 3 | 4 | 5 | string;
  readonly hint?: ReactNode;
  readonly solution?: ReactNode;
  readonly children: ReactNode;
}

function readableText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(readableText).join(" ");
  if (isValidElement(node)) {
    return readableText((node.props as { readonly children?: ReactNode }).children);
  }
  return "";
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

export function ExerciseBlock({
  title,
  number,
  topic,
  difficulty,
  hint,
  solution,
  children,
  id,
  className,
  ...props
}: ExerciseBlockProps) {
  const pathname = usePathname();
  const chapterContext = useChapterLearningContext();
  const [clientReady, setClientReady] = useState(false);
  const generatedAnchorId = `exercise-${stableHash(`${title ?? "练习"}|${number ?? ""}|${readableText(children)}`)}`;
  const anchorId = id ?? generatedAnchorId;
  const exerciseId = chapterContext
    ? `${chapterContext.chapterId}#${anchorId}`
    : `${pathname}#${anchorId}`;
  const legacyExerciseIds = chapterContext?.legacyDocumentPath
    ? [`${chapterContext.legacyDocumentPath}#${anchorId}`]
    : [];
  const completed = useSyncExternalStore(
    (callback) => {
      window.addEventListener(learningStateEvent, callback);
      return () => window.removeEventListener(learningStateEvent, callback);
    },
    () => getExerciseLearningState(localStorage, exerciseId, legacyExerciseIds).completed,
    () => false,
  );

  useEffect(() => {
    const readinessFrame = window.requestAnimationFrame(() => {
      setClientReady(true);
      window.dispatchEvent(new Event(learningStateEvent));
    });
    return () => window.cancelAnimationFrame(readinessFrame);
  }, []);

  return (
    <section
      id={id}
      className={["semantic-block", "semantic-exercise", className].filter(Boolean).join(" ")}
      data-kind="exercise"
      data-completed={completed}
      data-exercise-id={exerciseId}
      data-client-ready={clientReady}
      aria-busy={!clientReady}
      {...props}
    >
      <div className="semantic-block__heading">
        <span>{title ?? "练习"}</span>
        {number ? <span className="semantic-block__number">{number}</span> : null}
        <button
          type="button"
          className="exercise-completion"
          disabled={!clientReady}
          aria-pressed={completed}
          onClick={() => {
            writeExerciseLearningState(
              localStorage,
              exerciseId,
              !completed,
              new Date(),
              legacyExerciseIds,
            );
            window.dispatchEvent(new Event(learningStateEvent));
          }}
        >
          {completed ? (
            <Check aria-hidden="true" size={14} />
          ) : (
            <Circle aria-hidden="true" size={14} />
          )}
          {completed ? "已完成" : "标记完成"}
        </button>
      </div>
      <div className="semantic-block__body">
        {topic || difficulty ? (
          <dl className="exercise-metadata">
            {topic ? (
              <div>
                <dt>所属知识</dt>
                <dd>{topic}</dd>
              </div>
            ) : null}
            {difficulty ? (
              <div>
                <dt>难度</dt>
                <dd>{typeof difficulty === "number" ? `${difficulty}/5` : difficulty}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        <div className="exercise-prompt">{children}</div>
        {hint ? (
          <details className="exercise-disclosure exercise-disclosure--hint">
            <summary>查看提示</summary>
            <div>{hint}</div>
          </details>
        ) : null}
        {solution ? (
          <details className="exercise-disclosure exercise-disclosure--solution">
            <summary>查看解答</summary>
            <div>{solution}</div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
