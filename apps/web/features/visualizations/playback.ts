"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlaybackState } from "./types";

interface PlaybackOptions {
  readonly step: number;
  readonly maximumStep: number;
  readonly speed: number;
  readonly onStepChange: (step: number) => void;
  readonly minimumStep?: number;
}

export function usePlayback({
  step,
  maximumStep,
  speed,
  onStepChange,
  minimumStep = 0,
}: PlaybackOptions): PlaybackState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)")?.matches ?? false;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const updatePreference = () => {
      setReducedMotion(media.matches);
      if (media.matches) setIsPlaying(false);
    };
    media.addEventListener?.("change", updatePreference);
    return () => media.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === "hidden") setIsPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    if (!isPlaying || step >= maximumStep) return;
    const timeout = window.setTimeout(
      () => {
        const nextStep = Math.min(maximumStep, step + 1);
        onStepChange(nextStep);
        if (nextStep >= maximumStep) setIsPlaying(false);
      },
      Math.max(40, Math.round(360 / speed)),
    );
    return () => window.clearTimeout(timeout);
  }, [isPlaying, maximumStep, onStepChange, speed, step]);

  const toggle = useCallback(() => {
    if (reducedMotion) {
      onStepChange(step >= maximumStep ? minimumStep : maximumStep);
      setIsPlaying(false);
      return;
    }
    if (step >= maximumStep) {
      onStepChange(minimumStep);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((current) => !current);
  }, [maximumStep, minimumStep, onStepChange, reducedMotion, step]);

  const pause = useCallback(() => setIsPlaying(false), []);
  const stepBackward = useCallback(() => {
    setIsPlaying(false);
    onStepChange(Math.max(minimumStep, step - 1));
  }, [minimumStep, onStepChange, step]);
  const stepForward = useCallback(() => {
    setIsPlaying(false);
    onStepChange(Math.min(maximumStep, step + 1));
  }, [maximumStep, onStepChange, step]);

  const seek = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return;
      setIsPlaying(false);
      onStepChange(Math.max(minimumStep, Math.min(maximumStep, Math.round(value))));
    },
    [maximumStep, minimumStep, onStepChange],
  );

  return {
    step,
    maximumStep,
    speed,
    isPlaying,
    toggle,
    pause,
    stepBackward,
    stepForward,
    seek,
    minimumStep,
  };
}
