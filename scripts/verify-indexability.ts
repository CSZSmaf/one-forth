import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { publishedLocales, siteConfig } from "../packages/config/src/index.ts";
import { readerCurriculumRedirects } from "../packages/content/src/index.ts";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const maxRedirects = 5;
const defaultTimeoutMs = 15_000;

const representativeRoutes = {
  root: "/",
  home: "/zh-CN",
  bookshelf: "/zh-CN/books",
  mathematicsSeries: "/zh-CN/books/mathematics",
  foundationsBook: "/zh-CN/books/mathematics/mathematical-language-sets-proofs",
  algebraBook: "/zh-CN/books/mathematics/algebra-functions-analytic-geometry",
  calculusBook: "/zh-CN/books/mathematics/single-variable-calculus",
  multivariableBook: "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis",
  linearAlgebraBook: "/zh-CN/books/mathematics/linear-algebra",
  probabilityBook: "/zh-CN/books/mathematics/probability",
  statisticsBook: "/zh-CN/books/mathematics/mathematical-statistics",
  discreteBook: "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs",
  logicChapter: "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
  equationsChapter:
    "/zh-CN/books/mathematics/algebra-functions-analytic-geometry/equations-inequalities",
  algebraReviewChapter:
    "/zh-CN/books/mathematics/algebra-functions-analytic-geometry/algebra-functions-review",
  sequencesChapter: "/zh-CN/books/mathematics/single-variable-calculus/sequences-limits",
  limitsChapter: "/zh-CN/books/mathematics/single-variable-calculus/function-limits-continuity",
  calculusReviewChapter: "/zh-CN/books/mathematics/single-variable-calculus/single-variable-review",
  multivariableFunctionsChapter:
    "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis/several-variable-functions",
  gradientChapter:
    "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis/partials-gradient",
  multivariableReviewChapter:
    "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis/multivariable-review",
  vectorChapter: "/zh-CN/books/mathematics/linear-algebra/vectors-coordinates",
  linearSystemsChapter: "/zh-CN/books/mathematics/linear-algebra/linear-systems",
  linearMapsChapter: "/zh-CN/books/mathematics/linear-algebra/linear-maps-matrices",
  eigenReviewChapter: "/zh-CN/books/mathematics/linear-algebra/eigenstructure-review",
  probabilityAxiomsChapter: "/zh-CN/books/mathematics/probability/axioms-counting",
  conditionalProbabilityChapter: "/zh-CN/books/mathematics/probability/conditional-bayes",
  probabilityReviewChapter: "/zh-CN/books/mathematics/probability/probability-review",
  statisticsSamplesChapter: "/zh-CN/books/mathematics/mathematical-statistics/samples-statistics",
  confidenceIntervalsChapter:
    "/zh-CN/books/mathematics/mathematical-statistics/confidence-intervals",
  linearModelInferenceChapter:
    "/zh-CN/books/mathematics/mathematical-statistics/linear-model-inference",
  statisticsReviewChapter: "/zh-CN/books/mathematics/mathematical-statistics/statistics-review",
  discreteCountingChapter:
    "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs/counting-principles",
  discreteRecurrencesChapter:
    "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs/recurrences-generating-functions",
  discreteGraphsChapter:
    "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs/graphs-connectivity",
  discreteMatchingChapter:
    "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs/matching-coloring",
  discretePosetsChapter:
    "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs/posets-boolean",
  discreteReviewChapter:
    "/zh-CN/books/mathematics/discrete-mathematics-combinatorics-graphs/discrete-review",
  differentialEquationsChapter:
    "/zh-CN/books/mathematics/ordinary-differential-equations-dynamical-systems/existence-uniqueness",
  physicsChapter:
    "/zh-CN/books/physics/physical-quantities-measurement-modeling/quantities-dimensions",
  computingChapter:
    "/zh-CN/books/computer-science/programming-scientific-computing-foundations/programs-types-control",
  learningPath: "/zh-CN/paths/mathematics-for-machine-learning",
  search: "/zh-CN/search?q=logic",
  publishedLegacyLearn: "/zh-CN/learn/mathematics/foundations/logic-propositions",
  publishedProbabilityLegacyLearn: "/zh-CN/learn/mathematics/probability/probability-axioms",
  publishedStatisticsLegacyLearn:
    "/zh-CN/learn/mathematics/mathematical-statistics/sampling-distributions",
  discreteLegacyLearn: "/zh-CN/learn/mathematics/discrete-mathematics/counting-principles",
  differentialLegacyLearn: "/zh-CN/learn/mathematics/differential-equations/existence-uniqueness",
  publishedLegacyConcept: "/zh-CN/concepts/logic-and-quantifiers",
  publishedProbabilityConcept: "/zh-CN/concepts/probability-axioms",
  publishedStatisticsConcept: "/zh-CN/concepts/sampling-distributions",
  discreteConcept: "/zh-CN/concepts/counting-principles",
  legacyPathAlias: "/zh-CN/paths/calculus-foundations",
  designSystem: "/zh-CN/design-system",
  unsupportedLocale: "/en",
} as const;

function registeredRedirectTarget(sourcePath: string): string {
  const redirect = readerCurriculumRedirects.find((entry) => entry.sourcePath === sourcePath);
  if (!redirect) {
    throw new Error(`Missing curriculum redirect contract for ${sourcePath}`);
  }
  return redirect.targetPath;
}

const representativeTargets = {
  publishedConcept: registeredRedirectTarget(representativeRoutes.publishedLegacyConcept),
  publishedProbabilityConcept: registeredRedirectTarget(
    representativeRoutes.publishedProbabilityConcept,
  ),
  publishedStatisticsConcept: registeredRedirectTarget(
    representativeRoutes.publishedStatisticsConcept,
  ),
  discreteLegacyLearn: registeredRedirectTarget(representativeRoutes.discreteLegacyLearn),
  differentialLegacyLearn: registeredRedirectTarget(representativeRoutes.differentialLegacyLearn),
  discreteConcept: registeredRedirectTarget(representativeRoutes.discreteConcept),
  searchCanonical: "/zh-CN/search",
} as const;

const permanentRedirectStatuses = [301, 308] as const;

type PageRobotsExpectation = "index-follow" | "noindex-follow" | "noindex-nofollow";
type EndpointKind = "html" | "not-found" | "robots" | "sitemap" | "www-redirect";

interface EndpointSpec {
  readonly id: string;
  readonly label: string;
  readonly kind: EndpointKind;
  readonly requestUrl: string;
  readonly expectedCanonical: string | null;
  readonly expectedRedirectLocation: string | null;
  readonly expectedRedirectStatuses: readonly number[] | null;
  readonly expectedFinalStatus: number;
  readonly expectedRobots: PageRobotsExpectation | null;
  readonly expectedSitemapMembership: boolean | null;
  readonly sitemapTarget: string | null;
}

interface RedirectStep {
  readonly url: string;
  readonly status: number;
  readonly contentType: string | null;
  readonly location: string | null;
}

interface FetchTrace {
  readonly requestedUrl: string;
  readonly steps: readonly RedirectStep[];
  readonly finalUrl: string | null;
  readonly finalStatus: number | null;
  readonly finalContentType: string | null;
  readonly finalHeaders: Readonly<Record<string, string>>;
  readonly body: string;
  readonly bodyBytes: number;
  readonly error: string | null;
}

interface HreflangEntry {
  readonly language: string;
  readonly href: string;
  readonly rawHref: string;
}

interface HtmlMetadata {
  readonly canonical: string | null;
  readonly canonicalRaw: string | null;
  readonly canonicalCount: number;
  readonly robotsMeta: string | null;
  readonly xRobotsTag: string | null;
  readonly effectiveRobotsTokens: readonly string[];
  readonly hreflang: readonly HreflangEntry[];
}

interface LocalhostLeak {
  readonly source: string;
  readonly value: string;
}

interface InvariantResult {
  readonly id: string;
  readonly description: string;
  readonly expected: string;
  readonly actual: string;
  readonly passed: boolean;
}

interface EndpointReport {
  readonly id: string;
  readonly label: string;
  readonly kind: EndpointKind;
  readonly requestedUrl: string;
  readonly status: number | null;
  readonly contentType: string | null;
  readonly location: string | null;
  readonly finalUrl: string | null;
  readonly finalStatus: number | null;
  readonly finalContentType: string | null;
  readonly redirectChain: readonly RedirectStep[];
  readonly bodyBytes: number;
  readonly canonical: string | null;
  readonly canonicalRaw: string | null;
  readonly canonicalCount: number;
  readonly robotsMeta: string | null;
  readonly xRobotsTag: string | null;
  readonly effectiveRobotsTokens: readonly string[];
  readonly hreflang: readonly HreflangEntry[];
  readonly sitemapTarget: string | null;
  readonly sitemapMembership: boolean | null;
  readonly localhostLeaks: readonly LocalhostLeak[];
  readonly requestError: string | null;
  readonly invariants: readonly InvariantResult[];
}

interface CliOptions {
  readonly baseUrl: string;
  readonly canonicalOrigin: string;
  readonly isProduction: boolean;
  readonly auditOnly: boolean;
  readonly phase: string;
  readonly source: string;
  readonly outputDirectory: string;
  readonly timeoutMs: number;
}

interface RobotsDocument {
  readonly sitemaps: readonly string[];
  readonly disallow: readonly string[];
}

interface SitemapDocument {
  readonly urls: readonly string[];
  readonly duplicateUrls: readonly string[];
}

function optionValue(args: readonly string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const inline = args.find((argument) => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function hasFlag(args: readonly string[], name: string): boolean {
  return args.includes(name);
}

function environmentBoolean(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

function shouldRespawnWithEnvironmentProxy(): boolean {
  if (environmentBoolean(process.env.INDEXABILITY_PROXY_CHILD)) return false;
  if (environmentBoolean(process.env.NODE_USE_ENV_PROXY)) return false;
  if (process.execArgv.includes("--use-env-proxy")) return false;
  const proxyConfigured = Boolean(process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY);
  return proxyConfigured && process.allowedNodeEnvironmentFlags.has("--use-env-proxy");
}

function reportLabel(value: string, option: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error(`${option} must contain only lowercase letters, digits, and single hyphens`);
  }
  return normalized;
}

function normalizeOrigin(value: string, option: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${option} is not a valid absolute URL: ${value}`);
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error(`${option} must use http or https: ${value}`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      `${option} must be an origin without credentials, query, or fragment: ${value}`,
    );
  }
  if (url.pathname !== "/") {
    throw new Error(`${option} must not contain a path: ${value}`);
  }
  return url.origin;
}

function showHelp(): void {
  console.log(`Usage: pnpm exec tsx scripts/verify-indexability.ts [options]

Options:
  --base-url <origin>    Target origin (default: INDEXABILITY_BASE_URL or siteConfig.url)
  --phase <label>        Report phase under reports/round-5 (default: baseline)
  --source <label>       Report filename source label (default: production or target host)
  --output-dir <path>    Override the report directory
  --timeout-ms <number>  Per-request timeout (default: ${defaultTimeoutMs})
  --audit-only           Evaluate and report failures, but exit zero
  --help                 Show this help

Environment equivalents: INDEXABILITY_BASE_URL, INDEXABILITY_REPORT_PHASE,
INDEXABILITY_REPORT_SOURCE, INDEXABILITY_OUTPUT_DIR, INDEXABILITY_TIMEOUT_MS,
and INDEXABILITY_AUDIT_ONLY=1.`);
}

function parseOptions(args: readonly string[]): CliOptions {
  const canonicalOrigin = normalizeOrigin(siteConfig.url, "siteConfig.url");
  const baseUrl = normalizeOrigin(
    optionValue(args, "--base-url") ?? process.env.INDEXABILITY_BASE_URL ?? siteConfig.url,
    "--base-url/INDEXABILITY_BASE_URL",
  );
  const isProduction = baseUrl === canonicalOrigin;
  const phase = reportLabel(
    optionValue(args, "--phase") ?? process.env.INDEXABILITY_REPORT_PHASE ?? "baseline",
    "--phase/INDEXABILITY_REPORT_PHASE",
  );
  const defaultSource = isProduction
    ? "production"
    : new URL(baseUrl).hostname
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
  const source = reportLabel(
    optionValue(args, "--source") ?? process.env.INDEXABILITY_REPORT_SOURCE ?? defaultSource,
    "--source/INDEXABILITY_REPORT_SOURCE",
  );
  const outputDirectory = resolve(
    repositoryRoot,
    optionValue(args, "--output-dir") ??
      process.env.INDEXABILITY_OUTPUT_DIR ??
      `reports/round-5/${phase}`,
  );
  const timeoutRaw =
    optionValue(args, "--timeout-ms") ??
    process.env.INDEXABILITY_TIMEOUT_MS ??
    String(defaultTimeoutMs);
  const timeoutMs = Number(timeoutRaw);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error("--timeout-ms/INDEXABILITY_TIMEOUT_MS must be an integer from 1000 to 120000");
  }
  return {
    baseUrl,
    canonicalOrigin,
    isProduction,
    auditOnly:
      hasFlag(args, "--audit-only") || environmentBoolean(process.env.INDEXABILITY_AUDIT_ONLY),
    phase,
    source,
    outputDirectory,
    timeoutMs,
  };
}

function absoluteUrl(origin: string, path: string): string {
  return new URL(path, `${origin}/`).toString();
}

interface HtmlEndpointInput {
  readonly id: string;
  readonly label: string;
  readonly requestPath: string;
  readonly canonicalPath: string;
  readonly robots: PageRobotsExpectation;
  readonly sitemapMembership: boolean;
  readonly redirectTargetPath?: string;
  readonly redirectStatuses?: readonly number[];
}

function htmlEndpointSpec(options: CliOptions, input: HtmlEndpointInput): EndpointSpec {
  const canonical = (path: string) => absoluteUrl(options.canonicalOrigin, path);
  const target = (path: string) => absoluteUrl(options.baseUrl, path);
  return {
    id: input.id,
    label: input.label,
    kind: "html",
    requestUrl: target(input.requestPath),
    expectedCanonical: canonical(input.canonicalPath),
    expectedRedirectLocation: input.redirectTargetPath ? target(input.redirectTargetPath) : null,
    expectedRedirectStatuses: input.redirectTargetPath
      ? (input.redirectStatuses ?? permanentRedirectStatuses)
      : null,
    expectedFinalStatus: 200,
    expectedRobots: input.robots,
    expectedSitemapMembership: input.sitemapMembership,
    sitemapTarget: canonical(input.canonicalPath),
  };
}

function notFoundEndpointSpec(
  options: CliOptions,
  input: Readonly<{ id: string; label: string; requestPath: string }>,
): EndpointSpec {
  return {
    id: input.id,
    label: input.label,
    kind: "not-found",
    requestUrl: absoluteUrl(options.baseUrl, input.requestPath),
    expectedCanonical: null,
    expectedRedirectLocation: null,
    expectedRedirectStatuses: null,
    expectedFinalStatus: 404,
    expectedRobots: null,
    expectedSitemapMembership: false,
    sitemapTarget: absoluteUrl(options.canonicalOrigin, input.requestPath),
  };
}

function endpointSpecs(options: CliOptions): readonly EndpointSpec[] {
  const canonical = (path: string) => absoluteUrl(options.canonicalOrigin, path);
  const target = (path: string) => absoluteUrl(options.baseUrl, path);
  const specs: EndpointSpec[] = [
    htmlEndpointSpec(options, {
      id: "root",
      label: "Root locale redirect",
      requestPath: representativeRoutes.root,
      canonicalPath: representativeRoutes.home,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeRoutes.home,
      redirectStatuses: [307],
    }),
    htmlEndpointSpec(options, {
      id: "zh-cn-home",
      label: "Simplified Chinese home",
      requestPath: representativeRoutes.home,
      canonicalPath: representativeRoutes.home,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "bookshelf",
      label: "Textbook bookshelf",
      requestPath: representativeRoutes.bookshelf,
      canonicalPath: representativeRoutes.bookshelf,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "mathematics-series",
      label: "Mathematics series",
      requestPath: representativeRoutes.mathematicsSeries,
      canonicalPath: representativeRoutes.mathematicsSeries,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "foundations-book",
      label: "Published M00 foundations Book",
      requestPath: representativeRoutes.foundationsBook,
      canonicalPath: representativeRoutes.foundationsBook,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "algebra-book",
      label: "Published M01 algebra and analytic geometry Book",
      requestPath: representativeRoutes.algebraBook,
      canonicalPath: representativeRoutes.algebraBook,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "calculus-book",
      label: "Published M02 calculus Book",
      requestPath: representativeRoutes.calculusBook,
      canonicalPath: representativeRoutes.calculusBook,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "multivariable-book",
      label: "Published M03 multivariable calculus Book",
      requestPath: representativeRoutes.multivariableBook,
      canonicalPath: representativeRoutes.multivariableBook,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "linear-algebra-book",
      label: "Published M04 linear algebra Book",
      requestPath: representativeRoutes.linearAlgebraBook,
      canonicalPath: representativeRoutes.linearAlgebraBook,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "probability-book",
      label: "Published M05 probability Book",
      requestPath: representativeRoutes.probabilityBook,
      canonicalPath: representativeRoutes.probabilityBook,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "statistics-book",
      label: "Published M06 mathematical statistics Book",
      requestPath: representativeRoutes.statisticsBook,
      canonicalPath: representativeRoutes.statisticsBook,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-book",
      label: "Published M07 discrete mathematics Book",
      requestPath: representativeRoutes.discreteBook,
      canonicalPath: representativeRoutes.discreteBook,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "logic-chapter",
      label: "Published M00 logic Chapter",
      requestPath: representativeRoutes.logicChapter,
      canonicalPath: representativeRoutes.logicChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "equations-chapter",
      label: "Published M01 equations Chapter",
      requestPath: representativeRoutes.equationsChapter,
      canonicalPath: representativeRoutes.equationsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "algebra-review-chapter",
      label: "Published M01 review Chapter",
      requestPath: representativeRoutes.algebraReviewChapter,
      canonicalPath: representativeRoutes.algebraReviewChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "sequences-chapter",
      label: "Published M02 sequences Chapter",
      requestPath: representativeRoutes.sequencesChapter,
      canonicalPath: representativeRoutes.sequencesChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "limits-chapter",
      label: "Published M02 limits Chapter",
      requestPath: representativeRoutes.limitsChapter,
      canonicalPath: representativeRoutes.limitsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "calculus-review-chapter",
      label: "Published M02 review Chapter",
      requestPath: representativeRoutes.calculusReviewChapter,
      canonicalPath: representativeRoutes.calculusReviewChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "multivariable-functions-chapter",
      label: "Published M03 several-variable functions Chapter",
      requestPath: representativeRoutes.multivariableFunctionsChapter,
      canonicalPath: representativeRoutes.multivariableFunctionsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "gradient-chapter",
      label: "Published M03 gradient Chapter",
      requestPath: representativeRoutes.gradientChapter,
      canonicalPath: representativeRoutes.gradientChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "multivariable-review-chapter",
      label: "Published M03 review Chapter",
      requestPath: representativeRoutes.multivariableReviewChapter,
      canonicalPath: representativeRoutes.multivariableReviewChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "vectors-chapter",
      label: "Published M04 vectors Chapter",
      requestPath: representativeRoutes.vectorChapter,
      canonicalPath: representativeRoutes.vectorChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "linear-systems-chapter",
      label: "Published M04 linear systems Chapter",
      requestPath: representativeRoutes.linearSystemsChapter,
      canonicalPath: representativeRoutes.linearSystemsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "linear-maps-chapter",
      label: "Published M04 linear maps Chapter",
      requestPath: representativeRoutes.linearMapsChapter,
      canonicalPath: representativeRoutes.linearMapsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "eigen-review-chapter",
      label: "Published M04 eigenstructure review Chapter",
      requestPath: representativeRoutes.eigenReviewChapter,
      canonicalPath: representativeRoutes.eigenReviewChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "probability-axioms-chapter",
      label: "Published M05 probability axioms Chapter",
      requestPath: representativeRoutes.probabilityAxiomsChapter,
      canonicalPath: representativeRoutes.probabilityAxiomsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "conditional-probability-chapter",
      label: "Published M05 conditional probability Chapter",
      requestPath: representativeRoutes.conditionalProbabilityChapter,
      canonicalPath: representativeRoutes.conditionalProbabilityChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "probability-review-chapter",
      label: "Published M05 probability review Chapter",
      requestPath: representativeRoutes.probabilityReviewChapter,
      canonicalPath: representativeRoutes.probabilityReviewChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "statistics-samples-chapter",
      label: "Published M06 sampling distributions Chapter",
      requestPath: representativeRoutes.statisticsSamplesChapter,
      canonicalPath: representativeRoutes.statisticsSamplesChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "confidence-intervals-chapter",
      label: "Published M06 confidence intervals Chapter",
      requestPath: representativeRoutes.confidenceIntervalsChapter,
      canonicalPath: representativeRoutes.confidenceIntervalsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "linear-model-inference-chapter",
      label: "Published M06 linear model inference Chapter",
      requestPath: representativeRoutes.linearModelInferenceChapter,
      canonicalPath: representativeRoutes.linearModelInferenceChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "statistics-review-chapter",
      label: "Published M06 statistics review Chapter",
      requestPath: representativeRoutes.statisticsReviewChapter,
      canonicalPath: representativeRoutes.statisticsReviewChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-counting-chapter",
      label: "Published M07 counting principles Chapter",
      requestPath: representativeRoutes.discreteCountingChapter,
      canonicalPath: representativeRoutes.discreteCountingChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-recurrences-chapter",
      label: "Published M07 recurrences and generating functions Chapter",
      requestPath: representativeRoutes.discreteRecurrencesChapter,
      canonicalPath: representativeRoutes.discreteRecurrencesChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-graphs-chapter",
      label: "Published M07 graphs and connectivity Chapter",
      requestPath: representativeRoutes.discreteGraphsChapter,
      canonicalPath: representativeRoutes.discreteGraphsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-matching-chapter",
      label: "Published M07 matching and coloring Chapter",
      requestPath: representativeRoutes.discreteMatchingChapter,
      canonicalPath: representativeRoutes.discreteMatchingChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-posets-chapter",
      label: "Published M07 posets and Boolean algebra Chapter",
      requestPath: representativeRoutes.discretePosetsChapter,
      canonicalPath: representativeRoutes.discretePosetsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-review-chapter",
      label: "Published M07 discrete mathematics review Chapter",
      requestPath: representativeRoutes.discreteReviewChapter,
      canonicalPath: representativeRoutes.discreteReviewChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "differential-equations-chapter",
      label: "Published M08 differential equations Chapter",
      requestPath: representativeRoutes.differentialEquationsChapter,
      canonicalPath: representativeRoutes.differentialEquationsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "physics-chapter",
      label: "Published physical quantities Chapter",
      requestPath: representativeRoutes.physicsChapter,
      canonicalPath: representativeRoutes.physicsChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "computing-chapter",
      label: "Published programming foundations Chapter",
      requestPath: representativeRoutes.computingChapter,
      canonicalPath: representativeRoutes.computingChapter,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "learning-path",
      label: "Published learning path",
      requestPath: representativeRoutes.learningPath,
      canonicalPath: representativeRoutes.learningPath,
      robots: "index-follow",
      sitemapMembership: true,
    }),
    htmlEndpointSpec(options, {
      id: "search",
      label: "Internal search query",
      requestPath: representativeRoutes.search,
      canonicalPath: representativeTargets.searchCanonical,
      robots: "noindex-follow",
      sitemapMembership: false,
    }),
    htmlEndpointSpec(options, {
      id: "published-legacy-learn",
      label: "Published legacy learn permanent redirect",
      requestPath: representativeRoutes.publishedLegacyLearn,
      canonicalPath: representativeRoutes.logicChapter,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeRoutes.logicChapter,
    }),
    htmlEndpointSpec(options, {
      id: "published-probability-legacy-learn",
      label: "Published M05 legacy learn permanent redirect",
      requestPath: representativeRoutes.publishedProbabilityLegacyLearn,
      canonicalPath: representativeRoutes.probabilityAxiomsChapter,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeRoutes.probabilityAxiomsChapter,
    }),
    htmlEndpointSpec(options, {
      id: "published-statistics-legacy-learn",
      label: "Published M06 legacy learn permanent redirect",
      requestPath: representativeRoutes.publishedStatisticsLegacyLearn,
      canonicalPath: representativeRoutes.statisticsSamplesChapter,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeRoutes.statisticsSamplesChapter,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-legacy-learn",
      label: "Published M07 legacy learn permanent redirect",
      requestPath: representativeRoutes.discreteLegacyLearn,
      canonicalPath: representativeTargets.discreteLegacyLearn,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeTargets.discreteLegacyLearn,
    }),
    htmlEndpointSpec(options, {
      id: "differential-legacy-learn",
      label: "Published M08 legacy learn permanent redirect",
      requestPath: representativeRoutes.differentialLegacyLearn,
      canonicalPath: representativeTargets.differentialLegacyLearn,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeTargets.differentialLegacyLearn,
    }),
    htmlEndpointSpec(options, {
      id: "published-legacy-concept",
      label: "Published legacy concept permanent redirect",
      requestPath: representativeRoutes.publishedLegacyConcept,
      canonicalPath: representativeRoutes.logicChapter,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeTargets.publishedConcept,
    }),
    htmlEndpointSpec(options, {
      id: "published-probability-concept",
      label: "Published M05 legacy concept permanent redirect",
      requestPath: representativeRoutes.publishedProbabilityConcept,
      canonicalPath: representativeRoutes.probabilityAxiomsChapter,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeTargets.publishedProbabilityConcept,
    }),
    htmlEndpointSpec(options, {
      id: "published-statistics-concept",
      label: "Published M06 legacy concept permanent redirect",
      requestPath: representativeRoutes.publishedStatisticsConcept,
      canonicalPath: representativeRoutes.statisticsSamplesChapter,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeTargets.publishedStatisticsConcept,
    }),
    htmlEndpointSpec(options, {
      id: "discrete-concept",
      label: "Published M07 legacy concept permanent redirect",
      requestPath: representativeRoutes.discreteConcept,
      canonicalPath: representativeTargets.discreteConcept,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeTargets.discreteConcept,
    }),
    htmlEndpointSpec(options, {
      id: "legacy-path-alias",
      label: "Legacy learning-path Book alias",
      requestPath: representativeRoutes.legacyPathAlias,
      canonicalPath: representativeRoutes.calculusBook,
      robots: "index-follow",
      sitemapMembership: true,
      redirectTargetPath: representativeRoutes.calculusBook,
    }),
    {
      id: "robots",
      label: "Robots policy",
      kind: "robots",
      requestUrl: target("/robots.txt"),
      expectedCanonical: null,
      expectedRedirectLocation: null,
      expectedRedirectStatuses: null,
      expectedFinalStatus: 200,
      expectedRobots: null,
      expectedSitemapMembership: null,
      sitemapTarget: null,
    },
    {
      id: "sitemap",
      label: "XML sitemap",
      kind: "sitemap",
      requestUrl: target("/sitemap.xml"),
      expectedCanonical: null,
      expectedRedirectLocation: null,
      expectedRedirectStatuses: null,
      expectedFinalStatus: 200,
      expectedRobots: null,
      expectedSitemapMembership: null,
      sitemapTarget: null,
    },
    notFoundEndpointSpec(options, {
      id: "design-system",
      label: "Production-private design-system QA page",
      requestPath: representativeRoutes.designSystem,
    }),
    notFoundEndpointSpec(options, {
      id: "unsupported-locale",
      label: "Unsupported English locale",
      requestPath: representativeRoutes.unsupportedLocale,
    }),
  ];
  if (options.isProduction) {
    const wwwUrl = new URL(representativeRoutes.search, options.baseUrl);
    wwwUrl.hostname = `www.${siteConfig.domain}`;
    specs.push({
      id: "www-redirect",
      label: "Production www canonical-host redirect",
      kind: "www-redirect",
      requestUrl: wwwUrl.toString(),
      expectedCanonical: canonical(representativeTargets.searchCanonical),
      expectedRedirectLocation: canonical(representativeRoutes.search),
      expectedRedirectStatuses: [301],
      expectedFinalStatus: 200,
      expectedRobots: null,
      expectedSitemapMembership: null,
      sitemapTarget: null,
    });
  }
  return specs;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function fetchTrace(url: string, timeoutMs: number): Promise<FetchTrace> {
  const steps: RedirectStep[] = [];
  let currentUrl = url;
  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          "user-agent": `${siteConfig.shortName.replace(/\s+/g, "-")}-indexability-verifier/1.0`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const location = response.headers.get("location");
      steps.push({
        url: currentUrl,
        status: response.status,
        contentType: response.headers.get("content-type"),
        location,
      });
      if (redirectStatuses.has(response.status) && location) {
        if (redirectCount === maxRedirects) {
          await response.body?.cancel();
          return {
            requestedUrl: url,
            steps,
            finalUrl: currentUrl,
            finalStatus: response.status,
            finalContentType: response.headers.get("content-type"),
            finalHeaders: Object.fromEntries(response.headers.entries()),
            body: "",
            bodyBytes: 0,
            error: `redirect limit exceeded (${maxRedirects})`,
          };
        }
        const nextUrl = new URL(location, currentUrl);
        if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
          await response.body?.cancel();
          throw new Error(`unsupported redirect protocol: ${nextUrl.protocol}`);
        }
        await response.body?.cancel();
        currentUrl = nextUrl.toString();
        continue;
      }
      const body = await response.text();
      return {
        requestedUrl: url,
        steps,
        finalUrl: currentUrl,
        finalStatus: response.status,
        finalContentType: response.headers.get("content-type"),
        finalHeaders: Object.fromEntries(response.headers.entries()),
        body,
        bodyBytes: Buffer.byteLength(body),
        error: null,
      };
    }
  } catch (error) {
    return {
      requestedUrl: url,
      steps,
      finalUrl: steps.at(-1)?.url ?? null,
      finalStatus: steps.at(-1)?.status ?? null,
      finalContentType: steps.at(-1)?.contentType ?? null,
      finalHeaders: {},
      body: "",
      bodyBytes: 0,
      error: errorMessage(error),
    };
  }
  throw new Error("unreachable fetch state");
}

function decodeHtml(value: string): string {
  const named: Readonly<Record<string, string>> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (entity, token: string) => {
    if (token.startsWith("#x") || token.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
    }
    if (token.startsWith("#")) return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
    return named[token.toLowerCase()] ?? entity;
  });
}

function attributes(tag: string): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1]?.toLowerCase();
    if (!name || name.startsWith("<")) continue;
    result[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function resolvedUrl(raw: string | undefined, base: string): string | null {
  if (!raw) return null;
  try {
    return new URL(raw, base).toString();
  } catch {
    return raw;
  }
}

function htmlMetadata(
  body: string,
  finalUrl: string | null,
  xRobotsTag: string | null,
): HtmlMetadata {
  if (!finalUrl) {
    return {
      canonical: null,
      canonicalRaw: null,
      canonicalCount: 0,
      robotsMeta: null,
      xRobotsTag,
      effectiveRobotsTokens: robotsTokens(null, xRobotsTag),
      hreflang: [],
    };
  }
  const linkTags = [...body.matchAll(/<link\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const metaTags = [...body.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const canonicals = linkTags.filter((tag) =>
    (tag.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"),
  );
  const canonicalRaw = canonicals[0]?.href ?? null;
  const robotsMeta =
    metaTags.find((tag) => (tag.name ?? "").toLowerCase() === "robots")?.content ?? null;
  const hreflang = linkTags.flatMap((tag): HreflangEntry[] => {
    const rel = (tag.rel ?? "").toLowerCase().split(/\s+/);
    if (!rel.includes("alternate") || !tag.hreflang || !tag.href) return [];
    return [
      {
        language: tag.hreflang,
        href: resolvedUrl(tag.href, finalUrl) ?? tag.href,
        rawHref: tag.href,
      },
    ];
  });
  return {
    canonical: resolvedUrl(canonicalRaw ?? undefined, finalUrl),
    canonicalRaw,
    canonicalCount: canonicals.length,
    robotsMeta,
    xRobotsTag,
    effectiveRobotsTokens: robotsTokens(robotsMeta, xRobotsTag),
    hreflang,
  };
}

function robotsTokens(meta: string | null, header: string | null): readonly string[] {
  return [
    ...new Set(
      `${meta ?? ""},${header ?? ""}`
        .toLowerCase()
        .split(/[\s,;]+/)
        .filter(Boolean),
    ),
  ];
}

function parseRobots(body: string): RobotsDocument {
  const sitemaps: string[] = [];
  const disallow: string[] = [];
  for (const sourceLine of body.split(/\r?\n/)) {
    const line = sourceLine.replace(/\s+#.*$/, "").trim();
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (name === "sitemap" && value) sitemaps.push(value);
    if (name === "disallow" && value) disallow.push(value);
  }
  return { sitemaps, disallow };
}

function parseSitemap(body: string): SitemapDocument {
  const urls = [...body.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeHtml(match[1] ?? "").trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) duplicates.add(url);
    seen.add(url);
  }
  return { urls, duplicateUrls: [...duplicates] };
}

function localhostLeaks(
  body: string,
  headers: Readonly<Record<string, string>>,
): readonly LocalhostLeak[] {
  const pattern =
    /(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?(?:\/[^\s"'<>)]*)?/gi;
  const leaks: LocalhostLeak[] = [];
  const seen = new Set<string>();
  const collect = (source: string, value: string) => {
    for (const match of value.matchAll(pattern)) {
      const leak = match[0];
      const key = `${source}\0${leak}`;
      if (!seen.has(key)) {
        seen.add(key);
        leaks.push({ source, value: leak });
      }
      if (leaks.length >= 25) return;
    }
  };
  collect("response-body", body);
  for (const [name, value] of Object.entries(headers)) {
    collect(`response-header:${name}`, value);
    if (leaks.length >= 25) break;
  }
  return leaks;
}

function invariant(
  results: InvariantResult[],
  id: string,
  description: string,
  expected: string,
  actual: string,
  passed: boolean,
): void {
  results.push({ id, description, expected, actual, passed });
}

function initialStep(trace: FetchTrace): RedirectStep | null {
  return trace.steps[0] ?? null;
}

function normalizedLocation(location: string | null, requestedUrl: string): string | null {
  if (!location) return null;
  try {
    return new URL(location, requestedUrl).toString();
  } catch {
    return location;
  }
}

function contentTypeMatches(kind: EndpointKind, value: string | null): boolean {
  if (!value) return false;
  const mediaType = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (kind === "html" || kind === "not-found" || kind === "www-redirect") {
    return mediaType === "text/html";
  }
  if (kind === "robots") return mediaType === "text/plain";
  return mediaType === "application/xml" || mediaType === "text/xml" || mediaType.endsWith("+xml");
}

function expectedContentType(kind: EndpointKind): string {
  if (kind === "html" || kind === "not-found" || kind === "www-redirect") return "text/html";
  if (kind === "robots") return "text/plain";
  return "application/xml, text/xml, or +xml";
}

function evaluateEndpoint(
  spec: EndpointSpec,
  trace: FetchTrace,
  sitemap: SitemapDocument,
  robots: RobotsDocument,
  options: CliOptions,
): EndpointReport {
  const initial = initialStep(trace);
  const metadata =
    spec.kind === "html" || spec.kind === "www-redirect"
      ? htmlMetadata(trace.body, trace.finalUrl, trace.finalHeaders["x-robots-tag"] ?? null)
      : htmlMetadata("", null, trace.finalHeaders["x-robots-tag"] ?? null);
  const sitemapMembership = spec.sitemapTarget ? sitemap.urls.includes(spec.sitemapTarget) : null;
  const leaks = localhostLeaks(trace.body, trace.finalHeaders);
  const checks: InvariantResult[] = [];
  invariant(
    checks,
    `${spec.id}.request-completed`,
    "HTTP request completed without a transport or redirect error",
    "completed",
    trace.error ?? "completed",
    trace.error === null,
  );
  if (trace.error === null) {
    if (spec.expectedRedirectStatuses !== null) {
      const expectedStatus = spec.expectedRedirectStatuses.join(" or ");
      const statusPassed =
        initial !== null && spec.expectedRedirectStatuses.includes(initial.status);
      invariant(
        checks,
        `${spec.id}.initial-redirect-status`,
        "The entry request redirects before content is served",
        expectedStatus,
        initial ? String(initial.status) : "missing response",
        statusPassed,
      );
      const expectedLocation = spec.expectedRedirectLocation;
      const actualLocation = normalizedLocation(initial?.location ?? null, spec.requestUrl);
      invariant(
        checks,
        `${spec.id}.redirect-location`,
        "The redirect reaches the expected destination for this environment",
        expectedLocation ?? "a Location header",
        actualLocation ?? "missing",
        expectedLocation ? actualLocation === expectedLocation : actualLocation !== null,
      );
    } else {
      invariant(
        checks,
        `${spec.id}.initial-status`,
        "The endpoint responds directly",
        String(spec.expectedFinalStatus),
        initial ? String(initial.status) : "missing response",
        initial?.status === spec.expectedFinalStatus,
      );
    }
    invariant(
      checks,
      `${spec.id}.final-status`,
      "The resolved endpoint is available",
      String(spec.expectedFinalStatus),
      trace.finalStatus === null ? "missing" : String(trace.finalStatus),
      trace.finalStatus === spec.expectedFinalStatus,
    );
    invariant(
      checks,
      `${spec.id}.content-type`,
      "The resolved response has the expected media type",
      expectedContentType(spec.kind),
      trace.finalContentType ?? "missing",
      contentTypeMatches(spec.kind, trace.finalContentType),
    );
    if (options.isProduction) {
      invariant(
        checks,
        `${spec.id}.localhost-leaks`,
        "Production response headers and body do not expose local origins",
        "0 leaks",
        `${leaks.length} leak${leaks.length === 1 ? "" : "s"}`,
        leaks.length === 0,
      );
    }
    if (spec.kind === "html") {
      invariant(
        checks,
        `${spec.id}.canonical-count`,
        "The HTML document owns exactly one canonical link",
        "1",
        String(metadata.canonicalCount),
        metadata.canonicalCount === 1,
      );
      invariant(
        checks,
        `${spec.id}.canonical-value`,
        "The canonical link matches the route-owned production URL",
        spec.expectedCanonical ?? "none",
        metadata.canonical ?? "missing",
        metadata.canonical === spec.expectedCanonical,
      );
      const tokens = metadata.effectiveRobotsTokens;
      const noindex = tokens.includes("noindex") || tokens.includes("none");
      const nofollow = tokens.includes("nofollow") || tokens.includes("none");
      const robotsPassed =
        spec.expectedRobots === "index-follow"
          ? !noindex && !nofollow
          : spec.expectedRobots === "noindex-follow"
            ? noindex && !nofollow
            : noindex && nofollow;
      invariant(
        checks,
        `${spec.id}.robots-policy`,
        "Meta robots and X-Robots-Tag implement the route indexability policy",
        spec.expectedRobots ?? "not applicable",
        tokens.length > 0 ? tokens.join(", ") : "implicit index, follow",
        robotsPassed,
      );
      if (spec.expectedSitemapMembership !== null) {
        invariant(
          checks,
          `${spec.id}.sitemap-membership`,
          "Sitemap membership matches the route indexability policy",
          String(spec.expectedSitemapMembership),
          String(sitemapMembership),
          sitemapMembership === spec.expectedSitemapMembership,
        );
      }
      const invalidHreflang = metadata.hreflang.filter((entry) => {
        try {
          const url = new URL(entry.href);
          return (
            url.protocol !== "https:" || /^(?:localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname)
          );
        } catch {
          return true;
        }
      });
      invariant(
        checks,
        `${spec.id}.hreflang-targets`,
        "Any emitted hreflang links use valid public HTTPS URLs",
        "all valid public HTTPS URLs",
        invalidHreflang.length === 0 ? "valid" : `${invalidHreflang.length} invalid target(s)`,
        invalidHreflang.length === 0,
      );
      if (publishedLocales.length > 1) {
        const emitted = new Set(metadata.hreflang.map((entry) => entry.language));
        const missing = publishedLocales.filter((locale) => !emitted.has(locale));
        invariant(
          checks,
          `${spec.id}.hreflang-locales`,
          "All published locales have alternate links",
          publishedLocales.join(", "),
          missing.length === 0 ? "complete" : `missing ${missing.join(", ")}`,
          missing.length === 0,
        );
      }
    }
    if (spec.kind === "not-found" && spec.expectedSitemapMembership !== null) {
      invariant(
        checks,
        `${spec.id}.sitemap-membership`,
        "The unsupported route is excluded from the canonical sitemap",
        String(spec.expectedSitemapMembership),
        String(sitemapMembership),
        sitemapMembership === spec.expectedSitemapMembership,
      );
    }
    if (spec.kind === "robots") {
      const expectedSitemap = absoluteUrl(options.canonicalOrigin, "/sitemap.xml");
      invariant(
        checks,
        `${spec.id}.sitemap-directive`,
        "robots.txt advertises the canonical sitemap",
        expectedSitemap,
        robots.sitemaps.length > 0 ? robots.sitemaps.join(", ") : "missing",
        robots.sitemaps.includes(expectedSitemap),
      );
      invariant(
        checks,
        `${spec.id}.design-system-disallow`,
        "robots.txt disallows the design-system QA route",
        "/zh-CN/design-system",
        robots.disallow.length > 0 ? robots.disallow.join(", ") : "missing",
        robots.disallow.includes("/zh-CN/design-system"),
      );
    }
    if (spec.kind === "sitemap") {
      const invalidUrls = sitemap.urls.filter((value) => {
        try {
          const url = new URL(value);
          return url.origin !== options.canonicalOrigin || url.protocol !== "https:";
        } catch {
          return true;
        }
      });
      invariant(
        checks,
        `${spec.id}.has-urls`,
        "The sitemap contains at least one URL",
        "> 0 URLs",
        `${sitemap.urls.length} URLs`,
        sitemap.urls.length > 0,
      );
      invariant(
        checks,
        `${spec.id}.canonical-origin`,
        "Every sitemap URL uses the configured canonical HTTPS origin",
        options.canonicalOrigin,
        invalidUrls.length === 0 ? "all canonical" : `${invalidUrls.length} invalid URL(s)`,
        invalidUrls.length === 0,
      );
      invariant(
        checks,
        `${spec.id}.unique-urls`,
        "The sitemap contains no duplicate URLs",
        "0 duplicates",
        `${sitemap.duplicateUrls.length} duplicates`,
        sitemap.duplicateUrls.length === 0,
      );
    }
  }
  return {
    id: spec.id,
    label: spec.label,
    kind: spec.kind,
    requestedUrl: spec.requestUrl,
    status: initial?.status ?? null,
    contentType: initial?.contentType ?? null,
    location: initial?.location ?? null,
    finalUrl: trace.finalUrl,
    finalStatus: trace.finalStatus,
    finalContentType: trace.finalContentType,
    redirectChain: trace.steps,
    bodyBytes: trace.bodyBytes,
    canonical: metadata.canonical,
    canonicalRaw: metadata.canonicalRaw,
    canonicalCount: metadata.canonicalCount,
    robotsMeta: metadata.robotsMeta,
    xRobotsTag: metadata.xRobotsTag,
    effectiveRobotsTokens: metadata.effectiveRobotsTokens,
    hreflang: metadata.hreflang,
    sitemapTarget: spec.sitemapTarget,
    sitemapMembership,
    localhostLeaks: leaks,
    requestError: trace.error,
    invariants: checks,
  };
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function displayUrl(value: string | null, origin: string): string {
  if (!value) return "—";
  return value.startsWith(origin) ? value.slice(origin.length) || "/" : value;
}

function markdownReport(report: {
  readonly generatedAt: string;
  readonly target: {
    readonly baseUrl: string;
    readonly canonicalOrigin: string;
    readonly production: boolean;
  };
  readonly mode: { readonly auditOnly: boolean; readonly phase: string; readonly source: string };
  readonly summary: {
    readonly status: "pass" | "fail";
    readonly endpoints: number;
    readonly invariantChecks: number;
    readonly invariantFailures: number;
    readonly sitemapUrlCount: number;
  };
  readonly endpoints: readonly EndpointReport[];
}): string {
  const lines = [
    `# One Forth indexability verification — ${report.mode.source}`,
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `- Target: \`${report.target.baseUrl}\``,
    `- Canonical origin: \`${report.target.canonicalOrigin}\``,
    `- Mode: ${report.mode.auditOnly ? "audit-only (failures do not change the exit code)" : "enforced"}`,
    "",
    `Result: **${report.summary.status.toUpperCase()}** — ${report.summary.invariantFailures}/${report.summary.invariantChecks} explicit invariants failed across ${report.summary.endpoints} endpoints.`,
    "",
    "## Endpoint summary",
    "",
    "| Endpoint | HTTP → final | Content-Type | Location | Canonical | Robots | hreflang | Sitemap | localhost | Result |",
    "| --- | --- | --- | --- | --- | --- | ---: | --- | ---: | --- |",
  ];
  for (const endpoint of report.endpoints) {
    const failures = endpoint.invariants.filter((check) => !check.passed).length;
    const robots = endpoint.effectiveRobotsTokens.length
      ? endpoint.effectiveRobotsTokens.join(", ")
      : endpoint.kind === "html"
        ? "implicit index, follow"
        : "—";
    lines.push(
      `| ${markdownCell(endpoint.label)} | ${endpoint.status ?? "—"} → ${endpoint.finalStatus ?? "—"} | ${markdownCell(endpoint.finalContentType ?? "—")} | ${markdownCell(endpoint.location ?? "—")} | ${markdownCell(displayUrl(endpoint.canonical, report.target.canonicalOrigin))} | ${markdownCell(robots)} | ${endpoint.hreflang.length} | ${endpoint.sitemapMembership === null ? "—" : endpoint.sitemapMembership ? "yes" : "no"} | ${endpoint.localhostLeaks.length} | ${failures === 0 ? "PASS" : `FAIL (${failures})`} |`,
    );
  }
  lines.push("", "## Explicit invariant failures", "");
  const failures = report.endpoints.flatMap((endpoint) =>
    endpoint.invariants.filter((check) => !check.passed).map((check) => ({ endpoint, check })),
  );
  if (failures.length === 0) {
    lines.push("None.");
  } else {
    for (const { endpoint, check } of failures) {
      lines.push(
        `- \`${check.id}\` (${endpoint.label}): expected ${check.expected}; observed ${check.actual}.`,
      );
    }
  }
  lines.push("", "## Sitemap and robots evidence", "");
  lines.push(`- Sitemap URL count: ${report.summary.sitemapUrlCount}.`);
  const robotsEndpoint = report.endpoints.find((endpoint) => endpoint.id === "robots");
  lines.push(
    `- robots.txt: HTTP ${robotsEndpoint?.finalStatus ?? "—"}, Content-Type \`${robotsEndpoint?.finalContentType ?? "—"}\`.`,
  );
  lines.push(
    `- hreflang requirement: ${publishedLocales.length > 1 ? `required for ${publishedLocales.join(", ")}` : "not required while only zh-CN is published; emitted links are still validated"}.`,
  );
  lines.push("", "## Endpoint detail", "");
  for (const endpoint of report.endpoints) {
    lines.push(`### ${endpoint.label}`, "");
    lines.push(`- Requested: \`${endpoint.requestedUrl}\``);
    lines.push(`- Final: \`${endpoint.finalUrl ?? "—"}\` (${endpoint.finalStatus ?? "—"})`);
    lines.push(`- Canonical: \`${endpoint.canonical ?? "—"}\``);
    lines.push(`- robots meta: \`${endpoint.robotsMeta ?? "—"}\``);
    lines.push(`- X-Robots-Tag: \`${endpoint.xRobotsTag ?? "—"}\``);
    lines.push(
      `- hreflang: ${endpoint.hreflang.length > 0 ? endpoint.hreflang.map((entry) => `${entry.language}=${entry.href}`).join(", ") : "none"}`,
    );
    lines.push(
      `- Sitemap target/member: ${endpoint.sitemapTarget ?? "—"} / ${endpoint.sitemapMembership === null ? "—" : String(endpoint.sitemapMembership)}`,
    );
    lines.push(
      `- localhost leaks: ${endpoint.localhostLeaks.length > 0 ? endpoint.localhostLeaks.map((leak) => `${leak.source}=${leak.value}`).join(", ") : "none"}`,
    );
    if (endpoint.requestError) lines.push(`- Request error: ${endpoint.requestError}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help")) {
    showHelp();
    return;
  }
  const options = parseOptions(args);
  const specs = endpointSpecs(options);
  const traces = await Promise.all(
    specs.map(async (spec) => ({
      spec,
      trace: await fetchTrace(spec.requestUrl, options.timeoutMs),
    })),
  );
  const sitemapTrace = traces.find(({ spec }) => spec.kind === "sitemap")?.trace;
  const robotsTrace = traces.find(({ spec }) => spec.kind === "robots")?.trace;
  const sitemap = parseSitemap(sitemapTrace?.body ?? "");
  const robots = parseRobots(robotsTrace?.body ?? "");
  const endpoints = traces.map(({ spec, trace }) =>
    evaluateEndpoint(spec, trace, sitemap, robots, options),
  );
  const checks = endpoints.flatMap((endpoint) => endpoint.invariants);
  const failures = checks.filter((check) => !check.passed);
  const generatedAt = new Date().toISOString();
  const report = {
    schemaVersion: 2,
    generatedAt,
    target: {
      baseUrl: options.baseUrl,
      canonicalOrigin: options.canonicalOrigin,
      production: options.isProduction,
    },
    mode: {
      auditOnly: options.auditOnly,
      phase: options.phase,
      source: options.source,
    },
    representatives: representativeRoutes,
    summary: {
      status: failures.length === 0 ? ("pass" as const) : ("fail" as const),
      endpoints: endpoints.length,
      invariantChecks: checks.length,
      invariantFailures: failures.length,
      sitemapUrlCount: sitemap.urls.length,
    },
    robots: {
      sitemaps: robots.sitemaps,
      disallow: robots.disallow,
    },
    sitemap: {
      urlCount: sitemap.urls.length,
      urls: sitemap.urls,
      duplicateUrls: sitemap.duplicateUrls,
    },
    endpoints,
  };
  await mkdir(options.outputDirectory, { recursive: true });
  const jsonPath = resolve(options.outputDirectory, `indexability-${options.source}.json`);
  const markdownPath = resolve(options.outputDirectory, `indexability-${options.source}.md`);
  const prettierConfig = (await resolveConfig(markdownPath)) ?? {};
  const [jsonOutput, markdownOutput] = await Promise.all([
    format(JSON.stringify(report), { ...prettierConfig, filepath: jsonPath }),
    format(markdownReport(report), { ...prettierConfig, filepath: markdownPath }),
  ]);
  await Promise.all([
    writeFile(jsonPath, jsonOutput, "utf8"),
    writeFile(markdownPath, markdownOutput, "utf8"),
  ]);
  console.log(
    `Indexability ${report.summary.status.toUpperCase()}: ${failures.length}/${checks.length} explicit invariants failed.`,
  );
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${markdownPath}`);
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`- ${failure.id}: expected ${failure.expected}; observed ${failure.actual}`);
    }
    if (!options.auditOnly) process.exitCode = 1;
  }
}

if (shouldRespawnWithEnvironmentProxy()) {
  const child = spawnSync(
    process.execPath,
    ["--use-env-proxy", ...process.execArgv, ...process.argv.slice(1)],
    {
      stdio: "inherit",
      env: { ...process.env, INDEXABILITY_PROXY_CHILD: "1" },
    },
  );
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
} else {
  await main();
}
