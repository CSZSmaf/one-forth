import type { SeriesBlueprint } from "../blueprint";
import { computingAiBooks } from "./computing-ai";
import { computerFoundationBooks } from "./computer-foundations";

export const computerScienceSeries: SeriesBlueprint = {
  id: "computer-science",
  slug: "computer-science",
  title: "计算机",
  summary: "编程、算法、计算机组成、操作系统、网络与数据库。",
  books: [
    ...computingAiBooks.filter((book) => book.code.startsWith("C")),
    ...computerFoundationBooks,
  ],
};
export const artificialIntelligenceSeries: SeriesBlueprint = {
  id: "artificial-intelligence",
  slug: "artificial-intelligence",
  title: "人工智能",
  summary: "机器学习、神经网络、生成模型、智能体与科学机器学习。",
  books: computingAiBooks.filter((book) => book.code.startsWith("A")),
};
