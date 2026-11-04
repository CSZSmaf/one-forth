"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}
export interface CanvasBounds extends CanvasPoint {
  readonly width: number;
  readonly height: number;
}
export interface CanvasView extends CanvasPoint {
  readonly scale: number;
}
const minZoom = 0.04,
  maxZoom = 2.5;

export function zoomCanvas(view: CanvasView, point: CanvasPoint, factor: number): CanvasView {
  const scale = Math.max(minZoom, Math.min(maxZoom, view.scale * factor));
  return {
    scale,
    x: point.x - ((point.x - view.x) * scale) / view.scale,
    y: point.y - ((point.y - view.y) * scale) / view.scale,
  };
}

export function constrainCanvas(
  view: CanvasView,
  bounds: CanvasBounds,
  size: CanvasBounds,
): CanvasView {
  const margin = Math.min(100, size.width / 4, size.height / 4);
  return {
    ...view,
    x: Math.max(
      margin - (bounds.x + bounds.width) * view.scale,
      Math.min(size.width - margin - bounds.x * view.scale, view.x),
    ),
    y: Math.max(
      margin - (bounds.y + bounds.height) * view.scale,
      Math.min(size.height - margin - bounds.y * view.scale, view.y),
    ),
  };
}

export function useCanvasViewport(bounds: CanvasBounds, center: CanvasPoint, resetKey: string) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ x: 0, y: 0, width: 1000, height: 680 });
  const [view, setView] = useState<CanvasView>({ x: 500, y: 340, scale: 1 });
  const viewRef = useRef(view);
  const frame = useRef(0);
  const pointers = useRef(new Map<number, CanvasPoint>());
  const gesture = useRef<{ points: Map<number, CanvasPoint>; view: CanvasView } | null>(null);
  const moved = useRef(false);
  const origin = useRef<CanvasPoint | null>(null);
  const environment = useRef({ bounds, size, center });
  environment.current = { bounds, size, center };

  const update = useCallback((next: CanvasView) => {
    viewRef.current = constrainCanvas(next, environment.current.bounds, environment.current.size);
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        setView(viewRef.current);
      });
  }, []);
  const reset = useCallback(
    (fit = false) => {
      const { bounds: b, size: s, center: c } = environment.current;
      const scale = fit
        ? Math.max(minZoom, Math.min(1.2, (s.width - 64) / b.width, (s.height - 100) / b.height))
        : Math.min(1, Math.max(0.9, s.width / 1100));
      const target = fit ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : c;
      update({ scale, x: s.width / 2 - target.x * scale, y: s.height / 2 - target.y * scale });
    },
    [update],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0)
        setSize({ x: 0, y: 0, width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    reset();
  }, [resetKey, reset, size.width, size.height]);
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const point = useCallback((clientX: number, clientY: number): CanvasPoint => {
    const rect = ref.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }, []);
  const zoom = useCallback(
    (factor: number, at?: CanvasPoint) => {
      const s = environment.current.size;
      update(zoomCanvas(viewRef.current, at ?? { x: s.width / 2, y: s.height / 2 }, factor));
    },
    [update],
  );
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? environment.current.size.height : 1;
      if (!event.ctrlKey && (event.shiftKey || Math.abs(event.deltaX) > 0)) {
        const dx = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
        update({
          ...viewRef.current,
          x: viewRef.current.x - dx * unit,
          y: viewRef.current.y - (event.shiftKey ? 0 : event.deltaY * unit),
        });
      } else
        zoom(
          Math.exp(
            -Math.max(-240, Math.min(240, event.deltaY * unit)) * (event.ctrlKey ? 0.008 : 0.002),
          ),
          point(event.clientX, event.clientY),
        );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [point, update, zoom]);

  const begin = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== "touch" && event.button !== 0 && event.button !== 1) return;
    if (!pointers.current.size) {
      moved.current = false;
      origin.current = point(event.clientX, event.clientY);
    }
    pointers.current.set(event.pointerId, point(event.clientX, event.clientY));
    gesture.current = { points: new Map(pointers.current), view: viewRef.current };
    if (pointers.current.size > 1) moved.current = true;
    if (event.target === event.currentTarget || pointers.current.size > 1)
      event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    const current = point(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, current);
    if (
      origin.current &&
      Math.hypot(current.x - origin.current.x, current.y - origin.current.y) > 5
    )
      moved.current = true;
    if (moved.current && !event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.setPointerCapture?.(event.pointerId);
    const start = [...gesture.current.points.values()],
      end = [...pointers.current.values()];
    const a = start[0],
      b = end[0];
    if (!a || !b) return;
    if (start[1] && end[1]) {
      const c = start[1],
        d = end[1];
      const middle = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
      const next = zoomCanvas(
        gesture.current.view,
        middle,
        Math.hypot(b.x - d.x, b.y - d.y) / Math.max(1, Math.hypot(a.x - c.x, a.y - c.y)),
      );
      update({
        ...next,
        x: next.x + (b.x + d.x) / 2 - middle.x,
        y: next.y + (b.y + d.y) / 2 - middle.y,
      });
    } else
      update({
        ...gesture.current.view,
        x: gesture.current.view.x + b.x - a.x,
        y: gesture.current.view.y + b.y - a.y,
      });
  };
  const end = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    gesture.current = pointers.current.size
      ? { points: new Map(pointers.current), view: viewRef.current }
      : null;
  };
  const keyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return;
    const distance = event.shiftKey ? 160 : 60;
    const step: Record<string, CanvasPoint> = {
      ArrowLeft: { x: distance, y: 0 },
      ArrowRight: { x: -distance, y: 0 },
      ArrowUp: { x: 0, y: distance },
      ArrowDown: { x: 0, y: -distance },
    };
    const delta = step[event.key];
    if (delta) {
      event.preventDefault();
      update({
        ...viewRef.current,
        x: viewRef.current.x + delta.x,
        y: viewRef.current.y + delta.y,
      });
    }
    if (["+", "=", "-", "0", "Home"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "0" || event.key === "Home") reset();
      else zoom(event.key === "-" ? 1 / 1.2 : 1.2);
    }
  };
  return {
    ref,
    size,
    view,
    zoom,
    reset,
    recenter: (target: CanvasPoint) =>
      update({
        ...viewRef.current,
        x: size.width / 2 - target.x * viewRef.current.scale,
        y: size.height / 2 - target.y * viewRef.current.scale,
      }),
    consumeDrag: () => moved.current,
    handlers: {
      onPointerDown: begin,
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
      onKeyDown: keyboard,
    },
  };
}
