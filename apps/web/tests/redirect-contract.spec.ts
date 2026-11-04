import {
  learningPathAliases,
  readerConceptById,
  readerContentRepository,
  readerCurriculumRedirects,
  readerCurriculumRepository,
  type CurriculumRedirect,
} from "@one-forth/content";
import { expect, test } from "@playwright/test";

const permanentStatuses = new Set([301, 308]);
const redirectConcurrency = 12;

interface RedirectProbe {
  readonly sourcePath: string;
  readonly targetPath: string;
  readonly kind: CurriculumRedirect["kind"];
  readonly status: number | null;
  readonly expectedLocation: string;
  readonly actualLocation: string | null;
  readonly error: string | null;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<readonly R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async (): Promise<void> => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        const item = items[index];
        if (item === undefined) throw new Error(`Missing redirect fixture at index ${index}`);
        results[index] = await worker(item);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

test.describe("reader-safe permanent redirect contract", () => {
  test("all readable registry redirects return one permanent hop to the exact target", async ({
    request,
  }) => {
    test.setTimeout(180_000);
    const documents = await readerContentRepository.listDocuments({ locale: "zh-CN" });
    const expectedPathCount = learningPathAliases.filter((alias) =>
      readerCurriculumRepository.getBook(alias.targetBookId),
    ).length;
    expect(readerCurriculumRedirects).toHaveLength(
      documents.length + readerConceptById.size + expectedPathCount + 128,
    );
    expect(readerCurriculumRedirects.filter((entry) => entry.kind === "legacy-learn")).toHaveLength(
      documents.length,
    );
    expect(
      readerCurriculumRedirects.filter((entry) => entry.kind === "legacy-concept"),
    ).toHaveLength(readerConceptById.size);
    expect(readerCurriculumRedirects.filter((entry) => entry.kind === "legacy-path")).toHaveLength(
      expectedPathCount,
    );

    const baseURL = test.info().project.use.baseURL;
    if (typeof baseURL !== "string") throw new Error("Playwright baseURL is required");
    const probes = await mapWithConcurrency(
      readerCurriculumRedirects,
      redirectConcurrency,
      async (entry): Promise<RedirectProbe> => {
        const requestUrl = new URL(entry.sourcePath, baseURL).toString();
        const expectedLocation = new URL(entry.targetPath, baseURL).toString();
        try {
          const response = await request.get(requestUrl, { maxRedirects: 0, timeout: 20_000 });
          const rawLocation = response.headers().location;
          return {
            ...entry,
            status: response.status(),
            expectedLocation,
            actualLocation: rawLocation ? new URL(rawLocation, requestUrl).toString() : null,
            error: null,
          };
        } catch (error) {
          return {
            ...entry,
            status: null,
            expectedLocation,
            actualLocation: null,
            error: message(error),
          };
        }
      },
    );
    const failures = probes.filter(
      (probe) =>
        probe.error !== null ||
        probe.status === null ||
        !permanentStatuses.has(probe.status) ||
        probe.actualLocation !== probe.expectedLocation,
    );

    expect(failures, `Redirect sweep failures:\n${JSON.stringify(failures, null, 2)}`).toEqual([]);
  });
});
