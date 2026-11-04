export interface SimulationContext {
  readonly signal: AbortSignal;
  readonly version: number;
  readonly seed: number;
  reportProgress(progress: number): void;
}

export interface SimulationTask<TInput, TOutput> {
  readonly id: string;
  readonly version: number;
  run(input: TInput, context: SimulationContext): Promise<TOutput>;
}

export interface SimulationExecutionOptions {
  readonly seed?: number;
  readonly timeoutMilliseconds?: number;
  readonly onProgress?: (progress: number) => void;
}

type TaskShape<TTasks> = {
  readonly [TId in keyof TTasks]: { readonly input: unknown; readonly output: unknown };
};

type TaskCollection<TTasks extends TaskShape<TTasks>> = {
  readonly [TId in keyof TTasks]: SimulationTask<TTasks[TId]["input"], TTasks[TId]["output"]>;
};

export class SimulationRuntime<TTasks extends TaskShape<TTasks>> {
  readonly #tasks: TaskCollection<TTasks>;
  readonly #controllers = new Map<keyof TTasks, AbortController>();
  readonly #versions = new Map<keyof TTasks, number>();

  constructor(tasks: TaskCollection<TTasks>) {
    this.#tasks = tasks;
  }

  async execute<TId extends keyof TTasks>(
    id: TId,
    input: TTasks[TId]["input"],
    options: SimulationExecutionOptions = {},
  ): Promise<TTasks[TId]["output"]> {
    this.cancel(id);
    const controller = new AbortController();
    this.#controllers.set(id, controller);
    const version = (this.#versions.get(id) ?? 0) + 1;
    this.#versions.set(id, version);
    const timeoutMilliseconds = options.timeoutMilliseconds ?? 15_000;
    const timeout = setTimeout(() => controller.abort("timeout"), timeoutMilliseconds);

    try {
      const task = this.#tasks[id];
      return await task.run(input, {
        signal: controller.signal,
        version,
        seed: options.seed ?? 0,
        reportProgress: (progress) => options.onProgress?.(Math.min(1, Math.max(0, progress))),
      });
    } finally {
      clearTimeout(timeout);
      if (this.#controllers.get(id) === controller) this.#controllers.delete(id);
    }
  }

  cancel<TId extends keyof TTasks>(id: TId): void {
    this.#controllers.get(id)?.abort("cancelled");
    this.#controllers.delete(id);
  }
}
