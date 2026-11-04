import type { SupportedLocale } from "@one-forth/config";

export type {
  DiagramElement,
  DiagramTone,
  PaperFigureData,
  TeachingFigureData,
  TeachingFigurePanel,
} from "./teaching-figure";

export type LocalizedText = Readonly<
  Record<"zh-CN", string> & Partial<Record<Exclude<SupportedLocale, "zh-CN">, string>>
>;

export type ContentKind =
  | "concept"
  | "theorem"
  | "method"
  | "derivation"
  | "experiment"
  | "proof"
  | "problem-set"
  | "reference"
  | "paper-guide"
  | "biography"
  | "historical-note"
  | "dataset"
  | "software-tool";

export const knowledgeRelationTypeValues = [
  "prerequisite",
  "generalizes",
  "special-case-of",
  "equivalent-to",
  "contrasts-with",
  "derived-from",
  "applied-to",
  "motivates",
  "approximates",
  "historically-related",
  "implemented-by",
  "validated-by",
] as const;

export type KnowledgeRelationType = (typeof knowledgeRelationTypeValues)[number];

export type RelationDirection = "directed" | "bidirectional";

export type RelationLineStyle = "solid" | "dashed" | "dotted";

export interface KnowledgeRelation {
  readonly from: string;
  readonly to: string;
  readonly type: KnowledgeRelationType;
  readonly note?: LocalizedText;
  readonly strength?: "primary" | "secondary";
}

export interface SubjectDefinition {
  readonly id: string;
  readonly domainId: string;
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly parentId?: string;
  readonly colorToken?: string;
  readonly defaultLearningPath?: string;
  readonly supportedContentTypes?: readonly ContentKind[];
  readonly supportedVisualizationTypes?: readonly string[];
}

export interface RelationTypeDefinition {
  readonly id: KnowledgeRelationType;
  readonly inverseId: string;
  readonly label: LocalizedText;
  readonly inverseLabel: LocalizedText;
  readonly description: LocalizedText;
  readonly direction: RelationDirection;
  readonly colorToken: string;
  readonly lineStyle: RelationLineStyle;
  /** @deprecated Use label. Retained while older registry consumers migrate. */
  readonly title: LocalizedText;
}

export interface DomainDefinition {
  readonly id: string;
  readonly title: LocalizedText;
  readonly shortTitle: LocalizedText;
  readonly description: LocalizedText;
  readonly colorToken: string;
  readonly order: number;
  readonly subjects: readonly SubjectDefinition[];
  readonly relationTypes?: readonly RelationTypeDefinition[];
  readonly visualizationTypes?: readonly string[];
  readonly symbolNamespaces?: readonly string[];
  readonly unitSystems?: readonly string[];
}

export class Registry<T extends { readonly id: string }> {
  readonly #items = new Map<string, T>();

  register(item: T): void {
    if (this.#items.has(item.id)) {
      throw new Error(`Duplicate registry id: ${item.id}`);
    }
    this.#items.set(item.id, item);
  }

  get(id: string): T | undefined {
    return this.#items.get(id);
  }

  has(id: string): boolean {
    return this.#items.has(id);
  }

  list(): readonly T[] {
    return [...this.#items.values()];
  }

  clear(): void {
    this.#items.clear();
  }
}

function relationType(
  id: KnowledgeRelationType,
  inverseId: string,
  label: LocalizedText,
  inverseLabel: LocalizedText,
  description: LocalizedText,
  direction: RelationDirection,
  colorToken: string,
  lineStyle: RelationLineStyle,
): RelationTypeDefinition {
  return {
    id,
    inverseId,
    label,
    inverseLabel,
    description,
    direction,
    colorToken,
    lineStyle,
    title: label,
  };
}

export const relationTypeDefinitions: readonly RelationTypeDefinition[] = [
  relationType(
    "prerequisite",
    "prerequisite-for",
    { "zh-CN": "先修", en: "Prerequisite" },
    { "zh-CN": "后续需要", en: "Prerequisite for" },
    {
      "zh-CN": "源概念必须先于目标概念掌握。",
      en: "The source concept must be learned before the target concept.",
    },
    "directed",
    "relation-prerequisite",
    "solid",
  ),
  relationType(
    "generalizes",
    "special-case-of",
    { "zh-CN": "推广", en: "Generalizes" },
    { "zh-CN": "特例", en: "Special case of" },
    {
      "zh-CN": "源概念放宽目标概念的条件或扩大其适用范围。",
      en: "The source broadens the assumptions or scope of the target.",
    },
    "directed",
    "relation-hierarchy",
    "solid",
  ),
  relationType(
    "special-case-of",
    "generalizes",
    { "zh-CN": "是其特例", en: "Special case of" },
    { "zh-CN": "推广", en: "Generalizes" },
    {
      "zh-CN": "源概念可由目标概念在附加条件下得到。",
      en: "The source follows from the target under additional assumptions.",
    },
    "directed",
    "relation-hierarchy",
    "solid",
  ),
  relationType(
    "equivalent-to",
    "equivalent-to",
    { "zh-CN": "等价", en: "Equivalent to" },
    { "zh-CN": "等价", en: "Equivalent to" },
    {
      "zh-CN": "两个概念在声明的条件下可以相互推出。",
      en: "Each concept implies the other under the stated conditions.",
    },
    "bidirectional",
    "relation-equivalence",
    "solid",
  ),
  relationType(
    "contrasts-with",
    "contrasts-with",
    { "zh-CN": "对比", en: "Contrasts with" },
    { "zh-CN": "对比", en: "Contrasts with" },
    {
      "zh-CN": "两个概念通过关键差异帮助划定彼此边界。",
      en: "A key difference between the concepts clarifies their boundaries.",
    },
    "bidirectional",
    "relation-contrast",
    "dashed",
  ),
  relationType(
    "derived-from",
    "source-for",
    { "zh-CN": "推导自", en: "Derived from" },
    { "zh-CN": "用于推导", en: "Source for" },
    {
      "zh-CN": "源概念的结论由目标概念中的定义、定理或模型推导。",
      en: "The source is derived from a definition, theorem, or model in the target.",
    },
    "directed",
    "relation-derivation",
    "solid",
  ),
  relationType(
    "applied-to",
    "uses",
    { "zh-CN": "应用于", en: "Applied to" },
    { "zh-CN": "使用", en: "Uses" },
    {
      "zh-CN": "源概念中的方法或结论用于目标概念。",
      en: "A method or result from the source is used in the target.",
    },
    "directed",
    "relation-application",
    "solid",
  ),
  relationType(
    "motivates",
    "motivated-by",
    { "zh-CN": "引出", en: "Motivates" },
    { "zh-CN": "由其引出", en: "Motivated by" },
    {
      "zh-CN": "源概念暴露的问题或需求促成目标概念。",
      en: "A problem or need exposed by the source motivates the target.",
    },
    "directed",
    "relation-motivation",
    "dashed",
  ),
  relationType(
    "approximates",
    "approximated-by",
    { "zh-CN": "近似", en: "Approximates" },
    { "zh-CN": "由其近似", en: "Approximated by" },
    {
      "zh-CN": "源概念在声明的误差或极限条件下近似目标概念。",
      en: "The source approximates the target under stated error or limiting conditions.",
    },
    "directed",
    "relation-approximation",
    "dotted",
  ),
  relationType(
    "historically-related",
    "historically-related",
    { "zh-CN": "历史关联", en: "Historically related" },
    { "zh-CN": "历史关联", en: "Historically related" },
    {
      "zh-CN": "两个概念在发展史上的联系。",
      en: "The concepts have a verifiable connection in their historical development.",
    },
    "bidirectional",
    "relation-history",
    "dotted",
  ),
  relationType(
    "implemented-by",
    "implements",
    { "zh-CN": "由其实现", en: "Implemented by" },
    { "zh-CN": "实现", en: "Implements" },
    {
      "zh-CN": "目标概念给出源概念的算法或软件实现。",
      en: "The target provides an algorithmic or software implementation of the source.",
    },
    "directed",
    "relation-implementation",
    "dashed",
  ),
  relationType(
    "validated-by",
    "validates",
    { "zh-CN": "由其验证", en: "Validated by" },
    { "zh-CN": "验证", en: "Validates" },
    {
      "zh-CN": "目标概念提供检验源概念的证据或方法。",
      en: "The target provides evidence or a method that validates the source.",
    },
    "directed",
    "relation-validation",
    "dotted",
  ),
];

export const relationTypeDefinitionById: ReadonlyMap<
  KnowledgeRelationType,
  RelationTypeDefinition
> = new Map(relationTypeDefinitions.map((definition) => [definition.id, definition] as const));

export const relationTypeAliases = {
  "used-in": "applied-to",
} as const satisfies Readonly<Record<string, KnowledgeRelationType>>;

export function canonicalRelationType(value: string): KnowledgeRelationType | undefined {
  if (relationTypeDefinitionById.has(value as KnowledgeRelationType)) {
    return value as KnowledgeRelationType;
  }
  return relationTypeAliases[value as keyof typeof relationTypeAliases];
}

export function getRelationTypeDefinition(value: string): RelationTypeDefinition | undefined {
  const canonical = canonicalRelationType(value);
  return canonical ? relationTypeDefinitionById.get(canonical) : undefined;
}

const allKinds: readonly ContentKind[] = [
  "concept",
  "theorem",
  "method",
  "derivation",
  "experiment",
  "proof",
  "problem-set",
  "reference",
  "paper-guide",
  "biography",
  "historical-note",
  "dataset",
  "software-tool",
];

function subject(
  id: string,
  domainId: string,
  zh: string,
  en: string,
  description: string,
  options: Partial<SubjectDefinition> = {},
): SubjectDefinition {
  return {
    id,
    domainId,
    title: { "zh-CN": zh, en },
    description: { "zh-CN": description },
    supportedContentTypes: allKinds,
    ...options,
  };
}

export const mathematicsDomain: DomainDefinition = {
  id: "mathematics",
  title: { "zh-CN": "数学", en: "Mathematics" },
  shortTitle: { "zh-CN": "数学", en: "Math" },
  description: { "zh-CN": "集合、代数、分析、几何、概率与统计。" },
  colorToken: "domain-mathematics",
  order: 10,
  symbolNamespaces: [
    "math.foundations",
    "math.linear-algebra",
    "math.calculus",
    "math.probability",
    "math.discrete-mathematics",
    "math.differential-equations",
    "math.numerical",
    "math.analysis",
    "math.complex",
    "math.algebra",
    "math.geometry",
    "math.functional-analysis",
  ],
  visualizationTypes: ["svg", "canvas"],
  subjects: [
    subject(
      "foundations",
      "mathematics",
      "数学基础",
      "Foundations",
      "集合、逻辑、函数与证明语言。",
    ),
    subject(
      "linear-algebra",
      "mathematics",
      "线性代数",
      "Linear algebra",
      "向量、线性映射与空间结构。",
      {
        defaultLearningPath: "mathematics-for-machine-learning",
        supportedVisualizationTypes: ["linear-transform-2d"],
      },
    ),
    subject("calculus", "mathematics", "微积分与分析", "Calculus", "极限、导数、积分与连续变化。"),
    subject("optimization", "mathematics", "最优化", "Optimization", "目标、约束与数值求解。", {
      supportedVisualizationTypes: ["gradient-descent"],
    }),
    subject("probability", "mathematics", "概率论", "Probability", "随机现象的结构与度量。"),
    subject(
      "discrete-mathematics",
      "mathematics",
      "离散数学",
      "Discrete mathematics",
      "计数、递推、图、偏序与有限代数结构。",
    ),
    subject(
      "differential-equations",
      "mathematics",
      "微分方程与动力系统",
      "Differential equations and dynamical systems",
      "连续时间演化、线性系统、稳定性与分岔。",
    ),
    subject(
      "numerical-analysis",
      "mathematics",
      "数值分析",
      "Numerical analysis",
      "误差、稳定性、逼近、数值线性代数与微分方程离散。",
    ),
    subject(
      "real-analysis",
      "mathematics",
      "实分析与测度论",
      "Real analysis and measure theory",
      "完备性、函数列、测度、Lebesgue 积分与 Lp 空间。",
    ),
    subject(
      "complex-analysis",
      "mathematics",
      "复分析",
      "Complex analysis",
      "全纯函数、复积分、留数、保角映射与解析延拓。",
    ),
    subject(
      "abstract-algebra",
      "mathematics",
      "抽象代数",
      "Abstract algebra",
      "群、环、域、模、同态、商结构与 Galois 思想。",
    ),
    subject(
      "topology-differential-geometry",
      "mathematics",
      "拓扑与微分几何",
      "Topology and differential geometry",
      "拓扑空间、紧致性、流形、微分形式、度量与曲率。",
    ),
    subject(
      "functional-analysis",
      "mathematics",
      "泛函分析与算子理论",
      "Functional analysis and operator theory",
      "Banach 与 Hilbert 空间、有界及紧算子、对偶和谱理论。",
    ),
  ],
};

export const physicsDomain: DomainDefinition = {
  id: "physics",
  title: { "zh-CN": "物理学", en: "Physics" },
  shortTitle: { "zh-CN": "物理", en: "Physics" },
  description: { "zh-CN": "用数学模型连接守恒、场、波与可观测量。" },
  colorToken: "domain-physics",
  order: 20,
  symbolNamespaces: [
    "physics.measurement",
    "physics.waves",
    "physics.classical-mechanics",
    "physics.analytical-mechanics",
    "physics.electromagnetism",
    "physics.thermodynamics",
    "physics.statistical-physics",
    "physics.quantum-mechanics",
    "physics.relativity",
    "physics.continuum-mechanics",
    "physics.condensed-matter",
    "physics.computational-physics",
    "physics.field-theory",
  ],
  unitSystems: ["si"],
  visualizationTypes: ["svg", "canvas"],
  subjects: [
    subject(
      "measurement-modeling",
      "physics",
      "测量与建模",
      "Measurement and modeling",
      "物理量、单位、尺度、不确定度、校准与模型边界。",
    ),
    subject("waves", "physics", "波动", "Waves", "从局部振动到时空传播。", {
      supportedVisualizationTypes: ["wave-equation-1d"],
    }),
    subject(
      "classical-mechanics",
      "physics",
      "经典力学",
      "Classical mechanics",
      "运动、力与守恒律。",
    ),
    subject(
      "analytical-mechanics",
      "physics",
      "分析力学与非线性动力学",
      "Analytical mechanics and nonlinear dynamics",
      "变分原理、约束、Lagrange 与 Hamilton 形式、正则变换和混沌。",
    ),
    subject(
      "electromagnetism",
      "physics",
      "电磁学",
      "Electromagnetism",
      "电荷与场、电势、稳恒磁场、感应、Maxwell 方程与电磁波。",
    ),
    subject(
      "thermodynamics",
      "physics",
      "热力学",
      "Thermodynamics",
      "平衡态、能量传递、第二定律、熵、热力学势与相平衡。",
    ),
    subject(
      "statistical-physics",
      "physics",
      "统计物理",
      "Statistical physics",
      "微观状态、系综、配分函数、量子统计、涨落与临界现象。",
    ),
    subject(
      "quantum-mechanics",
      "physics",
      "量子力学",
      "Quantum mechanics",
      "态、算符与测量的数学框架。",
    ),
    subject(
      "special-general-relativity-foundations",
      "physics",
      "相对论基础",
      "Foundations of relativity",
      "Lorentz 时空、四维动力学、曲率、测地线与 Einstein 场方程。",
    ),
    subject(
      "fluid-mechanics-continuum",
      "physics",
      "流体与连续介质",
      "Fluid and continuum mechanics",
      "连续介质运动学、守恒方程、黏性流、边界层与不稳定性。",
    ),
    subject(
      "solid-state-condensed-matter-foundations",
      "physics",
      "凝聚态基础",
      "Foundations of condensed matter",
      "晶体、声子、电子能带、输运、磁性与超导。",
    ),
    subject(
      "computational-physics",
      "physics",
      "计算物理",
      "Computational physics",
      "离散化、粒子与场模拟、随机采样、分子动力学及可复现计算。",
    ),
    subject(
      "particle-physics-field-theory-introduction",
      "physics",
      "粒子物理与场论导论",
      "Introduction to particle physics and field theory",
      "相对论性场、自由场量子化、散射、规范对称性与标准模型轮廓。",
    ),
  ],
};

export const computerScienceDomain: DomainDefinition = {
  id: "computer-science",
  title: { "zh-CN": "计算机科学", en: "Computer science" },
  shortTitle: { "zh-CN": "计算机", en: "Computing" },
  description: { "zh-CN": "研究信息表示、算法与可计算系统。" },
  colorToken: "domain-computer-science",
  order: 30,
  symbolNamespaces: [
    "computing.programming",
    "computing.algorithms",
    "computing.data-experiments",
    "computing.architecture",
    "computing.operating-systems",
    "computing.networks",
    "computing.databases",
  ],
  visualizationTypes: ["svg"],
  subjects: [
    subject(
      "computer-architecture",
      "computer-science",
      "计算机组成",
      "Computer architecture",
      "二进制表示、数字逻辑、指令集、流水线、缓存与输入输出。",
    ),
    subject(
      "operating-systems",
      "computer-science",
      "操作系统",
      "Operating systems",
      "进程、调度、线程同步、虚拟内存与文件系统。",
    ),
    subject(
      "computer-networks",
      "computer-science",
      "计算机网络",
      "Computer networks",
      "网络分层、以太网、IP 路由、传输协议与网络测量。",
    ),
    subject(
      "databases",
      "computer-science",
      "数据库",
      "Databases",
      "关系模型、SQL、数据规范化、索引、事务与恢复。",
    ),
    subject("algorithms", "computer-science", "算法", "Algorithms", "计算过程、复杂度与数据结构。"),
    subject(
      "scientific-computing",
      "computer-science",
      "科学计算",
      "Scientific computing",
      "数值模型与可复现实验。",
    ),
  ],
};

export const machineLearningDomain: DomainDefinition = {
  id: "machine-learning",
  title: { "zh-CN": "机器学习", en: "Machine learning" },
  shortTitle: { "zh-CN": "机器学习", en: "ML" },
  description: { "zh-CN": "从数据、模型与优化过程理解可学习系统。" },
  colorToken: "domain-machine-learning",
  order: 40,
  symbolNamespaces: ["ml.optimization", "ml.neural-networks"],
  visualizationTypes: ["svg", "canvas", "worker"],
  subjects: [
    subject(
      "learning-theory",
      "machine-learning",
      "学习基础",
      "Learning foundations",
      "损失、泛化与模型评估。",
    ),
    subject(
      "neural-networks",
      "machine-learning",
      "神经网络",
      "Neural networks",
      "计算图、表示学习与反向传播。",
      {
        defaultLearningPath: "perceptron-to-transformer",
        supportedVisualizationTypes: ["backprop-computation-graph", "neural-decision-boundary"],
      },
    ),
    subject(
      "generative-models",
      "machine-learning",
      "生成模型",
      "Generative models",
      "概率建模、表征与生成。",
      {
        defaultLearningPath: "generative-models-foundations",
      },
    ),
  ],
};

export const interdisciplinaryDomain: DomainDefinition = {
  id: "interdisciplinary",
  title: { "zh-CN": "交叉科学", en: "Interdisciplinary" },
  shortTitle: { "zh-CN": "交叉", en: "Interdisciplinary" },
  description: { "zh-CN": "连接数学、物理、计算与学习系统。" },
  colorToken: "domain-interdisciplinary",
  order: 50,
  visualizationTypes: ["svg"],
  subjects: [
    subject(
      "scientific-machine-learning",
      "interdisciplinary",
      "科学机器学习",
      "Scientific ML",
      "物理模型与学习算法的交汇。",
    ),
  ],
};

export const domainRegistry = new Registry<DomainDefinition>();
export const subjectRegistry = new Registry<SubjectDefinition>();

export function registerDomain(definition: DomainDefinition): void {
  domainRegistry.register(definition);
  for (const subjectDefinition of definition.subjects) {
    if (subjectDefinition.domainId !== definition.id) {
      throw new Error(
        `Subject ${subjectDefinition.id} declares ${subjectDefinition.domainId}, expected ${definition.id}`,
      );
    }
    subjectRegistry.register(subjectDefinition);
  }
}

export function initializeCoreDomains(): void {
  if (domainRegistry.list().length > 0) return;
  [
    mathematicsDomain,
    physicsDomain,
    computerScienceDomain,
    machineLearningDomain,
    interdisciplinaryDomain,
  ].forEach(registerDomain);
}

initializeCoreDomains();

export function localize(text: LocalizedText, locale: SupportedLocale): string {
  return text[locale] ?? text["zh-CN"];
}
