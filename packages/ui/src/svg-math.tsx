import { StaticMath } from "./static-math";
import { MathLabel } from "./math-label";
import type { ReactNode } from "react";

interface SvgMathFrameProps {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height?: number;
  readonly label: string;
  readonly align?: "left" | "center" | "right";
  readonly fontSize?: number;
  readonly children: ReactNode;
}

function SvgMathFrame({
  x,
  y,
  width,
  height = 32,
  children,
  label,
  align = "left",
  fontSize = 14,
}: SvgMathFrameProps) {
  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      data-math-export-label={label}
      data-math-export-align={align}
      data-math-export-size={fontSize}
    >
      <div className="svg-math" style={{ fontSize, textAlign: align }}>
        {children}
      </div>
    </foreignObject>
  );
}

/** KaTeX inside an SVG viewport, with a native-text equivalent for image export. */
export function SvgMath({
  latex,
  ...props
}: Omit<SvgMathFrameProps, "children"> & { readonly latex: string }) {
  return (
    <SvgMathFrame {...props}>
      <StaticMath latex={latex} label={props.label} />
    </SvgMathFrame>
  );
}

export function SvgMathText({
  value,
  ...props
}: Omit<SvgMathFrameProps, "children"> & { readonly value: string }) {
  return (
    <SvgMathFrame {...props}>
      <MathLabel value={value} label={props.label} />
    </SvgMathFrame>
  );
}
