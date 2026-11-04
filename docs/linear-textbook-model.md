# One Forth 线性教材模型

## 1. 模型边界

课程层属于 `packages/content`：Schema、课程数据、查询、迁移和验证在内容层完成；`apps/web` 只组合页面；通用目录展示组件进入 `packages/ui`。课程模型不得依赖 React、页面模块或学科算法包。

## 2. 核心类型

```ts
type CurriculumNodeKind = "series" | "book" | "part" | "chapter";
type CurriculumStatus = "planned" | "outline" | "draft" | "reviewed" | "verified";

interface CurriculumNode {
  id: string;
  kind: CurriculumNodeKind;
  locale: string;
  slug: string;
  title: string;
  shortTitle?: string;
  summary: string;
  order: number;
  parentId?: string;
  level: "foundation" | "undergraduate" | "advanced" | "research";
  difficulty?: number;
  estimatedMinutes?: number;
  status: CurriculumStatus;
  contentId?: string;
  prerequisites: string[];
  conceptIds: string[];
  visualizationIds: string[];
  resourceIds: string[];
  learningObjectives: string[];
  plannedSections: PlannedSection[];
  plannedDefinitions: string[];
  plannedEquations: string[];
  plannedExamples: PlannedItem[];
  plannedExercises: PlannedItem[];
}

interface CanonicalLocation {
  chapterId: string;
  anchorId?: string;
}
```

正式实现必须接入版本化 Schema，并为现有 Concept、LearningPath 和 Document 提供 migration；本文示例不替代最终类型定义。

## 3. 不变量

- Series、Book、Part、Chapter ID 分别全局唯一。
- slug 在同一父节点和 locale 下唯一；ID 不因翻译或改标题变化。
- 除 Series 外每个节点有且只有一个父节点。
- 同一父节点的 `order` 不重复，排序使用确定性比较，不依赖运行时 locale 差异。
- Chapter 在一个 Book 中只有一个 canonical 位置。
- 每个 Book 有开始章和结尾/复习章。
- previous/next 只从树生成，不写入 MDX frontmatter。
- prerequisite 必须可解析且无环。
- 每个 Chapter 有摘要、学习目标；planned Chapter 至少有 3 个主题专用 plannedSections。
- `contentId` 可空；没有正文时由 PlannedChapterPage 渲染结构化提纲。
- 任何自动化都不能把 `planned`、`outline` 或 `draft` 提升为人工审阅状态。

## 4. 自动派生

课程查询层统一生成：

- 教材编号、Part/Chapter 编号；
- 面包屑；
- 上一章、下一章；
- 当前章在本册中的位置；
- Book 开始/继续目标和完成比例；
- 左侧分册目录与移动抽屉；
- Series/Book 页面目录；
- 搜索结果的教材位置；
- sitemap 候选和 robots 策略。

## 5. 概念、正文与章节

- Chapter 是主要教学单位，可以包含多个 Concept。
- Document 是 Chapter 的可选正文载荷，不再决定全站主顺序。
- Concept 保留稳定 ID 和知识关系，并通过 `canonicalLocation` 指向主要 Chapter 或锚点。
- 同一定义/定理只有一个主要讲解位置；其他章节只保留必要说明和精确链接。
- 微型概念页合并后，原 URL 永久跳到对应锚点；未确认合并前保持 `pending`。

## 6. 学习状态

学习状态以 Chapter ID 为键；现有 Concept ID 状态通过显式迁移映射转换。必须分别保存：

- 最近阅读章节和锚点；
- 页面阅读位置；
- 章节显式完成；
- 练习完成；
- Book 完成比例。

滚动到底不自动等同于掌握。首页只显示一个最近 Book/Chapter；没有记录时使用第一册的开始章。

## 7. 验证接口

`validate:curriculum` 至少检查唯一性、父节点、order、孤立节点、先修环、开始/结束章、正文归属、实验绑定、概念 canonicalLocation 和自动相邻章。`validate:anchors` 检查同页重复、非法前缀和不存在目标；`validate:redirects` 检查旧 URL 的最终目标。
