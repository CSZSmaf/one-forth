import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HomeLearningProgress,
  resolveHomeLearningPath,
  type HomeLearningPathDefinitionDto,
} from "@/components/home-learning-progress";
import { writeConceptLearningState } from "@/lib/learning-state";

const path: HomeLearningPathDefinitionDto = {
  pathId: "linear-algebra-foundations",
  title: "线性代数基础",
  summary: "从向量开始，按先修顺序学习线性代数。",
  pathHref: "/zh-CN/paths/linear-algebra-foundations",
  estimatedHours: 30,
  nodes: Array.from({ length: 20 }, (_, index) => ({
    conceptId: `concept-${index + 1}`,
    title: `第${index + 1}章`,
    ...(index < 5 ? { articleHref: `/zh-CN/learn/chapter-${index + 1}` } : {}),
  })),
};

describe("home learning progress", () => {
  it("offers three registered beginner routes and a truthful zero-foundation chapter", () => {
    const recommendedPaths: readonly HomeLearningPathDefinitionDto[] = [
      path,
      {
        ...path,
        pathId: "calculus-foundations",
        title: "高等数学基础",
        pathHref: "/zh-CN/paths/calculus-foundations",
      },
      {
        ...path,
        pathId: "probability-statistics-foundations",
        title: "概率与统计基础",
        pathHref: "/zh-CN/paths/probability-statistics-foundations",
      },
    ];

    render(
      <HomeLearningProgress
        path={path}
        recommendedPaths={recommendedPaths}
        zeroFoundationChapter={{
          title: "集合与映射",
          href: "/zh-CN/concepts/sets-and-mappings",
          maturityLabel: "基础入门",
        }}
      />,
    );

    expect(screen.getByText("三条入门路线")).toBeVisible();
    expect(screen.getByRole("link", { name: /高等数学基础/ })).toHaveAttribute(
      "href",
      "/zh-CN/paths/calculus-foundations",
    );
    expect(screen.getByRole("link", { name: /概率与统计基础/ })).toHaveAttribute(
      "href",
      "/zh-CN/paths/probability-statistics-foundations",
    );
    expect(screen.getByRole("link", { name: /集合与映射/ })).toHaveAttribute(
      "href",
      "/zh-CN/concepts/sets-and-mappings",
    );
    expect(screen.getByText("基础入门")).toBeVisible();
    expect(document.body.textContent).not.toMatch(/课程规划|草稿|预览|编辑状态/);
  });

  it("shows a real path recommendation when there is no local record", () => {
    const { container } = render(<HomeLearningProgress path={path} />);

    expect(screen.getByText("推荐起点")).toBeVisible();
    expect(screen.getByRole("heading", { name: "线性代数基础" })).toBeVisible();
    expect(screen.getByText(/0 \/ 20 个概念/)).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "学习路径完成进度" })).toHaveValue(0);
    expect(screen.getByRole("link", { name: /打开学习路径/ })).toHaveAttribute(
      "href",
      path.pathHref,
    );
    expect(container.textContent).not.toMatch(/linear-algebra-foundations|concept-1/);
  });

  it("uses all path nodes and resumes the current article", () => {
    writeConceptLearningState(localStorage, "concept-1", {
      status: "completed",
      pathId: path.pathId,
    });
    writeConceptLearningState(localStorage, "concept-2", {
      readingProgress: 44,
      lastAnchor: "worked-example",
      pathId: path.pathId,
    });

    const resolved = resolveHomeLearningPath(path, localStorage);
    expect(resolved).toMatchObject({
      pathId: path.pathId,
      total: 20,
      completed: 1,
      percent: 5,
      currentChapter: { conceptId: "concept-2", title: "第2章" },
      destination: {
        kind: "article",
        href: "/zh-CN/learn/chapter-2#worked-example",
      },
    });
    expect(resolved.conceptIds).toHaveLength(20);

    render(<HomeLearningProgress path={path} />);
    expect(
      screen.getByText("继续学习", { selector: ".home-continue__heading span" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "第2章" })).toBeVisible();
    expect(screen.getByText(/1 \/ 20 个概念/)).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "学习路径完成进度" })).toHaveValue(5);
    expect(screen.getByRole("link", { name: /继续阅读/ })).toHaveAttribute(
      "href",
      "/zh-CN/learn/chapter-2#worked-example",
    );
  });

  it("keeps a completed path complete and sends its CTA to the path page", () => {
    for (const node of path.nodes) {
      writeConceptLearningState(localStorage, node.conceptId, {
        status: "completed",
        pathId: path.pathId,
      });
    }

    render(<HomeLearningProgress path={path} />);
    expect(
      screen.getByText("继续学习", { selector: ".home-continue__heading span" }),
    ).toBeVisible();
    expect(screen.getByText("已完成", { selector: ".status-label" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "线性代数基础" })).toBeVisible();
    expect(screen.getByText(/20 \/ 20 个概念/)).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "学习路径完成进度" })).toHaveValue(100);
    expect(screen.getByRole("link", { name: /继续学习/ })).toHaveAttribute("href", path.pathHref);
  });
});
