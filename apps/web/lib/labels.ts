import { siteConfig, type SupportedLocale } from "@one-forth/config";
import {
  conceptCatalog,
  learningPaths,
  type EquationKind,
  type ResourceMetadataFieldStatus,
  type SymbolUnitKind,
} from "@one-forth/content";
import { domainRegistry, localize, subjectRegistry, type LocalizedText } from "@one-forth/registry";
import { units } from "@one-forth/physics";
export {
  resolveContentKindLabel,
  resolveDomainLabel,
  resolveInverseRelationLabel,
  resolveRelationDescription,
  resolveRelationLabel,
  resolveSubjectLabel,
} from "./client-labels";

const unknownLabels = {
  concept: { "zh-CN": "未知概念", en: "Unknown concept" },
  path: { "zh-CN": "未知学习路径", en: "Unknown learning path" },
  resourceLink: { "zh-CN": "其他入口", en: "Other link" },
  namespace: { "zh-CN": "未分类命名空间", en: "Unclassified namespace" },
  author: { "zh-CN": "内容维护者", en: "Content maintainer" },
  unit: { "zh-CN": "未声明单位", en: "Unspecified unit" },
} as const satisfies Readonly<Record<string, LocalizedText>>;

const resourceLinkLabels: Readonly<Record<string, LocalizedText>> = {
  official: { "zh-CN": "官方页面", en: "Official page" },
  doi: { "zh-CN": "DOI", en: "DOI" },
  arxiv: { "zh-CN": "arXiv", en: "arXiv" },
  code: { "zh-CN": "代码仓库", en: "Code repository" },
};

const namespaceLabels: Readonly<Record<string, LocalizedText>> = {
  "math.linear-algebra": { "zh-CN": "数学 · 线性代数", en: "Mathematics · Linear algebra" },
  "math.calculus": { "zh-CN": "数学 · 微积分", en: "Mathematics · Calculus" },
  "math.probability": { "zh-CN": "数学 · 概率论", en: "Mathematics · Probability" },
  "ml.neural-networks": {
    "zh-CN": "机器学习 · 神经网络",
    en: "Machine learning · Neural networks",
  },
  "ml.optimization": { "zh-CN": "机器学习 · 最优化", en: "Machine learning · Optimization" },
  "physics.waves": { "zh-CN": "物理学 · 波动", en: "Physics · Waves" },
};

const symbolUnitKindLabels: Readonly<Record<SymbolUnitKind, LocalizedText>> = {
  physical: { "zh-CN": "物理量", en: "Physical quantity" },
  dimensionless: { "zh-CN": "无量纲", en: "Dimensionless" },
  contextual: { "zh-CN": "由上下文确定", en: "Context dependent" },
  "not-applicable": { "zh-CN": "不适用", en: "Not applicable" },
};

const equationKindLabels: Readonly<Record<EquationKind, LocalizedText>> = {
  definition: { "zh-CN": "定义式", en: "Definition" },
  identity: { "zh-CN": "恒等式", en: "Identity" },
  law: { "zh-CN": "定律", en: "Law" },
  constraint: { "zh-CN": "约束", en: "Constraint" },
  update: { "zh-CN": "更新式", en: "Update rule" },
  canonical: { "zh-CN": "典范公式", en: "Canonical equation" },
};

const resourceMetadataFieldStatusLabels: Readonly<
  Record<ResourceMetadataFieldStatus, LocalizedText>
> = {
  complete: { "zh-CN": "已提供", en: "Available" },
  unavailable: { "zh-CN": "暂无可核实信息", en: "No verified information available" },
  "not-applicable": { "zh-CN": "不适用", en: "Not applicable" },
};

const resourceMetadataSummaryLabels: Readonly<Record<ResourceMetadataFieldStatus, LocalizedText>> =
  {
    complete: { "zh-CN": "完整", en: "Complete" },
    unavailable: {
      "zh-CN": "存在暂无可核实字段",
      en: "Some fields have no verified information",
    },
    "not-applicable": { "zh-CN": "部分字段不适用", en: "Some fields are not applicable" },
  };

const conceptLabels = new Map(
  conceptCatalog.map((concept) => [concept.id, concept.title] as const),
);
const pathLabels = new Map(learningPaths.map((path) => [path.id, path.title] as const));
const unitDefinitions = new Map(units.map((unit) => [unit.id, unit] as const));

function resolveMappedLabel(
  value: string,
  labels: Readonly<Record<string, LocalizedText>>,
  unknown: LocalizedText,
  locale: SupportedLocale,
): string {
  return localize(labels[value] ?? unknown, locale);
}

export function resolveConceptLabel(id: string, locale: SupportedLocale): string {
  return localize(conceptLabels.get(id) ?? unknownLabels.concept, locale);
}

export function resolvePathLabel(id: string, locale: SupportedLocale): string {
  return localize(pathLabels.get(id) ?? unknownLabels.path, locale);
}

export function resolveResourceLinkLabel(kind: string, locale: SupportedLocale): string {
  return resolveMappedLabel(kind, resourceLinkLabels, unknownLabels.resourceLink, locale);
}

export function resolveResourceMetadataFieldStatusLabel(
  status: ResourceMetadataFieldStatus,
  locale: SupportedLocale,
): string {
  return localize(resourceMetadataFieldStatusLabels[status], locale);
}

export function resolveResourceMetadataSummaryLabel(
  status: ResourceMetadataFieldStatus,
  locale: SupportedLocale,
): string {
  return localize(resourceMetadataSummaryLabels[status], locale);
}

export function resolveSymbolNamespaceLabel(
  namespace: string,
  locale: SupportedLocale,
  context: { readonly domain?: string; readonly subject?: string } = {},
): string {
  const authored = namespaceLabels[namespace];
  if (authored) return localize(authored, locale);
  const domain = context.domain ? domainRegistry.get(context.domain) : undefined;
  const subject = context.subject ? subjectRegistry.get(context.subject) : undefined;
  if (domain && subject) {
    return `${localize(domain.shortTitle, locale)} · ${localize(subject.title, locale)}`;
  }
  if (domain) return localize(domain.title, locale);
  return localize(unknownLabels.namespace, locale);
}

export function resolveSymbolUnitKindLabel(
  unitKind: SymbolUnitKind,
  locale: SupportedLocale,
): string {
  return localize(symbolUnitKindLabels[unitKind], locale);
}

export function resolveEquationKindLabel(
  equationKind: EquationKind,
  locale: SupportedLocale,
): string {
  return localize(equationKindLabels[equationKind], locale);
}

export function resolveUnitLabel(id: string, locale: SupportedLocale): string {
  const unit = unitDefinitions.get(id);
  return unit
    ? `${localize(unit.name, locale)}（${unit.symbol}）`
    : localize(unknownLabels.unit, locale);
}

export function resolveAuthorLabel(id: string, locale: SupportedLocale): string {
  return id === siteConfig.organization.authorId
    ? siteConfig.organization.name
    : localize(unknownLabels.author, locale);
}
