import { describe, expect, it } from "vitest";
import { constrainCanvas, zoomCanvas } from "./canvas-viewport";

describe("canvas viewport", () => {
  it("keeps the world point beneath the pointer stationary during zoom", () => {
    const view = { x: 123, y: -80, scale: 0.8 },
      point = { x: 300, y: 220 };
    const next = zoomCanvas(view, point, 1.5);
    expect((point.x - next.x) / next.scale).toBeCloseTo((point.x - view.x) / view.scale);
    expect((point.y - next.y) / next.scale).toBeCloseTo((point.y - view.y) / view.scale);
    expect(zoomCanvas(view, point, 100).scale).toBe(2.5);
    expect(zoomCanvas(view, point, 0.001).scale).toBe(0.04);
  });
  it("prevents dragging every node out of view", () => {
    const bounds = { x: -200, y: -150, width: 400, height: 300 };
    const size = { x: 0, y: 0, width: 1000, height: 600 };
    for (const sign of [-1, 1]) {
      const v = constrainCanvas({ x: sign * 1e8, y: sign * 1e8, scale: 1 }, bounds, size);
      expect(v.x + bounds.x).toBeLessThan(size.width);
      expect(v.x + bounds.x + bounds.width).toBeGreaterThan(0);
      expect(v.y + bounds.y).toBeLessThan(size.height);
      expect(v.y + bounds.y + bounds.height).toBeGreaterThan(0);
    }
  });
});
