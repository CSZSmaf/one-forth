"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  learningStateEvent,
  learningStateStorageKey,
  readLearningState,
} from "@/lib/learning-state";

export interface HomeLearningPathNodeDto {
  readonly conceptId: string;
  readonly title: string;
  readonly articleHref?: string;
}

export interface HomeLearningPathDefinitionDto {
  readonly pathId: string;
  readonly title: string;
  readonly summary: string;
  readonly pathHref: string;
  readonly estimatedHours: number;
  /** Every registered path node, including nodes that do not yet have a document. */
  readonly nodes: readonly HomeLearningPathNodeDto[];
}

export interface HomeLearningStartingChapterDto {
  readonly title: string;
  readonly href: string;
  readonly maturityLabel: string;
}

export interface HomeLearningPathDto extends HomeLearningPathDefinitionDto {
  readonly conceptIds: readonly string[];
  readonly total: number;
  readonly completed: number;
  readonly percent: number;
  readonly hasLocalRecord: boolean;
  readonly currentChapter?: HomeLearningPathNodeDto;
  readonly destination: {
    readonly kind: "path" | "article";
    readonly href: string;
  };
  readonly status: "not-started" | "in-progress" | "completed";
}

interface HomeLearningProgressProps {
  readonly path: HomeLearningPathDefinitionDto;
  readonly recommendedPaths?: readonly HomeLearningPathDefinitionDto[];
  readonly zeroFoundationChapter?: HomeLearningStartingChapterDto;
}

function subscribe(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === learningStateStorageKey) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(learningStateEvent, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(learningStateEvent, callback);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(learningStateStorageKey) ?? "";
}

export function resolveHomeLearningPath(
  definition: HomeLearningPathDefinitionDto,
  storage: Pick<Storage, "getItem">,
): HomeLearningPathDto {
  const envelope = readLearningState(storage);
  const conceptIds = definition.nodes.map((node) => node.conceptId);
  const completed = conceptIds.filter(
    (chapterId) => envelope.chapters[chapterId]?.status === "completed",
  ).length;
  const pathRecord = envelope.paths[definition.pathId];
  const recordedNodes = definition.nodes
    .map((node) => ({ node, state: envelope.chapters[node.conceptId] }))
    .filter(
      (entry) => entry.state?.status === "completed" || entry.state?.status === "in-progress",
    );
  const hasLocalRecord = Boolean(pathRecord) || recordedNodes.length > 0;
  const recentInProgress = recordedNodes
    .filter((entry) => entry.state?.status === "in-progress")
    .sort((a, b) => (b.state?.updatedAt ?? "").localeCompare(a.state?.updatedAt ?? ""))[0]?.node;
  const trackedChapter = pathRecord?.currentChapterId
    ? definition.nodes.find(
        (node) =>
          node.conceptId === pathRecord.currentChapterId &&
          envelope.chapters[node.conceptId]?.status !== "completed",
      )
    : undefined;
  const firstIncomplete = definition.nodes.find(
    (node) => envelope.chapters[node.conceptId]?.status !== "completed",
  );
  const currentChapter =
    recentInProgress ?? trackedChapter ?? firstIncomplete ?? definition.nodes.at(-1);
  const status =
    definition.nodes.length > 0 && completed === definition.nodes.length
      ? "completed"
      : hasLocalRecord
        ? "in-progress"
        : "not-started";
  const currentState = currentChapter ? envelope.chapters[currentChapter.conceptId] : undefined;
  const destination =
    status === "in-progress" && currentChapter?.articleHref
      ? {
          kind: "article" as const,
          href: currentState?.lastAnchor
            ? `${currentChapter.articleHref}#${currentState.lastAnchor}`
            : currentChapter.articleHref,
        }
      : { kind: "path" as const, href: definition.pathHref };

  return {
    ...definition,
    conceptIds,
    total: conceptIds.length,
    completed,
    percent: conceptIds.length === 0 ? 0 : Math.round((completed / conceptIds.length) * 100),
    hasLocalRecord,
    ...(currentChapter ? { currentChapter } : {}),
    destination,
    status,
  };
}

export function HomeLearningProgress({
  path: definition,
  recommendedPaths = [],
  zeroFoundationChapter,
}: HomeLearningProgressProps) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const path = resolveHomeLearningPath(definition, {
    getItem: () => snapshot || null,
  });
  const statusLabel =
    path.status === "completed" ? "已完成" : path.status === "in-progress" ? "进行中" : "未开始";
  const headingLabel = path.hasLocalRecord ? "继续学习" : "推荐起点";
  const title =
    path.status === "in-progress" && path.currentChapter ? path.currentChapter.title : path.title;
  const description =
    path.status === "completed"
      ? `已完成「${path.title}」的全部 ${path.total} 个概念节点。`
      : path.status === "in-progress" && path.currentChapter
        ? `当前章节是「${path.currentChapter.title}」。`
        : path.summary;
  const actionLabel = !path.hasLocalRecord
    ? "打开学习路径"
    : path.destination.kind === "article"
      ? "继续阅读"
      : "继续学习";

  return (
    <aside className="home-continue" aria-labelledby="continue-title">
      <div className="home-continue__heading">
        <div>
          <span>{headingLabel}</span>
          <h2 id="continue-title">{title}</h2>
        </div>
        <span className="status-label">{statusLabel}</span>
      </div>
      <p>{description}</p>
      <div className="home-continue__progress">
        <progress value={path.percent} max={100} aria-label="学习路径完成进度" />
        <span>
          {path.completed} / {path.total} 个概念 · 约 {path.estimatedHours} 小时
        </span>
      </div>
      {!path.hasLocalRecord && recommendedPaths.length > 0 ? (
        <div className="home-continue__recommendations">
          <span>三条入门路线</span>
          <ul>
            {recommendedPaths.map((recommendedPath) => (
              <li key={recommendedPath.pathId}>
                <Link href={recommendedPath.pathHref}>
                  <strong>{recommendedPath.title}</strong>
                  <small>
                    {recommendedPath.nodes.length} 个概念 · 约 {recommendedPath.estimatedHours} 小时
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!path.hasLocalRecord && zeroFoundationChapter ? (
        <div className="home-continue__foundation">
          <span>零基础第一章</span>
          <Link href={zeroFoundationChapter.href}>
            <strong>{zeroFoundationChapter.title}</strong>
            <small>{zeroFoundationChapter.maturityLabel}</small>
          </Link>
        </div>
      ) : null}
      <Link className="text-link" href={path.destination.href}>
        {actionLabel}
        <ArrowRight aria-hidden="true" size={15} />
      </Link>
    </aside>
  );
}
