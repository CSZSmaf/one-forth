import { describe, expect, it } from "vitest";
import { SimulationRuntime } from "./index";

interface TestTasks {
  readonly double: { readonly input: number; readonly output: number };
}

describe("simulation runtime", () => {
  it("executes a typed task", async () => {
    const runtime = new SimulationRuntime<TestTasks>({
      double: {
        id: "double",
        version: 1,
        run: async (input, context) => {
          context.reportProgress(1);
          return input * 2;
        },
      },
    });
    await expect(runtime.execute("double", 3)).resolves.toBe(6);
  });
});
