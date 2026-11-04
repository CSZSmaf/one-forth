"use client";

import { MathRichTextContent, useMathOverflow } from "@one-forth/ui";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { SupportedLocale } from "@one-forth/config";
import {
  Download,
  Link2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Share2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type { PlaybackState, VisualizationExportHandlers, VisualizationId } from "./types";
import { VisualizationScientificReview } from "./scientific-review";

interface VisualizationFrameProps {
  readonly id: VisualizationId;
  readonly locale: SupportedLocale;
  readonly title: string;
  readonly description: string;
  readonly playback: PlaybackState;
  readonly onReset: () => void;
  readonly onSpeedChange: (speed: number) => void;
  readonly shareUrl: () => string;
  readonly exports: VisualizationExportHandlers;
  readonly controls: ReactNode;
  readonly children: ReactNode;
  readonly textAlternative: string;
  readonly status?: string;
  readonly notice?: string | null;
  readonly metrics?: ReactNode;
}

const speedOptions = [0.25, 0.5, 1, 1.5, 2] as const;

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "操作未完成，请稍后重试。";
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "input, select, textarea, button, a, [contenteditable='true'], [data-math-scroll]",
      ),
    )
  );
}

export function VisualizationFrame({
  id,
  locale,
  title,
  description,
  playback,
  onReset,
  onSpeedChange,
  shareUrl,
  exports,
  controls,
  children,
  textAlternative,
  status,
  notice,
  metrics,
}: VisualizationFrameProps) {
  const shellRef = useRef<HTMLElement>(null);
  useMathOverflow(shellRef);
  const descriptionId = useId();
  const alternativeId = useId();
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const zh = locale === "zh-CN";
  const pausePlayback = playback.pause;

  useEffect(() => {
    const shell = shellRef.current;
    const readinessFrame = window.requestAnimationFrame(() => {
      setClientReady(true);
      if (shell) shell.dataset.clientReady = "true";
    });
    const update = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => {
      window.cancelAnimationFrame(readinessFrame);
      if (shell) delete shell.dataset.clientReady;
      document.removeEventListener("fullscreenchange", update);
    };
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && !entry.isIntersecting) pausePlayback();
      },
      { threshold: 0.05 },
    );
    observer.observe(shell);
    return () => observer.disconnect();
  }, [pausePlayback]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (isInteractiveTarget(event.target)) return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      playback.toggle();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      playback.stepBackward();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      playback.stepForward();
    } else if (event.key === "Home") {
      event.preventDefault();
      playback.pause();
      onReset();
    }
  }

  async function copyShareUrl(): Promise<void> {
    const url = shareUrl();
    window.history.replaceState(window.history.state, "", url);
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setOperationMessage(zh ? "分享链接已复制。" : "Share link copied.");
    } catch {
      setOperationMessage(
        zh ? "链接已写入地址栏，可手动复制。" : "The URL is ready in the address bar.",
      );
    }
  }

  async function copyFigureAnchor(): Promise<void> {
    const url = new URL(window.location.href);
    url.hash = `figure-${id}`;
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url.toString());
      setOperationMessage(zh ? "实验锚点链接已复制。" : "Figure anchor copied.");
    } catch {
      window.location.hash = `figure-${id}`;
      setOperationMessage(
        zh ? "实验锚点已写入地址栏，可手动复制。" : "The figure anchor is in the address bar.",
      );
    }
  }

  async function toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shellRef.current?.requestFullscreen) await shellRef.current.requestFullscreen();
      else throw new Error(zh ? "当前浏览器不支持全屏。" : "Fullscreen is not supported.");
    } catch (error) {
      setOperationMessage(messageFrom(error));
    }
  }

  async function exportSvg(): Promise<void> {
    try {
      download(new Blob([exports.toSvg()], { type: "image/svg+xml;charset=utf-8" }), `${id}.svg`);
      setOperationMessage(zh ? "SVG 已导出。" : "SVG exported.");
    } catch (error) {
      setOperationMessage(messageFrom(error));
    }
  }

  async function exportPng(): Promise<void> {
    try {
      download(await exports.toPng(), `${id}.png`);
      setOperationMessage(zh ? "PNG 已导出。" : "PNG exported.");
    } catch (error) {
      setOperationMessage(messageFrom(error));
    }
  }

  const maximum = Math.max(1, playback.maximumStep);

  return (
    <section
      ref={shellRef}
      className={`interactive-figure interactive-figure--${id}`}
      aria-labelledby={`${descriptionId}-title`}
      aria-describedby={`${descriptionId} ${alternativeId}`}
      aria-busy={!clientReady}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <header className="interactive-figure__header">
        <div className="interactive-figure__heading">
          <h2 id={`${descriptionId}-title`}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>
        <div
          className="interactive-figure__utilities"
          aria-label={zh ? "实验工具" : "Experiment tools"}
        >
          <button
            type="button"
            className="visualization-action anchor-copy-button"
            disabled={!clientReady}
            onClick={() => void copyFigureAnchor()}
            aria-label={zh ? `复制“${title}”实验的锚点链接` : `Copy the ${title} figure anchor`}
          >
            <Link2 aria-hidden="true" size={15} />
            {zh ? "复制图链接" : "Copy figure link"}
          </button>
          <button
            type="button"
            className="visualization-action"
            disabled={!clientReady}
            onClick={() => void copyShareUrl()}
          >
            <Share2 aria-hidden="true" size={15} />
            {zh ? "分享状态" : "Share state"}
          </button>
          <button
            type="button"
            className="visualization-action"
            disabled={!clientReady}
            onClick={() => void exportSvg()}
          >
            <Download aria-hidden="true" size={15} />
            {zh ? "导出 SVG" : "Export SVG"}
          </button>
          <button
            type="button"
            className="visualization-action"
            disabled={!clientReady}
            onClick={() => void exportPng()}
          >
            <Download aria-hidden="true" size={15} />
            {zh ? "导出 PNG" : "Export PNG"}
          </button>
          <button
            type="button"
            className="visualization-action"
            disabled={!clientReady}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? (
              <Minimize2 aria-hidden="true" size={15} />
            ) : (
              <Maximize2 aria-hidden="true" size={15} />
            )}
            {isFullscreen ? (zh ? "退出全屏" : "Exit fullscreen") : zh ? "全屏" : "Fullscreen"}
          </button>
        </div>
      </header>

      <div
        className="interactive-figure__timeline"
        aria-label={zh ? "动画时间轴" : "Animation timeline"}
      >
        <div className="interactive-figure__transport">
          <button
            type="button"
            disabled={!clientReady}
            onClick={playback.stepBackward}
            aria-label={zh ? "单步后退" : "Step backward"}
          >
            <SkipBack aria-hidden="true" size={15} />
          </button>
          <button
            type="button"
            disabled={!clientReady}
            onClick={playback.toggle}
            aria-pressed={playback.isPlaying}
          >
            {playback.isPlaying ? (
              <Pause aria-hidden="true" size={15} />
            ) : (
              <Play aria-hidden="true" size={15} />
            )}
            {playback.isPlaying ? (zh ? "暂停" : "Pause") : zh ? "播放" : "Play"}
          </button>
          <button
            type="button"
            disabled={!clientReady}
            onClick={playback.stepForward}
            aria-label={zh ? "单步前进" : "Step forward"}
          >
            <SkipForward aria-hidden="true" size={15} />
          </button>
          <button
            type="button"
            disabled={!clientReady}
            onClick={() => {
              playback.pause();
              onReset();
            }}
          >
            <RotateCcw aria-hidden="true" size={15} />
            {zh ? "重置" : "Reset"}
          </button>
        </div>
        {playback.seek ? (
          <input
            type="range"
            className="interactive-figure__seek"
            min={playback.minimumStep ?? 0}
            max={maximum}
            step={1}
            value={playback.step}
            disabled={!clientReady}
            aria-label={zh ? "当前动画进度" : "Animation progress"}
            onChange={(event) => playback.seek?.(Number(event.target.value))}
          />
        ) : (
          <progress
            value={playback.step}
            max={maximum}
            aria-label={zh ? "当前动画进度" : "Animation progress"}
          />
        )}
        <output className="interactive-figure__step">
          {zh ? "步骤" : "Step"} {playback.step} / {playback.maximumStep}
        </output>
        <label className="interactive-figure__speed">
          <span>{zh ? "速度" : "Speed"}</span>
          <select
            disabled={!clientReady}
            value={playback.speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          >
            {speedOptions.map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="interactive-figure__workspace">
        <div
          className="interactive-figure__canvas"
          aria-label={zh ? "实验主画布" : "Experiment canvas"}
        >
          {children}
        </div>
        <aside
          className="interactive-figure__parameters"
          aria-label={zh ? "实验参数" : "Experiment parameters"}
        >
          <fieldset className="interactive-figure__parameter-fieldset" disabled={!clientReady}>
            <legend className="sr-only">
              {zh ? "实验参数控制" : "Experiment parameter controls"}
            </legend>
            {controls}
          </fieldset>
        </aside>
      </div>

      {metrics ? <div className="interactive-figure__metrics">{metrics}</div> : null}
      <details className="interactive-figure__alternative">
        <summary>{zh ? "读取当前图形说明" : "Read the current figure description"}</summary>
        <p id={alternativeId}>{textAlternative}</p>
      </details>
      <p className="interactive-figure__keyboard-hint">
        {zh
          ? "键盘：空格播放或暂停，左右方向键单步，Home 重置。"
          : "Keyboard: Space plays or pauses, arrows step, Home resets."}
      </p>
      <div className="interactive-figure__status" aria-live="polite">
        {status ? (
          <p>
            <MathRichTextContent value={status} />
          </p>
        ) : null}
        {notice ? <p>{notice}</p> : null}
        {operationMessage ? <p>{operationMessage}</p> : null}
      </div>
      <VisualizationScientificReview id={id} locale={locale} />
    </section>
  );
}
