/** Authored, static teaching diagrams. Coordinates are in each panel's SVG view box. */
export type DiagramTone =
  | "ink"
  | "muted"
  | "input"
  | "output"
  | "positive"
  | "negative"
  | "gradient"
  | "wave";

interface DiagramStyle {
  readonly tone?: DiagramTone;
  readonly fill?: "none" | "surface" | "tint" | "solid";
  readonly dashed?: boolean;
  readonly strokeWidth?: number;
}

export type DiagramElement =
  | (DiagramStyle & {
      readonly kind: "line";
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly arrow?: boolean;
    })
  | (DiagramStyle & { readonly kind: "path"; readonly d: string; readonly arrow?: boolean })
  | (DiagramStyle & {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    })
  | (DiagramStyle & {
      readonly kind: "circle";
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
    })
  | (DiagramStyle & {
      readonly kind: "ellipse";
      readonly cx: number;
      readonly cy: number;
      readonly rx: number;
      readonly ry: number;
    })
  | {
      readonly kind: "text";
      readonly x: number;
      readonly y: number;
      readonly text: string;
      readonly anchor?: "start" | "middle" | "end";
      readonly size?: number;
      readonly weight?: "normal" | "bold";
      readonly tone?: DiagramTone;
    }
  | {
      readonly kind: "math";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height?: number;
      readonly latex: string;
      readonly label: string;
      readonly align?: "left" | "center" | "right";
      readonly size?: number;
      readonly tone?: DiagramTone;
    };

export interface TeachingFigurePanel {
  readonly title: string;
  readonly description: string;
  /** Use 320 so 18–20px labels remain readable on a narrow article. */
  readonly width: number;
  readonly height: number;
  readonly elements: readonly DiagramElement[];
}

export interface TeachingFigureData {
  readonly id: string;
  readonly bookId: string;
  readonly conceptId: string;
  readonly title: string;
  readonly caption: string;
  /** Exact paragraph or heading text in the MDX; insertion follows this block. */
  readonly after: string;
  readonly panels: readonly TeachingFigurePanel[];
  readonly source?: {
    readonly resourceId: string;
    readonly label: string;
    readonly url: string;
  };
}

export interface PaperFigureData {
  readonly id: string;
  readonly conceptId: string;
  readonly resourceId: string;
  readonly title: string;
  readonly caption: string;
  readonly alt: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly credit: string;
  readonly paperUrl: string;
  readonly licenseName: string;
  readonly licenseUrl: string;
}
