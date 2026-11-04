import type { SupportedLocale } from "@one-forth/config";
import type { ComponentType, Dispatch, SetStateAction } from "react";

export const visualizationIds = [
  "linear-transform-2d",
  "gradient-descent",
  "gradient-field",
  "backprop-computation-graph",
  "neural-decision-boundary",
  "wave-equation-1d",
  "fourier-harmonic-superposition",
  "attention-weight-matrix",
  "probability-sampling-convergence",
  "confidence-coverage",
  "phase-space-chaos",
  "coulomb-gauss-field",
  "quantum-measurement",
  "algorithm-complexity-trace",
  "ode-stability-convergence",
  "pinn-residual-training",
  "function-graph-transform",
  "riemann-sum-convergence",
  "birthday-paradox-simulation",
  "damped-oscillator-regimes",
  "projectile-motion",
  "maxwell-speed-distribution",
  "least-squares-regression",
  "epsilon-greedy-bandit",
] as const;

export type VisualizationId = (typeof visualizationIds)[number];

export interface VisualizationComponentProps {
  readonly locale: SupportedLocale;
}

export type VisualizationComponent = ComponentType<VisualizationComponentProps>;

export interface VisualizationExportHandlers {
  readonly toSvg: () => string;
  readonly toPng: () => Promise<Blob>;
}

export interface PlaybackState {
  readonly step: number;
  readonly maximumStep: number;
  readonly speed: number;
  readonly isPlaying: boolean;
  readonly toggle: () => void;
  readonly pause: () => void;
  readonly stepBackward: () => void;
  readonly stepForward: () => void;
  readonly seek?: (step: number) => void;
  readonly minimumStep?: number;
}

export interface UrlBackedState<TState> {
  readonly state: TState;
  readonly setState: Dispatch<SetStateAction<TState>>;
  readonly shareUrl: () => string;
  readonly notice: string | null;
}

export function isVisualizationId(value: string): value is VisualizationId {
  return visualizationIds.some((id) => id === value);
}
