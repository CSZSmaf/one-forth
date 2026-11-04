import {
  contentKindValues,
  conceptById,
  learningPaths,
  relationTypeValues,
} from "../packages/content/src/index.ts";
import {
  domainRegistry,
  canonicalRelationType,
  relationTypeAliases,
  relationTypeDefinitions,
  registerDomain,
  subjectRegistry,
  type DomainDefinition,
  type LocalizedText,
  type SubjectDefinition,
} from "../packages/registry/src/index.ts";
import { visualizationManifest } from "../packages/visualization/src/index.ts";
import { errorMessage } from "./lib/content-files.ts";

interface RegistryError {
  readonly location: string;
  readonly message: string;
}

function hasText(value: LocalizedText): boolean {
  return (
    Boolean(value["zh-CN"]?.trim()) && Object.values(value).every((text) => Boolean(text?.trim()))
  );
}

function findParentCycle(subject: SubjectDefinition): readonly string[] | null {
  const path: string[] = [subject.id];
  const seen = new Set(path);
  let cursor = subject;
  while (cursor.parentId) {
    path.push(cursor.parentId);
    if (seen.has(cursor.parentId)) return path;
    seen.add(cursor.parentId);
    const parent = subjectRegistry.get(cursor.parentId);
    if (!parent) return null;
    cursor = parent;
  }
  return null;
}

function assertTestDomainCanRegister(): void {
  const domains = [...domainRegistry.list()];
  const testSubject: SubjectDefinition = {
    id: "architecture-test-subject",
    domainId: "architecture-test-domain",
    title: { "zh-CN": "架构测试学科", en: "Architecture test subject" },
    description: { "zh-CN": "证明新学科可经由注册表加入，而不修改核心页面。" },
    supportedContentTypes: ["concept"],
  };
  const testDomain: DomainDefinition = {
    id: "architecture-test-domain",
    title: { "zh-CN": "架构测试领域", en: "Architecture test domain" },
    shortTitle: { "zh-CN": "测试", en: "Test" },
    description: { "zh-CN": "仅存在于校验进程中的扩展性测试。" },
    colorToken: "domain-architecture-test",
    order: 9_999,
    subjects: [testSubject],
  };

  try {
    registerDomain(testDomain);
    if (domainRegistry.get(testDomain.id) !== testDomain) {
      throw new Error("test domain was not retrievable after registration");
    }
    if (subjectRegistry.get(testSubject.id) !== testSubject) {
      throw new Error("test subject was not registered with its domain");
    }
  } finally {
    domainRegistry.clear();
    subjectRegistry.clear();
    domains.forEach(registerDomain);
  }
}

async function main(): Promise<void> {
  const errors: RegistryError[] = [];
  const domains = domainRegistry.list();
  const subjects = subjectRegistry.list();
  const domainIds = new Set(domains.map((domain) => domain.id));
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const learningPathIds = new Set(learningPaths.map((path) => path.id));
  const visualizationById = new Map(
    visualizationManifest.map((entry) => [entry.id, entry] as const),
  );
  const validKinds = new Set<string>(contentKindValues);
  const validRelations = new Set<string>(relationTypeValues);
  const validRendererCapabilities = new Set(["svg", "canvas", "webgl", "hybrid", "worker"]);

  if (domains.length === 0)
    errors.push({ location: "domainRegistry", message: "At least one domain is required" });
  if (domainIds.size !== domains.length)
    errors.push({ location: "domainRegistry", message: "Duplicate domain IDs" });
  if (subjectIds.size !== subjects.length)
    errors.push({ location: "subjectRegistry", message: "Duplicate subject IDs" });

  const relationDefinitionIds = relationTypeDefinitions.map((definition) => definition.id);
  if (new Set(relationDefinitionIds).size !== relationDefinitionIds.length) {
    errors.push({ location: "relationRegistry", message: "Duplicate canonical relation IDs" });
  }
  if (
    relationDefinitionIds.length !== relationTypeValues.length ||
    relationTypeValues.some((id) => !relationDefinitionIds.includes(id))
  ) {
    errors.push({
      location: "relationRegistry",
      message: "Canonical relation definitions and relationTypeValues differ",
    });
  }
  for (const definition of relationTypeDefinitions) {
    const location = `relation:${definition.id}`;
    if (!definition.inverseId.trim())
      errors.push({ location, message: "inverseId must not be empty" });
    if (
      !hasText(definition.label) ||
      !hasText(definition.inverseLabel) ||
      !hasText(definition.description)
    ) {
      errors.push({ location, message: "Labels and description must be localized and non-empty" });
    }
    if (!definition.colorToken.trim())
      errors.push({ location, message: "colorToken must not be empty" });
    if (!["directed", "bidirectional"].includes(definition.direction)) {
      errors.push({ location, message: `Unknown direction: ${definition.direction}` });
    }
    if (!["solid", "dashed", "dotted"].includes(definition.lineStyle)) {
      errors.push({ location, message: `Unknown lineStyle: ${definition.lineStyle}` });
    }
    const inverse = relationTypeDefinitions.find(
      (candidate) => candidate.id === definition.inverseId,
    );
    if (inverse && inverse.inverseId !== definition.id) {
      errors.push({
        location,
        message: `Canonical inverse ${inverse.id} points to ${inverse.inverseId}`,
      });
    }
  }
  for (const [alias, canonical] of Object.entries(relationTypeAliases)) {
    if (validRelations.has(alias)) {
      errors.push({ location: `relation-alias:${alias}`, message: "Alias is already canonical" });
    }
    if (!validRelations.has(canonical) || canonicalRelationType(alias) !== canonical) {
      errors.push({
        location: `relation-alias:${alias}`,
        message: `Alias does not resolve to canonical relation ${canonical}`,
      });
    }
  }

  const orders = new Map<number, string>();
  const namespaces = new Map<string, string>();
  for (const domain of domains) {
    const location = `domain:${domain.id}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(domain.id)) {
      errors.push({ location, message: "ID must use kebab-case" });
    }
    if (!hasText(domain.title) || !hasText(domain.shortTitle) || !hasText(domain.description)) {
      errors.push({
        location,
        message: "Localized title, shortTitle, and description must be non-empty",
      });
    }
    if (!domain.colorToken.trim())
      errors.push({ location, message: "colorToken must not be empty" });
    if (!Number.isFinite(domain.order)) errors.push({ location, message: "order must be finite" });
    const orderOwner = orders.get(domain.order);
    if (orderOwner)
      errors.push({ location, message: `order ${domain.order} is already used by ${orderOwner}` });
    orders.set(domain.order, domain.id);

    for (const namespace of domain.symbolNamespaces ?? []) {
      const owner = namespaces.get(namespace);
      if (owner)
        errors.push({
          location,
          message: `symbol namespace ${namespace} is already owned by ${owner}`,
        });
      namespaces.set(namespace, domain.id);
    }
    for (const capability of domain.visualizationTypes ?? []) {
      if (!validRendererCapabilities.has(capability)) {
        errors.push({ location, message: `Unknown visualization capability: ${capability}` });
      }
    }
    for (const relation of domain.relationTypes ?? []) {
      if (!validRelations.has(relation.id))
        errors.push({ location, message: `Unknown relation type: ${relation.id}` });
      if (!hasText(relation.label))
        errors.push({ location, message: `Relation ${relation.id} has an empty label` });
    }

    const nestedIds = new Set<string>();
    for (const nestedSubject of domain.subjects) {
      if (nestedIds.has(nestedSubject.id)) {
        errors.push({ location, message: `Duplicate nested subject: ${nestedSubject.id}` });
      }
      nestedIds.add(nestedSubject.id);
      if (subjectRegistry.get(nestedSubject.id) !== nestedSubject) {
        errors.push({
          location,
          message: `Subject ${nestedSubject.id} is missing or differs in subjectRegistry`,
        });
      }
    }
  }

  for (const subject of subjects) {
    const location = `subject:${subject.id}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subject.id)) {
      errors.push({ location, message: "ID must use kebab-case" });
    }
    if (!domainIds.has(subject.domainId))
      errors.push({ location, message: `Unknown domain: ${subject.domainId}` });
    if (!hasText(subject.title) || !hasText(subject.description)) {
      errors.push({ location, message: "Localized title and description must be non-empty" });
    }
    if (subject.parentId) {
      const parent = subjectRegistry.get(subject.parentId);
      if (!parent) {
        errors.push({ location, message: `Unknown parent subject: ${subject.parentId}` });
      } else if (parent.domainId !== subject.domainId) {
        errors.push({ location, message: `Parent ${subject.parentId} belongs to another domain` });
      }
      const cycle = findParentCycle(subject);
      if (cycle) errors.push({ location, message: `Parent cycle: ${cycle.join(" -> ")}` });
    }
    if (subject.defaultLearningPath && !learningPathIds.has(subject.defaultLearningPath)) {
      errors.push({
        location,
        message: `Unknown default learning path: ${subject.defaultLearningPath}`,
      });
    }
    for (const kind of subject.supportedContentTypes ?? []) {
      if (!validKinds.has(kind))
        errors.push({ location, message: `Unknown supported content kind: ${kind}` });
    }
    for (const visualizationId of subject.supportedVisualizationTypes ?? []) {
      const visualization = visualizationById.get(visualizationId);
      if (!visualization) {
        errors.push({ location, message: `Unknown supported visualization: ${visualizationId}` });
      } else if (visualization.domain !== subject.domainId) {
        errors.push({
          location,
          message: `Visualization ${visualizationId} belongs to ${visualization.domain}`,
        });
      }
    }
  }

  for (const visualization of visualizationManifest) {
    const location = `visualization:${visualization.id}`;
    const domain = domainRegistry.get(visualization.domain);
    if (!domain) {
      errors.push({
        location,
        message: `Unknown domain: ${visualization.domain}`,
      });
    } else if (!(domain.visualizationTypes ?? []).includes(visualization.renderer)) {
      errors.push({
        location,
        message: `Domain ${domain.id} does not declare renderer capability ${visualization.renderer}`,
      });
    }
    if (!hasText(visualization.title) || !hasText(visualization.description)) {
      errors.push({ location, message: "Title and description must be localized and non-empty" });
    }
    const review = visualization.scientificReview;
    if (!hasText(review.observationGoal) || !hasText(review.mathematicalModel)) {
      errors.push({ location, message: "Scientific observation goal and model must be non-empty" });
    }
    const localizedGroups = [
      ["assumptions", review.assumptions, 2],
      ["procedure", review.procedure, 3],
      ["expectedPhenomena", review.expectedPhenomena, 2],
      ["numericalValidation", review.numericalValidation, 2],
      ["limitations", review.limitations, 2],
    ] as const;
    localizedGroups.forEach(([name, entries, minimum]) => {
      if (entries.length < minimum || entries.some((entry) => !hasText(entry))) {
        errors.push({
          location,
          message: `Scientific ${name} must contain at least ${minimum} localized entries`,
        });
      }
    });
    if (review.relatedConceptIds.length === 0) {
      errors.push({ location, message: "Scientific review needs a related concept" });
    }
    for (const conceptId of review.relatedConceptIds) {
      if (!conceptById.has(conceptId)) {
        errors.push({ location, message: `Unknown related scientific concept: ${conceptId}` });
      }
    }
  }

  try {
    assertTestDomainCanRegister();
  } catch (error) {
    errors.push({ location: "registry-extension-smoke", message: errorMessage(error) });
  }

  errors.sort((left, right) =>
    `${left.location}\0${left.message}`.localeCompare(`${right.location}\0${right.message}`, "en"),
  );
  if (errors.length > 0) {
    errors.forEach((error) => console.error(`ERROR ${error.location}: ${error.message}`));
    throw new Error(`Registry validation failed with ${errors.length} error(s)`);
  }
  console.log(
    `Registry validation passed: ${domains.length} domain(s), ${subjects.length} subject(s), ${relationTypeDefinitions.length} canonical relation(s), ${visualizationManifest.length} visualization(s); synthetic subject registration succeeded.`,
  );
}

main().catch((error: unknown) => {
  console.error(`validate-registry: ${errorMessage(error)}`);
  process.exitCode = 1;
});
