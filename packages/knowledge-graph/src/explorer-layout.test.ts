import { describe, expect, it } from "vitest";
import {
  focusLayout,
  graphBounds,
  neighbourhood,
  overviewLayout,
  overviewLabels,
} from "./explorer-layout";

const nodes = Array.from({ length: 40 }, (_, index) => ({
  index,
  title: `Concept ${index}`,
  domain: "example",
  x: 100,
  y: 100,
}));
describe("graph exploration layout", () => {
  it("prioritizes the focused label when labels collide and omits off-screen labels", () => {
    const labels = overviewLabels(
      [
        { index: 0, x: 0, y: 0, width: 44, height: 44, title: "First concept", priority: 1 },
        { index: 1, x: 20, y: 0, width: 44, height: 44, title: "Focused concept", priority: 100 },
        { index: 2, x: 1000, y: 0, width: 44, height: 44, title: "Off-screen", priority: 1 },
      ],
      { x: -50, y: -50, width: 400, height: 200 },
      1,
    );
    expect([...labels]).toEqual([1]);
  });
  it("keeps only incident relations, retains an isolated center, and ignores filtered endpoints", () => {
    const edges = [
      { source: 0, target: 1, direction: "directed" },
      { source: 1, target: 2, direction: "directed" },
      { source: 0, target: 3, direction: "bidirectional" },
    ] as const;
    expect(neighbourhood(nodes, edges, 0).nodes.map((n) => n.index)).toEqual([0, 1, 3]);
    expect(neighbourhood(nodes.slice(0, 3), edges, 0).edges).toHaveLength(1);
    expect(neighbourhood(nodes, edges, 39).nodes.map((n) => n.index)).toEqual([39]);
  });
  it("lays out crowded generated coordinates deterministically without overlapping nodes", () => {
    const result = overviewLayout(nodes);
    expect(result).toEqual(overviewLayout(nodes));
    for (const a of result)
      for (const b of result) {
        if (a.index >= b.index) continue;
        expect(
          Math.abs(a.x - b.x) >= (a.width + b.width) / 2 ||
            Math.abs(a.y - b.y) >= (a.height + b.height) / 2,
        ).toBe(true);
      }
  });
  it("separates incoming and outgoing branches without shrinking long lists", () => {
    const edges = nodes.slice(1).map((n) => ({
      source: n.index === 1 ? 1 : 0,
      target: n.index === 1 ? 0 : n.index,
      direction: "directed" as const,
    }));
    const positions = focusLayout(nodes, edges, 0);
    expect(positions.find((n) => n.index === 1)?.x).toBeLessThan(0);
    expect(positions.filter((n) => n.index > 1).every((n) => n.x > 0)).toBe(true);
    expect(new Set(positions.filter((n) => n.index > 1).map((n) => n.x)).size).toBe(1);
    const bounds = graphBounds(positions);
    expect(bounds.height).toBeGreaterThan(3000);
    expect(
      positions.every((n) => n.x - n.width / 2 > bounds.x && n.y - n.height / 2 > bounds.y),
    ).toBe(true);
  });
});
