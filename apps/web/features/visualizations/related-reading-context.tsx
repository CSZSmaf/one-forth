"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export interface VisualizationRelatedReadingLink {
  readonly id: string;
  readonly title: string;
  readonly href: string;
}

const VisualizationRelatedReadingContext = createContext<
  readonly VisualizationRelatedReadingLink[]
>([]);

export function VisualizationRelatedReadingProvider({
  links,
  children,
}: {
  readonly links: readonly VisualizationRelatedReadingLink[];
  readonly children: ReactNode;
}) {
  return (
    <VisualizationRelatedReadingContext.Provider value={links}>
      {children}
    </VisualizationRelatedReadingContext.Provider>
  );
}

export function useVisualizationRelatedReading(): readonly VisualizationRelatedReadingLink[] {
  return useContext(VisualizationRelatedReadingContext);
}
