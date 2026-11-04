import type { SupportedLocale } from "@one-forth/config";
export { getTeachingFigure, teachingFigures } from "./teaching-figures";
export { getPaperFigure, paperFigures } from "./paper-figures";
import type {
  ContentKind,
  KnowledgeRelation,
  KnowledgeRelationType,
  LocalizedText,
} from "@one-forth/registry";
import { contentFrontmatterSchema, contentKindValues, relationTypeValues } from "./content-schema";
import type { ContentDocument, ContentFrontmatter } from "./content-schema";
import { conceptById, conceptCatalog, requiredRoundTwoConceptIds } from "./concepts";
import type { ConceptArticleStatus, ConceptEntity, ConceptReadiness } from "./concepts";
import {
  curriculumData,
  curriculumSectionPlans,
  curriculumVisualizationBindings,
  deriveCurriculumRedirects,
  InMemoryCurriculumRepository,
  migrateConceptV1ToV2,
  selectPublishedCurriculum,
  selectPublishedVisualizationBindings,
  selectReadableCurriculum,
  selectReadableVisualizationBindings,
} from "./curriculum";
import type {
  CanonicalLocation,
  CurriculumBook,
  CurriculumChapter,
  CurriculumChapterContext,
  CurriculumDataset,
  CurriculumLevel,
  CurriculumNode,
  CurriculumNodeKind,
  CurriculumPart,
  CurriculumProgress,
  CurriculumRepository,
  CurriculumRedirect,
  CurriculumRedirectKind,
  CurriculumSeries,
  LegacyConceptV1Shape,
  MigratedConceptV2,
  PlannedItem,
  PlannedSection,
} from "./curriculum";
import { generatedDocuments } from "./generated";
import { deriveLegacyBookRedirects } from "./curriculum/legacy-book-redirects";
import { generatedMathIndex } from "./generated-math-index";
export { extractMathFragments, maskCodeForMath, type MathFragment } from "./math-source";
export { inspectMathIntegrity } from "./math-integrity";
export { resolveMathFragmentAnchor } from "./math-index";
import { buildMathIndex } from "./math-index";
import type {
  BookMathIndex,
  BuiltMathIndex,
  ChapterMathCoverage,
  EquationRecord,
  EquationVariable,
  LegacyEquationRecord,
  LegacySymbolDefinition,
  MathRecordLocation,
  SymbolDefinition,
  SymbolUnitKind,
} from "./math-index";
import { migrateLearningPathV2ToV3 } from "./learning-path-migration";
import type { LearningPathConceptChapterResolver } from "./learning-path-migration";
import {
  learningPathAliasById,
  learningPathAliases,
  learningPathById,
  learningPaths,
  legacyLearningPathsV2,
  migrateLearningPathV3ToV4,
  requiredRoundTwoLearningPathIds,
  requiredSeriesLearningPathIds,
  requiredTopicalLearningPathIds,
} from "./learning-paths";
import type {
  DiscoverableLearningPath,
  LearningPath,
  LearningPathAlias,
  LearningPathCheckpoint,
  LearningPathConceptProjection,
  LearningPathExercise,
  LearningPathSection,
  LearningPathV3,
  LearningPathV4,
  LegacyLearningPathCheckpointV2,
  LegacyLearningPathExerciseV2,
  LegacyLearningPathV2,
} from "./learning-paths";
import {
  deriveConceptMaturity,
  editorialStatusValues,
  hasRecentUpdate,
  isContentIndexable,
  isContentReadable,
  isContentRecentUpdateEligible,
  isContentRecommendable,
  isContentSearchable,
  isRecentUpdateRevision,
  publicationStatusValues,
  publicationPolicyFor,
  reviewCheckStatusValues,
  revisionTypeValues,
} from "./maturity";
import type {
  ContentReviewState,
  EditorialStatus,
  PublicationAccessOptions,
  PublicationPolicy,
  PublicationStatus,
  ReviewCheckStatus,
  RevisionHistoryEntry,
  RevisionType,
} from "./maturity";

export {
  conceptById,
  conceptCatalog,
  learningPathAliasById,
  learningPathAliases,
  learningPathById,
  learningPaths,
  legacyLearningPathsV2,
  requiredRoundTwoConceptIds,
  requiredRoundTwoLearningPathIds,
  requiredSeriesLearningPathIds,
  requiredTopicalLearningPathIds,
  deriveConceptMaturity,
  editorialStatusValues,
  hasRecentUpdate,
  isContentIndexable,
  isContentReadable,
  isContentRecentUpdateEligible,
  isContentRecommendable,
  isContentSearchable,
  isRecentUpdateRevision,
  publicationStatusValues,
  publicationPolicyFor,
  reviewCheckStatusValues,
  revisionTypeValues,
  curriculumData,
  curriculumSectionPlans,
  curriculumVisualizationBindings,
  deriveCurriculumRedirects,
  migrateLearningPathV2ToV3,
  migrateLearningPathV3ToV4,
  migrateConceptV1ToV2,
  selectPublishedCurriculum,
  selectPublishedVisualizationBindings,
  selectReadableCurriculum,
  selectReadableVisualizationBindings,
  contentFrontmatterSchema,
  contentKindValues,
  relationTypeValues,
};

export type {
  BookMathIndex,
  BuiltMathIndex,
  ChapterMathCoverage,
  EquationKind,
  EquationRecord,
  EquationRecordV2,
  EquationVariable,
  MathRecordLocation,
  SymbolDefinition,
  SymbolDefinitionV2,
  SymbolUnitKind,
} from "./math-index";
export type {
  ContentDocument,
  ContentFrontmatter,
  ConceptArticleStatus,
  ConceptEntity,
  ConceptReadiness,
  DiscoverableLearningPath,
  LearningPath,
  LearningPathAlias,
  LearningPathCheckpoint,
  LearningPathConceptChapterResolver,
  LearningPathConceptProjection,
  LearningPathExercise,
  LearningPathSection,
  LearningPathV3,
  LearningPathV4,
  LegacyLearningPathCheckpointV2,
  LegacyLearningPathExerciseV2,
  LegacyLearningPathV2,
  ContentReviewState,
  EditorialStatus,
  PublicationAccessOptions,
  PublicationPolicy,
  PublicationStatus,
  ReviewCheckStatus,
  RevisionHistoryEntry,
  RevisionType,
  CanonicalLocation,
  CurriculumBook,
  CurriculumChapter,
  CurriculumChapterContext,
  CurriculumDataset,
  CurriculumLevel,
  CurriculumNode,
  CurriculumNodeKind,
  CurriculumPart,
  CurriculumProgress,
  CurriculumRepository,
  CurriculumRedirect,
  CurriculumRedirectKind,
  CurriculumSeries,
  LegacyConceptV1Shape,
  MigratedConceptV2,
  PlannedItem,
  PlannedSection,
};

export interface ContentFilter {
  readonly locale?: SupportedLocale;
  readonly domain?: string;
  readonly subject?: string;
  readonly kind?: ContentKind;
  readonly publicationStatus?: PublicationStatus;
  readonly editorialStatus?: EditorialStatus;
}

export interface ConceptFilter {
  readonly domain?: string;
  readonly subject?: string;
  readonly articleStatus?: ConceptArticleStatus;
  readonly recommendedPath?: string;
}

export interface SearchQuery {
  readonly value: string;
  readonly locale?: SupportedLocale;
  readonly domain?: string;
  readonly kind?: string;
  readonly includePreview?: boolean;
}

export interface SearchResult {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly url: string;
  readonly score: number;
}

export interface ContentRepository {
  readonly curriculum: CurriculumRepository;
  getConcept(id: string): Promise<ConceptEntity | null>;
  listConcepts(filter?: ConceptFilter): Promise<readonly ConceptEntity[]>;
  getDocument(id: string, locale: SupportedLocale): Promise<ContentDocument | null>;
  getDocumentForConcept(
    conceptId: string,
    locale: SupportedLocale,
  ): Promise<ContentDocument | null>;
  getDocumentBySlug(
    slug: readonly string[],
    locale: SupportedLocale,
  ): Promise<ContentDocument | null>;
  listDocuments(filter?: ContentFilter): Promise<readonly ContentDocument[]>;
  getRelations(id: string): Promise<readonly KnowledgeRelation[]>;
  search(query: SearchQuery): Promise<readonly SearchResult[]>;
}

export class GeneratedContentRepository implements ContentRepository {
  readonly curriculum: CurriculumRepository;
  readonly #documents: readonly ContentDocument[];
  readonly #concepts: readonly ConceptEntity[];

  constructor(
    documents: readonly ContentDocument[] = generatedDocuments,
    concepts: readonly ConceptEntity[] = conceptCatalog,
    curriculum: CurriculumRepository = new InMemoryCurriculumRepository(curriculumData, concepts),
  ) {
    this.#documents = documents.map((document) => {
      const chapter = curriculum.getChapterForContent(document.frontmatter.id);
      const context = chapter ? curriculum.getChapterContext(chapter.id, document.locale) : null;
      return context ? { ...document, url: context.canonicalPath } : document;
    });
    this.#concepts = concepts;
    this.curriculum = curriculum;
  }

  async getConcept(id: string): Promise<ConceptEntity | null> {
    return this.#concepts.find((concept) => concept.id === id) ?? null;
  }

  async listConcepts(filter: ConceptFilter = {}): Promise<readonly ConceptEntity[]> {
    return this.#concepts.filter((concept) => {
      if (filter.domain && concept.domain !== filter.domain) return false;
      if (filter.subject && concept.subject !== filter.subject) return false;
      if (filter.articleStatus && concept.articleStatus !== filter.articleStatus) return false;
      if (filter.recommendedPath && concept.recommendedPath !== filter.recommendedPath)
        return false;
      return true;
    });
  }

  async getDocument(id: string, locale: SupportedLocale): Promise<ContentDocument | null> {
    return (
      this.#documents.find(
        (document) => document.frontmatter.id === id && document.locale === locale,
      ) ?? null
    );
  }

  async getDocumentForConcept(
    conceptId: string,
    locale: SupportedLocale,
  ): Promise<ContentDocument | null> {
    return (
      this.#documents.find(
        (document) => document.frontmatter.conceptId === conceptId && document.locale === locale,
      ) ?? null
    );
  }

  async getDocumentBySlug(
    slug: readonly string[],
    locale: SupportedLocale,
  ): Promise<ContentDocument | null> {
    return (
      this.#documents.find(
        (document) => document.locale === locale && document.slug.join("/") === slug.join("/"),
      ) ?? null
    );
  }

  async listDocuments(filter: ContentFilter = {}): Promise<readonly ContentDocument[]> {
    return this.#documents.filter((document) => {
      if (filter.locale && document.locale !== filter.locale) return false;
      if (filter.domain && document.frontmatter.domain !== filter.domain) return false;
      if (filter.subject && document.frontmatter.subject !== filter.subject) return false;
      if (filter.kind && document.frontmatter.kind !== filter.kind) return false;
      if (
        filter.publicationStatus &&
        document.frontmatter.publicationStatus !== filter.publicationStatus
      )
        return false;
      if (filter.editorialStatus && document.frontmatter.editorialStatus !== filter.editorialStatus)
        return false;
      return true;
    });
  }

  async getRelations(id: string): Promise<readonly KnowledgeRelation[]> {
    const concept = this.#concepts.find((candidate) => candidate.id === id);
    const document = this.#documents.find((candidate) => candidate.frontmatter.conceptId === id);
    if (!concept && !document) return [];
    const prerequisites = concept?.prerequisites ?? document?.frontmatter.prerequisites ?? [];
    const prerequisiteRelations: KnowledgeRelation[] = prerequisites.map((target) => ({
      from: target,
      to: id,
      type: "prerequisite",
      strength: "primary",
    }));
    const declaredRelations: KnowledgeRelation[] = (document?.frontmatter.relations ?? []).map(
      (relation) => ({
        from: id,
        to: relation.target,
        type: relation.type,
        ...(relation.note ? { note: { "zh-CN": relation.note } } : {}),
        ...(relation.strength ? { strength: relation.strength } : {}),
      }),
    );
    const relations = [
      ...prerequisiteRelations,
      ...(concept?.relations ?? []),
      ...declaredRelations,
    ];
    const unique = new Map<string, KnowledgeRelation>();
    for (const relation of relations) {
      unique.set(`${relation.from}\0${relation.to}\0${relation.type}`, relation);
    }
    const visibleConceptIds = new Set(this.#concepts.map((entry) => entry.id));
    return [...unique.values()].filter(
      (relation) => visibleConceptIds.has(relation.from) && visibleConceptIds.has(relation.to),
    );
  }

  async search(query: SearchQuery): Promise<readonly SearchResult[]> {
    const normalized = query.value.trim().toLocaleLowerCase(query.locale ?? "zh-CN");
    if (!normalized) return [];
    const locale = query.locale ?? "zh-CN";
    const documentEntries = this.#documents
      .filter((document) => {
        if (query.locale && document.locale !== query.locale) return false;
        if (query.domain && document.frontmatter.domain !== query.domain) return false;
        if (query.kind && document.frontmatter.kind !== query.kind) return false;
        return isContentSearchable(document.frontmatter.publicationStatus, {
          includePreview: query.includePreview === true,
        });
      })
      .map((document) => {
        const haystack = [
          document.frontmatter.title,
          document.frontmatter.summary,
          ...document.frontmatter.tags,
          ...document.frontmatter.aliases,
          document.body,
        ]
          .join(" ")
          .toLocaleLowerCase(document.locale);
        const titleMatch = document.frontmatter.title
          .toLocaleLowerCase(document.locale)
          .includes(normalized);
        const score = titleMatch ? 10 : haystack.includes(normalized) ? 4 : 0;
        return { document, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ document, score }) => ({
        id: document.documentId,
        title: document.frontmatter.title,
        summary: document.frontmatter.summary,
        url: document.url,
        score,
      }));
    return documentEntries.sort(
      (left, right) => right.score - left.score || left.title.localeCompare(right.title, locale),
    );
  }
}

export type ResourceKind =
  | "paper"
  | "book"
  | "lecture"
  | "dataset"
  | "software"
  | "simulation"
  | "historical-source"
  | "encyclopedia-entry";

export interface ResourceLinks {
  readonly official?: string;
  readonly doi?: string;
  readonly arxiv?: string;
  readonly code?: string;
}

export type ResourceMetadataFieldStatus = "complete" | "unavailable" | "not-applicable";

export interface ResourceMetadataFields {
  readonly authors: ResourceMetadataFieldStatus;
  readonly year: ResourceMetadataFieldStatus;
  readonly publication: ResourceMetadataFieldStatus;
}

export interface ResourceRecord {
  readonly id: string;
  readonly kind: ResourceKind;
  readonly title: string;
  readonly authors?: readonly string[];
  readonly year?: number;
  readonly publisher?: string;
  readonly venue?: string;
  readonly description?: LocalizedText;
  readonly significance?: LocalizedText;
  readonly prerequisites?: readonly string[];
  readonly links: ResourceLinks;
  readonly topics: readonly string[];
  readonly verifiedAt?: string;
  /** Aggregate state; field-level states distinguish unavailable data from true non-applicability. */
  readonly metadataStatus: ResourceMetadataFieldStatus;
  readonly metadataFields: ResourceMetadataFields;
  readonly metadataNote?: LocalizedText;
}

type AuthoredResourceRecord = Omit<
  ResourceRecord,
  "metadataStatus" | "metadataFields" | "metadataNote"
>;

import { computerFoundationResources } from "./computer-foundation-resources";
import { aiArchitectureResources } from "./ai-architecture-resources";
import { supplementalResources } from "./supplemental-resources";

const authoredResources: readonly AuthoredResourceRecord[] = [
  ...computerFoundationResources,
  ...aiArchitectureResources,
  ...supplementalResources,
  {
    id: "yale-phys-200",
    kind: "lecture",
    title: "PHYS 200: Fundamentals of Physics I",
    authors: ["Ramamurti Shankar"],
    year: 2006,
    publisher: "Yale University",
    description: {
      "zh-CN": "耶鲁大学物理公开课，含力学、相对论、热学与波动的录像、讲稿和习题。",
      en: "Yale lectures, transcripts and exercises on mechanics, relativity, thermodynamics and waves.",
    },
    links: {
      official: "https://oyc.yale.edu/physics/phys-200",
    },
    topics: ["newton-laws"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "yale-phys-201",
    kind: "lecture",
    title: "PHYS 201: Fundamentals of Physics II",
    authors: ["Ramamurti Shankar"],
    year: 2010,
    publisher: "Yale University",
    description: {
      "zh-CN": "耶鲁大学物理公开课，含电磁学、光学与量子物理的录像、讲稿和习题。",
      en: "Yale lectures, transcripts and exercises on electromagnetism, optics and quantum physics.",
    },
    links: {
      official: "https://oyc.yale.edu/physics/phys-201",
    },
    topics: ["maxwell-waves"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "harvard-cs50x-2026",
    kind: "lecture",
    title: "CS50x: Introduction to Computer Science",
    authors: ["David J. Malan"],
    year: 2026,
    publisher: "Harvard University",
    description: {
      "zh-CN": "哈佛大学计算机入门课程，涵盖 C、Python、算法、数据结构和 SQL。",
      en: "Harvard introductory course covering C, Python, algorithms, data structures and SQL.",
    },
    links: {
      official: "https://cs50.harvard.edu/x/2026/",
    },
    topics: ["programs-types-control"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "stanford-cs224n-2025",
    kind: "lecture",
    title: "CS224N: Natural Language Processing with Deep Learning",
    authors: ["Diyi Yang", "Tatsunori Hashimoto"],
    year: 2025,
    publisher: "Stanford University",
    description: {
      "zh-CN": "斯坦福大学自然语言处理课程的公开课件与作业，涵盖词向量、注意力和 Transformer。",
      en: "Stanford slides and assignments on word vectors, attention and Transformers.",
    },
    links: {
      official: "https://web.stanford.edu/class/archive/cs/cs224n/cs224n.1254/",
    },
    topics: ["transformer-architecture"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-missing-semester-2020",
    kind: "lecture",
    title: "The Missing Semester of Your CS Education",
    year: 2020,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "MIT 工具课程，介绍 Shell、编辑器、Git、调试、性能分析和构建工具。",
      en: "MIT tutorials on the shell, editors, Git, debugging, profiling and build tools.",
    },
    links: {
      official: "https://missing.csail.mit.edu/2020/",
    },
    topics: ["testing-version-control"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "composing-programs",
    kind: "book",
    title: "Composing Programs, Third Edition",
    authors: ["John DeNero"],
    publisher: "Composing Programs",
    description: {
      "zh-CN": "伯克利 CS61A 使用的开放教材，介绍程序抽象、数据抽象和解释器。",
      en: "The open textbook used in Berkeley CS61A, covering program abstraction, data abstraction and interpreters.",
    },
    links: {
      official: "https://composingprograms.com/3ed/",
    },
    topics: ["programs-types-control"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "adam-kingma-ba",
    kind: "paper",
    title: "Adam: A Method for Stochastic Optimization",
    authors: ["Diederik P. Kingma", "Jimmy Ba"],
    year: 2015,
    venue: "ICLR",
    description: {
      "zh-CN": "介绍利用梯度一阶与二阶矩估计调整步长的 Adam 优化算法。",
      en: "Introduces Adam updates using estimates of the first and second moments of gradients.",
    },
    links: {
      official: "https://arxiv.org/abs/1412.6980",
    },
    topics: ["sgd-momentum-adaptive"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "resnet-he",
    kind: "paper",
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
    year: 2016,
    venue: "CVPR",
    description: {
      "zh-CN": "提出残差连接，并报告深层卷积网络在图像分类与检测中的实验结果。",
      en: "Introduces residual connections and reports deep convolutional network results for image classification and detection.",
    },
    links: {
      official:
        "https://openaccess.thecvf.com/content_cvpr_2016/html/He_Deep_Residual_Learning_CVPR_2016_paper.html",
      arxiv: "https://arxiv.org/abs/1512.03385",
    },
    topics: ["cnn-architectures"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "book-of-proof-hammack",
    kind: "book",
    title: "Book of Proof, Third Edition",
    authors: ["Richard Hammack"],
    description: {
      "zh-CN":
        "面向数学证明过渡课程的开放教材，覆盖集合、逻辑、直接证明、反证法、关系、函数与基数。",
    },
    significance: {
      "zh-CN": "用于核对数学语言、证明结构、关系和可数性章节中的定义、例题与练习。",
    },
    prerequisites: [],
    links: { official: "https://richardhammack.github.io/BookOfProof/index.html" },
    topics: [
      "sets-and-mappings",
      "logic-and-quantifiers",
      "proof-strategies",
      "mathematical-induction",
      "countability-and-structures",
      "mathematical-language-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "open-logic-sets-logic-computation",
    kind: "book",
    title: "Sets, Logic, Computation: An Open Introduction to Logic",
    publisher: "Open Logic Project",
    description: {
      "zh-CN": "开放逻辑教材，系统介绍集合、关系、函数、命题逻辑、一阶逻辑、证明系统与归纳。",
    },
    significance: {
      "zh-CN": "用于核对量词否定、关系性质、归纳证明和可数性论证的形式表达。",
    },
    prerequisites: [],
    links: { official: "https://slc.openlogicproject.org/" },
    topics: [
      "logic-and-quantifiers",
      "proof-strategies",
      "mathematical-induction",
      "countability-and-structures",
      "mathematical-language-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "attention-is-all-you-need",
    kind: "paper",
    title: "Attention Is All You Need",
    authors: [
      "Ashish Vaswani",
      "Noam Shazeer",
      "Niki Parmar",
      "Jakob Uszkoreit",
      "Llion Jones",
      "Aidan N. Gomez",
      "Łukasz Kaiser",
      "Illia Polosukhin",
    ],
    year: 2017,
    venue: "Advances in Neural Information Processing Systems 30",
    description: { "zh-CN": "提出以自注意力为核心、无需循环结构的 Transformer 架构。" },
    significance: { "zh-CN": "阅读注意力机制文章时用于核对原始模型定义和实验边界。" },
    prerequisites: ["attention-mechanism", "backpropagation"],
    links: {
      official: "https://papers.nips.cc/paper/7181-attention-is-all-you-need",
      arxiv: "https://arxiv.org/abs/1706.03762",
    },
    topics: [
      "attention-mechanism",
      "multihead-positional",
      "transformer-architecture",
      "sequence-transformer-review",
      "vision-transformers",
    ],
    verifiedAt: "2026-07-11",
  },
  {
    id: "stanford-cs231n-2025",
    kind: "lecture",
    title: "CS231n: Deep Learning for Computer Vision",
    authors: ["Aditesh Kumar", "Wenlong Huang", "Cristobal Eyzaguirre"],
    year: 2025,
    publisher: "Stanford University",
    description: {
      "zh-CN":
        "覆盖视觉分类、卷积网络、残差架构、检测、分割、视觉 Transformer、训练工程和视觉数据评估。",
    },
    significance: {
      "zh-CN":
        "用于核对 A06 的离散卷积、网络结构、目标检测、密集预测、视觉 Transformer 及计算机视觉实验边界。",
    },
    prerequisites: ["neural-backprop-review", "deep-learning-engineering-review"],
    links: { official: "https://cs231n.stanford.edu/2025/index.html" },
    topics: [
      "convolution-operators",
      "cnn-architectures",
      "detection",
      "segmentation",
      "vision-transformers",
      "computer-vision-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "deep-learning-book",
    kind: "book",
    title: "Deep Learning",
    authors: ["Ian Goodfellow", "Yoshua Bengio", "Aaron Courville"],
    year: 2016,
    publisher: "MIT Press",
    description: { "zh-CN": "系统介绍深度网络的数学基础、优化与建模方法。" },
    significance: { "zh-CN": "适合作为反向传播和优化章节的完整参考。" },
    prerequisites: ["linear-transformation", "gradient-descent"],
    links: { official: "https://www.deeplearningbook.org/" },
    topics: [
      "gradient-descent",
      "backpropagation",
      "computation-graphs",
      "initialization-gradient-flow",
      "neural-backprop-review",
      "sgd-momentum-adaptive",
      "schedules-second-order",
      "normalization",
      "regularization-augmentation",
      "mixed-precision-distributed",
      "deep-learning-engineering-review",
      "rnns-gating",
      "sequence-training",
      "multihead-positional",
      "transformer-architecture",
      "sequence-transformer-review",
      "autoregressive-models",
      "variational-autoencoders",
      "generative-adversarial",
      "normalizing-flows",
      "score-diffusion",
      "generative-models-review",
    ],
    verifiedAt: "2026-07-11",
  },
  {
    id: "simclr-paper",
    kind: "paper",
    title: "A Simple Framework for Contrastive Learning of Visual Representations",
    authors: ["Ting Chen", "Simon Kornblith", "Mohammad Norouzi", "Geoffrey Hinton"],
    year: 2020,
    venue: "Proceedings of the 37th International Conference on Machine Learning",
    description: {
      "zh-CN": "提出 SimCLR，对数据增强、投影头、批内负样本和温度化对比目标进行系统实验。",
    },
    significance: { "zh-CN": "用于核对对比学习目标、增强选择、负样本规模以及表示评估的实证边界。" },
    prerequisites: ["metric-learning", "regularization-augmentation"],
    links: { official: "https://proceedings.mlr.press/v119/chen20j.html" },
    topics: ["representation-objectives", "contrastive-learning", "representation-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "bert-masked-language-modeling",
    kind: "paper",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
    year: 2019,
    venue: "Proceedings of NAACL-HLT 2019",
    description: { "zh-CN": "以掩码语言建模和句间目标预训练双向 Transformer 表示。" },
    significance: { "zh-CN": "用于核对掩码预测的条件建模方式、预训练—微调接口和原始实验范围。" },
    prerequisites: ["transformer-architecture"],
    links: {
      official: "https://aclanthology.org/N19-1423/",
      doi: "https://doi.org/10.18653/v1/N19-1423",
      arxiv: "https://arxiv.org/abs/1810.04805",
    },
    topics: ["masked-prediction", "representation-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "clip-paper",
    kind: "paper",
    title: "Learning Transferable Visual Models From Natural Language Supervision",
    authors: [
      "Alec Radford",
      "Jong Wook Kim",
      "Chris Hallacy",
      "Aditya Ramesh",
      "Gabriel Goh",
      "Sandhini Agarwal",
      "Girish Sastry",
      "Amanda Askell",
      "Pamela Mishkin",
      "Jack Clark",
      "Gretchen Krueger",
      "Ilya Sutskever",
    ],
    year: 2021,
    venue: "Proceedings of the 38th International Conference on Machine Learning",
    description: { "zh-CN": "用大规模图像—文本配对数据和双塔对比目标学习可迁移视觉表示。" },
    significance: { "zh-CN": "用于核对跨模态对齐、零样本分类、数据构造和评价限制。" },
    prerequisites: ["contrastive-learning", "computer-vision-review"],
    links: { official: "https://proceedings.mlr.press/v139/radford21a.html" },
    topics: ["multimodal-pretraining", "representation-review", "vision-language"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "vae-paper",
    kind: "paper",
    title: "Auto-Encoding Variational Bayes",
    authors: ["Diederik P. Kingma", "Max Welling"],
    year: 2013,
    description: { "zh-CN": "提出以重参数化估计器训练连续潜变量生成模型的变分自编码框架。" },
    significance: { "zh-CN": "用于核对证据下界、近似后验和重参数化梯度的原始推导。" },
    prerequisites: ["em-variational", "neural-backprop-review"],
    links: {
      official: "https://arxiv.org/abs/1312.6114",
      arxiv: "https://arxiv.org/abs/1312.6114",
    },
    topics: ["variational-autoencoders", "generative-models-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "gan-paper",
    kind: "paper",
    title: "Generative Adversarial Nets",
    authors: [
      "Ian Goodfellow",
      "Jean Pouget-Abadie",
      "Mehdi Mirza",
      "Bing Xu",
      "David Warde-Farley",
      "Sherjil Ozair",
      "Aaron Courville",
      "Yoshua Bengio",
    ],
    year: 2014,
    venue: "Advances in Neural Information Processing Systems 27",
    description: { "zh-CN": "提出生成器与判别器之间的极小极大训练框架。" },
    significance: { "zh-CN": "用于核对原始对抗目标、最优判别器分析和实验结论范围。" },
    prerequisites: ["loss-functions", "neural-backprop-review"],
    links: {
      official:
        "https://papers.nips.cc/paper_files/paper/2014/hash/f033ed80deb0234979a61f95710dbe25-Abstract.html",
    },
    topics: ["generative-adversarial", "generative-models-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "ddpm-paper",
    kind: "paper",
    title: "Denoising Diffusion Probabilistic Models",
    authors: ["Jonathan Ho", "Ajay Jain", "Pieter Abbeel"],
    year: 2020,
    venue: "Advances in Neural Information Processing Systems 33",
    description: { "zh-CN": "以参数化反向 Markov 链和去噪目标训练扩散概率模型。" },
    significance: { "zh-CN": "用于核对前向加噪、反向采样、变分界与噪声预测目标的关系。" },
    prerequisites: ["continuous-distributions", "neural-backprop-review"],
    links: {
      official:
        "https://proceedings.neurips.cc/paper/2020/hash/4c5bcfec8584af0d967f1ab10179ca4b-Abstract.html",
      arxiv: "https://arxiv.org/abs/2006.11239",
    },
    topics: ["score-diffusion", "generative-models-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "sutton-barto-reinforcement-learning-2e",
    kind: "book",
    title: "Reinforcement Learning: An Introduction, Second Edition",
    authors: ["Richard S. Sutton", "Andrew G. Barto"],
    year: 2018,
    publisher: "MIT Press",
    description: {
      "zh-CN": "系统介绍多臂赌博机、Markov 决策过程、价值估计、控制、函数逼近与策略梯度。",
    },
    significance: {
      "zh-CN":
        "用于核对 A10 的定义、Bellman 推导、经典算法与收敛条件；高级离线与多智能体内容另标研究边界。",
    },
    prerequisites: ["conditional-probability", "gradient-descent"],
    links: { official: "https://mitpress.mit.edu/9780262039246/reinforcement-learning/" },
    topics: [
      "markov-decision-processes",
      "dynamic-programming-td",
      "q-learning",
      "policy-gradients",
      "model-offline-rl",
      "reinforcement-learning-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "geometric-deep-learning-book",
    kind: "book",
    title: "Geometric Deep Learning: Grids, Groups, Graphs, Geodesics, and Gauges",
    authors: ["Michael M. Bronstein", "Joan Bruna", "Taco Cohen", "Petar Veličković"],
    year: 2021,
    description: {
      "zh-CN": "以域、对称群、尺度分离和局部性统一卷积、图网络、Transformer 与几何学习。",
    },
    significance: {
      "zh-CN": "用于核对 A11 的不变性、等变性、群作用、谱方法和几何深度学习统一框架。",
    },
    prerequisites: ["homomorphisms-actions", "smooth-manifolds", "neural-backprop-review"],
    links: {
      official: "https://geometricdeeplearning.com/book/",
      arxiv: "https://arxiv.org/abs/2104.13478",
    },
    topics: [
      "graph-signals",
      "invariance-equivariance",
      "spectral-geometric",
      "graph-generation-dynamics",
      "geometric-deep-learning-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "gilmer-neural-message-passing",
    kind: "paper",
    title: "Neural Message Passing for Quantum Chemistry",
    authors: [
      "Justin Gilmer",
      "Samuel S. Schoenholz",
      "Patrick F. Riley",
      "Oriol Vinyals",
      "George E. Dahl",
    ],
    year: 2017,
    venue: "Proceedings of the 34th International Conference on Machine Learning",
    description: { "zh-CN": "把多种分子图模型统一为消息传递神经网络框架。" },
    significance: { "zh-CN": "用于核对消息、聚合、更新、读出和分子任务实验的原始定义。" },
    prerequisites: ["graph-signals", "neural-backprop-review"],
    links: { official: "https://proceedings.mlr.press/v70/gilmer17a.html" },
    topics: ["message-passing", "graph-generation-dynamics", "geometric-deep-learning-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "language-model-scaling-laws",
    kind: "paper",
    title: "Scaling Laws for Neural Language Models",
    authors: [
      "Jared Kaplan",
      "Sam McCandlish",
      "Tom Henighan",
      "Tom B. Brown",
      "Benjamin Chess",
      "Rewon Child",
      "Scott Gray",
      "Alec Radford",
      "Jeffrey Wu",
      "Dario Amodei",
    ],
    year: 2020,
    description: {
      "zh-CN": "在受控实验中研究语言模型损失随参数量、数据量和训练计算变化的经验幂律。",
    },
    significance: {
      "zh-CN": "用于说明规模律是特定数据、模型与损失范围内的经验关系，不是无条件能力定律。",
    },
    prerequisites: ["transformer-architecture", "entropy-divergence"],
    links: {
      official: "https://arxiv.org/abs/2001.08361",
      arxiv: "https://arxiv.org/abs/2001.08361",
    },
    topics: ["language-modeling-scaling", "llm-agents-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "instructgpt-paper",
    kind: "paper",
    title: "Training Language Models to Follow Instructions with Human Feedback",
    authors: [
      "Long Ouyang",
      "Jeffrey Wu",
      "Xu Jiang",
      "Diogo Almeida",
      "Carroll L. Wainwright",
      "Pamela Mishkin",
      "Chong Zhang",
      "Sandhini Agarwal",
      "Katarina Slama",
      "Alex Ray",
      "John Schulman",
      "Jacob Hilton",
      "Fraser Kelton",
      "Luke Miller",
      "Maddie Simens",
      "Amanda Askell",
      "Peter Welinder",
      "Paul Christiano",
      "Jan Leike",
      "Ryan Lowe",
    ],
    year: 2022,
    venue: "Advances in Neural Information Processing Systems 35",
    description: {
      "zh-CN": "以监督示范、偏好比较、奖励模型和强化学习使语言模型更贴近标注者意图。",
    },
    significance: {
      "zh-CN": "用于核对指令适配和人类反馈训练流程，并保留数据分布、标注者和残余错误边界。",
    },
    prerequisites: ["language-modeling-scaling", "policy-gradients"],
    links: {
      official:
        "https://proceedings.neurips.cc/paper/2022/hash/b1efde53be364a73914f58805a001731-Abstract-Conference.html",
      arxiv: "https://arxiv.org/abs/2203.02155",
    },
    topics: ["instruction-adaptation", "alignment-objectives", "llm-agents-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "rag-paper",
    kind: "paper",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: [
      "Patrick Lewis",
      "Ethan Perez",
      "Aleksandra Piktus",
      "Fabio Petroni",
      "Vladimir Karpukhin",
      "Naman Goyal",
      "Heinrich Küttler",
      "Mike Lewis",
      "Wen-tau Yih",
      "Tim Rocktäschel",
      "Sebastian Riedel",
      "Douwe Kiela",
    ],
    year: 2020,
    venue: "Advances in Neural Information Processing Systems 33",
    description: {
      "zh-CN": "把参数化生成器与可更新的非参数文档索引结合，用检索证据支持知识密集任务。",
    },
    significance: {
      "zh-CN": "用于核对检索—生成联合建模的原始范围；引用正确性和生产审计需要额外设计。",
    },
    prerequisites: ["transformer-architecture", "conditional-probability"],
    links: {
      official:
        "https://papers.neurips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html",
      arxiv: "https://arxiv.org/abs/2005.11401",
    },
    topics: ["retrieval-grounding", "tools-memory-planning", "llm-agents-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "react-paper",
    kind: "paper",
    title: "ReAct: Synergizing Reasoning and Acting in Language Models",
    authors: [
      "Shunyu Yao",
      "Jeffrey Zhao",
      "Dian Yu",
      "Nan Du",
      "Izhak Shafran",
      "Karthik Narasimhan",
      "Yuan Cao",
    ],
    year: 2023,
    venue: "International Conference on Learning Representations",
    description: { "zh-CN": "让语言模型交替产生推理轨迹与环境动作，以外部观察更新后续决策。" },
    significance: {
      "zh-CN": "用于核对工具调用智能体的基本循环和论文实验范围，不把自由文本轨迹等同于可靠证明。",
    },
    prerequisites: ["instruction-adaptation", "markov-decision-processes"],
    links: { official: "https://react-lm.github.io/", arxiv: "https://arxiv.org/abs/2210.03629" },
    topics: ["tools-memory-planning", "llm-agents-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "shap-paper",
    kind: "paper",
    title: "A Unified Approach to Interpreting Model Predictions",
    authors: ["Scott M. Lundberg", "Su-In Lee"],
    year: 2017,
    venue: "Advances in Neural Information Processing Systems 30",
    description: { "zh-CN": "把多种局部特征归因方法统一为加性解释模型，并提出 SHAP 值。" },
    significance: {
      "zh-CN": "用于核对 Shapley 归因公理、近似方法和计算限制，不把归因自动解释为因果效应。",
    },
    prerequisites: ["conditional-probability", "linear-regression"],
    links: {
      official:
        "https://proceedings.neurips.cc/paper_files/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html",
      arxiv: "https://arxiv.org/abs/1705.07874",
    },
    topics: ["feature-attribution", "mechanistic-interpretability", "safety-governance-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "calibration-modern-neural-networks",
    kind: "paper",
    title: "On Calibration of Modern Neural Networks",
    authors: ["Chuan Guo", "Geoff Pleiss", "Yu Sun", "Kilian Q. Weinberger"],
    year: 2017,
    venue: "Proceedings of the 34th International Conference on Machine Learning",
    description: { "zh-CN": "系统测量现代神经网络的置信度失配，并比较后处理校准方法。" },
    significance: { "zh-CN": "用于核对可靠性图、期望校准误差与温度缩放的定义和实验范围。" },
    prerequisites: ["metrics-baselines", "conditional-probability"],
    links: {
      official: "https://proceedings.mlr.press/v70/guo17a.html",
      arxiv: "https://arxiv.org/abs/1706.04599",
    },
    topics: ["calibration-ood", "safety-governance-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "adversarial-examples-goodfellow",
    kind: "paper",
    title: "Explaining and Harnessing Adversarial Examples",
    authors: ["Ian J. Goodfellow", "Jonathon Shlens", "Christian Szegedy"],
    year: 2015,
    venue: "International Conference on Learning Representations",
    description: { "zh-CN": "提出快速梯度符号攻击，并从局部线性响应解释一类对抗脆弱性。" },
    significance: {
      "zh-CN": "用于核对威胁模型、攻击构造和对抗训练的原始主张；不能替代自适应防御评估。",
    },
    prerequisites: ["gradient", "neural-backprop-review"],
    links: {
      official: "https://research.google/pubs/explaining-and-harnessing-adversarial-examples/",
      arxiv: "https://arxiv.org/abs/1412.6572",
    },
    topics: ["robustness-attacks", "safety-governance-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "nist-ai-rmf-1",
    kind: "paper",
    title: "Artificial Intelligence Risk Management Framework (AI RMF 1.0)",
    authors: ["Elham Tabassi"],
    year: 2023,
    publisher: "National Institute of Standards and Technology",
    description: {
      "zh-CN": "面向不同组织和使用情境的自愿 AI 风险管理框架，组织治理、映射、测量与管理活动。",
    },
    significance: {
      "zh-CN": "用于把技术评测连接到情境化风险登记、责任和持续监测；它不是模型安全认证。",
    },
    prerequisites: ["metrics-baselines"],
    links: {
      official:
        "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10",
      doi: "https://doi.org/10.6028/NIST.AI.100-1",
    },
    topics: ["alignment-objectives", "safety-governance-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "differentiable-physics-position",
    kind: "paper",
    title: "Differentiable Physics: A Position Piece",
    authors: ["Bharath Ramsundar", "Dilip Krishnamurthy", "Venkatasubramanian Viswanathan"],
    year: 2021,
    description: {
      "zh-CN": "讨论可微程序与经典数值模拟结合后在参数估计、微分方程和科学建模中的作用。",
    },
    significance: {
      "zh-CN": "用于建立可微物理的范围与方法分类，同时保留离散化误差和梯度正确性检查。",
    },
    prerequisites: ["automatic-differentiation", "numerical-pde"],
    links: {
      official: "https://arxiv.org/abs/2109.07573",
      arxiv: "https://arxiv.org/abs/2109.07573",
    },
    topics: ["differentiable-physics", "inverse-uncertainty", "scientific-ml-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "pinn-raissi-2019",
    kind: "paper",
    title:
      "Physics-informed neural networks: A deep learning framework for solving forward and inverse problems involving nonlinear partial differential equations",
    authors: ["Maziar Raissi", "Paris Perdikaris", "George Em Karniadakis"],
    year: 2019,
    venue: "Journal of Computational Physics 378",
    description: {
      "zh-CN": "以自动微分计算方程残差，将观测和物理约束共同用于前向与逆向 PDE 问题。",
    },
    significance: {
      "zh-CN": "用于核对 PINN 原始损失构造和实验；误差估计、刚性与高频失效需另行验证。",
    },
    prerequisites: ["partial-differential-equations", "automatic-differentiation"],
    links: {
      official: "https://doi.org/10.1016/j.jcp.2018.10.045",
      doi: "https://doi.org/10.1016/j.jcp.2018.10.045",
      arxiv: "https://arxiv.org/abs/1711.10561",
    },
    topics: ["pinn", "inverse-uncertainty", "scientific-ml-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "deeponet-paper",
    kind: "paper",
    title:
      "Learning nonlinear operators via DeepONet based on the universal approximation theorem of operators",
    authors: ["Lu Lu", "Pengzhan Jin", "Guofei Pang", "Zhongqiang Zhang", "George Em Karniadakis"],
    year: 2021,
    venue: "Nature Machine Intelligence 3",
    description: {
      "zh-CN": "以 branch net 和 trunk net 构造 DeepONet，并在多类显式与微分算子任务上验证。",
    },
    significance: { "zh-CN": "用于核对算子逼近结构、传感器输入和论文实验范围。" },
    prerequisites: ["functional-mappings", "neural-backprop-review"],
    links: {
      official: "https://www.nature.com/articles/s42256-021-00302-5",
      doi: "https://doi.org/10.1038/s42256-021-00302-5",
      arxiv: "https://arxiv.org/abs/1910.03193",
    },
    topics: ["deeponet", "neural-operators", "scientific-ml-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "fourier-neural-operator-paper",
    kind: "paper",
    title: "Fourier Neural Operator for Parametric Partial Differential Equations",
    authors: [
      "Zongyi Li",
      "Nikola Kovachki",
      "Kamyar Azizzadenesheli",
      "Burigede Liu",
      "Kaushik Bhattacharya",
      "Andrew Stuart",
      "Anima Anandkumar",
    ],
    year: 2021,
    venue: "International Conference on Learning Representations",
    description: { "zh-CN": "在 Fourier 空间参数化积分核，学习参数化 PDE 的函数到函数映射。" },
    significance: {
      "zh-CN": "用于核对 FNO 架构、基准和零样本超分辨率主张，并明确网格与分布外限制。",
    },
    prerequisites: ["fourier-transform", "numerical-pde", "functional-mappings"],
    links: {
      official: "https://iclr.cc/virtual/2021/poster/3281",
      arxiv: "https://arxiv.org/abs/2010.08895",
    },
    topics: ["neural-operators", "inverse-uncertainty", "scientific-ml-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-mathematics-for-computer-science",
    kind: "lecture",
    title: "MIT 6.042J Mathematics for Computer Science",
    authors: ["Albert R. Meyer", "Adam Chlipala"],
    year: 2015,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "离散数学课程，系统覆盖定义、证明、集合、函数、关系、计数与离散概率。",
    },
    significance: {
      "zh-CN":
        "用于核对集合与函数语言、有限集合上的证明方法，以及组合计数、条件概率和离散概率的推导。",
    },
    prerequisites: [],
    links: {
      official: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/",
    },
    topics: [
      "sets-and-mappings",
      "functions-and-graphs",
      "probability-axioms",
      "combinatorial-probability",
      "conditional-probability",
      "bayes-theorem",
      "probability-review",
      "counting-principles",
      "recurrences-generating-functions",
      "graphs-connectivity",
      "matching-coloring",
      "posets-boolean",
      "discrete-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "discrete-mathematics-open-introduction-4e",
    kind: "book",
    title: "Discrete Mathematics: An Open Introduction, Fourth Edition",
    authors: ["Oscar Levin"],
    year: 2025,
    description: {
      "zh-CN":
        "面向数学与计算机专业低年级课程的开放教材，覆盖逻辑与证明、图论、计数、序列、离散结构和生成函数。",
    },
    significance: {
      "zh-CN": "用于核对图论、计数、递推与生成函数章节中的定义顺序、证明边界和可复算练习。",
    },
    prerequisites: ["proof-strategies", "mathematical-induction"],
    links: { official: "https://discrete.openmathbooks.org/dmoi4.html" },
    topics: [
      "counting-principles",
      "recurrences-generating-functions",
      "graphs-connectivity",
      "matching-coloring",
      "posets-boolean",
      "discrete-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "applied-discrete-structures-runestone",
    kind: "book",
    title: "Applied Discrete Structures",
    authors: ["Al Doerr", "Ken Levasseur"],
    publisher: "Runestone Academy",
    description: {
      "zh-CN":
        "两学期离散结构开放教材，系统覆盖组合计数、递推与生成函数、关系、图、树、偏序、格和布尔代数。",
    },
    significance: {
      "zh-CN":
        "用于交叉核对递推、图连通性、树、着色、偏序、格与布尔代数的定义、算法条件和练习结构。",
    },
    prerequisites: ["sets-and-mappings", "proof-strategies"],
    links: { official: "https://runestone.academy/ns/books/published/ads/adsindex.html" },
    topics: [
      "counting-principles",
      "recurrences-generating-functions",
      "graphs-connectivity",
      "matching-coloring",
      "posets-boolean",
      "discrete-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "stanford-cs103-elements-subsets-guide",
    kind: "lecture",
    title: "Stanford CS103 Guide to Elements and Subsets",
    publisher: "Stanford University",
    description: {
      "zh-CN": "用对象类型和交互示例区分集合的元素关系与子集关系。",
    },
    significance: {
      "zh-CN": "用于核对成员符号、子集符号及二者不能互换的基础边界。",
    },
    prerequisites: [],
    links: { official: "https://web.stanford.edu/class/cs103/elements_and_subsets" },
    topics: ["sets-and-mappings"],
    verifiedAt: "2026-07-11",
  },
  {
    id: "openstax-calculus-volume-1",
    kind: "book",
    title: "Calculus Volume 1",
    authors: ["Gilbert Strang", "Edwin Herman"],
    year: 2016,
    publisher: "OpenStax, Rice University",
    description: { "zh-CN": "覆盖函数、极限、导数与积分的一学期微积分开放教材。" },
    significance: { "zh-CN": "用于核对基础微积分定义、定理条件、分步例题与练习。" },
    prerequisites: ["functions-and-graphs"],
    links: { official: "https://openstax.org/details/books/calculus-volume-1/" },
    topics: [
      "functions-and-graphs",
      "limits-and-continuity",
      "derivatives-and-differentials",
      "derivative-applications",
      "integrals-and-accumulation",
    ],
    verifiedAt: "2026-07-11",
  },
  {
    id: "openstax-calculus-volume-2",
    kind: "book",
    title: "Calculus Volume 2",
    authors: ["Gilbert Strang", "Edwin Herman"],
    year: 2016,
    publisher: "OpenStax, Rice University",
    description: {
      "zh-CN": "覆盖积分方法、微分方程、数列与级数、幂级数和参数方程的开放教材。",
    },
    significance: {
      "zh-CN": "用于核对数列与级数的收敛条件、积分技巧、反常积分和幂级数例题。",
    },
    prerequisites: ["algebra-functions-review"],
    links: { official: "https://openstax.org/details/books/calculus-volume-2/" },
    topics: [
      "sequences-and-series",
      "derivative-applications",
      "integrals-and-accumulation",
      "integration-techniques",
      "improper-integrals",
      "taylor-expansion",
      "single-variable-calculus-review",
      "existence-uniqueness",
      "first-order-methods",
      "higher-order-linear",
      "dynamical-systems-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "openstax-precalculus-2e",
    kind: "book",
    title: "Precalculus 2e",
    authors: ["Jay Abramson"],
    year: 2021,
    publisher: "OpenStax, Rice University",
    description: {
      "zh-CN": "覆盖函数、多项式、有理式、指数对数、三角函数与解析几何的大学先修开放教材。",
    },
    significance: {
      "zh-CN": "用于核对 M01 的定义域、函数变换、方程求解、圆锥曲线与分步练习。",
    },
    prerequisites: ["equations-and-inequalities"],
    links: { official: "https://openstax.org/details/books/precalculus-2e" },
    topics: [
      "equations-and-inequalities",
      "polynomials",
      "functions-and-graphs",
      "exponential-logarithmic-functions",
      "coordinate-geometry",
      "algebra-functions-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "openstax-algebra-trigonometry-2e",
    kind: "book",
    title: "Algebra and Trigonometry 2e",
    authors: ["Jay Abramson"],
    year: 2021,
    publisher: "OpenStax, Rice University",
    description: {
      "zh-CN": "系统覆盖方程与不等式、代数函数、指数对数函数、三角函数和解析几何。",
    },
    significance: {
      "zh-CN": "用于逐项复核 M01 的代数规则、图像性质、参数问题与完整例题。",
    },
    prerequisites: [],
    links: { official: "https://openstax.org/details/books/algebra-and-trigonometry-2e" },
    topics: [
      "equations-and-inequalities",
      "polynomials",
      "functions-and-graphs",
      "exponential-logarithmic-functions",
      "coordinate-geometry",
      "algebra-functions-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "openstax-calculus-volume-3",
    kind: "book",
    title: "Calculus Volume 3",
    authors: ["Gilbert Strang", "Edwin Herman"],
    year: 2016,
    publisher: "OpenStax, Rice University",
    description: { "zh-CN": "覆盖向量、多元函数、多重积分与二阶微分方程的开放教材。" },
    significance: { "zh-CN": "为方向导数、梯度、向量分析和数学物理章节提供可核对的教材背景。" },
    prerequisites: ["derivatives-and-differentials", "vectors"],
    links: { official: "https://openstax.org/details/books/calculus-volume-3" },
    topics: [
      "several-variable-functions",
      "gradient",
      "multiple-integrals",
      "line-integrals",
      "vector-fields",
      "surface-integrals",
      "green-stokes-gauss",
      "multivariable-calculus-review",
      "vectors",
      "wave-equation",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "openstax-introductory-statistics",
    kind: "book",
    title: "Introductory Statistics 2e",
    authors: ["Barbara Illowsky", "Susan Dean"],
    year: 2023,
    publisher: "OpenStax, Rice University",
    description: { "zh-CN": "以代数为先修，系统介绍概率、随机变量、分布与统计推断。" },
    significance: {
      "zh-CN":
        "提供大量分步例题和练习，适合核对分布、样本统计量、置信区间、假设检验和简单线性回归的基础计算与解释。",
    },
    prerequisites: ["functions-and-graphs"],
    links: { official: "https://openstax.org/details/books/introductory-statistics-2e" },
    topics: [
      "probability-axioms",
      "combinatorial-probability",
      "conditional-probability",
      "bayes-theorem",
      "random-variables-distributions",
      "discrete-distributions",
      "continuous-distributions",
      "expectation-variance-covariance",
      "law-large-numbers",
      "central-limit-theorem",
      "probability-review",
      "sampling-distributions",
      "confidence-intervals",
      "hypothesis-testing",
      "linear-model-inference",
      "statistics-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "mit-ocw-18-650-statistics-for-applications",
    kind: "lecture",
    title: "MIT 18.650 Statistics for Applications",
    authors: ["Philippe Rigollet"],
    year: 2016,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "从统计模型、参数推断和估计量评价出发，覆盖矩估计、最大似然、假设检验、拟合优度、回归与广义线性模型。",
    },
    significance: {
      "zh-CN":
        "适合把随机样本、估计量评价、置信区间、检验和回归放在同一课程结构中学习，并比较有限样本结论与渐近方法。",
    },
    prerequisites: ["probability-review", "derivatives-and-differentials", "matrices"],
    links: {
      official: "https://ocw.mit.edu/courses/18-650-statistics-for-applications-fall-2016/",
    },
    topics: [
      "sampling-distributions",
      "statistical-estimation",
      "maximum-likelihood-estimation",
      "confidence-intervals",
      "hypothesis-testing",
      "linear-model-inference",
      "statistics-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "casella-berger-statistical-inference-2e",
    kind: "book",
    title: "Statistical Inference, Second Edition",
    authors: ["George Casella", "Roger L. Berger"],
    year: 2002,
    publisher: "Cengage",
    description: {
      "zh-CN":
        "从概率第一原理建立统计推断，系统讨论数据约化、点估计、区间估计与假设检验的理论条件。",
    },
    significance: {
      "zh-CN":
        "适合深入学习充分性、完备性、UMVU、似然、信息量、枢轴量和 Neyman–Pearson 框架的严格条件。",
    },
    prerequisites: ["probability-review", "integrals-and-accumulation"],
    links: {
      official: "https://www.cengage.com/c/statistical-inference-2e-casella-berger/9780534243128/",
    },
    topics: [
      "sampling-distributions",
      "statistical-estimation",
      "maximum-likelihood-estimation",
      "confidence-intervals",
      "hypothesis-testing",
      "statistics-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "wasserman-all-of-statistics",
    kind: "book",
    title: "All of Statistics: A Concise Course in Statistical Inference",
    authors: ["Larry Wasserman"],
    year: 2004,
    publisher: "Springer New York",
    description: {
      "zh-CN": "以简明路径连接经验分布、参数推断、检验、统计决策、回归和计算统计。",
    },
    significance: {
      "zh-CN": "适合沿经验分布、估计误差、区间与检验、决策风险和线性模型建立统一的统计推断视角。",
    },
    prerequisites: ["probability-review", "matrices"],
    links: { official: "https://link.springer.com/book/10.1007/978-0-387-21736-9" },
    topics: [
      "sampling-distributions",
      "statistical-estimation",
      "maximum-likelihood-estimation",
      "confidence-intervals",
      "hypothesis-testing",
      "linear-model-inference",
      "statistics-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "introduction-statistical-learning-r-2e",
    kind: "book",
    title: "An Introduction to Statistical Learning: with Applications in R, Second Edition",
    authors: ["Gareth James", "Daniela Witten", "Trevor Hastie", "Robert Tibshirani"],
    year: 2021,
    publisher: "Springer",
    description: {
      "zh-CN":
        "以数据分析案例介绍线性回归、分类、重抽样、模型选择和多重检验，并明确预测与解释的差别。",
    },
    significance: {
      "zh-CN": "适合结合案例理解线性模型的系数、标准误、区间、检验、预测与常见诊断边界。",
    },
    prerequisites: ["linear-systems", "probability-review"],
    links: { official: "https://link.springer.com/book/10.1007/978-1-0716-1418-1" },
    topics: ["linear-model-inference", "hypothesis-testing", "statistics-review"],
    verifiedAt: "2026-07-13",
  },
  {
    id: "mit-ocw-18-01sc-single-variable-calculus",
    kind: "lecture",
    title: "MIT 18.01SC Single Variable Calculus",
    authors: ["David Jerison"],
    year: 2010,
    publisher: "MIT OpenCourseWare",
    description: { "zh-CN": "含讲义、视频、例题、习题与解答的单变量微积分自学课程。" },
    significance: { "zh-CN": "课程材料连接严格定义、计算技巧与应用，可作为完整学习序列。" },
    prerequisites: ["functions-and-graphs"],
    links: {
      official: "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/",
    },
    topics: [
      "sequences-and-series",
      "limits-and-continuity",
      "derivatives-and-differentials",
      "derivative-applications",
      "chain-rule",
      "taylor-expansion",
      "integrals-and-accumulation",
      "fundamental-theorem-calculus",
      "integration-techniques",
      "improper-integrals",
      "single-variable-calculus-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "mit-ocw-18-02sc-multivariable-calculus",
    kind: "lecture",
    title: "MIT 18.02SC Multivariable Calculus",
    authors: ["Denis Auroux"],
    year: 2010,
    publisher: "MIT OpenCourseWare",
    description: { "zh-CN": "覆盖向量、矩阵、多元微分、多重积分与向量分析的自学课程。" },
    significance: { "zh-CN": "把线性代数对象用于几何与多变量问题，并提供例题、习题和解答。" },
    prerequisites: ["integrals-and-accumulation", "vectors"],
    links: {
      official: "https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/",
    },
    topics: [
      "vectors",
      "matrices",
      "determinants",
      "several-variable-functions",
      "gradient",
      "multiple-integrals",
      "line-integrals",
      "vector-fields",
      "surface-integrals",
      "green-stokes-gauss",
      "multivariable-calculus-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "mit-ocw-18-06sc-linear-algebra",
    kind: "lecture",
    title: "MIT 18.06SC Linear Algebra",
    authors: ["Gilbert Strang"],
    year: 2011,
    publisher: "MIT OpenCourseWare",
    description: { "zh-CN": "从线性方程组进入向量空间、矩阵分解、行列式与特征值。" },
    significance: { "zh-CN": "提供线性代数核心概念的完整课程顺序、例题、习题和考试材料。" },
    prerequisites: ["functions-and-graphs"],
    links: { official: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/" },
    topics: [
      "vectors",
      "matrices",
      "linear-systems",
      "gaussian-elimination",
      "matrix-rank",
      "null-space",
      "linear-transformation",
      "determinants",
      "eigenvalues-eigenvectors",
      "orthogonality",
      "orthogonal-projection",
      "least-squares",
      "positive-definite-matrices",
      "quadratic-forms",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "gatech-interactive-linear-algebra",
    kind: "book",
    title: "Interactive Linear Algebra",
    authors: ["Dan Margalit", "Joseph Rabinoff"],
    year: 2019,
    publisher: "Georgia Institute of Technology",
    description: {
      "zh-CN":
        "按线性方程组、向量与基、矩阵和线性变换、行列式、特征结构与正交性组织的开放交互教材。",
    },
    significance: {
      "zh-CN":
        "章节含几何解释、交互图、例题、练习提示和部分解答，可用于交叉核对本册六章的代数与几何主线。",
    },
    prerequisites: ["functions-and-graphs"],
    links: { official: "https://textbooks.math.gatech.edu/ila/" },
    topics: [
      "vectors",
      "linear-combinations",
      "span-and-basis",
      "matrices",
      "matrix-multiplication",
      "linear-systems",
      "gaussian-elimination",
      "matrix-rank",
      "null-space",
      "linear-transformation",
      "determinants",
      "eigenvalues-eigenvectors",
      "orthogonality",
      "orthogonal-projection",
      "least-squares",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "mit-ocw-probability",
    kind: "lecture",
    title: "MIT 6.041SC Probabilistic Systems Analysis and Applied Probability",
    authors: ["John Tsitsiklis"],
    year: 2013,
    publisher: "MIT OpenCourseWare",
    description: { "zh-CN": "介绍概率模型、随机变量、随机过程和统计推断基础的本科课程。" },
    significance: { "zh-CN": "课程包含讲授、习题、解答和考试，适合系统检验概率计算。" },
    prerequisites: ["integrals-and-accumulation"],
    links: {
      official:
        "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/",
    },
    topics: [
      "probability-axioms",
      "combinatorial-probability",
      "conditional-probability",
      "bayes-theorem",
      "random-variables-distributions",
      "discrete-distributions",
      "continuous-distributions",
      "joint-distributions",
      "expectation-variance-covariance",
      "law-large-numbers",
      "central-limit-theorem",
      "probability-review",
    ],
    verifiedAt: "2026-07-13",
  },
  {
    id: "stanford-cs229-materials",
    kind: "lecture",
    title: "Stanford CS229 Course Materials",
    authors: ["Andrew Ng"],
    publisher: "Stanford University",
    description: { "zh-CN": "覆盖监督学习、广义线性模型、学习理论、优化与生成学习算法。" },
    significance: { "zh-CN": "用于核对经典机器学习模型的目标函数、推导和适用前提。" },
    prerequisites: ["gradient", "matrices"],
    links: { official: "https://cs229.stanford.edu/materials.html-full" },
    topics: [
      "supervised-learning",
      "linear-regression",
      "logistic-regression",
      "loss-functions",
      "gradient-descent",
      "overfitting-generalization",
      "regularization",
      "data-splits-leakage",
      "metrics-baselines",
      "shift-uncertainty",
      "ml-problems-review",
      "empirical-risk-capacity",
      "linear-learning-review",
      "feature-maps-kernels",
      "support-vector-machines",
      "decision-trees",
      "random-forests",
      "gradient-boosting",
      "kernel-tree-review",
      "clustering",
      "pca-manifolds",
      "directed-undirected",
      "exact-inference",
      "em-variational",
      "unsupervised-pgm-review",
    ],
    verifiedAt: "2026-07-11",
  },
  {
    id: "mit-ocw-statistical-mechanics-i-8-333",
    kind: "lecture",
    title: "Statistical Mechanics I: Statistical Mechanics of Particles",
    authors: ["Mehran Kardar"],
    year: 2013,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖微正则、正则和巨正则系综、相互作用系统、量子统计、Bose 与 Fermi 气体以及临界行为基础。",
    },
    significance: {
      "zh-CN": "用于核对 P06 的系综推导、配分函数、涨落关系、量子占据分布和多粒子例题。",
    },
    prerequisites: ["thermodynamics-review", "probability-review"],
    links: {
      official:
        "https://ocw.mit.edu/courses/8-333-statistical-mechanics-i-statistical-mechanics-of-particles-fall-2013/",
    },
    topics: [
      "microcanonical",
      "canonical",
      "grand-canonical",
      "bose-fermi",
      "critical-phenomena",
      "statistical-physics-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-statistical-mechanics-ii-8-334",
    kind: "lecture",
    title: "Statistical Mechanics II: Statistical Physics of Fields",
    authors: ["Mehran Kardar"],
    year: 2014,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖序参量、Landau–Ginzburg 模型、临界涨落、尺度假设、普适性、重整化群和临界动力学。",
    },
    significance: {
      "zh-CN": "用于核对 P06 临界现象章节的对称性、临界指数、尺度关系和重整化群适用边界。",
    },
    prerequisites: ["canonical", "thermodynamics-review"],
    links: {
      official:
        "https://ocw.mit.edu/courses/8-334-statistical-mechanics-ii-statistical-physics-of-fields-spring-2014/",
    },
    topics: ["critical-phenomena", "statistical-physics-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-quantum-physics-i-8-04",
    kind: "lecture",
    title: "Quantum Physics I",
    authors: ["Allan Adams", "Matthew Evans", "Barton Zwiebach"],
    year: 2013,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖量子理论的实验基础、波函数、Schrödinger 方程、不确定关系、一维势阱与势垒、隧穿、谐振子和三维中心势。",
    },
    significance: {
      "zh-CN":
        "用于核对 P07 的态与概率解释、时间演化、概率流、一维束缚态和散射计算，并明确理想势模型的适用边界。",
    },
    prerequisites: ["waves-optics-review", "hilbert-spaces", "probability-review"],
    links: {
      official: "https://www.ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2013/",
    },
    topics: [
      "states-observables",
      "measurement-uncertainty",
      "schrodinger-equation",
      "one-dimensional-systems",
      "quantum-mechanics-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-quantum-physics-ii-8-05",
    kind: "lecture",
    title: "Quantum Physics II",
    authors: ["Barton Zwiebach"],
    year: 2013,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖量子力学一般形式、动力学、两态系统、角动量、自旋、角动量加法和全同粒子的交换对称性。",
    },
    significance: {
      "zh-CN": "用于核对 P07 的算符表象、投影测量、角动量代数、自旋系统、复合系统与全同粒子例题。",
    },
    prerequisites: ["schrodinger-equation", "states-observables"],
    links: {
      official: "https://ocw.mit.edu/courses/8-05-quantum-physics-ii-fall-2013/",
    },
    topics: [
      "states-observables",
      "measurement-uncertainty",
      "angular-momentum-spin",
      "quantum-mechanics-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-relativity-spacetime-8-033",
    kind: "lecture",
    title: "Introduction to Relativity and Spacetime Physics",
    authors: ["Scott Hughes"],
    year: 2024,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "系统介绍狭义相对论，并从等效原理、度量与引力红移进入广义相对论的核心概念。",
    },
    significance: {
      "zh-CN":
        "用于核对 P08 的 Lorentz 变换、时空间隔、四动量、相对论电磁学、等效原理和弱场观测例题。",
    },
    prerequisites: ["mechanics-review", "electromagnetism-review"],
    links: {
      official:
        "https://ocw.mit.edu/courses/8-033-introduction-to-relativity-and-spacetime-physics-fall-2024/",
    },
    topics: [
      "lorentz-transform",
      "relativistic-dynamics",
      "equivalence-geodesics",
      "relativity-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-general-relativity-8-962",
    kind: "lecture",
    title: "General Relativity",
    authors: ["Scott Hughes"],
    year: 2020,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "覆盖微分几何、Einstein 广义相对论基本原理、实验检验、黑洞、引力波与宇宙学。",
    },
    significance: {
      "zh-CN":
        "用于核对 P08 的张量与曲率约定、测地线、场方程、Schwarzschild 时空和宇宙学解的推导边界。",
    },
    prerequisites: ["lorentz-transform", "metrics-curvature"],
    links: { official: "https://ocw.mit.edu/courses/8-962-general-relativity-spring-2020/" },
    topics: [
      "tensors-curvature",
      "equivalence-geodesics",
      "einstein-field-equations",
      "relativity-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-advanced-fluid-mechanics-2-25",
    kind: "lecture",
    title: "Advanced Fluid Mechanics",
    authors: ["Gareth McKinley"],
    year: 2013,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖连续介质质量、动量与能量方程，Navier–Stokes 方程、相似性、边界层、涡量、势流、湍流和表面张力。",
    },
    significance: {
      "zh-CN":
        "用于核对 P09 的守恒方程符号、应力量纲、无黏与黏性流推导、边界层尺度和流动稳定性例题。",
    },
    prerequisites: ["mechanics-review", "multivariable-calculus-review"],
    links: {
      official: "https://ocw.mit.edu/courses/2-25-advanced-fluid-mechanics-fall-2013/",
    },
    topics: [
      "kinematics-stress",
      "conservation-laws",
      "euler-bernoulli",
      "navier-stokes",
      "boundary-layers-instability",
      "fluid-mechanics-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-physics-solids-i-8-231",
    kind: "lecture",
    title: "Physics of Solids I",
    authors: ["Xiao-Gang Wen"],
    year: 2006,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "介绍固体量子理论，覆盖晶体周期性与对称性、衍射、晶格动力学、声子、自由电子、能带、半导体、费米面和磁性。",
    },
    significance: {
      "zh-CN": "用于核对 P10 的晶格记号、倒易空间、声子色散、电子态密度、Bloch 能带和半导体例题。",
    },
    prerequisites: ["statistical-physics-review", "quantum-mechanics-review"],
    links: { official: "https://ocw.mit.edu/courses/8-231-physics-of-solids-i-fall-2006/" },
    topics: ["crystal-structure", "phonons", "free-electrons", "band-theory"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-theory-solids-ii-8-512",
    kind: "lecture",
    title: "Theory of Solids II",
    authors: ["Patrick Lee"],
    year: 2009,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "覆盖线性响应、无序、超导、局域与巡游磁性、Kondo 问题和 Fermi 液体理论。",
    },
    significance: {
      "zh-CN":
        "用于核对 P10 的 London 与 Ginzburg–Landau 描述、超导准粒子、交换磁性、输运响应和集体相例题。",
    },
    prerequisites: ["band-theory", "critical-phenomena"],
    links: { official: "https://ocw.mit.edu/courses/8-512-theory-of-solids-ii-spring-2009/" },
    topics: ["magnetism-superconductivity", "condensed-matter-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-modern-many-body-8-513",
    kind: "lecture",
    title: "Modern Quantum Many-body Physics for Condensed Matter Systems",
    authors: ["Xiao-Gang Wen"],
    year: 2021,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖准粒子、几何相位、Chern 数、量子 Hall 相、对称性破缺、拓扑超导、拓扑序和长程纠缠。",
    },
    significance: {
      "zh-CN": "用于限定 P10 拓扑相综述中的概念层级，并核对对称性相与拓扑相的区分及体边对应。",
    },
    prerequisites: ["band-theory", "angular-momentum-spin"],
    links: {
      official:
        "https://ocw.mit.edu/courses/8-513-modern-quantum-many-body-physics-for-condensed-matter-systems-fall-2021/",
    },
    topics: ["condensed-matter-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-numerical-fluid-mechanics-2-29",
    kind: "lecture",
    title: "Numerical Fluid Mechanics",
    authors: ["Pierre Lermusiaux"],
    year: 2015,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖误差与条件数、线性系统、偏微分方程差分与有限体积、时间推进、稳定性、网格、有限元和流体求解器。",
    },
    significance: {
      "zh-CN": "用于核对 P11 的离散化误差、场方程网格算法、时间步稳定性、边界条件和数值验证流程。",
    },
    prerequisites: ["numerical-analysis-review", "fluid-mechanics-review"],
    links: {
      official: "https://ocw.mit.edu/courses/2-29-numerical-fluid-mechanics-spring-2015/",
    },
    topics: ["discretization-validation", "particles-fields", "computational-physics-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-atomistic-modeling-3-320",
    kind: "lecture",
    title: "Atomistic Computer Modeling of Materials",
    authors: ["Gerbrand Ceder", "Nicola Marzari"],
    year: 2005,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖原子尺度能量模型、定量误差、热力学系综、Monte Carlo、分子动力学、自由能、涨落、输运和粗粒化。",
    },
    significance: {
      "zh-CN":
        "用于核对 P11 的 Metropolis 采样、分子动力学积分、边界条件、统计量估计和模型精度讨论。",
    },
    prerequisites: ["statistical-physics-review", "newton-laws"],
    links: {
      official:
        "https://ocw.mit.edu/courses/3-320-atomistic-computer-modeling-of-materials-sma-5107-spring-2005/",
    },
    topics: ["monte-carlo", "molecular-dynamics", "computational-physics-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-scientific-programming-12-010",
    kind: "lecture",
    title: "Computational Methods of Scientific Programming",
    authors: ["Thomas Herring", "Chris Hill"],
    year: 2024,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "面向物理科学实践介绍程序设计、算法验证、数值分析、可视化、高性能工作流、版本控制、文档和可复现发布。",
    },
    significance: {
      "zh-CN": "用于核对 P11 的程序验证、并行性能测量、环境记录、结果传播和可复现计算实验要求。",
    },
    prerequisites: ["numerical-analysis-review", "model-assumptions"],
    links: {
      official:
        "https://ocw.mit.edu/courses/12-010-computational-methods-of-scientific-programming-fall-2024/",
    },
    topics: [
      "discretization-validation",
      "parallel-reproducible",
      "computational-physics-review",
      "arrays-vectorization",
      "visualization-experiments",
      "testing-version-control",
      "programming-review",
      "data-quality-cleaning",
      "transformation-provenance",
      "tracking-packaging",
      "data-experiment-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-python-programming-6-0001",
    kind: "lecture",
    title: "Introduction to Computer Science and Programming in Python",
    authors: ["Ana Bell", "Eric Grimson", "John Guttag"],
    year: 2016,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "面向无编程经验学习者介绍计算思维、Python 基本类型、控制流、函数、集合、测试、异常和小型程序设计。",
    },
    significance: {
      "zh-CN": "用于核对 C00 的基础程序语义、函数分解、集合与文件处理、异常、测试和可执行例题。",
    },
    prerequisites: ["algebra-functions-review", "mathematical-language-review"],
    links: {
      official:
        "https://www.ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
    },
    topics: [
      "programs-types-control",
      "collections-files",
      "arrays-vectorization",
      "testing-version-control",
      "programming-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-introduction-algorithms-6-006",
    kind: "lecture",
    title: "Introduction to Algorithms",
    authors: ["Erik Demaine", "Jason Ku", "Justin Solomon"],
    year: 2020,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "介绍计算问题建模、常用数据结构、算法范式、正确性论证以及时间和空间性能分析。",
    },
    significance: {
      "zh-CN": "用于核对 C01 的序列与树、散列和图、分治与排序、动态规划、图算法及复杂度分析。",
    },
    prerequisites: ["programming-review", "discrete-review"],
    links: {
      official: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
    },
    topics: [
      "sequences-trees",
      "hash-graphs",
      "divide-greedy",
      "dynamic-graph-algorithms",
      "complexity-computability",
      "algorithms-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "nist-sematech-statistical-methods-handbook",
    kind: "book",
    title: "NIST/SEMATECH e-Handbook of Statistical Methods",
    authors: ["National Institute of Standards and Technology", "SEMATECH"],
    publisher: "National Institute of Standards and Technology",
    description: {
      "zh-CN":
        "提供数据探索、测量过程、实验设计、过程建模、统计检验、置信区间和多过程比较的可操作参考。",
    },
    significance: {
      "zh-CN":
        "用于核对 C02 的随机化与阻断、实验设计选择、功效与误差、指标比较、假设检验和多重比较边界。",
    },
    prerequisites: ["statistics-review"],
    links: { official: "https://www.itl.nist.gov/div898/handbook/" },
    topics: [
      "data-quality-cleaning",
      "controls-randomization",
      "metrics-comparisons",
      "data-experiment-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-relativistic-qft-i-8-323",
    kind: "lecture",
    title: "Relativistic Quantum Field Theory I",
    authors: ["Hong Liu"],
    year: 2023,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "从局域性、经典场与 Noether 定理进入自由标量场、Dirac 场、正则量子化、传播子、路径积分、Feynman 图和量子电动力学。",
    },
    significance: {
      "zh-CN":
        "用于核对 P12 的场作用量、相对论场方程、自由场量子化、相互作用展开、散射规则和规范不变性。",
    },
    prerequisites: ["quantum-mechanics-review", "relativity-review"],
    links: {
      official:
        "https://www.ocw.mit.edu/courses/8-323-relativistic-quantum-field-theory-i-spring-2023/",
    },
    topics: [
      "classical-fields",
      "klein-gordon-dirac",
      "field-quantization",
      "interactions-diagrams",
      "gauge-standard-model",
      "particle-field-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-nuclear-particle-physics-8-701",
    kind: "lecture",
    title: "Introduction to Nuclear and Particle Physics",
    authors: ["Markus Klute"],
    year: 2020,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "介绍核与粒子物理的实验基础、基本粒子与相互作用、对称性、Feynman 计算、QED、QCD、弱作用、Higgs 和中微子。",
    },
    significance: {
      "zh-CN":
        "用于核对 P12 标准模型概述、散射可观测量、量子数与守恒律，并保持理论陈述与实验建立范围一致。",
    },
    prerequisites: ["quantum-mechanics-review", "relativistic-dynamics"],
    links: {
      official:
        "https://ocw.mit.edu/courses/8-701-introduction-to-nuclear-and-particle-physics-fall-2020/",
    },
    topics: ["interactions-diagrams", "gauge-standard-model", "particle-field-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-thermodynamics-kinetics-5-60",
    kind: "lecture",
    title: "Thermodynamics & Kinetics",
    authors: ["Keith A. Nelson", "Moungi Bawendi"],
    year: 2008,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "覆盖热平衡与状态方程、热与功、第一定律、第二定律、熵、自由能、化学势和相平衡。",
    },
    significance: {
      "zh-CN": "用于核对 P05 的符号约定、循环效率、熵平衡、热力学势、Maxwell 关系和相平衡计算。",
    },
    prerequisites: ["single-variable-calculus-review", "measurement-modeling-review"],
    links: {
      official: "https://ocw.mit.edu/courses/5-60-thermodynamics-kinetics-spring-2008/",
    },
    topics: [
      "equilibrium-state",
      "first-law",
      "second-law",
      "entropy-production",
      "free-energies",
      "thermodynamics-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-electricity-magnetism-8-02",
    kind: "lecture",
    title: "Physics II: Electricity and Magnetism",
    year: 2007,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖 Coulomb 与 Gauss 定律、电势、导体、电路、磁场、Faraday 感应、Maxwell 方程、电磁波和能流。",
    },
    significance: {
      "zh-CN":
        "用于核对 P04 的场与势定义、积分定律方向、边界条件、电路暂态、Maxwell 方程和波动例题。",
    },
    prerequisites: ["multivariable-calculus-review", "waves-optics-review"],
    links: {
      official:
        "https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/",
    },
    topics: [
      "coulomb-gauss",
      "potential-boundaries",
      "steady-magnetic",
      "induction-circuits",
      "maxwell-waves",
      "electromagnetism-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-classical-mechanics-iii-8-09",
    kind: "lecture",
    title: "Classical Mechanics III",
    authors: ["Iain Stewart"],
    year: 2014,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖 Lagrange 与 Hamilton 力学、约束、对称守恒、正则变换、Hamilton–Jacobi、连续系统和非线性混沌。",
    },
    significance: {
      "zh-CN":
        "用于核对 P02 的变分条件、约束处理、Hamilton 形式、Poisson 括号、正则变换和混沌例题。",
    },
    prerequisites: ["mechanics-review", "dynamical-systems-review"],
    links: {
      official: "https://ocw.mit.edu/courses/8-09-classical-mechanics-iii-fall-2014/",
    },
    topics: [
      "variational-principle",
      "constraints-symmetry",
      "hamilton-equations",
      "canonical-transformations",
      "phase-space-chaos",
      "analytical-mechanics-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-classical-mechanics-8-01sc",
    kind: "lecture",
    title: "Classical Mechanics",
    authors: [
      "Deepto Chakrabarty",
      "Peter Dourmashkin",
      "Michelle Tomasik",
      "Anna Frebel",
      "Vladan Vuletic",
    ],
    year: 2016,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "覆盖运动学、Newton 定律、约束、功与能、动量与碰撞、刚体转动、力矩和角动量。",
    },
    significance: {
      "zh-CN": "用于核对 P01 的受力模型、守恒定律、参考系约定、转动公式、完整例题和练习。",
    },
    prerequisites: ["quantities-dimensions", "derivatives-and-differentials"],
    links: {
      official: "https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/",
    },
    topics: [
      "kinematics",
      "newton-laws",
      "work-energy",
      "momentum-collisions",
      "rigid-rotation",
      "mechanics-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "openstax-university-physics-v1-measurement",
    kind: "book",
    title: "University Physics Volume 1",
    authors: ["Samuel J. Ling", "Jeff Sanny", "William Moebs"],
    year: 2016,
    publisher: "OpenStax, Rice University",
    description: {
      "zh-CN":
        "第一章覆盖物理尺度、SI 单位、单位换算、量纲分析、Fermi 估算、准确度、精密度、不确定度和有效数字。",
    },
    significance: {
      "zh-CN": "用于核对 P00 的基础术语、量纲规则、估算步骤、测量报告和入门不确定度计算。",
    },
    prerequisites: ["algebra-functions-review"],
    links: {
      official: "https://openstax.org/books/university-physics-volume-1/pages/1-introduction",
    },
    topics: [
      "quantities-dimensions",
      "scaling-estimation",
      "measurement-errors",
      "uncertainty-propagation",
      "model-assumptions",
      "measurement-modeling-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "nist-measurement-uncertainty-observation-equations",
    kind: "paper",
    title: "Assessment of Measurement Uncertainty via Observation Equations",
    authors: ["Antonio M. Possolo", "Blaza Toman"],
    year: 2007,
    publisher: "Metrologia / National Institute of Standards and Technology",
    description: {
      "zh-CN":
        "从测量方程与观测方程出发讨论测量不确定度的计算传播和统计建模，并展示校准及多实验室案例。",
    },
    significance: {
      "zh-CN": "用于核对 P00 中测量方程、相关输入、统计模型和不确定度报告的严格边界。",
    },
    prerequisites: ["measurement-errors", "functions-and-graphs"],
    links: {
      official:
        "https://www.nist.gov/publications/assessment-measurement-uncertainty-observation-equations",
    },
    topics: ["uncertainty-propagation", "measurement-modeling-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-functional-analysis-18-102",
    kind: "lecture",
    title: "Introduction to Functional Analysis",
    authors: ["Casey Rodriguez"],
    year: 2021,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖赋范与 Banach 空间、Hahn–Banach、Baire 范畴方法、Hilbert 空间、紧与自伴算子以及谱定理。",
    },
    significance: {
      "zh-CN": "用于核对 M16 的完备性假设、基本定理、投影与对偶、紧算子谱性质和紧自伴谱定理。",
    },
    prerequisites: ["eigenvalues-eigenvectors", "real-analysis-review"],
    links: {
      official:
        "https://ocw.mit.edu/courses/18-102-introduction-to-functional-analysis-spring-2021/",
    },
    topics: [
      "banach-spaces",
      "fundamental-theorems",
      "hilbert-spaces",
      "compact-self-adjoint",
      "spectral-theorem",
      "functional-analysis-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-introduction-topology-18-901",
    kind: "lecture",
    title: "Introduction to Topology",
    authors: ["James Munkres"],
    year: 2004,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "覆盖拓扑空间与连续函数、连通性、紧致性、分离公理以及度量化和嵌入等主题。",
    },
    significance: {
      "zh-CN": "用于核对 M15 点集拓扑部分的定义、保持性质、分离条件、反例与练习。",
    },
    prerequisites: ["proof-strategies", "real-completeness"],
    links: {
      official: "https://ocw.mit.edu/courses/18-901-introduction-to-topology-fall-2004/",
    },
    topics: ["topological-spaces", "compact-connected", "topology-geometry-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-analysis-ii-18-101",
    kind: "lecture",
    title: "Analysis II",
    authors: ["Victor Guillemin"],
    year: 2005,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "从多变量分析进入流形、切空间、定向、微分形式、流形积分与 Stokes 定理。",
    },
    significance: {
      "zh-CN": "用于核对 M15 流形、切空间、微分形式和广义 Stokes 定理的定义、方向约定和例题。",
    },
    prerequisites: ["multivariable-calculus-review", "real-completeness"],
    links: {
      official: "https://ocw.mit.edu/courses/18-101-analysis-ii-fall-2005/",
    },
    topics: ["smooth-manifolds", "differential-forms", "topology-geometry-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-differential-geometry-18-950",
    kind: "lecture",
    title: "Differential Geometry",
    authors: ["Paul Seidel"],
    year: 2008,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "严格介绍微分几何，并围绕度量、测地线和曲率研究曲线与曲面的局部及整体性质。",
    },
    significance: {
      "zh-CN": "用于核对 M15 Riemann 度量、测地线、曲率计算与几何解释的假设和符号。",
    },
    prerequisites: ["smooth-manifolds", "multivariable-calculus-review"],
    links: {
      official: "https://ocw.mit.edu/courses/18-950-differential-geometry-fall-2008/",
    },
    topics: ["metrics-curvature", "topology-geometry-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-algebra-i-18-701",
    kind: "lecture",
    title: "Algebra I",
    authors: ["Michael Artin"],
    year: 2010,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "介绍群、子群、陪集、同态、商群、群作用与线性群，并以对称性连接抽象结构和具体计算。",
    },
    significance: {
      "zh-CN": "用于核对 M14 群论部分的定义、同构定理、轨道稳定子关系、例题和练习条件。",
    },
    prerequisites: ["proof-strategies", "eigenvalues-eigenvectors"],
    links: {
      official: "https://ocw.mit.edu/courses/18-701-algebra-i-fall-2010/",
    },
    topics: ["groups-subgroups", "homomorphisms-actions", "abstract-algebra-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-algebra-ii-18-702",
    kind: "lecture",
    title: "Algebra II",
    authors: ["Michael Artin"],
    year: 2011,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "覆盖环、理想、域、多项式环、模、域扩张、Galois 理论及相关结构定理。",
    },
    significance: {
      "zh-CN": "用于核对 M14 环、域、模和 Galois 思想部分的定义、假设、结构定理与计算。",
    },
    prerequisites: ["groups-subgroups", "homomorphisms-actions"],
    links: {
      official: "https://ocw.mit.edu/courses/18-702-algebra-ii-spring-2011/",
    },
    topics: ["rings-ideals", "fields-polynomials", "modules-structure", "abstract-algebra-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-complex-variables-18-04",
    kind: "lecture",
    title: "Complex Variables with Applications",
    authors: ["Jeremy Orloff"],
    year: 2018,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖复代数、解析函数、Cauchy 定理与积分公式、Taylor/Laurent 级数、留数、保角映射和解析延拓。",
    },
    significance: {
      "zh-CN": "用于核对 M13 的定义、积分方向、奇点分类、留数计算、映射条件和例题。",
    },
    prerequisites: ["multivariable-calculus-review", "real-analysis-review"],
    links: {
      official:
        "https://ocw.mit.edu/courses/18-04-complex-variables-with-applications-spring-2018/",
    },
    topics: [
      "complex-differentiation",
      "power-series",
      "cauchy-theorems",
      "residue-calculus",
      "conformal-continuation",
      "complex-analysis-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-real-analysis-18-100a",
    kind: "lecture",
    title: "Real Analysis",
    authors: ["Casey Rodriguez"],
    year: 2020,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "从实数完备性、数列与级数进入连续、微分、Riemann 积分以及函数列的逐点和一致收敛。",
    },
    significance: {
      "zh-CN": "用于核对实数完备性、Cauchy 判据、紧致性、函数列极限交换和反例构造。",
    },
    prerequisites: ["proof-strategies", "single-variable-calculus-review"],
    links: {
      official: "https://ocw.mit.edu/courses/18-100a-real-analysis-fall-2020/",
    },
    topics: ["real-completeness", "function-sequences", "real-analysis-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-measure-integration-18-125",
    kind: "lecture",
    title: "Measure and Integration",
    authors: ["Jeff Viaclovsky"],
    year: 2003,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "介绍抽象测度、Lebesgue 积分、收敛定理、Lebesgue 测度、Lp 空间、乘积测度与 Fubini 定理。",
    },
    significance: {
      "zh-CN": "用于核对可测性、积分定义、极限换序条件、Lp 范数与乘积测度结论。",
    },
    prerequisites: ["real-completeness", "function-sequences"],
    links: {
      official: "https://ocw.mit.edu/courses/18-125-measure-and-integration-fall-2003/",
    },
    topics: [
      "measure-measurable",
      "lebesgue-integration",
      "lp-product-measures",
      "real-analysis-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-nonlinear-optimization-2025",
    kind: "lecture",
    title: "Nonlinear Optimization",
    authors: ["Gabriele Farina"],
    year: 2025,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "覆盖一阶最优性、法锥、凸函数、分离、KKT、Lagrange 对偶以及一阶优化算法。",
    },
    significance: {
      "zh-CN": "用于核对优化模型、凸性、次梯度、约束资格、KKT 条件和对偶结论的适用前提。",
    },
    prerequisites: ["gradient", "linear-systems"],
    links: {
      official:
        "https://ocw.mit.edu/courses/6-7220j-nonlinear-optimization-spring-2025/pages/lecture-notes/",
    },
    topics: [
      "optimization-models",
      "convexity-subgradients",
      "gradient-descent",
      "constraints-duality",
      "optimization-information-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "stanford-ee276-information-theory",
    kind: "lecture",
    title: "EE 276: Information Theory",
    authors: ["Tsachy Weissman"],
    year: 2026,
    publisher: "Stanford University",
    description: {
      "zh-CN": "系统介绍熵、相对熵、互信息，以及数据表示、压缩、通信与推断中的信息度量。",
    },
    significance: {
      "zh-CN": "用于核对离散熵、条件熵、KL 散度和互信息的定义、恒等式、单位与零值条件。",
    },
    prerequisites: ["conditional-probability", "expectation-variance-covariance"],
    links: { official: "https://web.stanford.edu/class/ee276/" },
    topics: ["entropy-divergence", "optimization-information-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-introduction-numerical-analysis",
    kind: "lecture",
    title: "Introduction to Numerical Analysis",
    authors: ["Laurent Demanet"],
    year: 2012,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "本科数值分析课程，覆盖求根、插值与逼近、数值积分、微分方程以及线性代数中的直接和迭代方法。",
    },
    significance: {
      "zh-CN": "用于核对 M10 各类算法的误差阶、稳定性条件、停止准则和可复算例题。",
    },
    prerequisites: ["linear-systems", "derivatives-and-differentials"],
    links: {
      official:
        "https://ocw.mit.edu/courses/18-330-introduction-to-numerical-analysis-spring-2012/",
    },
    topics: [
      "floating-point-errors",
      "linear-system-solvers",
      "interpolation-approximation",
      "quadrature-differentiation",
      "ode-pde-numerics",
      "numerical-analysis-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-topics-fourier-analysis-2024",
    kind: "lecture",
    title: "Topics in Fourier Analysis",
    authors: ["Daniel Stroock"],
    year: 2024,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN": "从 Fourier 级数与 Gibbs 现象进入 L1/L2 Fourier 变换、Hermite 函数与温和分布。",
    },
    significance: {
      "zh-CN": "用于核对正交展开、Fourier 变换、反演条件和分布理论的对象边界。",
    },
    prerequisites: ["fourier-series", "improper-integrals"],
    links: {
      official: "https://ocw.mit.edu/courses/res-18-015-topics-in-fourier-analysis-spring-2024/",
    },
    topics: [
      "orthogonal-expansions",
      "transform-convolution",
      "distributions-sampling",
      "fourier-pde-review",
    ],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-linear-pde-18-303",
    kind: "lecture",
    title: "Linear Partial Differential Equations",
    authors: ["Matthew Hancock"],
    year: 2006,
    publisher: "MIT OpenCourseWare",
    description: {
      "zh-CN":
        "覆盖扩散、Laplace/Poisson 与波动方程，以及分离变量、Fourier 方法、本征值和 Green 函数。",
    },
    significance: {
      "zh-CN": "用于核对经典线性偏微分方程的初边值条件、分离变量解和物理解释。",
    },
    prerequisites: ["fourier-series", "partial-differential-equations"],
    links: {
      official:
        "https://ocw.mit.edu/courses/18-303-linear-partial-differential-equations-fall-2006/",
    },
    topics: ["heat-wave-laplace", "fourier-pde-review"],
    verifiedAt: "2026-07-14",
  },
  {
    id: "mit-ocw-differential-equations",
    kind: "lecture",
    title: "MIT 18.03SC Differential Equations",
    authors: ["Arthur Mattuck", "Haynes Miller"],
    year: 2011,
    publisher: "MIT OpenCourseWare",
    description: { "zh-CN": "覆盖常微分方程、线性系统、傅里叶级数与拉普拉斯变换。" },
    significance: { "zh-CN": "为傅里叶方法、模态分解及其微分方程应用提供连续课程背景。" },
    prerequisites: ["integrals-and-accumulation"],
    links: {
      official: "https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/",
    },
    topics: [
      "existence-uniqueness",
      "first-order-methods",
      "higher-order-linear",
      "phase-plane-linear",
      "stability-bifurcation",
      "dynamical-systems-review",
      "fourier-series",
      "wave-equation",
    ],
    verifiedAt: "2026-07-11",
  },
  {
    id: "mit-ocw-vibrations-waves",
    kind: "lecture",
    title: "MIT 8.03SC Physics III: Vibrations and Waves",
    authors: ["Yen-Jie Lee"],
    year: 2016,
    publisher: "MIT OpenCourseWare",
    description: { "zh-CN": "从振子、耦合模态进入机械波、电磁波与波动方程的本科物理课程。" },
    significance: { "zh-CN": "连接波动方程的数学解、边界条件、驻波和物理观测。" },
    prerequisites: ["derivatives-and-differentials", "vectors"],
    links: {
      official: "https://ocw.mit.edu/courses/8-03sc-physics-iii-vibrations-and-waves-fall-2016/",
    },
    topics: [
      "harmonic-oscillator",
      "coupled-normal-modes",
      "wave-parameters-superposition",
      "wave-equation",
      "interference-diffraction",
      "waves-optics-review",
      "fourier-series",
      "sturm-liouville",
    ],
    verifiedAt: "2026-07-14",
  },
];

export const resources: readonly ResourceRecord[] = authoredResources.map((resource) => {
  const metadataFields: ResourceMetadataFields = {
    authors:
      resource.authors && resource.authors.length > 0
        ? "complete"
        : resource.kind === "software" || resource.kind === "simulation"
          ? "not-applicable"
          : "unavailable",
    year:
      resource.year !== undefined
        ? "complete"
        : resource.kind === "software" ||
            resource.kind === "simulation" ||
            resource.kind === "encyclopedia-entry"
          ? "not-applicable"
          : "unavailable",
    publication:
      resource.publisher || resource.venue
        ? "complete"
        : resource.kind === "dataset" ||
            resource.kind === "software" ||
            resource.kind === "simulation"
          ? "not-applicable"
          : "unavailable",
  };
  const fieldLabels = {
    authors: "作者",
    year: "年份",
    publication: "出版者或载体",
  } as const;
  const unavailableFields = Object.entries(metadataFields)
    .filter(([, status]) => status === "unavailable")
    .map(([field]) => fieldLabels[field as keyof ResourceMetadataFields]);
  const notApplicableFields = Object.entries(metadataFields)
    .filter(([, status]) => status === "not-applicable")
    .map(([field]) => fieldLabels[field as keyof ResourceMetadataFields]);
  const metadataStatus: ResourceMetadataFieldStatus = unavailableFields.length
    ? "unavailable"
    : notApplicableFields.length
      ? "not-applicable"
      : "complete";
  return {
    ...resource,
    metadataStatus,
    metadataFields,
    ...(unavailableFields.length > 0 || notApplicableFields.length > 0
      ? {
          metadataNote: {
            "zh-CN":
              [
                ...(unavailableFields.length > 0
                  ? [
                      `${unavailableFields.join("、")}未在已核验来源中明确提供，登记为“暂无可核实信息”`,
                    ]
                  : []),
                ...(notApplicableFields.length > 0
                  ? [`${notApplicableFields.join("、")}对该持续更新或非出版型资源不适用`]
                  : []),
              ].join("；") + "；未作推测性补写。",
          },
        }
      : {}),
  };
});

const authoredSymbols: readonly LegacySymbolDefinition[] = [
  {
    id: "vector-x",
    latex: "\\mathbf{x}",
    plainText: "x",
    accessibleLabel: { "zh-CN": "输入向量 x", en: "input vector x" },
    meaning: { "zh-CN": "输入向量", en: "input vector" },
    namespace: "math.linear-algebra",
  },
  {
    id: "gradient-nabla",
    latex: "\\nabla f",
    plainText: "grad f",
    accessibleLabel: { "zh-CN": "函数 f 的梯度", en: "gradient of f" },
    meaning: { "zh-CN": "函数 f 的梯度", en: "gradient of f" },
    namespace: "math.calculus",
  },
  {
    id: "scalar-x",
    latex: "x",
    plainText: "x",
    accessibleLabel: { "zh-CN": "标量 x", en: "scalar x" },
    meaning: { "zh-CN": "自变量或标量输入", en: "scalar input" },
    namespace: "math.calculus",
  },
  {
    id: "increment-h",
    latex: "h",
    plainText: "h",
    accessibleLabel: { "zh-CN": "输入增量 h", en: "input increment h" },
    meaning: { "zh-CN": "趋近于零的输入增量", en: "input increment" },
    namespace: "math.calculus",
  },
  {
    id: "unit-direction-u",
    latex: "\\mathbf{u}",
    plainText: "u",
    accessibleLabel: { "zh-CN": "单位方向向量 u", en: "unit direction vector u" },
    meaning: { "zh-CN": "单位方向向量", en: "unit direction vector" },
    namespace: "math.calculus",
    assumptions: ["欧氏范数等于 1"],
  },
  {
    id: "matrix-a",
    latex: "A",
    plainText: "A",
    accessibleLabel: { "zh-CN": "矩阵 A", en: "matrix A" },
    meaning: { "zh-CN": "线性变换的矩阵表示", en: "matrix representation" },
    namespace: "math.linear-algebra",
  },
  {
    id: "vector-y",
    latex: "\\mathbf{y}",
    plainText: "y",
    accessibleLabel: { "zh-CN": "输出向量 y", en: "output vector y" },
    meaning: { "zh-CN": "输出向量", en: "output vector" },
    namespace: "math.linear-algebra",
  },
  {
    id: "eigenvalue-lambda",
    latex: "\\lambda",
    plainText: "lambda",
    accessibleLabel: { "zh-CN": "特征值 lambda", en: "eigenvalue lambda" },
    meaning: { "zh-CN": "矩阵的特征值", en: "eigenvalue" },
    namespace: "math.linear-algebra",
  },
  {
    id: "eigenvector-v",
    latex: "\\mathbf{v}",
    plainText: "v",
    accessibleLabel: { "zh-CN": "特征向量 v", en: "eigenvector v" },
    meaning: { "zh-CN": "与特征值对应的非零特征向量", en: "eigenvector" },
    namespace: "math.linear-algebra",
    assumptions: ["向量非零"],
  },
  {
    id: "random-variable-x",
    latex: "X",
    plainText: "X",
    accessibleLabel: { "zh-CN": "随机变量 X", en: "random variable X" },
    meaning: { "zh-CN": "随机变量", en: "random variable" },
    namespace: "math.probability",
  },
  {
    id: "random-variable-y",
    latex: "Y",
    plainText: "Y",
    accessibleLabel: { "zh-CN": "随机变量 Y", en: "random variable Y" },
    meaning: { "zh-CN": "与 X 联合研究的随机变量", en: "joint random variable" },
    namespace: "math.probability",
  },
  {
    id: "model-parameters-theta",
    latex: "\\boldsymbol{\\theta}",
    plainText: "theta",
    accessibleLabel: { "zh-CN": "模型参数向量 theta", en: "model parameter vector theta" },
    meaning: { "zh-CN": "模型参数向量", en: "model parameter vector" },
    namespace: "ml.optimization",
  },
  {
    id: "learning-rate-eta",
    latex: "\\eta",
    plainText: "eta",
    accessibleLabel: { "zh-CN": "学习率 eta", en: "learning rate eta" },
    meaning: { "zh-CN": "梯度下降学习率", en: "learning rate" },
    namespace: "ml.optimization",
    assumptions: ["通常取正值"],
  },
  {
    id: "loss-function-l",
    latex: "L",
    plainText: "L",
    accessibleLabel: { "zh-CN": "损失函数 L", en: "loss function L" },
    meaning: { "zh-CN": "待最小化的损失函数", en: "loss function" },
    namespace: "ml.optimization",
  },
  {
    id: "query-matrix-q",
    latex: "Q",
    plainText: "Q",
    accessibleLabel: { "zh-CN": "查询矩阵 Q", en: "query matrix Q" },
    meaning: { "zh-CN": "注意力查询矩阵", en: "query matrix" },
    namespace: "ml.neural-networks",
  },
  {
    id: "key-matrix-k",
    latex: "K",
    plainText: "K",
    accessibleLabel: { "zh-CN": "键矩阵 K", en: "key matrix K" },
    meaning: { "zh-CN": "注意力键矩阵", en: "key matrix" },
    namespace: "ml.neural-networks",
  },
  {
    id: "value-matrix-v",
    latex: "V",
    plainText: "V",
    accessibleLabel: { "zh-CN": "值矩阵 V", en: "value matrix V" },
    meaning: { "zh-CN": "注意力值矩阵", en: "value matrix" },
    namespace: "ml.neural-networks",
  },
  {
    id: "wave-displacement-u",
    latex: "u(x,t)",
    plainText: "u(x,t)",
    accessibleLabel: { "zh-CN": "位置 x、时刻 t 的波位移 u", en: "wave displacement u at x and t" },
    meaning: { "zh-CN": "位置 x、时刻 t 的波位移", en: "wave displacement" },
    namespace: "physics.waves",
  },
  {
    id: "wave-speed",
    latex: "c",
    plainText: "c",
    accessibleLabel: { "zh-CN": "波速 c，单位米每秒", en: "wave speed c in metres per second" },
    meaning: { "zh-CN": "波速", en: "wave speed" },
    namespace: "physics.waves",
    unit: "metre-per-second",
  },
];

const authoredEquations: readonly LegacyEquationRecord[] = [
  {
    id: "linear-transformation",
    equationKind: "definition",
    name: { "zh-CN": "线性变换", en: "Linear transformation" },
    latex: "\\mathbf{y}=A\\mathbf{x}",
    plainText: "y = A x",
    accessibleLabel: {
      "zh-CN": "输出向量 y 等于矩阵 A 乘输入向量 x",
      en: "output vector y equals matrix A times input vector x",
    },
    variables: [
      { symbolId: "vector-y", role: { "zh-CN": "输出向量" } },
      { symbolId: "matrix-a", role: { "zh-CN": "变换矩阵" } },
      { symbolId: "vector-x", role: { "zh-CN": "输入向量" } },
    ],
    assumptions: [{ "zh-CN": "A 为有限维线性映射的矩阵表示。" }],
    domain: "mathematics",
    subjects: ["linear-algebra"],
    relatedTopics: ["linear-transformation"],
  },
  {
    id: "derivative-definition",
    equationKind: "definition",
    name: { "zh-CN": "导数的差商定义", en: "Derivative definition" },
    latex: "f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}",
    plainText: "f'(x) = limit as h -> 0 of (f(x+h) - f(x)) / h",
    accessibleLabel: {
      "zh-CN": "f 在 x 处的导数等于 h 趋于零时差商的极限",
      en: "the derivative of f at x is the limit of the difference quotient as h approaches zero",
    },
    variables: [
      { symbolId: "scalar-x", role: { "zh-CN": "求导位置" } },
      { symbolId: "increment-h", role: { "zh-CN": "非零输入增量" } },
    ],
    assumptions: [{ "zh-CN": "差商极限存在且有限。" }],
    domain: "mathematics",
    subjects: ["calculus"],
    relatedTopics: ["derivatives-and-differentials", "limits-and-continuity"],
  },
  {
    id: "directional-derivative",
    equationKind: "identity",
    name: { "zh-CN": "方向导数与梯度", en: "Directional derivative" },
    latex: "D_{\\mathbf{u}}f(\\mathbf{x})=\\nabla f(\\mathbf{x})^\\mathsf{T}\\mathbf{u}",
    plainText: "D_u f(x) = grad f(x) dot u",
    accessibleLabel: {
      "zh-CN": "f 沿单位向量 u 的方向导数等于 f 的梯度与 u 的内积",
      en: "the directional derivative of f along unit vector u equals the dot product of the gradient of f and u",
    },
    variables: [
      { symbolId: "gradient-nabla", role: { "zh-CN": "函数在当前位置的梯度" } },
      { symbolId: "unit-direction-u", role: { "zh-CN": "考察方向" } },
    ],
    assumptions: [{ "zh-CN": "函数在该点可微，方向向量使用同一欧氏内积。" }],
    domain: "mathematics",
    subjects: ["calculus"],
    relatedTopics: ["gradient", "derivatives-and-differentials"],
  },
  {
    id: "eigenvalue-equation",
    equationKind: "definition",
    name: { "zh-CN": "特征值方程", en: "Eigenvalue equation" },
    latex: "A\\mathbf{v}=\\lambda\\mathbf{v}",
    plainText: "A v = lambda v",
    accessibleLabel: {
      "zh-CN": "矩阵 A 乘特征向量 v 等于特征值 lambda 乘 v",
      en: "matrix A times eigenvector v equals eigenvalue lambda times v",
    },
    variables: [
      { symbolId: "matrix-a", role: { "zh-CN": "方阵" } },
      { symbolId: "eigenvector-v", role: { "zh-CN": "非零特征向量" } },
      { symbolId: "eigenvalue-lambda", role: { "zh-CN": "对应特征值" } },
    ],
    assumptions: [{ "zh-CN": "A 为方阵，特征向量不为零。" }],
    domain: "mathematics",
    subjects: ["linear-algebra"],
    relatedTopics: ["eigenvalues-eigenvectors", "matrices"],
  },
  {
    id: "expectation-discrete",
    equationKind: "definition",
    name: { "zh-CN": "离散随机变量的期望", en: "Discrete expectation" },
    latex: "\\mathbb{E}[X]=\\sum_x x\\,p_X(x)",
    plainText: "E[X] = sum over x of x p_X(x)",
    accessibleLabel: {
      "zh-CN": "随机变量 X 的期望等于对每个取值 x 的 x 乘概率质量 p 下标 X 的求和",
      en: "the expectation of X is the sum over x of x times the probability mass p sub X of x",
    },
    variables: [{ symbolId: "random-variable-x", role: { "zh-CN": "离散随机变量" } }],
    assumptions: [{ "zh-CN": "绝对矩存在，即各项绝对值的加权和收敛。" }],
    domain: "mathematics",
    subjects: ["probability"],
    relatedTopics: ["random-variables-distributions", "expectation-variance-covariance"],
  },
  {
    id: "variance-definition",
    equationKind: "definition",
    name: { "zh-CN": "方差", en: "Variance" },
    latex: "\\operatorname{Var}(X)=\\mathbb{E}[(X-\\mathbb{E}[X])^2]",
    plainText: "Var(X) = E[(X - E[X])^2]",
    accessibleLabel: {
      "zh-CN": "X 的方差等于 X 减去其期望后的平方的期望",
      en: "the variance of X is the expectation of the squared difference between X and its expectation",
    },
    variables: [{ symbolId: "random-variable-x", role: { "zh-CN": "具有有限二阶矩的随机变量" } }],
    assumptions: [{ "zh-CN": "随机变量的二阶矩有限。" }],
    domain: "mathematics",
    subjects: ["probability"],
    relatedTopics: ["expectation-variance-covariance"],
  },
  {
    id: "gradient-descent-update",
    equationKind: "update",
    name: { "zh-CN": "梯度下降更新", en: "Gradient descent update" },
    latex:
      "\\boldsymbol{\\theta}_{k+1}=\\boldsymbol{\\theta}_k-\\eta\\nabla L(\\boldsymbol{\\theta}_k)",
    plainText: "theta_(k+1) = theta_k - eta grad L(theta_k)",
    accessibleLabel: {
      "zh-CN": "下一步参数 theta 等于当前参数减去学习率 eta 乘当前损失梯度",
      en: "the next parameter vector equals the current parameters minus learning rate eta times the current loss gradient",
    },
    variables: [
      { symbolId: "model-parameters-theta", role: { "zh-CN": "第 k 次迭代的模型参数" } },
      { symbolId: "learning-rate-eta", role: { "zh-CN": "更新步长" } },
      { symbolId: "loss-function-l", role: { "zh-CN": "目标损失" } },
    ],
    assumptions: [{ "zh-CN": "损失函数在当前位置可微，学习率与局部曲率相容。" }],
    domain: "mathematics",
    subjects: ["optimization"],
    relatedTopics: ["gradient-descent", "gradient", "loss-functions"],
  },
  {
    id: "scaled-dot-product-attention",
    equationKind: "definition",
    name: { "zh-CN": "缩放点积注意力", en: "Scaled dot-product attention" },
    latex:
      "\\operatorname{Attention}(Q,K,V)=\\operatorname{softmax}\\!\\left(\\frac{QK^\\mathsf{T}}{\\sqrt{d_k}}\\right)V",
    plainText: "Attention(Q,K,V) = softmax(Q K^T / sqrt(d_k)) V",
    accessibleLabel: {
      "zh-CN": "缩放点积注意力等于 Q 乘 K 转置再除以键维度平方根，经过 softmax 后乘 V",
      en: "scaled dot-product attention is softmax of Q times K transpose divided by the square root of the key dimension, then multiplied by V",
    },
    variables: [
      { symbolId: "query-matrix-q", role: { "zh-CN": "查询矩阵" } },
      { symbolId: "key-matrix-k", role: { "zh-CN": "键矩阵" } },
      { symbolId: "value-matrix-v", role: { "zh-CN": "值矩阵" } },
    ],
    assumptions: [{ "zh-CN": "查询与键具有相同特征维度，掩码在 softmax 前施加。" }],
    domain: "machine-learning",
    subjects: ["neural-networks"],
    relatedTopics: ["attention-mechanism", "transformer"],
  },
  {
    id: "fourier-series-real",
    equationKind: "definition",
    name: { "zh-CN": "实形式傅里叶级数", en: "Real Fourier series" },
    latex: "f(x)\\sim\\frac{a_0}{2}+\\sum_{n=1}^{\\infty}\\bigl(a_n\\cos nx+b_n\\sin nx\\bigr)",
    plainText: "f(x) ~ a_0/2 + sum from n=1 to infinity of (a_n cos(n x) + b_n sin(n x))",
    accessibleLabel: {
      "zh-CN": "f 的实傅里叶级数由常数项二分之一 a 零与所有正整数频率的余弦和正弦项组成",
      en: "the real Fourier series of f consists of one half a zero plus cosine and sine terms over all positive integer frequencies",
    },
    variables: [],
    assumptions: [{ "zh-CN": "函数具有给定周期，并满足所采用收敛定理的条件。" }],
    domain: "mathematics",
    subjects: ["calculus"],
    relatedTopics: ["fourier-series", "wave-equation"],
  },
  {
    id: "wave-equation-1d",
    equationKind: "law",
    name: { "zh-CN": "一维波动方程", en: "One-dimensional wave equation" },
    latex: "\\frac{\\partial^2 u}{\\partial t^2}=c^2\\frac{\\partial^2 u}{\\partial x^2}",
    plainText: "partial^2 u / partial t^2 = c^2 partial^2 u / partial x^2",
    accessibleLabel: {
      "zh-CN": "位移 u 对时间的二阶偏导等于波速 c 的平方乘 u 对位置的二阶偏导",
      en: "the second partial derivative of displacement u with respect to time equals wave speed c squared times the second partial derivative with respect to position",
    },
    variables: [
      { symbolId: "wave-displacement-u", role: { "zh-CN": "弦或介质的横向位移" } },
      { symbolId: "wave-speed", role: { "zh-CN": "介质中的波速" }, unit: "metre-per-second" },
    ],
    assumptions: [{ "zh-CN": "介质均匀、线性，且波速 c 为常数。" }],
    domain: "physics",
    subjects: ["waves"],
    relatedTopics: ["wave-equation"],
  },
];

function resolveMathTopicLocation(
  topicId: string,
  documents: readonly ContentDocument[],
): MathRecordLocation | undefined {
  const concept = conceptById.get(topicId);
  if (!concept) return undefined;
  const chapter = curriculumData.chapters.find(
    (candidate) => candidate.id === concept.canonicalLocation.chapterId,
  );
  if (!chapter?.contentId) return undefined;
  const document = documents.find((candidate) => candidate.frontmatter.id === chapter.contentId);
  if (!document) return undefined;
  return {
    documentId: document.documentId,
    chapterId: chapter.id,
    anchorId: concept.canonicalLocation.anchorId ?? "article-overview",
  };
}

export function buildMathRecordsForDocuments(
  documents: readonly ContentDocument[],
  requireAuthoredEquationReferences = false,
): BuiltMathIndex {
  return buildMathIndex({
    documents,
    curriculum: curriculumData,
    authoredEquations,
    authoredSymbols,
    resolveTopicLocation: (topicId) => resolveMathTopicLocation(topicId, documents),
    resolveTopicTitle: (topicId) => conceptById.get(topicId)?.title["zh-CN"],
    requireAuthoredEquationReferences,
  });
}

export const equations: readonly EquationRecord[] = generatedMathIndex.equations;
export const symbols: readonly SymbolDefinition[] = generatedMathIndex.symbols;
export const mathIndexBooks: readonly BookMathIndex[] = generatedMathIndex.books;
export const chapterMathCoverage: readonly ChapterMathCoverage[] = generatedMathIndex.coverage;

export const curriculumRepository: CurriculumRepository = new InMemoryCurriculumRepository(
  curriculumData,
  conceptCatalog,
);

export const contentRepository: ContentRepository = new GeneratedContentRepository(
  generatedDocuments,
  conceptCatalog,
  curriculumRepository,
);

export const publishedCurriculumData = selectPublishedCurriculum(curriculumData);
const publishedChapterIds = new Set(publishedCurriculumData.chapters.map((chapter) => chapter.id));
const publishedConcepts = conceptCatalog.filter((concept) =>
  publishedChapterIds.has(concept.canonicalLocation.chapterId),
);
const publishedDocuments = generatedDocuments.filter((document) =>
  isContentIndexable(document.frontmatter.publicationStatus),
);
export const publicConceptById: ReadonlyMap<string, ConceptEntity> = new Map(
  publishedConcepts.map((concept) => [concept.id, concept] as const),
);
const publishedVisualizationBindings = selectPublishedVisualizationBindings(
  curriculumVisualizationBindings,
  publishedCurriculumData,
);

/**
 * Public application boundary. Its backing collections contain no hidden or
 * preview records, so public callers cannot opt into editorial data by mistake.
 */
export const publicCurriculumRepository: CurriculumRepository = new InMemoryCurriculumRepository(
  publishedCurriculumData,
  publishedConcepts,
  publishedVisualizationBindings,
);

export const publicContentRepository: ContentRepository = new GeneratedContentRepository(
  publishedDocuments,
  publishedConcepts,
  publicCurriculumRepository,
);

export const readableCurriculumData = selectReadableCurriculum(curriculumData);
const readableChapterIds = new Set(readableCurriculumData.chapters.map((chapter) => chapter.id));
const readerConcepts = conceptCatalog.filter((concept) =>
  readableChapterIds.has(concept.canonicalLocation.chapterId),
);
const readerDocuments = generatedDocuments.filter((document) =>
  isContentReadable(document.frontmatter.publicationStatus),
);
export const readerConceptById: ReadonlyMap<string, ConceptEntity> = new Map(
  readerConcepts.map((concept) => [concept.id, concept] as const),
);
const readableVisualizationBindings = selectReadableVisualizationBindings(
  curriculumVisualizationBindings,
  readableCurriculumData,
);

/**
 * Reader application boundary. Preview and published records remain readable
 * with their truthful source status; hidden editorial records are absent.
 */
export const readerCurriculumRepository: CurriculumRepository = new InMemoryCurriculumRepository(
  readableCurriculumData,
  readerConcepts,
  readableVisualizationBindings,
);

export const readerContentRepository: ContentRepository = new GeneratedContentRepository(
  readerDocuments,
  readerConcepts,
  readerCurriculumRepository,
);

const curriculumContentRedirects: readonly CurriculumRedirect[] = deriveCurriculumRedirects({
  locale: "zh-CN",
  documents: publishedDocuments,
  concepts: publishedConcepts,
  repository: publicCurriculumRepository,
});

function deriveCurriculumPathRedirects(
  repository: CurriculumRepository,
): readonly CurriculumRedirect[] {
  return learningPathAliases.flatMap((alias) => {
    const book = repository.getBook(alias.targetBookId);
    const series = book ? repository.getSeries(book.seriesId) : null;
    if (!book || !series) return [];
    return [
      {
        sourcePath: `/zh-CN/paths/${alias.id}`,
        targetPath: `/zh-CN/books/${series.slug}/${book.slug}`,
        kind: "legacy-path" as const,
      },
    ];
  });
}

const curriculumPathRedirects = deriveCurriculumPathRedirects(publicCurriculumRepository);

export const curriculumRedirects: readonly CurriculumRedirect[] = [
  ...curriculumContentRedirects,
  ...curriculumPathRedirects,
  ...deriveLegacyBookRedirects(publicCurriculumRepository),
].sort((left, right) => left.sourcePath.localeCompare(right.sourcePath, "en"));

const readerCurriculumContentRedirects: readonly CurriculumRedirect[] = deriveCurriculumRedirects({
  locale: "zh-CN",
  documents: readerDocuments,
  concepts: readerConcepts,
  repository: readerCurriculumRepository,
});
const readerCurriculumPathRedirects = deriveCurriculumPathRedirects(readerCurriculumRepository);

/** Reader-safe legacy mappings include preview targets and still exclude hidden records. */
export const readerCurriculumRedirects: readonly CurriculumRedirect[] = [
  ...readerCurriculumContentRedirects,
  ...readerCurriculumPathRedirects,
  ...deriveLegacyBookRedirects(readerCurriculumRepository),
].sort((left, right) => left.sourcePath.localeCompare(right.sourcePath, "en"));
