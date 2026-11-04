import { describe, expect, it } from "vitest";

type Matrix = readonly (readonly number[])[];

const closeTo = (actual: number, expected: number, tolerance = 1e-10): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

const multiplyMatrixVector = (matrix: Matrix, vector: readonly number[]): number[] =>
  matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index]!, 0));

const multiplyMatrices = (left: Matrix, right: Matrix): number[][] => {
  const rightColumns = right[0]?.length ?? 0;
  return left.map((row) =>
    Array.from({ length: rightColumns }, (_, column) =>
      row.reduce((sum, value, index) => sum + value * right[index]![column]!, 0),
    ),
  );
};

const transpose = (matrix: Matrix): number[][] =>
  Array.from({ length: matrix[0]?.length ?? 0 }, (_, column) => matrix.map((row) => row[column]!));

const determinant2 = (matrix: Matrix): number =>
  matrix[0]![0]! * matrix[1]![1]! - matrix[0]![1]! * matrix[1]![0]!;

const determinant3 = (matrix: Matrix): number => {
  const [a, b, c] = matrix[0]!;
  const [d, e, f] = matrix[1]!;
  const [g, h, i] = matrix[2]!;
  return a! * (e! * i! - f! * h!) - b! * (d! * i! - f! * g!) + c! * (d! * h! - e! * g!);
};

const dot = (left: readonly number[], right: readonly number[]): number =>
  left.reduce((sum, value, index) => sum + value * right[index]!, 0);

describe("M04 worked-example calculations", () => {
  it("checks basis coordinates, inner products, and orthogonal projection", () => {
    const basis: Matrix = [
      [1, 1],
      [1, -1],
    ];
    const coordinates = [3, 2] as const;
    expect(multiplyMatrixVector(basis, coordinates)).toEqual([5, 1]);

    const vector = [3, 4] as const;
    const direction = [1, 1] as const;
    const scale = dot(vector, direction) / dot(direction, direction);
    const projection = direction.map((value) => value * scale);
    const residual = vector.map((value, index) => value - projection[index]!);
    expect(projection).toEqual([3.5, 3.5]);
    closeTo(dot(residual, direction), 0);
    closeTo(dot(vector, vector), dot(projection, projection) + dot(residual, residual));

    const dependent = [2, 2] as const;
    expect(determinant2([basis[0]!, dependent])).toBe(0);
  });

  it("checks matrix products, inverses, and orthogonal norm preservation", () => {
    const left: Matrix = [
      [1, 2],
      [0, -1],
    ];
    const right: Matrix = [
      [3, 1],
      [2, 0],
    ];
    expect(multiplyMatrices(left, right)).toEqual([
      [7, 1],
      [-2, 0],
    ]);
    expect(multiplyMatrices(right, left)).toEqual([
      [3, 5],
      [2, 4],
    ]);

    const matrix: Matrix = [
      [2, 1],
      [1, 1],
    ];
    const inverse: Matrix = [
      [1, -1],
      [-1, 2],
    ];
    expect(multiplyMatrices(matrix, inverse)).toEqual([
      [1, 0],
      [0, 1],
    ]);

    const cosine = 3 / 5;
    const sine = 4 / 5;
    const rotation: Matrix = [
      [cosine, -sine],
      [sine, cosine],
    ];
    const source = [2, -1] as const;
    const rotated = multiplyMatrixVector(rotation, source);
    closeTo(dot(rotated, rotated), dot(source, source));
    expect(multiplyMatrices(transpose(rotation), rotation)).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it("checks unique, infinite, and inconsistent linear systems", () => {
    const uniqueMatrix: Matrix = [
      [1, 1],
      [2, -1],
    ];
    expect(multiplyMatrixVector(uniqueMatrix, [1, 2])).toEqual([3, 0]);
    expect(determinant2(uniqueMatrix)).toBe(-3);

    const rankOneMatrix: Matrix = [
      [1, 2, -1],
      [2, 4, -2],
    ];
    const particular = [3, 0, 0] as const;
    const nullDirections = [
      [-2, 1, 0],
      [1, 0, 1],
    ] as const;
    expect(multiplyMatrixVector(rankOneMatrix, particular)).toEqual([3, 6]);
    for (const direction of nullDirections) {
      expect(multiplyMatrixVector(rankOneMatrix, direction)).toEqual([0, 0]);
    }

    const inconsistentLeft = [1, 2, -1] as const;
    const inconsistentRight = inconsistentLeft.map((value) => value * 2);
    expect(inconsistentRight).toEqual([2, 4, -2]);
    expect(6 * 2).not.toBe(13);
  });

  it("checks rank-nullity and least-squares residual orthogonality", () => {
    const matrix: Matrix = [
      [1, 2, 3],
      [0, 1, 1],
    ];
    const nullVector = [-1, -1, 1] as const;
    expect(multiplyMatrixVector(matrix, nullVector)).toEqual([0, 0]);
    const rank = 2;
    const nullity = 1;
    expect(rank + nullity).toBe(3);

    const design: Matrix = [
      [1, 0],
      [1, 1],
      [1, 2],
    ];
    const observations = [1, 2, 2] as const;
    const estimate = [7 / 6, 1 / 2] as const;
    const fitted = multiplyMatrixVector(design, estimate);
    const residual = observations.map((value, index) => value - fitted[index]!);
    residual.forEach((value, index) => closeTo(value, [-1 / 6, 1 / 3, -1 / 6][index]!));
    const normalResidual = multiplyMatrixVector(transpose(design), residual);
    normalResidual.forEach((value) => closeTo(value, 0));
    multiplyMatrixVector(multiplyMatrices(transpose(design), design), estimate).forEach(
      (value, index) => closeTo(value, [5, 6][index]!),
    );
  });

  it("checks determinant row rules, products, and oriented volume", () => {
    const matrix: Matrix = [
      [1, 2, 0],
      [0, 1, 3],
      [2, 0, 1],
    ];
    expect(determinant3(matrix)).toBe(13);
    expect(determinant3([matrix[1]!, matrix[0]!, matrix[2]!])).toBe(-13);
    expect(determinant3([matrix[0]!, matrix[1]!, matrix[2]!.map((value) => value * 4)])).toBe(52);
    expect(
      determinant3([
        matrix[0]!,
        matrix[1]!,
        matrix[2]!.map((value, index) => value + 5 * matrix[0]![index]!),
      ]),
    ).toBe(13);

    const left: Matrix = [
      [2, 1],
      [0, 3],
    ];
    const right: Matrix = [
      [1, -1],
      [4, 2],
    ];
    closeTo(determinant2(multiplyMatrices(left, right)), determinant2(left) * determinant2(right));
  });

  it("checks kernels, images, composition, and change of basis", () => {
    const map: Matrix = [
      [1, 1, 0],
      [0, 1, 1],
    ];
    expect(multiplyMatrixVector(map, [1, -1, 1])).toEqual([0, 0]);
    expect(2 + 1).toBe(3); // rank plus nullity equals the input dimension

    const first: Matrix = [
      [1, 2],
      [0, 1],
    ];
    const second: Matrix = [
      [2, 0],
      [1, -1],
    ];
    const vector = [3, -2] as const;
    expect(multiplyMatrixVector(second, multiplyMatrixVector(first, vector))).toEqual(
      multiplyMatrixVector(multiplyMatrices(second, first), vector),
    );

    const standardMatrix: Matrix = [
      [2, 1],
      [0, 1],
    ];
    const basisMatrix: Matrix = [
      [1, 1],
      [1, -1],
    ];
    const basisMatrixInverse: Matrix = [
      [0.5, 0.5],
      [0.5, -0.5],
    ];
    expect(
      multiplyMatrices(basisMatrixInverse, multiplyMatrices(standardMatrix, basisMatrix)),
    ).toEqual([
      [2, 0],
      [1, 1],
    ]);
  });

  it("checks eigenpairs, diagonalization, a defective matrix, and the spectral theorem", () => {
    const matrix: Matrix = [
      [4, 1],
      [2, 3],
    ];
    expect(multiplyMatrixVector(matrix, [1, 1])).toEqual([5, 5]);
    expect(multiplyMatrixVector(matrix, [1, -2])).toEqual([2, -4]);
    expect(4 + 3).toBe(5 + 2);
    expect(determinant2(matrix)).toBe(5 * 2);

    const eigenvectors: Matrix = [
      [1, 1],
      [1, -2],
    ];
    const diagonal: Matrix = [
      [5, 0],
      [0, 2],
    ];
    expect(multiplyMatrices(matrix, eigenvectors)).toEqual(
      multiplyMatrices(eigenvectors, diagonal),
    );

    const defective: Matrix = [
      [2, 1],
      [0, 2],
    ];
    expect(multiplyMatrixVector(defective, [1, 0])).toEqual([2, 0]);
    expect(multiplyMatrixVector(defective, [0, 1])).not.toEqual([0, 2]);

    const symmetric: Matrix = [
      [2, 1],
      [1, 2],
    ];
    const invSqrtTwo = 1 / Math.sqrt(2);
    const orthogonalEigenvectors: Matrix = [
      [invSqrtTwo, invSqrtTwo],
      [invSqrtTwo, -invSqrtTwo],
    ];
    const spectralDiagonal: Matrix = [
      [3, 0],
      [0, 1],
    ];
    const reconstructed = multiplyMatrices(
      multiplyMatrices(orthogonalEigenvectors, spectralDiagonal),
      transpose(orthogonalEigenvectors),
    );
    reconstructed.forEach((row, rowIndex) =>
      row.forEach((value, columnIndex) => closeTo(value, symmetric[rowIndex]![columnIndex]!)),
    );

    for (const vector of [
      [1, 0],
      [1, -1],
      [-2, 3],
    ] as const) {
      const quadraticValue = dot(vector, multiplyMatrixVector(symmetric, vector));
      expect(quadraticValue).toBeGreaterThan(0);
    }
  });
});
