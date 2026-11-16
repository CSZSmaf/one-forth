"use client";

import type { SupportedLocale } from "@one-forth/config";
import { decodeVisualizationState, encodeVisualizationState } from "@one-forth/visualization";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UrlBackedState, VisualizationId } from "./types";

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface NumberBounds {
  readonly minimum?: number;
  readonly maximum?: number;
}

export function readNumber(
  record: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
  bounds: NumberBounds = {},
): number {
  const candidate = record[key];
  if (typeof candidate !== "number" || !Number.isFinite(candidate)) return fallback;
  return Math.min(
    bounds.maximum ?? Number.POSITIVE_INFINITY,
    Math.max(bounds.minimum ?? Number.NEGATIVE_INFINITY, candidate),
  );
}

export function readInputNumber(
  value: string,
  fallback: number,
  bounds: NumberBounds = {},
): number {
  const candidate = Number(value);
  if (!Number.isFinite(candidate)) return fallback;
  return Math.min(
    bounds.maximum ?? Number.POSITIVE_INFINITY,
    Math.max(bounds.minimum ?? Number.NEGATIVE_INFINITY, candidate),
  );
}

const playbackSpeeds = [0.25, 0.5, 1, 1.5, 2] as const;

export function readPlaybackSpeed(
  record: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const candidate = readNumber(record, key, fallback, { minimum: 0.25, maximum: 2 });
  return playbackSpeeds.reduce(
    (nearest, speed) =>
      Math.abs(speed - candidate) < Math.abs(nearest - candidate) ? speed : nearest,
    fallback,
  );
}

export function readInteger(
  record: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
  bounds: NumberBounds = {},
): number {
  return Math.round(readNumber(record, key, fallback, bounds));
}

export function readBoolean(
  record: Readonly<Record<string, unknown>>,
  key: string,
  fallback: boolean,
): boolean {
  return typeof record[key] === "boolean" ? record[key] : fallback;
}

export function readEnum<const TValue extends string>(
  record: Readonly<Record<string, unknown>>,
  key: string,
  values: readonly TValue[],
  fallback: TValue,
): TValue {
  const candidate = record[key];
  return typeof candidate === "string" && values.some((value) => value === candidate)
    ? (candidate as TValue)
    : fallback;
}

export function useUrlBackedVisualizationState<TState>(
  id: VisualizationId,
  initialState: TState,
  validate: (value: unknown) => TState,
  toRecord: (state: TState) => Readonly<Record<string, unknown>>,
  locale: SupportedLocale = "zh-CN",
): UrlBackedState<TState> {
  const [state, setInternalState] = useState<TState>(initialState);
  const [notice, setNotice] = useState<string | null>(null);
  const restoredRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get("state");
    if (url.searchParams.get("viz") !== id || !encoded) return;
    const timeout = window.setTimeout(() => {
      restoredRef.current = true;
      try {
        setInternalState(validate(decodeVisualizationState(encoded)));
        setNotice(
          locale === "zh-CN"
            ? "已从分享链接恢复实验状态。"
            : "Experiment state restored from the shared URL.",
        );
      } catch {
        setNotice(
          locale === "zh-CN"
            ? "分享状态无法解析，已使用安全默认值。"
            : "The shared state could not be parsed; safe defaults are in use.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [id, locale, validate]);

  const setState = useCallback<Dispatch<SetStateAction<TState>>>((nextState) => {
    dirtyRef.current = true;
    setInternalState(nextState);
  }, []);

  const encodedState = encodeVisualizationState(toRecord(state));

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timeout = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("viz", id);
      url.searchParams.set("state", encodedState);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [encodedState, id]);

  const shareUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("viz", id);
    url.searchParams.set("state", encodeVisualizationState(toRecord(state)));
    return url.toString();
  }, [id, state, toRecord]);

  return { state, setState, shareUrl, notice };
}
