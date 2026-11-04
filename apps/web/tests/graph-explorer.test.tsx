import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  GraphExplorer,
  type GraphExplorerEdgeTuple,
  type GraphExplorerNodeTuple,
} from "@/components/graph-explorer";

const domains = ["mathematics", "physics"] as const;
const subjects = ["calculus", "linear-algebra", "classical-mechanics"] as const;
const relationTypes = ["prerequisite", "contrasts-with"] as const;

const nodes: readonly GraphExplorerNodeTuple[] = [
  ...Array.from({ length: 60 }, (_, index) => {
    const subject = index % 2 === 0 ? 0 : 1;
    return [
      `数学节点 ${index}`,
      0,
      subject,
      (index % 5) + 1,
      `/zh-CN/books/mathematics/test/chapter-${index}`,
      100 + (index % 8) * 80,
      100 + Math.floor(index / 8) * 70,
    ] as const;
  }),
  ["物理节点 A", 1, 2, 2, "/zh-CN/books/physics/test/physics-a", 620, 120],
  ["物理节点 B", 1, 2, 3, "/zh-CN/books/physics/test/physics-b", 660, 190],
];

const edges: readonly GraphExplorerEdgeTuple[] = [
  ...Array.from({ length: 59 }, (_, index) => [index, index + 1, 0] as const),
  [60, 61, 1, 0] as const,
];

const renderGraph = () =>
  render(
    <GraphExplorer
      nodes={nodes}
      edges={edges}
      domains={domains}
      subjects={subjects}
      relationTypes={relationTypes}
      locale="zh-CN"
    />,
  );
const canvas = () => screen.getByRole("group", { name: /^知识图谱画布/ });

describe("GraphExplorer", () => {
  it("shows a local diagram, follows neighbours, and returns to the previous focus", () => {
    renderGraph();
    expect(within(canvas()).getAllByRole("button")).toHaveLength(2);
    fireEvent.click(within(canvas()).getByRole("button", { name: "查看关联: 数学节点 1" }));
    expect(within(canvas()).getAllByRole("button")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 2, name: "数学节点 1" })[0]).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "上一步" }));
    expect(screen.getAllByRole("heading", { level: 2, name: "数学节点 0" })[0]).toBeVisible();
    expect(screen.getByRole("button", { name: "上一步" })).toBeDisabled();
  });

  it("focuses only on activation, and keeps reading as a separate link", () => {
    renderGraph();
    const next = within(canvas()).getByRole("button", { name: "查看关联: 数学节点 1" });
    fireEvent.mouseEnter(next);
    expect(screen.getAllByRole("heading", { level: 2, name: "数学节点 0" })[0]).toBeVisible();
    fireEvent.keyDown(next, { key: "Enter" });
    expect(screen.getAllByRole("link", { name: "阅读正文" })[0]).toHaveAttribute(
      "href",
      nodes[1]?.[4],
    );
    expect(within(canvas()).queryByRole("link")).not.toBeInTheDocument();
  });

  it("can return to the complete filtered graph after selecting a node", () => {
    renderGraph();
    fireEvent.click(screen.getByRole("button", { name: "全图" }));
    expect(within(canvas()).getAllByRole("button")).toHaveLength(62);
    fireEvent.click(within(canvas()).getByRole("button", { name: "查看关联: 数学节点 20" }));
    expect(within(canvas()).getAllByRole("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "全图" }));
    expect(within(canvas()).getAllByRole("button")).toHaveLength(62);
  });

  it("applies domain and relation filters to the canvas and URL", async () => {
    const { container } = renderGraph();
    fireEvent.change(screen.getByLabelText("学科领域"), { target: { value: "physics" } });
    fireEvent.change(screen.getByLabelText("关系类型"), { target: { value: "contrasts-with" } });
    expect(within(canvas()).getAllByRole("button")).toHaveLength(2);
    expect(
      container.querySelector('.graph-edges path[data-type="contrasts-with"]'),
    ).toHaveAttribute("marker-start");
    expect(container.querySelector(".graph-relation-legend")?.textContent).toContain("对比");
    await waitFor(() => expect(window.location.search).toContain("domain=physics"));
    expect(window.location.search).toContain("relation=contrasts-with");
  });

  it("finds a concept while retaining its direct neighbours and reports an empty search", () => {
    renderGraph();
    fireEvent.change(screen.getByLabelText("查找知识节点"), { target: { value: "数学节点 58" } });
    expect(within(canvas()).getAllByRole("button")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 2, name: "数学节点 58" })[0]).toBeVisible();
    fireEvent.change(screen.getByLabelText("查找知识节点"), { target: { value: "不存在的概念" } });
    expect(within(canvas()).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByText("当前筛选条件下没有知识节点。").length).toBeGreaterThan(0);
  });

  it("preserves all filtered entries and list pagination", () => {
    renderGraph();
    const list = screen.getByText("以列表读取全部筛选结果").closest("details");
    expect(list).not.toBeNull();
    if (!list) return;
    list.open = true;
    expect(within(list).getAllByRole("link")).toHaveLength(50);
    fireEvent.click(within(list).getByRole("button", { name: "下一页" }));
    expect(within(list).getAllByRole("link")).toHaveLength(12);
    fireEvent.change(screen.getByLabelText("学科领域"), { target: { value: "physics" } });
    expect(within(list).getAllByRole("link")).toHaveLength(2);
  });

  it("expands the canvas without removing filter controls or reading links", () => {
    const { container } = renderGraph();
    fireEvent.click(screen.getByRole("button", { name: "扩大画布" }));
    expect(container.querySelector(".graph-explorer")).toHaveAttribute("data-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "筛选" }));
    expect(container.querySelector(".graph-controls")).toHaveAttribute("data-open", "true");
    expect(screen.getAllByRole("link", { name: "阅读正文" })[0]).toBeVisible();
  });
});
