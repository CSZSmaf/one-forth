import { siteConfig } from "@one-forth/config";
import { readerContentRepository } from "@one-forth/content";
import { listToolIndexEntries } from "@one-forth/content/tool-index";
import { domainRegistry, subjectRegistry } from "@one-forth/registry";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => navigationMocks);

import ContributePage from "@/app/[locale]/contribute/page";
import DesignSystemPage from "@/app/[locale]/design-system/page";
import GlossaryPage from "@/app/[locale]/glossary/page";
import SubjectCoursePage, {
  generateMetadata as generateSubjectMetadata,
  generateStaticParams as generateSubjectParams,
} from "@/app/[locale]/subjects/[domain]/[subject]/page";
import DomainCoursePage, {
  generateMetadata as generateDomainMetadata,
  generateStaticParams as generateDomainParams,
} from "@/app/[locale]/subjects/[domain]/page";
import SubjectDirectoryPage from "@/app/[locale]/subjects/page";
import robots from "@/app/robots";

afterEach(() => {
  vi.unstubAllEnvs();
  navigationMocks.notFound.mockClear();
});

describe("public subject and glossary directories", () => {
  it("derives every reader directory entry from published content", async () => {
    const readableDocuments = await readerContentRepository.listDocuments({ locale: "zh-CN" });
    const glossaryEntries = listToolIndexEntries({
      locale: "zh-CN",
      kind: ["concept", "definition"],
    });
    expect(
      glossaryEntries.every(
        (entry) => entry.title.trim() !== "" && entry.title.trim() !== entry.sourceId,
      ),
    ).toBe(true);

    const subjectView = render(await SubjectDirectoryPage());
    expect(subjectView.container.textContent).not.toMatch(
      /规划|建设|编辑状态|publicationStatus|editorialStatus|成熟度|完成率|草稿|预览稿|待人工审校/,
    );
    for (const domain of domainRegistry.list()) {
      const hasReadableContent = readableDocuments.some(
        (document) => document.frontmatter.domain === domain.id,
      );
      expect(
        subjectView.container.querySelector(`[data-domain="${domain.id}"]`) !== null,
        domain.id,
      ).toBe(hasReadableContent);
    }
    cleanup();
    const glossaryDomainOrder = new Map(
      [...domainRegistry.list()]
        .sort((left, right) => left.order - right.order)
        .map((domain, index) => [domain.id, index] as const),
    );
    const visibleGlossaryEntries = glossaryEntries
      .filter((entry) => entry.title.trim() !== "" && entry.title.trim() !== entry.sourceId)
      .sort(
        (left, right) =>
          (glossaryDomainOrder.get(left.domain ?? "") ?? Number.MAX_SAFE_INTEGER) -
            (glossaryDomainOrder.get(right.domain ?? "") ?? Number.MAX_SAFE_INTEGER) ||
          left.title.localeCompare(right.title, "zh-CN") ||
          left.id.localeCompare(right.id),
      );
    const glossaryView = render(
      await GlossaryPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const glossaryItems = [
      ...glossaryView.container.querySelectorAll<HTMLElement>(".glossary-domain li"),
    ];
    expect(glossaryItems).toHaveLength(Math.min(50, visibleGlossaryEntries.length));
    const glossaryIds = glossaryItems.map((item) => item.id);
    expect(new Set(glossaryIds).size).toBe(glossaryIds.length);
    const allGlossaryFormulae = [
      ...glossaryView.container.querySelectorAll<HTMLElement>(".static-math--glossary"),
    ];
    expect(allGlossaryFormulae.length).toBeGreaterThan(0);
    expect(
      allGlossaryFormulae.every((formula) => formula.querySelector(".katex-mathml math") !== null),
    ).toBe(true);
    expect(glossaryView.container.querySelector(".katex-error")).toBeNull();
    for (const entry of visibleGlossaryEntries.slice(0, 50)) {
      expect(glossaryIds, entry.id).toContain(`glossary-${entry.id}`);
      expect(
        glossaryView.container.querySelector(`a[href="${entry.canonicalUrl}"]`),
        entry.id,
      ).not.toBeNull();
    }

    const boundedOperator = glossaryEntries.find(
      (entry) => entry.sourceId === "definition-bounded-operator",
    );
    expect(boundedOperator).toBeDefined();
    cleanup();
    const boundedOperatorView = render(
      await GlossaryPage({
        params: Promise.resolve({ locale: "zh-CN" }),
        searchParams: Promise.resolve({ q: boundedOperator?.title ?? "" }),
      }),
    );
    const boundedOperatorItem = [
      ...boundedOperatorView.container.querySelectorAll<HTMLElement>(".glossary-domain li"),
    ].find((item) => item.id === `glossary-${boundedOperator?.id}`);
    const renderedFormulae = [
      ...(boundedOperatorItem?.querySelectorAll<HTMLElement>(".static-math--glossary") ?? []),
    ];
    expect(renderedFormulae.map((formula) => formula.dataset.latex)).toContain(
      "\\|Tx\\|_Y\\le C\\|x\\|_X \\quad\\text{对所有 }x\\in X,",
    );
    expect(boundedOperatorItem?.querySelector(".katex-mathml math")).not.toBeNull();
    expect(boundedOperatorItem?.querySelector(".katex-error")).toBeNull();
    expect(boundedOperatorItem?.querySelector("p")?.textContent).not.toContain("$$");
  });

  it("pre-renders and serves domain and subject routes with reader-visible descendants", async () => {
    const readableDocuments = await readerContentRepository.listDocuments({ locale: "zh-CN" });
    const expectedDomains = [
      ...new Set(readableDocuments.map((document) => document.frontmatter.domain)),
    ].map((domain) => ({ locale: "zh-CN", domain }));
    const expectedSubjects = [
      ...new Map(
        readableDocuments.map((document) => [
          `${document.frontmatter.domain}/${document.frontmatter.subject}`,
          {
            locale: "zh-CN",
            domain: document.frontmatter.domain,
            subject: document.frontmatter.subject,
          },
        ]),
      ).values(),
    ];

    expect(await generateDomainParams()).toEqual(expectedDomains);
    expect(await generateSubjectParams()).toEqual(expectedSubjects);

    const unavailableDomain = domainRegistry
      .list()
      .find((domain) => !expectedDomains.some((entry) => entry.domain === domain.id));
    if (unavailableDomain) {
      await expect(
        DomainCoursePage({
          params: Promise.resolve({ locale: "zh-CN", domain: unavailableDomain.id }),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
    }

    const unavailableSubject = subjectRegistry
      .list()
      .find(
        (subject) =>
          !expectedSubjects.some(
            (entry) => entry.domain === subject.domainId && entry.subject === subject.id,
          ),
      );
    if (unavailableSubject) {
      await expect(
        SubjectCoursePage({
          params: Promise.resolve({
            locale: "zh-CN",
            domain: unavailableSubject.domainId,
            subject: unavailableSubject.id,
          }),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
    }
  });

  it("indexes every fully published subject and domain aggregate", async () => {
    const subjectParams = {
      locale: "zh-CN" as const,
      domain: "computer-science",
      subject: "algorithms",
    };
    const subjectMetadata = await generateSubjectMetadata({
      params: Promise.resolve(subjectParams),
    });
    expect(subjectMetadata.robots).toMatchObject({ index: true, follow: true });

    const subjectView = render(await SubjectCoursePage({ params: Promise.resolve(subjectParams) }));
    const subjectDocuments = await readerContentRepository.listDocuments({
      locale: "zh-CN",
      domain: subjectParams.domain,
      subject: subjectParams.subject,
    });
    expect(subjectView.container.querySelectorAll(".course-sequence > ol > li")).toHaveLength(
      subjectDocuments.length,
    );
    expect(subjectView.container.textContent).not.toMatch(/预览稿|待人工审校|编辑状态|草稿/);
    cleanup();

    const mixedSubjectMetadata = await generateSubjectMetadata({
      params: Promise.resolve({
        locale: "zh-CN" as const,
        domain: "mathematics",
        subject: "calculus",
      }),
    });
    expect(mixedSubjectMetadata.robots).toMatchObject({ index: true, follow: true });

    const computerScienceMetadata = await generateDomainMetadata({
      params: Promise.resolve({ locale: "zh-CN" as const, domain: "computer-science" }),
    });
    expect(computerScienceMetadata.robots).toMatchObject({ index: true, follow: true });

    const mixedDomainMetadata = await generateDomainMetadata({
      params: Promise.resolve({ locale: "zh-CN" as const, domain: "mathematics" }),
    });
    expect(mixedDomainMetadata.robots).toMatchObject({ index: true, follow: true });
  });
});

describe("reader-facing support routes", () => {
  it("turns the contribution page into a correction checklist without engineering links", async () => {
    render(
      await ContributePage({
        searchParams: Promise.resolve({
          topic: "向量",
          source:
            "https://one-forth.com/zh-CN/books/mathematics/linear-algebra/vectors-coordinates",
        }),
      }),
    );

    expect(screen.getByRole("heading", { name: "报告正文中的问题。" })).toBeVisible();
    expect(screen.getByText("向量")).toBeVisible();
    expect(screen.getByText(/^https:\/\/one-forth\.com/)).toBeVisible();
    expect(document.body.textContent).not.toMatch(/仓库|Schema|校验命令|设计系统/);
    expect(screen.getByRole("link", { name: siteConfig.profile.email })).toHaveAttribute(
      "href",
      `mailto:${siteConfig.profile.email}`,
    );
  });

  it("keeps the design reference available in development and returns 404 in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const developmentView = render(<>{DesignSystemPage()}</>);
    expect(screen.getByRole("heading", { name: "设计系统检查页" })).toBeVisible();
    developmentView.unmount();

    vi.stubEnv("NODE_ENV", "production");
    expect(() => DesignSystemPage()).toThrow("NEXT_NOT_FOUND");
  });

  it("uses robots only as a secondary defense for internal references", () => {
    const rules = robots().rules;
    expect(rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/zh-CN/design-system", "/en/design-system"],
    });
  });
});
