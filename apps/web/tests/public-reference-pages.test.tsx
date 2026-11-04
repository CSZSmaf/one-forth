import { resources } from "@one-forth/content";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { presentGraphConcepts } from "@one-forth/knowledge-graph/presentation";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EquationsPage from "@/app/[locale]/equations/page";
import { buildToolKnowledgeGraph } from "@/app/[locale]/graph/page";
import PlaygroundPage from "@/app/[locale]/playground/page";
import ResourcePage, {
  generateStaticParams as generateResourceParams,
} from "@/app/[locale]/resources/[id]/page";
import ResourcesPage from "@/app/[locale]/resources/page";
import SymbolsPage from "@/app/[locale]/symbols/page";
import { parseMathRichText } from "@/components/math-rich-text";
import { resolveResourceMetadataFieldStatusLabel } from "@/lib/labels";
import {
  listPublicEquationReferences,
  listPublicResourceUsages,
  listPublicResources,
  listPublicSymbolReferences,
} from "@/lib/reference-locations";

afterEach(cleanup);

const internalEditorialCopyPattern =
  /publicationStatus|editorialStatus|translationEditorialStatus|humanReviewer|课程规划|规划状态|草稿状态|预览稿|待人工审阅|待人工审校|待归档|待登记/i;

describe("reader reference pages", () => {
  it("builds graph identity and relations from the unified index", () => {
    const graph = buildToolKnowledgeGraph("zh-CN");

    expect(graph.nodes).toHaveLength(
      presentGraphConcepts(listToolIndexEntries({ locale: "zh-CN", kind: "concept" }), "zh-CN")
        .length,
    );
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.nodes.map((node) => node[0])).toContain("特征值与特征向量");
    expect(graph.nodes.some((node) => /综合复习|综合项目/u.test(node[0]))).toBe(false);
    expect(
      graph.edges.every(
        ([source, target]) =>
          source !== target &&
          graph.nodes[source] !== undefined &&
          graph.nodes[target] !== undefined,
      ),
    ).toBe(true);
    // Every node carries precomputed layout coordinates (no -1 fallback).
    expect(graph.nodes.every((node) => node[5] >= 0 && node[6] >= 0)).toBe(true);
    // Lookup tables cover every indexed field on nodes and edges.
    expect(graph.nodes.every((node) => graph.domains[node[1]] !== undefined)).toBe(true);
    expect(graph.nodes.every((node) => graph.subjects[node[2]] !== undefined)).toBe(true);
    expect(graph.edges.every((edge) => graph.relationTypes[edge[2]] !== undefined)).toBe(true);
    expect(graph.edges.every((edge) => edge[3] === 0 || edge[3] === 1)).toBe(true);
  });

  it("derives complete equation and symbol indexes from textbook locations", async () => {
    const [equationReferences, symbolReferences] = await Promise.all([
      listPublicEquationReferences("zh-CN"),
      listPublicSymbolReferences("zh-CN"),
    ]);
    expect(equationReferences.length).toBeGreaterThan(0);
    expect(symbolReferences.length).toBeGreaterThan(0);

    const equationView = render(
      await EquationsPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(equationView.container.querySelectorAll(".equation-index > li")).toHaveLength(
      Math.min(20, equationReferences.length),
    );
    expect(
      [...equationView.container.querySelectorAll(".equation-index__details dl dd")].every(
        (definition) => definition.textContent?.includes("单位："),
      ),
    ).toBe(true);
    expect(equationView.container.textContent).not.toMatch(internalEditorialCopyPattern);

    cleanup();
    const symbolView = render(
      await SymbolsPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(symbolView.container.querySelectorAll(".reference-table tbody tr")).toHaveLength(
      Math.min(50, symbolReferences.length),
    );
    const symbolById = new Map(symbolReferences.map(({ symbol }) => [symbol.id, symbol] as const));
    for (const row of symbolView.container.querySelectorAll<HTMLTableRowElement>(
      ".reference-table tbody tr",
    )) {
      const symbolId = row.id.replace(/^symbol-/u, "");
      const reference = symbolReferences.find(({ symbol }) => symbol.id === symbolId);
      expect(row.querySelectorAll("td:last-child a"), symbolId).toHaveLength(
        reference?.locations.length ?? 0,
      );
      const renderedConflicts = [...row.querySelectorAll<HTMLElement>(".symbol-conflict-list")].map(
        (element) => element.dataset.notation,
      );
      // 同形冲突按规范化记号聚合，同一字形只渲染一次（取首个代表）。
      const seenNotations = new Set<string>();
      const expectedConflicts = (reference?.symbol.conflictsWith ?? []).flatMap((id) => {
        const conflict = symbolById.get(id);
        if (!conflict) return [];
        const notation = conflict.plainText.normalize("NFC").trim();
        if (seenNotations.has(notation)) return [];
        seenNotations.add(notation);
        return [conflict.latex];
      });
      expect(renderedConflicts, `${symbolId} conflict symbols`).toEqual(expectedConflicts);
    }
    expect(symbolView.container.textContent).not.toMatch(internalEditorialCopyPattern);
  });

  it("resolves equation and symbol deep links onto the page containing the target", async () => {
    const [equationReferences, symbolReferences] = await Promise.all([
      listPublicEquationReferences("zh-CN"),
      listPublicSymbolReferences("zh-CN"),
    ]);
    const targetEquation =
      equationReferences.find(
        ({ equation }) => equation.id === "a14-inverse-uncertainty-equation-e865b858",
      )?.equation ?? equationReferences.at(-1)?.equation;
    const targetSymbol = symbolReferences.at(-1)?.symbol;

    if (targetEquation) {
      render(
        await EquationsPage({
          params: Promise.resolve({ locale: "zh-CN" }),
          searchParams: Promise.resolve({ equation: targetEquation.id }),
        }),
      );
      const equationElement = document.getElementById(targetEquation.id);
      expect(equationElement).not.toBeNull();
      const metadataValues = [
        ...targetEquation.assumptions.map((assumption) => assumption["zh-CN"]),
        ...targetEquation.applications,
        ...targetEquation.limitingCases,
      ];
      const expectedLatex = metadataValues.flatMap((value) =>
        parseMathRichText(value)
          .filter((segment) => segment.kind === "math")
          .map((segment) => segment.latex),
      );
      const renderedLatex = [
        ...(equationElement?.querySelectorAll<HTMLElement>(".static-math--authored") ?? []),
      ].map((element) => element.dataset.latex);
      expect(renderedLatex).toEqual(expectedLatex);
      expect(equationElement?.textContent).not.toMatch(/\$|\\Phi/u);
      cleanup();
    }
    if (targetSymbol) {
      render(
        await SymbolsPage({
          params: Promise.resolve({ locale: "zh-CN" }),
          searchParams: Promise.resolve({ symbol: targetSymbol.id }),
        }),
      );
      expect(document.getElementById(`symbol-${targetSymbol.id}`)).not.toBeNull();
    }
  });

  it("pre-renders every resource cited by reader-facing正文", async () => {
    const publicResources = await listPublicResources("zh-CN");
    expect(publicResources.length).toBeGreaterThan(0);
    expect(await generateResourceParams()).toEqual(
      publicResources.map((resource) => ({ locale: "zh-CN", id: resource.id })),
    );

    const directory = render(
      await ResourcesPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(directory.container.querySelectorAll(".resource-directory__list > li")).toHaveLength(
      Math.min(24, publicResources.length),
    );
    expect(directory.container.textContent).not.toMatch(internalEditorialCopyPattern);

    const firstPublicResource = publicResources[0];
    if (firstPublicResource) {
      cleanup();
      const usages = await listPublicResourceUsages(firstPublicResource.id, "zh-CN");
      render(
        await ResourcePage({
          params: Promise.resolve({ locale: "zh-CN", id: firstPublicResource.id }),
        }),
      );
      expect(screen.getByRole("heading", { name: firstPublicResource.title })).toBeVisible();
      expect(screen.getByRole("heading", { name: "教材中的引用位置" })).toBeVisible();
      for (const usage of usages) {
        const usageLink = screen.getByRole("link", { name: usage.label });
        expect(usageLink).toHaveAttribute("href", usage.url);
        expect(usageLink.closest("li")?.querySelector("p"), usage.chapterId).toBeNull();
      }
      expect(document.body.textContent).not.toMatch(/待编辑|待登记|草稿|预览|审阅/);
    }

    const unavailableResource = publicResources.find(
      (resource) => resource.id === "book-of-proof-hammack",
    );
    expect(unavailableResource).toBeDefined();
    expect(unavailableResource?.metadataStatus).toBe("unavailable");
    expect(unavailableResource?.metadataFields).toMatchObject({
      authors: "complete",
      year: "unavailable",
      publication: "unavailable",
    });
    const resourcesWithPartialMetadata = [
      unavailableResource,
      publicResources.find((resource) => resource.metadataStatus === "not-applicable"),
    ].filter((resource) => resource !== undefined);
    for (const resource of resourcesWithPartialMetadata) {
      cleanup();
      const filteredDirectory = render(
        await ResourcesPage({
          params: Promise.resolve({ locale: "zh-CN" }),
          searchParams: Promise.resolve({ q: resource.title }),
        }),
      );
      for (const status of Object.values(resource.metadataFields)) {
        if (status === "complete") continue;
        expect(filteredDirectory.container.textContent).not.toContain(
          resolveResourceMetadataFieldStatusLabel(status, "zh-CN"),
        );
      }
      expect(filteredDirectory.container.textContent).not.toContain("未提供或不适用");
      expect(filteredDirectory.container.textContent).not.toMatch(/核验于|推测性补写/);

      cleanup();
      render(
        await ResourcePage({
          params: Promise.resolve({ locale: "zh-CN", id: resource.id }),
        }),
      );
      for (const status of Object.values(resource.metadataFields)) {
        if (status === "complete") continue;
        expect(document.body.textContent).not.toContain(
          resolveResourceMetadataFieldStatusLabel(status, "zh-CN"),
        );
      }
      expect(document.body.textContent).not.toMatch(/核验于|推测性补写/);
    }

    const publicIds = new Set(publicResources.map((resource) => resource.id));
    const unavailableId =
      resources.find((resource) => !publicIds.has(resource.id))?.id ?? "not-a-public-resource";
    await expect(
      ResourcePage({ params: Promise.resolve({ locale: "zh-CN", id: unavailableId }) }),
    ).rejects.toThrow(/404/);
  });

  it("keeps the playground index free of editorial payload fields", async () => {
    const view = render(
      await PlaygroundPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(view.container.textContent).not.toMatch(internalEditorialCopyPattern);
    expect(view.container.querySelectorAll(".experiment-directory > li")).toHaveLength(
      listToolIndexEntries({ locale: "zh-CN", kind: "visualization" }).length,
    );
    expect(view.container.querySelectorAll(".experiment-directory > li").length).toBeGreaterThan(0);
  });
});
