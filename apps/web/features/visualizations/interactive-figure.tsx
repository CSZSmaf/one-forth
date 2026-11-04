"use client";

import { uiText, type SupportedLocale } from "@one-forth/config";
import { usePathname } from "next/navigation";
import { Component, Suspense } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { visualizationMetadata } from "./metadata";
import {
  VisualizationRelatedReadingProvider,
  type VisualizationRelatedReadingLink,
} from "./related-reading-context";
import { RegisteredVisualization } from "./registry";
import { isVisualizationId } from "./types";

export interface InteractiveFigureProps {
  readonly id: string;
  readonly locale?: SupportedLocale;
  readonly relatedReading?: readonly VisualizationRelatedReadingLink[];
}

interface ErrorBoundaryProps {
  readonly resetKey: string;
  readonly locale: SupportedLocale;
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

class VisualizationErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      "Visualization failed",
      process.env.NODE_ENV === "development"
        ? { id: this.props.resetKey, error, componentStack: info.componentStack }
        : { id: this.props.resetKey },
    );
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      const zh = this.props.locale === "zh-CN";
      return (
        <section className="interactive-figure-error" role="alert">
          <h2>{zh ? "实验暂时无法加载" : "The experiment could not be loaded"}</h2>
          <p>{uiText[this.props.locale].readerInterface.experimentRetry}</p>
          <button type="button" onClick={() => this.setState({ error: null })}>
            {zh ? "重试" : "Retry"}
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

export function InteractiveFigure({ id, locale, relatedReading = [] }: InteractiveFigureProps) {
  const pathname = usePathname();
  const activeLocale: SupportedLocale =
    locale ?? (pathname.split("/")[1] === "en" ? "en" : "zh-CN");
  if (!isVisualizationId(id)) {
    return (
      <section className="interactive-figure-error" role="alert">
        <h2>{activeLocale === "zh-CN" ? "未知实验" : "Unknown experiment"}</h2>
        <p>{activeLocale === "zh-CN" ? `注册表中不存在“${id}”。` : `“${id}” is not registered.`}</p>
      </section>
    );
  }

  const metadata = visualizationMetadata(id, activeLocale);
  return (
    <section
      id={`figure-${id}`}
      className="interactive-figure-anchor anchor-copy-target"
      aria-label={
        activeLocale === "zh-CN"
          ? `${metadata.title}交互实验`
          : `${metadata.title} interactive experiment`
      }
    >
      <VisualizationRelatedReadingProvider links={relatedReading}>
        <VisualizationErrorBoundary resetKey={id} locale={activeLocale}>
          <Suspense
            fallback={
              <section className="interactive-figure-loading" aria-busy="true" aria-live="polite">
                <h2>{metadata.title}</h2>
                <p>
                  {activeLocale === "zh-CN"
                    ? "正在加载交互实验…"
                    : "Loading the interactive experiment…"}
                </p>
              </section>
            }
          >
            <RegisteredVisualization id={id} locale={activeLocale} />
          </Suspense>
        </VisualizationErrorBoundary>
      </VisualizationRelatedReadingProvider>
    </section>
  );
}
