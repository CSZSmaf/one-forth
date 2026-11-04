export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export type Matrix2 = readonly [number, number, number, number];

export function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(vector: Vector2, factor: number): Vector2 {
  return { x: vector.x * factor, y: vector.y * factor };
}

export function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

export function magnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}

export function normalize(vector: Vector2): Vector2 {
  const length = magnitude(vector);
  return length === 0 ? { x: 0, y: 0 } : scale(vector, 1 / length);
}

export function determinant2(matrix: Matrix2): number {
  const [a, b, c, d] = matrix;
  return a * d - b * c;
}

export function multiplyMatrixVector(matrix: Matrix2, vector: Vector2): Vector2 {
  const [a, b, c, d] = matrix;
  return { x: a * vector.x + b * vector.y, y: c * vector.x + d * vector.y };
}

export function interpolateMatrix(from: Matrix2, to: Matrix2, progress: number): Matrix2 {
  const t = Math.min(1, Math.max(0, progress));
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
    from[3] + (to[3] - from[3]) * t,
  ];
}

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Exact binomial coefficient for finite counting. The multiplicative form keeps
 * intermediate values integral and avoids factorial overflow.
 */
export function binomialCoefficient(n: number, k: number): bigint {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(k) || n < 0) {
    throw new RangeError("binomialCoefficient expects a non-negative safe integer n and integer k");
  }
  if (k < 0 || k > n) return 0n;

  const shorterSide = Math.min(k, n - k);
  let value = 1n;
  for (let index = 1; index <= shorterSide; index += 1) {
    value = (value * BigInt(n - shorterSide + index)) / BigInt(index);
  }
  return value;
}
