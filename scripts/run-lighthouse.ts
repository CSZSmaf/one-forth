import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Source = "local" | "production";
type FormFactor = "mobile" | "desktop";
type JsonRecord = Record<string, unknown>;

interface PageDefinition {
  readonly name: string;
  readonly location: string;
}

interface Options {
  readonly phase: string;
  readonly source: Source;
  readonly baseURL: string;
  readonly formFactor: FormFactor;
  readonly runs: number;
  readonly pages: readonly PageDefinition[];
}

interface LighthouseMetrics {
  readonly performanceScore: number | null;
  readonly lcpMs: number | null;
  readonly cls: number | null;
  readonly inpMs: number | null;
  readonly tbtMs: number | null;
  readonly primaryResponsiveness: "INP" | "TBT" | null;
  readonly primaryResponsivenessMs: number | null;
  readonly jsTransferBytes: number | null;
  readonly totalTransferBytes: number | null;
  readonly requestCount: number | null;
  readonly scriptRequestCount: number | null;
  readonly longTaskCount: number | null;
  readonly longTaskTotalMs: number | null;
  readonly longestTaskMs: number | null;
}

interface SuccessfulRun {
  readonly status: "ok";
  readonly run: number;
  readonly rawReport: string;
  readonly metrics: LighthouseMetrics;
  readonly diagnostic?: string;
}

interface FailedRun {
  readonly status: "error";
  readonly run: number;
  readonly rawReport: string;
  readonly error: string;
}

type RunResult = SuccessfulRun | FailedRun;

interface PageResult {
  readonly name: string;
  readonly location: string;
  readonly url: string;
  readonly successfulRuns: number;
  readonly failedRuns: number;
  readonly median: LighthouseMetrics | null;
  readonly runs: readonly RunResult[];
}

const defaultPages: readonly PageDefinition[] = [
  { name: "home", location: "/zh-CN" },
  {
    name: "article-vectors",
    location: "/zh-CN/learn/mathematics/linear-algebra/vectors",
  },
  { name: "knowledge-graph", location: "/zh-CN/graph" },
  {
    name: "experiment-gradient-descent",
    location: "/zh-CN/playground?figure=gradient-descent",
  },
];

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const lighthouseCli = path.join(repositoryRoot, "node_modules", "lighthouse", "cli", "index.js");

function printHelp(): void {
  console.log(`Usage: pnpm exec tsx scripts/run-lighthouse.ts [phase] [source] [options]

Arguments:
  phase                 Report phase, for example baseline or after (default: baseline)
  source                local or production (default: local)

Options:
  --base-url <url>       Override the source base URL
  --form-factor <value>  mobile or desktop (default: desktop)
  --runs <count>         Runs per page, from 1 to 10 (default: 1)
  --page <name=path>     Replace defaults with one or more named paths/URLs
  --help                 Show this help

Environment equivalents: LIGHTHOUSE_PHASE, LIGHTHOUSE_SOURCE,
LIGHTHOUSE_BASE_URL, LIGHTHOUSE_FORM_FACTOR, and LIGHTHOUSE_RUNS.`);
}

function parsePage(value: string): PageDefinition {
  const separator = value.indexOf("=");
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error(`Invalid --page value "${value}". Expected name=/path or name=https://...`);
  }
  return {
    name: value.slice(0, separator),
    location: value.slice(separator + 1),
  };
}

function parseOptions(argumentsList: readonly string[]): Options {
  const positional: string[] = [];
  const configuredPages: PageDefinition[] = [];
  let baseURL: string | null = process.env.LIGHTHOUSE_BASE_URL ?? null;
  let formFactor = process.env.LIGHTHOUSE_FORM_FACTOR ?? "desktop";
  let runsValue = process.env.LIGHTHOUSE_RUNS ?? "1";

  const readValue = (index: number, flag: string): string => {
    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
    return value;
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (!argument) continue;
    if (argument === "--help") {
      printHelp();
      process.exit(0);
    }
    if (argument === "--base-url") {
      baseURL = readValue(index, argument);
      index += 1;
      continue;
    }
    if (argument.startsWith("--base-url=")) {
      baseURL = argument.slice("--base-url=".length);
      continue;
    }
    if (argument === "--form-factor") {
      formFactor = readValue(index, argument);
      index += 1;
      continue;
    }
    if (argument.startsWith("--form-factor=")) {
      formFactor = argument.slice("--form-factor=".length);
      continue;
    }
    if (argument === "--runs") {
      runsValue = readValue(index, argument);
      index += 1;
      continue;
    }
    if (argument.startsWith("--runs=")) {
      runsValue = argument.slice("--runs=".length);
      continue;
    }
    if (argument === "--page") {
      configuredPages.push(parsePage(readValue(index, argument)));
      index += 1;
      continue;
    }
    if (argument.startsWith("--page=")) {
      configuredPages.push(parsePage(argument.slice("--page=".length)));
      continue;
    }
    if (argument.startsWith("--")) throw new Error(`Unknown option: ${argument}`);
    positional.push(argument);
  }

  const phase = positional[0] ?? process.env.LIGHTHOUSE_PHASE ?? "baseline";
  const sourceValue = positional[1] ?? process.env.LIGHTHOUSE_SOURCE ?? "local";
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(phase)) {
    throw new Error(`Invalid phase "${phase}". Use letters, numbers, and hyphens only.`);
  }
  if (sourceValue !== "local" && sourceValue !== "production") {
    throw new Error(`Invalid source "${sourceValue}". Expected local or production.`);
  }
  if (formFactor !== "mobile" && formFactor !== "desktop") {
    throw new Error(`Invalid form factor "${formFactor}". Expected mobile or desktop.`);
  }
  const runs = Number(runsValue);
  if (!Number.isInteger(runs) || runs < 1 || runs > 10) {
    throw new Error(`Invalid run count "${runsValue}". Expected an integer from 1 to 10.`);
  }
  const source: Source = sourceValue;
  const defaultBaseURL =
    source === "production" ? "https://one-forth.com" : "http://localhost:3000";
  const resolvedBaseURL = new URL(baseURL ?? defaultBaseURL).toString();
  const pages = configuredPages.length > 0 ? configuredPages : defaultPages;
  const names = new Set<string>();
  for (const page of pages) {
    if (names.has(page.name)) throw new Error(`Duplicate page name: ${page.name}`);
    names.add(page.name);
  }

  return { phase, source, baseURL: resolvedBaseURL, formFactor, runs, pages };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordValue(record: JsonRecord | null, key: string): JsonRecord | null {
  const value = record?.[key];
  return isRecord(value) ? value : null;
}

function numericValue(record: JsonRecord | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function audit(report: JsonRecord, id: string): JsonRecord | null {
  return recordValue(recordValue(report, "audits"), id);
}

function auditNumericValue(report: JsonRecord, id: string): number | null {
  return numericValue(audit(report, id), "numericValue");
}

function auditItems(report: JsonRecord, id: string): readonly JsonRecord[] | null {
  const details = recordValue(audit(report, id), "details");
  const items = details?.items;
  if (!Array.isArray(items)) return null;
  return items.filter(isRecord);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function extractMetrics(report: JsonRecord): LighthouseMetrics {
  const performance = recordValue(recordValue(report, "categories"), "performance");
  const score = numericValue(performance, "score");
  const inpMs =
    auditNumericValue(report, "interaction-to-next-paint") ??
    auditNumericValue(report, "experimental-interaction-to-next-paint");
  const tbtMs = auditNumericValue(report, "total-blocking-time");
  const networkRequests = auditItems(report, "network-requests");
  const scriptRequests = networkRequests?.filter((request) => {
    const resourceType = stringValue(request, "resourceType")?.toLowerCase();
    const mimeType = stringValue(request, "mimeType")?.toLowerCase();
    return resourceType === "script" || Boolean(mimeType?.includes("javascript"));
  });
  const longTasks = auditItems(report, "long-tasks");
  const longTaskDurations = longTasks
    ?.map((task) => numericValue(task, "duration"))
    .filter((duration): duration is number => duration !== null);

  return {
    performanceScore: score === null ? null : score * 100,
    lcpMs: auditNumericValue(report, "largest-contentful-paint"),
    cls: auditNumericValue(report, "cumulative-layout-shift"),
    inpMs,
    tbtMs,
    primaryResponsiveness: inpMs !== null ? "INP" : tbtMs !== null ? "TBT" : null,
    primaryResponsivenessMs: inpMs ?? tbtMs,
    jsTransferBytes:
      scriptRequests === undefined
        ? null
        : sum(scriptRequests.map((request) => numericValue(request, "transferSize") ?? 0)),
    totalTransferBytes: auditNumericValue(report, "total-byte-weight"),
    requestCount: networkRequests?.length ?? null,
    scriptRequestCount: scriptRequests?.length ?? null,
    longTaskCount: longTasks?.length ?? null,
    longTaskTotalMs: longTaskDurations === undefined ? null : sum(longTaskDurations),
    longestTaskMs:
      longTaskDurations === undefined
        ? null
        : longTaskDurations.length === 0
          ? 0
          : Math.max(...longTaskDurations),
  };
}

function median(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (present.length === 0) return null;
  const midpoint = Math.floor(present.length / 2);
  const upper = present[midpoint];
  if (upper === undefined) return null;
  if (present.length % 2 === 1) return upper;
  const lower = present[midpoint - 1];
  return lower === undefined ? upper : (lower + upper) / 2;
}

function medianMetrics(runs: readonly SuccessfulRun[]): LighthouseMetrics | null {
  if (runs.length === 0) return null;
  const metrics = runs.map((run) => run.metrics);
  const inpMs = median(metrics.map((entry) => entry.inpMs));
  const tbtMs = median(metrics.map((entry) => entry.tbtMs));
  return {
    performanceScore: median(metrics.map((entry) => entry.performanceScore)),
    lcpMs: median(metrics.map((entry) => entry.lcpMs)),
    cls: median(metrics.map((entry) => entry.cls)),
    inpMs,
    tbtMs,
    primaryResponsiveness: inpMs !== null ? "INP" : tbtMs !== null ? "TBT" : null,
    primaryResponsivenessMs: inpMs ?? tbtMs,
    jsTransferBytes: median(metrics.map((entry) => entry.jsTransferBytes)),
    totalTransferBytes: median(metrics.map((entry) => entry.totalTransferBytes)),
    requestCount: median(metrics.map((entry) => entry.requestCount)),
    scriptRequestCount: median(metrics.map((entry) => entry.scriptRequestCount)),
    longTaskCount: median(metrics.map((entry) => entry.longTaskCount)),
    longTaskTotalMs: median(metrics.map((entry) => entry.longTaskTotalMs)),
    longestTaskMs: median(metrics.map((entry) => entry.longestTaskMs)),
  };
}

function slug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) throw new Error(`Page name "${value}" cannot be converted to a filename.`);
  return normalized;
}

async function runLighthouse(argumentsList: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [lighthouseCli, ...argumentsList], {
      cwd: repositoryRoot,
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      const detail = stderr.trim() || stdout.trim() || `exit code ${code ?? "unknown"}`;
      reject(new Error(detail.slice(-8_000)));
    });
  });
}

async function lighthouseVersion(): Promise<string> {
  try {
    return await runLighthouse(["--version"]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Lighthouse is unavailable. Add it at the workspace root with "pnpm add -Dw lighthouse". ${detail}`,
    );
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function createCsv(pages: readonly PageResult[]): string {
  const headings = [
    "page",
    "url",
    "run",
    "status",
    "performance_score",
    "lcp_ms",
    "cls",
    "inp_ms",
    "tbt_ms",
    "responsiveness_metric",
    "responsiveness_ms",
    "js_transfer_bytes",
    "total_transfer_bytes",
    "request_count",
    "script_request_count",
    "long_task_count",
    "long_task_total_ms",
    "longest_task_ms",
    "raw_report",
    "diagnostic",
    "error",
  ];
  const rows: Array<readonly (string | number | null)[]> = [headings];
  for (const page of pages) {
    for (const run of page.runs) {
      const metrics = run.status === "ok" ? run.metrics : null;
      rows.push([
        page.name,
        page.url,
        run.run,
        run.status,
        metrics?.performanceScore ?? null,
        metrics?.lcpMs ?? null,
        metrics?.cls ?? null,
        metrics?.inpMs ?? null,
        metrics?.tbtMs ?? null,
        metrics?.primaryResponsiveness ?? null,
        metrics?.primaryResponsivenessMs ?? null,
        metrics?.jsTransferBytes ?? null,
        metrics?.totalTransferBytes ?? null,
        metrics?.requestCount ?? null,
        metrics?.scriptRequestCount ?? null,
        metrics?.longTaskCount ?? null,
        metrics?.longTaskTotalMs ?? null,
        metrics?.longestTaskMs ?? null,
        run.rawReport,
        run.status === "ok" ? (run.diagnostic ?? null) : null,
        run.status === "error" ? run.error : null,
      ]);
    }
  }
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

const options = parseOptions(process.argv.slice(2));
const version = await lighthouseVersion();
const phaseDirectory = path.join(repositoryRoot, "reports", "round-4", options.phase);
const rawDirectory = path.join(phaseDirectory, "lighthouse", "raw", options.source);
await mkdir(rawDirectory, { recursive: true });

const pageResults: PageResult[] = [];
for (const page of options.pages) {
  const url = new URL(page.location, options.baseURL).toString();
  const runs: RunResult[] = [];
  for (let run = 1; run <= options.runs; run += 1) {
    const rawPath = path.join(rawDirectory, `${slug(page.name)}--run-${run}.json`);
    const relativeRawPath = path.relative(repositoryRoot, rawPath).replaceAll("\\", "/");
    const lighthouseArguments = [
      url,
      "--quiet",
      "--only-categories=performance",
      "--output=json",
      `--output-path=${rawPath}`,
      "--chrome-flags=--headless=new",
    ];
    if (options.formFactor === "desktop") lighthouseArguments.push("--preset=desktop");

    console.log(`[${page.name}] Lighthouse run ${run}/${options.runs}: ${url}`);
    const attemptDiagnostics: string[] = [];
    let result: RunResult | null = null;
    for (let attempt = 1; attempt <= 3 && result === null; attempt += 1) {
      await writeFile(rawPath, "", "utf8");
      let runnerDiagnostic: string | null = null;
      try {
        await runLighthouse(lighthouseArguments);
      } catch (error) {
        runnerDiagnostic = errorMessage(error);
      }

      try {
        const parsed: unknown = JSON.parse(await readFile(rawPath, "utf8"));
        if (!isRecord(parsed)) throw new Error("Lighthouse output is not a JSON object.");
        if (runnerDiagnostic) {
          attemptDiagnostics.push(`attempt ${attempt}: ${runnerDiagnostic}`);
          console.warn(
            `[${page.name}] Lighthouse wrote a valid report but exited non-zero: ${runnerDiagnostic}`,
          );
        }
        result = {
          status: "ok",
          run,
          rawReport: relativeRawPath,
          metrics: extractMetrics(parsed),
          ...(attemptDiagnostics.length > 0 ? { diagnostic: attemptDiagnostics.join("\n") } : {}),
        };
      } catch (error) {
        attemptDiagnostics.push(
          `attempt ${attempt}: ${[runnerDiagnostic, errorMessage(error)].filter(Boolean).join("\n")}`,
        );
        if (attempt < 3) {
          console.warn(`[${page.name}] Retrying Lighthouse after attempt ${attempt} failed.`);
        }
      }
    }
    runs.push(
      result ?? {
        status: "error",
        run,
        rawReport: relativeRawPath,
        error: attemptDiagnostics.join("\n"),
      },
    );
  }
  const successes = runs.filter((run): run is SuccessfulRun => run.status === "ok");
  pageResults.push({
    name: page.name,
    location: page.location,
    url,
    successfulRuns: successes.length,
    failedRuns: runs.length - successes.length,
    median: medianMetrics(successes),
    runs,
  });
}

const generatedAt = new Date().toISOString();
const summary = {
  schemaVersion: 1,
  generatedAt,
  phase: options.phase,
  source: options.source,
  baseURL: options.baseURL,
  formFactor: options.formFactor,
  runsPerPage: options.runs,
  lighthouseVersion: version,
  metricUnits: {
    performanceScore: "0-100",
    lcpMs: "milliseconds",
    cls: "unitless",
    inpMs: "milliseconds",
    tbtMs: "milliseconds",
    transferBytes: "bytes",
    longTasks: "tasks of at least 50 milliseconds",
  },
  pages: pageResults,
};
const summaryPath = path.join(phaseDirectory, `lighthouse-${options.source}.json`);
const csvPath = path.join(phaseDirectory, `lighthouse-${options.source}.csv`);
await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
await writeFile(csvPath, createCsv(pageResults), "utf8");

const failures = pageResults.reduce((total, page) => total + page.failedRuns, 0);
console.log(
  `Wrote ${pageResults.length} page summaries to ${path.relative(repositoryRoot, summaryPath)} and ${path.relative(repositoryRoot, csvPath)}.`,
);
if (failures > 0) {
  console.error(
    `${failures} Lighthouse run(s) failed; successful runs remain available in the reports.`,
  );
  process.exitCode = 1;
}
