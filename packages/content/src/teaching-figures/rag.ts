import type { DiagramElement, DiagramTone, TeachingFigureData } from "@one-forth/registry";

const text = (x: number, y: number, value: string, tone: DiagramTone = "ink"): DiagramElement => ({
  kind: "text",
  x,
  y,
  text: value,
  size: 19,
  tone,
});

const math = (
  x: number,
  y: number,
  width: number,
  latex: string,
  label: string,
  tone: DiagramTone = "ink",
): DiagramElement => ({
  kind: "math",
  x,
  y,
  width,
  height: 42,
  latex,
  label,
  size: 19,
  align: "center",
  tone,
});

const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tone: DiagramTone = "ink",
  arrow = false,
): DiagramElement => ({ kind: "line", x1, y1, x2, y2, tone, arrow });

const branches = [
  { index: 1, center: 52, retrieval: "0.6", generation: "0.2", barWidth: 156 },
  { index: 2, center: 160, retrieval: "0.3", generation: "0.5", barWidth: 78 },
  { index: 3, center: 268, retrieval: "0.1", generation: "0.1", barWidth: 26 },
] as const;

export const ragAlgorithmFigures: readonly TeachingFigureData[] = [
  {
    id: "a12-rag-generation",
    bookId: "a12",
    conceptId: "retrieval-grounding",
    title: "RAG-Sequence 生成概率",
    caption:
      "示例用三篇文档计算同一完整答案的概率；RAG-Sequence 在每条生成分支内固定文档，再按检索概率加权求和。",
    source: {
      resourceId: "rag-paper",
      label: "Lewis 等，2020；依据算法绘制",
      url: "https://proceedings.neurips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html",
    },
    after:
      "系统接收问题 $q$ 后，先构造检索查询，召回候选片段，按相关性和权限过滤或重排，再在长度预算内组成上下文 $C$，最后由生成器估计 $p(y\\mid q,C)$。输出若包含引用，还要把每个声明映射回片段、原文档、版本与位置。任一阶段都可失败：查询丢失约束、召回漏证据、重排误降、上下文截断、生成忽略证据或引用指错来源。",
    panels: [
      {
        title: "检索概率",
        description:
          "查询向量 h(q) 与文档向量 d(z) 的内积产生检索分数。取前三篇文档并归一化后，文档一、二、三的检索概率分别为零点六、零点三、零点一。条形长度与概率成正比，数值及文档编号同时标注。",
        width: 320,
        height: 400,
        elements: [
          text(160, 24, "检索概率"),
          text(80, 62, "查询向量"),
          text(240, 62, "文档向量"),
          math(20, 72, 120, "h(q)", "问题 q 的查询向量"),
          math(180, 72, 120, "d(z)", "文档 z 的向量"),
          line(80, 112, 120, 134, "ink", true),
          line(240, 112, 200, 134, "ink", true),
          math(
            4,
            138,
            312,
            "p_\\eta(z\\mid q)\\propto e^{h(q)^\\top d(z)}",
            "检索概率与查询向量和文档向量内积的指数成正比",
          ),
          line(160, 184, 160, 205, "ink", true),
          text(160, 234, "取前3篇并归一化"),
          ...branches.flatMap((branch, row): readonly DiagramElement[] => [
            math(4, 256 + row * 47, 50, `z_${branch.index}`, `文档${branch.index}`),
            {
              kind: "rect",
              x: 70,
              y: 263 + row * 47,
              width: branch.barWidth,
              height: 20,
              tone: "input",
              fill: "tint",
            },
            math(
              244,
              256 + row * 47,
              68,
              branch.retrieval,
              `文档${branch.index}的检索概率为${branch.retrieval}`,
              "input",
            ),
          ]),
        ],
      },
      {
        title: "逐文档生成与加权",
        description:
          "三个参数共享的生成器分别接收问题 q 与文档 z 一、z 二、z 三。对同一完整答案 y 的生成概率分别为零点二、零点五、零点一。每项乘以对应检索概率零点六、零点三、零点一后求和，得到零点二八。每个分支在所有输出 token 上固定同一文档。",
        width: 320,
        height: 440,
        elements: [
          text(160, 24, "逐文档生成"),
          math(
            18,
            36,
            284,
            "p_\\theta(y\\mid q,z_j)",
            "同一完整答案 y 在问题 q 与文档 z j 条件下的生成概率",
          ),
          ...branches.flatMap((branch): readonly DiagramElement[] => [
            math(
              branch.center - 50,
              84,
              100,
              `(q,z_${branch.index})`,
              `问题 q 与文档${branch.index}`,
            ),
            line(branch.center, 124, branch.center, 138, "ink", true),
            {
              kind: "rect",
              x: branch.center - 44,
              y: 144,
              width: 88,
              height: 44,
              tone: "output",
              fill: "tint",
            },
            text(branch.center, 172, "生成器", "output"),
            line(branch.center, 194, branch.center, 210, "output", true),
            math(
              branch.center - 44,
              218,
              88,
              branch.generation,
              `文档${branch.index}条件下答案 y 的生成概率为${branch.generation}`,
              "output",
            ),
            line(branch.center, 258, branch.center, 270),
            math(
              branch.center - 48,
              277,
              96,
              `\\times ${branch.retrieval}`,
              `乘以检索概率${branch.retrieval}`,
              "input",
            ),
          ]),
          { kind: "path", d: "M 52 319 V 362 H 135", tone: "ink", arrow: true },
          line(160, 319, 160, 337, "ink", true),
          { kind: "path", d: "M 268 319 V 362 H 185", tone: "ink", arrow: true },
          { kind: "circle", cx: 160, cy: 362, r: 20, tone: "ink", fill: "surface" },
          math(140, 346, 40, "\\Sigma", "求和"),
          math(
            20,
            398,
            280,
            "p(y\\mid q)\\approx 0.28",
            "答案 y 的边缘概率约为零点二八",
            "positive",
          ),
        ],
      },
    ],
  },
];
