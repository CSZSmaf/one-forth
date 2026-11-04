"use client";

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";

const TAU = Math.PI * 2;
const REFERENCE_AMPLITUDE = 46;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function pathForPhase(phase: number, amplitude: number): string {
  return Array.from({ length: 101 }, (_, index) => {
    const x = (index / 100) * 720;
    const angle = (index / 100) * Math.PI * 4;
    const y = 132 - Math.sin(angle + phase) * amplitude;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function HomeMathField() {
  const patternId = useId().replaceAll(":", "");
  const [phase, setPhase] = useState(0.7);
  const [amplitude, setAmplitude] = useState(46);
  const primary = useMemo(() => pathForPhase(phase, amplitude), [amplitude, phase]);
  const reference = useMemo(() => pathForPhase(0, REFERENCE_AMPLITUDE), []);

  const updatePhaseFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const ratio = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    setPhase(ratio * TAU);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePhaseFromPointer(event);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      updatePhaseFromPointer(event);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.5 : 0.1;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setPhase((value) => clamp(value - step, 0, TAU));
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setPhase((value) => clamp(value + step, 0, TAU));
    } else if (event.key === "Home") {
      event.preventDefault();
      setPhase(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setPhase(TAU);
    }
  };

  const phaseText = phase.toFixed(2);
  const observation = `峰值与谷值约为 ±${amplitude}；相较参考函数，图像向左平移 ${phaseText} 弧度。`;

  return (
    <figure className="home-field" aria-labelledby="home-field-title">
      <div className="home-field__header">
        <figcaption id="home-field-title">
          <span>正弦函数参数实验</span>
          <strong>观察振幅与相位怎样改变同一个函数。</strong>
        </figcaption>
        <div
          className="home-field__equation"
          aria-label={`函数 f 括号 x 等于 ${amplitude} 乘正弦 x 加 ${phaseText}`}
        >
          f(x) = {amplitude} sin(x + {phaseText})
        </div>
      </div>
      <div
        className="home-field__canvas"
        role="slider"
        tabIndex={0}
        aria-label="在函数图像中调整相位"
        aria-valuemin={0}
        aria-valuemax={Number(TAU.toFixed(2))}
        aria-valuenow={Number(phaseText)}
        aria-valuetext={`${phaseText} 弧度`}
        aria-describedby="home-field-description"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <svg viewBox="0 0 720 264" aria-hidden="true">
          <defs>
            <pattern id={patternId} width="36" height="33" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 33" fill="none" className="home-field__minor-grid" />
            </pattern>
          </defs>
          <rect width="720" height="264" fill={`url(#${patternId})`} />
          <line x1="0" y1="132" x2="720" y2="132" className="axis" />
          <line x1="360" y1="0" x2="360" y2="264" className="axis" />
          <path d={reference} className="math-path math-path--secondary" />
          <path d={primary} className="math-path" />
          <circle
            cx="360"
            cy={132 - Math.sin(Math.PI * 2 + phase) * amplitude}
            r="5"
            className="math-point"
          />
        </svg>
      </div>
      <p id="home-field-description" className="home-field__observation" aria-live="polite">
        {observation} 实线是当前函数，虚线是参考函数 46
        sin(x)。可在图中左右拖动，或用方向键微调相位。
      </p>
      <div className="home-field__controls">
        <label>
          振幅 A
          <input
            aria-label="振幅 A"
            type="range"
            min="18"
            max="82"
            value={amplitude}
            onChange={(event) => setAmplitude(Number(event.target.value))}
          />
          <output>{amplitude}</output>
        </label>
        <label>
          相位 φ
          <input
            aria-label="相位 φ"
            type="range"
            min="0"
            max={TAU}
            step="0.05"
            value={phase}
            onChange={(event) => setPhase(Number(event.target.value))}
          />
          <output>{phaseText}</output>
        </label>
      </div>
    </figure>
  );
}
