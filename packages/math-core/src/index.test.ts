import { describe, expect, it } from "vitest";
import {
  binomialCoefficient,
  createSeededRandom,
  determinant2,
  interpolateMatrix,
  multiplyMatrixVector,
} from "./index";

describe("math core", () => {
  it("applies a two-dimensional linear transformation", () => {
    expect(multiplyMatrixVector([2, 1, 0, -1], { x: 3, y: 4 })).toEqual({ x: 10, y: -4 });
    expect(determinant2([2, 1, 0, -1])).toBe(-2);
  });

  it("interpolates from the identity matrix", () => {
    expect(interpolateMatrix([1, 0, 0, 1], [3, 2, 1, -1], 0.5)).toEqual([2, 1, 0.5, 0]);
  });

  it("replays seeded random sequences", () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("computes exact binomial coefficients without factorials", () => {
    expect(binomialCoefficient(0, 0)).toBe(1n);
    expect(binomialCoefficient(10, 3)).toBe(120n);
    expect(binomialCoefficient(60, 30)).toBe(118_264_581_564_861_424n);
    expect(binomialCoefficient(10, 7)).toBe(binomialCoefficient(10, 3));
    expect(binomialCoefficient(10, -1)).toBe(0n);
    expect(binomialCoefficient(10, 11)).toBe(0n);
    expect(() => binomialCoefficient(1.5, 1)).toThrow(RangeError);
  });
});
