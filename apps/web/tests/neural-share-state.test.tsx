import { StrictMode } from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeVisualizationState, decodeVisualizationState } from "@one-forth/visualization";
import { NeuralDecisionBoundary } from "@/features/visualizations/neural-decision-boundary";
import { trainDeterministicNeuralNetwork } from "@/features/visualizations/science/neural-attention-models";
import {
  isRecord,
  readInteger,
  useUrlBackedVisualizationState,
} from "@/features/visualizations/state";

const options = {
  dataset: "moons",
  hiddenWidth: 5,
  activation: "tanh",
  learningRate: 0.08,
  epochs: 80,
  seed: 17,
} as const;
const originalWorker = globalThis.Worker;

class TrainingWorker {
  static instances: TrainingWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  taskId = 0;
  constructor() {
    TrainingWorker.instances.push(this);
  }
  postMessage(message: { readonly taskId: number }) {
    this.taskId = message.taskId;
  }
  terminate() {}
  complete(lastEpoch = 80) {
    const training = trainDeterministicNeuralNetwork(options);
    this.onmessage?.(
      new MessageEvent("message", {
        data: {
          type: "result",
          taskId: this.taskId,
          snapshots: training.snapshots.slice(0, lastEpoch + 1),
        },
      }),
    );
  }
}

describe("neural experiment shared state", () => {
  it("keeps later user edits when opening an experiment without shared state", async () => {
    window.history.replaceState({}, "", "/zh-CN/playground");
    const { result } = renderHook(() =>
      useUrlBackedVisualizationState(
        "gradient-descent",
        { step: 0 },
        (value) => ({ step: isRecord(value) ? readInteger(value, "step", 0) : 0 }),
        (state) => ({ ...state }),
      ),
    );
    act(() => result.current.setState({ step: 1 }));
    await waitFor(() =>
      expect(new URL(window.location.href).searchParams.get("state")).not.toBeNull(),
    );
    act(() => result.current.setState({ step: 2 }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
    expect(result.current.state.step).toBe(2);
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      writable: true,
      value: originalWorker,
    });
  });

  it.each([false, true])(
    "keeps a shared nonzero epoch after training (StrictMode=%s)",
    async (strict) => {
      TrainingWorker.instances = [];
      Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        writable: true,
        value: TrainingWorker,
      });
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      const encoded = encodeVisualizationState({ ...options, step: 30, speed: 1 });
      window.history.replaceState(
        {},
        "",
        `/zh-CN/playground?viz=neural-decision-boundary&state=${encoded}`,
      );
      const component = <NeuralDecisionBoundary locale="zh-CN" />;
      render(strict ? <StrictMode>{component}</StrictMode> : component);
      await screen.findByText("已从分享链接恢复实验状态。");
      const worker = TrainingWorker.instances.at(-1);
      if (!worker) throw new Error("The training worker did not start.");
      act(() => worker.complete());
      await waitFor(() =>
        expect(screen.getByText("epoch").nextElementSibling).toHaveTextContent("30"),
      );
      await new Promise((resolve) => setTimeout(resolve, 150));
      const shared = new URL(window.location.href).searchParams.get("state");
      expect(shared && decodeVisualizationState(shared)).toMatchObject({ step: 30 });
      fireEvent.click(screen.getByRole("button", { name: "重新训练" }));
      const retrained = TrainingWorker.instances.at(-1);
      if (!retrained || retrained === worker)
        throw new Error("Retraining did not create a new task.");
      act(() => retrained.complete(10));
      await waitFor(() =>
        expect(screen.getByText("epoch").nextElementSibling).toHaveTextContent("0"),
      );
    },
  );
});
