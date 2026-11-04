"use client";

import { lazy } from "react";
import type { LazyExoticComponent } from "react";
import type { DescriptorExperimentId } from "./science/descriptor-experiment-models";
import type { VisualizationComponent, VisualizationComponentProps, VisualizationId } from "./types";

function descriptorVisualization(
  id: DescriptorExperimentId,
): LazyExoticComponent<VisualizationComponent> {
  return lazy(async () => {
    const loaded = await import("./descriptor-visualization");
    return {
      default: (props: VisualizationComponentProps) => (
        <loaded.DescriptorVisualization {...props} id={id} />
      ),
    };
  });
}

const visualizationRegistry: Readonly<
  Record<VisualizationId, LazyExoticComponent<VisualizationComponent>>
> = {
  "linear-transform-2d": lazy(async () => {
    const loaded = await import("./linear-transform-2d");
    return { default: loaded.LinearTransform2D };
  }),
  "gradient-descent": lazy(async () => {
    const loaded = await import("./gradient-descent");
    return { default: loaded.GradientDescent };
  }),
  "gradient-field": lazy(async () => {
    const loaded = await import("./gradient-field");
    return { default: loaded.GradientField };
  }),
  "backprop-computation-graph": lazy(async () => {
    const loaded = await import("./backprop-computation-graph");
    return { default: loaded.BackpropComputationGraph };
  }),
  "neural-decision-boundary": lazy(async () => {
    const loaded = await import("./neural-decision-boundary");
    return { default: loaded.NeuralDecisionBoundary };
  }),
  "wave-equation-1d": lazy(async () => {
    const loaded = await import("./wave-equation-1d");
    return { default: loaded.WaveEquation1D };
  }),
  "fourier-harmonic-superposition": lazy(async () => {
    const loaded = await import("./fourier-harmonic-superposition");
    return { default: loaded.FourierHarmonicSuperposition };
  }),
  "attention-weight-matrix": lazy(async () => {
    const loaded = await import("./attention-weight-matrix");
    return { default: loaded.AttentionWeightMatrix };
  }),
  "probability-sampling-convergence": descriptorVisualization("probability-sampling-convergence"),
  "confidence-coverage": descriptorVisualization("confidence-coverage"),
  "phase-space-chaos": descriptorVisualization("phase-space-chaos"),
  "coulomb-gauss-field": descriptorVisualization("coulomb-gauss-field"),
  "quantum-measurement": descriptorVisualization("quantum-measurement"),
  "algorithm-complexity-trace": descriptorVisualization("algorithm-complexity-trace"),
  "ode-stability-convergence": descriptorVisualization("ode-stability-convergence"),
  "pinn-residual-training": descriptorVisualization("pinn-residual-training"),
  "function-graph-transform": descriptorVisualization("function-graph-transform"),
  "riemann-sum-convergence": descriptorVisualization("riemann-sum-convergence"),
  "birthday-paradox-simulation": descriptorVisualization("birthday-paradox-simulation"),
  "damped-oscillator-regimes": descriptorVisualization("damped-oscillator-regimes"),
  "projectile-motion": descriptorVisualization("projectile-motion"),
  "maxwell-speed-distribution": descriptorVisualization("maxwell-speed-distribution"),
  "least-squares-regression": descriptorVisualization("least-squares-regression"),
  "epsilon-greedy-bandit": descriptorVisualization("epsilon-greedy-bandit"),
};

interface RegisteredVisualizationProps extends VisualizationComponentProps {
  readonly id: VisualizationId;
}

export function RegisteredVisualization({ id, locale }: RegisteredVisualizationProps) {
  const Visualization = visualizationRegistry[id];
  return <Visualization locale={locale} />;
}
