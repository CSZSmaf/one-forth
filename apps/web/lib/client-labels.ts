import type { SupportedLocale } from "@one-forth/config";
import {
  domainRegistry,
  getRelationTypeDefinition,
  localize,
  subjectRegistry,
  type LocalizedText,
} from "@one-forth/registry";

const unknownLabels = {
  domain: { "zh-CN": "未知学科领域", en: "Unknown domain" },
  subject: { "zh-CN": "未知课程主题", en: "Unknown subject" },
  relation: { "zh-CN": "未知关系", en: "Unknown relation" },
  contentKind: { "zh-CN": "其他内容", en: "Other content" },
} as const satisfies Readonly<Record<string, LocalizedText>>;

const contentKindLabels: Readonly<Record<string, LocalizedText>> = {
  concept: { "zh-CN": "概念", en: "Concept" },
  article: { "zh-CN": "正文", en: "Article" },
  chapter: { "zh-CN": "章节", en: "Chapter" },
  theorem: { "zh-CN": "定理", en: "Theorem" },
  method: { "zh-CN": "方法", en: "Method" },
  derivation: { "zh-CN": "推导", en: "Derivation" },
  experiment: { "zh-CN": "实验", en: "Experiment" },
  proof: { "zh-CN": "证明", en: "Proof" },
  "problem-set": { "zh-CN": "问题集", en: "Problem set" },
  reference: { "zh-CN": "参考资料", en: "Reference" },
  "paper-guide": { "zh-CN": "论文导读", en: "Paper guide" },
  biography: { "zh-CN": "人物", en: "Biography" },
  "historical-note": { "zh-CN": "历史札记", en: "Historical note" },
  dataset: { "zh-CN": "数据集", en: "Dataset" },
  "software-tool": { "zh-CN": "软件工具", en: "Software tool" },
  equation: { "zh-CN": "公式", en: "Equation" },
  symbol: { "zh-CN": "符号", en: "Symbol" },
  paper: { "zh-CN": "论文", en: "Paper" },
  book: { "zh-CN": "书籍", en: "Book" },
  "learning-path": { "zh-CN": "学习路径", en: "Learning path" },
  lecture: { "zh-CN": "课程", en: "Course" },
  software: { "zh-CN": "软件", en: "Software" },
  simulation: { "zh-CN": "模拟", en: "Simulation" },
  "historical-source": { "zh-CN": "历史资料", en: "Historical source" },
  "encyclopedia-entry": { "zh-CN": "百科条目", en: "Encyclopedia entry" },
};

function resolveMappedLabel(
  value: string,
  labels: Readonly<Record<string, LocalizedText>>,
  unknown: LocalizedText,
  locale: SupportedLocale,
): string {
  return localize(labels[value] ?? unknown, locale);
}

export function resolveDomainLabel(id: string, locale: SupportedLocale): string {
  return localize(domainRegistry.get(id)?.title ?? unknownLabels.domain, locale);
}

export function resolveSubjectLabel(id: string, locale: SupportedLocale): string {
  return localize(subjectRegistry.get(id)?.title ?? unknownLabels.subject, locale);
}

export function resolveRelationLabel(id: string, locale: SupportedLocale): string {
  return localize(getRelationTypeDefinition(id)?.label ?? unknownLabels.relation, locale);
}

export function resolveInverseRelationLabel(id: string, locale: SupportedLocale): string {
  return localize(getRelationTypeDefinition(id)?.inverseLabel ?? unknownLabels.relation, locale);
}

export function resolveRelationDescription(id: string, locale: SupportedLocale): string {
  return localize(getRelationTypeDefinition(id)?.description ?? unknownLabels.relation, locale);
}

export function resolveContentKindLabel(kind: string, locale: SupportedLocale): string {
  return resolveMappedLabel(kind, contentKindLabels, unknownLabels.contentKind, locale);
}
