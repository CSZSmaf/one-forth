import { readerCurriculumRepository } from "@one-forth/content";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => navigationMocks);

import BooksDirectoryPage from "@/app/[locale]/books/page";
import SeriesPage, {
  generateMetadata as generateSeriesMetadata,
} from "@/app/[locale]/books/[series]/page";
import BookPage, {
  generateMetadata as generateBookMetadata,
} from "@/app/[locale]/books/[series]/[book]/page";
import {
  generateMetadata as generateChapterMetadata,
  generateStaticParams as generateChapterStaticParams,
} from "@/app/[locale]/books/[series]/[book]/[chapter]/page";

const forbiddenEngineeringCopy = /TODO|课程规划|编辑状态|publicationStatus|editorialStatus|schema/i;

describe("curriculum book routes", () => {
  it("renders a scan-friendly index for every reader-visible series and book", async () => {
    const series = readerCurriculumRepository.listSeries();
    const books = readerCurriculumRepository.listBooks();
    expect(series).toHaveLength(4);
    expect(books).toHaveLength(52);

    const { container } = render(
      await BooksDirectoryPage({ params: Promise.resolve({ locale: "zh-CN" }) }),
    );

    series.forEach((entry) => {
      expect(screen.getByRole("heading", { name: entry.title["zh-CN"] })).toBeVisible();
    });
    expect(container.querySelectorAll(".book-shelf > li")).toHaveLength(books.length);
    expect(container.textContent).not.toMatch(forbiddenEngineeringCopy);
    expect(screen.getByRole("heading", { name: "物理" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "计算机" })).toBeVisible();
    expect(screen.getByRole("link", { name: /C00 编程与科学计算基础/ })).toBeVisible();
  });

  it("renders the mathematics series and a complete first-book table of contents", async () => {
    const mathematics = readerCurriculumRepository.getSeriesBySlug("mathematics");
    if (!mathematics) throw new Error("The published mathematics series is missing.");
    const mathematicsBooks = readerCurriculumRepository.listBooks(mathematics.id);

    const seriesView = render(
      await SeriesPage({
        params: Promise.resolve({ locale: "zh-CN", series: "mathematics" }),
      }),
    );
    expect(seriesView.container.querySelectorAll(".book-shelf > li")).toHaveLength(
      mathematicsBooks.length,
    );
    seriesView.unmount();

    const bookView = render(
      await BookPage({
        params: Promise.resolve({
          locale: "zh-CN",
          series: "mathematics",
          book: "mathematical-language-sets-proofs",
        }),
      }),
    );
    const contents = screen.getByRole("heading", { name: "目录" }).closest("section");
    expect(contents).not.toBeNull();
    if (!contents) return;
    expect(within(contents).getAllByRole("listitem")).toHaveLength(6);
    expect(within(contents).getByRole("link", { name: /^02\s+集合、映射与关系/ })).toHaveAttribute(
      "href",
      "/zh-CN/books/mathematics/mathematical-language-sets-proofs/sets-mappings",
    );
    expect(screen.getByRole("link", { name: "开始本册" })).toHaveAttribute(
      "href",
      "/zh-CN/books/mathematics/mathematical-language-sets-proofs/logic-propositions",
    );
    expect(screen.getByRole("heading", { name: "相关教材" })).toBeVisible();
    expect(screen.getByRole("link", { name: /M01 代数、函数与解析几何/ })).toHaveAttribute(
      "href",
      "/zh-CN/books/mathematics/algebra-functions-analytic-geometry",
    );
    expect(bookView.container.textContent).not.toMatch(forbiddenEngineeringCopy);
    expect(bookView.container.textContent).not.toContain("预览稿／待人工审校");
  });

  it("indexes every completed chapter at its books canonical", async () => {
    const params = {
      locale: "zh-CN" as const,
      series: "mathematics",
      book: "ordinary-differential-equations-dynamical-systems",
      chapter: "existence-uniqueness",
    };

    const metadata = await generateChapterMetadata({ params: Promise.resolve(params) });
    expect(metadata.alternates?.canonical).toBe(
      "https://one-forth.com/zh-CN/books/mathematics/ordinary-differential-equations-dynamical-systems/existence-uniqueness",
    );
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(generateChapterStaticParams()).toContainEqual(params);

    expect(metadata.title).toBe("初值问题、存在唯一性与方向场");
  });

  it("pre-renders exactly the reader-visible chapters and gives them a books canonical", async () => {
    const publicChapters = readerCurriculumRepository.listChapters();
    const staticParams = generateChapterStaticParams();
    expect(publicChapters).toHaveLength(312);
    expect(staticParams).toHaveLength(publicChapters.length);
    expect(new Set(staticParams.map((params) => JSON.stringify(params))).size).toBe(
      publicChapters.length,
    );

    const chapter = readerCurriculumRepository.getChapterForContent("linear-transformations");
    const context = chapter
      ? readerCurriculumRepository.getChapterContext(chapter.id, "zh-CN")
      : null;
    if (!context) throw new Error("The published linear transformation chapter is missing.");
    const metadata = await generateChapterMetadata({
      params: Promise.resolve({
        locale: "zh-CN",
        series: context.series.slug,
        book: context.book.slug,
        chapter: context.chapter.slug,
      }),
    });
    expect(metadata.alternates?.canonical).toBe(`https://one-forth.com${context.canonicalPath}`);
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("lists every chapter without editorial labels and indexes every completed aggregate", async () => {
    const completedBookView = render(
      await BookPage({
        params: Promise.resolve({
          locale: "zh-CN",
          series: "mathematics",
          book: "ordinary-differential-equations-dynamical-systems",
        }),
      }),
    );
    const completedContents = screen.getByRole("heading", { name: "目录" }).closest("section");
    expect(completedContents).not.toBeNull();
    expect(within(completedContents as HTMLElement).getAllByRole("listitem")).toHaveLength(6);
    expect(completedContents?.textContent).not.toMatch(/预览稿|待人工审校|编辑状态|草稿/);
    completedBookView.unmount();

    const completedBookMetadata = await generateBookMetadata({
      params: Promise.resolve({
        locale: "zh-CN",
        series: "mathematics",
        book: "ordinary-differential-equations-dynamical-systems",
      }),
    });
    expect(completedBookMetadata.robots).toMatchObject({ index: true, follow: true });

    const mixedBookMetadata = await generateBookMetadata({
      params: Promise.resolve({
        locale: "zh-CN",
        series: "physics",
        book: "oscillations-waves-optics",
      }),
    });
    expect(mixedBookMetadata.robots).toMatchObject({ index: true, follow: true });

    const mathematicsMetadata = await generateSeriesMetadata({
      params: Promise.resolve({ locale: "zh-CN", series: "mathematics" }),
    });
    expect(mathematicsMetadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("publishes the complete M02 sequence in textbook order", async () => {
    const calculus = readerCurriculumRepository
      .listBooks()
      .find((book) => book.slug === "single-variable-calculus");
    if (!calculus) throw new Error("The published M02 textbook is missing.");

    const chapters = readerCurriculumRepository.listChapters(calculus.id);
    expect(chapters.map((chapter) => chapter.slug)).toEqual([
      "sequences-limits",
      "function-limits-continuity",
      "derivatives-differentials",
      "derivative-applications",
      "definite-integral-accumulation",
      "single-variable-review",
    ]);

    const view = render(
      await BookPage({
        params: Promise.resolve({
          locale: "zh-CN",
          series: "mathematics",
          book: "single-variable-calculus",
        }),
      }),
    );
    const contents = screen.getByRole("heading", { name: "目录" }).closest("section");
    expect(contents).not.toBeNull();
    if (!contents) return;
    expect(within(contents).getAllByRole("listitem")).toHaveLength(6);
    expect(
      within(contents).getByRole("link", { name: /^01\s+数列极限与收敛判据/ }),
    ).toHaveAttribute("href", "/zh-CN/books/mathematics/single-variable-calculus/sequences-limits");
    expect(
      within(contents).getByRole("link", { name: /^06\s+积分方法、无穷级数与单变量微积分复习/ }),
    ).toHaveAttribute(
      "href",
      "/zh-CN/books/mathematics/single-variable-calculus/single-variable-review",
    );
    expect(view.container.textContent).not.toMatch(forbiddenEngineeringCopy);
  });

  it("publishes the complete M03 sequence in textbook order", async () => {
    const multivariable = readerCurriculumRepository
      .listBooks()
      .find((book) => book.slug === "multivariable-calculus-vector-analysis");
    if (!multivariable) throw new Error("The published M03 textbook is missing.");

    const chapters = readerCurriculumRepository.listChapters(multivariable.id);
    expect(chapters.map((chapter) => chapter.slug)).toEqual([
      "several-variable-functions",
      "partials-gradient",
      "double-triple-integrals",
      "line-surface-integrals",
      "green-stokes-gauss",
      "multivariable-review",
    ]);

    const view = render(
      await BookPage({
        params: Promise.resolve({
          locale: "zh-CN",
          series: "mathematics",
          book: "multivariable-calculus-vector-analysis",
        }),
      }),
    );
    const contents = screen.getByRole("heading", { name: "目录" }).closest("section");
    expect(contents).not.toBeNull();
    if (!contents) return;
    expect(within(contents).getAllByRole("listitem")).toHaveLength(6);
    expect(
      within(contents).getByRole("link", { name: /^01\s+多变量函数、极限与连续/ }),
    ).toHaveAttribute(
      "href",
      "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis/several-variable-functions",
    );
    expect(
      within(contents).getByRole("link", { name: /^06\s+多变量微积分与向量分析综合复习/ }),
    ).toHaveAttribute(
      "href",
      "/zh-CN/books/mathematics/multivariable-calculus-vector-analysis/multivariable-review",
    );
    expect(contents).not.toHaveTextContent("从欧氏空间中的邻域和路径出发");
    expect(contents).toHaveTextContent("Green、Stokes 与 Gauss 定理");
    expect(contents).not.toHaveTextContent("本章研究");
    expect(view.container.textContent).not.toMatch(forbiddenEngineeringCopy);
  });

  it("publishes the complete M04 sequence in textbook order", async () => {
    const linearAlgebra = readerCurriculumRepository
      .listBooks()
      .find((book) => book.slug === "linear-algebra");
    if (!linearAlgebra) throw new Error("The published M04 textbook is missing.");

    const chapters = readerCurriculumRepository.listChapters(linearAlgebra.id);
    expect(chapters.map((chapter) => chapter.slug)).toEqual([
      "vectors-coordinates",
      "matrices-operations",
      "linear-systems",
      "determinants-volume",
      "linear-maps-matrices",
      "eigenstructure-review",
    ]);

    const view = render(
      await BookPage({
        params: Promise.resolve({
          locale: "zh-CN",
          series: "mathematics",
          book: "linear-algebra",
        }),
      }),
    );
    const contents = screen.getByRole("heading", { name: "目录" }).closest("section");
    expect(contents).not.toBeNull();
    if (!contents) return;
    expect(within(contents).getAllByRole("listitem")).toHaveLength(6);
    expect(
      within(contents).getByRole("link", { name: /^01\s+向量、坐标与线性组合/ }),
    ).toHaveAttribute("href", "/zh-CN/books/mathematics/linear-algebra/vectors-coordinates");
    expect(
      within(contents).getByRole("link", {
        name: /^06\s+特征值、特征向量、对角化与综合复习/,
      }),
    ).toHaveAttribute("href", "/zh-CN/books/mathematics/linear-algebra/eigenstructure-review");
    expect(contents).not.toHaveTextContent("向量、坐标与线性组合从向量空间公理进入张成");
    expect(contents).not.toHaveTextContent("以不变方向、特征空间和重数判断对角化");
    expect(contents).not.toHaveTextContent("本章研究");
    expect(view.container.textContent).not.toMatch(forbiddenEngineeringCopy);
  });
});
