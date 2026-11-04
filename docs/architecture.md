# One Forth 架构

架构边界与运行模型。

## 1. 架构目标

One Forth 需要同时支持静态教材式内容、复杂知识关系、可复现实验和未来多学科扩展。架构采用：

```text
领域无关核心 + 学科注册模块 + 内容数据 + 可视化插件
```

关键质量属性：

- 新增学科不修改核心页面。
- 内容、数学模型、渲染和运行时独立演进。
- 普通文章保持静态、快速和可索引。
- 交互实验按需加载且可复现。
- 数据与引用能在构建阶段校验。
- Cloudflare Worker 运行时兼容。

## 2. 当前实现

仓库已经迁移为 pnpm/Turborepo monorepo；Web 应用位于 `apps/web`，共享职责拆分到 12 个领域无关 package。vinext/Sites 兼容层负责把 App Router、RSC 与静态资源构建为 Cloudflare Worker 输出。内容在构建前生成类型化文档与 MDX 注册表，页面请求期间不读取文件系统。

## 3. 系统上下文

```mermaid
flowchart LR
  reader["学习者"] --> web["One Forth Web"]
  author["作者与审阅者"] --> repo["Git 内容仓库"]
  repo --> pipeline["内容编译与校验"]
  pipeline --> web
  web --> local["本地搜索索引"]
  web --> graph["知识图谱数据"]
  web --> runtime["浏览器仿真运行时"]
  web --> cf["Cloudflare Worker 与静态资源"]
  cf --> domain["one-forth.com"]
```

一期没有运行所必需的外部数据库、付费 API 或云端搜索。用户偏好、最近搜索和可分享实验状态只使用 URL 或明确的设备本地存储。

## 4. 目录

```text
apps/
  web/
    app/[locale]/
    components/
    features/
    lib/
    styles/
    public/
packages/
  ui/
  config/
  content/
  search/
  knowledge-graph/
  visualization/
  math-core/
  numerical/
  physics/
  simulation-runtime/
  testing/
content/
  zh-CN/
  en/
  concepts/
  resources/
  equations/
  symbols/
  units/
  constants/
  learning-paths/
scripts/migrations/
tests/
docs/
```

目录只在存在真实实现时建立，避免空 package。每个 package 只暴露公共入口，应用不跨越入口深度导入内部文件。

## 5. 依赖方向

```mermaid
flowchart TD
  app["apps/web"] --> ui["ui"]
  app --> content["content"]
  app --> search["search"]
  app --> graph["knowledge-graph"]
  app --> viz["visualization"]
  content --> config["config"]
  search --> content
  graph --> content
  viz --> runtime["simulation-runtime"]
  viz --> math["math-core"]
  viz --> numerical["numerical"]
  viz --> physics["physics"]
  numerical --> math
  physics --> math
  physics --> numerical
```

禁止反向依赖：数学/数值/物理包不依赖 React、页面或 MDX；content 不依赖具体页面；UI 不依赖单一学科实现。

## 6. 品牌和环境配置

`packages/config` 提供唯一站点配置：

```ts
export const siteConfig = {
  name: "One Forth",
  shortName: "One Forth",
  domain: "one-forth.com",
  url: "https://one-forth.com",
  description: "...",
  brand: {
    wordmark: "One Forth",
    monogram: "1/4",
  },
};
```

实现时使用 Zod 验证环境变量。`NEXT_PUBLIC_SITE_URL` 可在测试/preview 中覆盖 origin，但生产默认值和 canonical 必须是正式 HTTPS 域名。页面只消费 `siteConfig`，不读取散落环境变量。

`1/4` 只是候选 monogram，视觉验证前不作为主 Logo。

## 7. 领域和学科注册

```ts
interface DomainDefinition {
  id: string;
  title: LocalizedText;
  shortTitle: LocalizedText;
  description: LocalizedText;
  colorToken: string;
  order: number;
  subjects: SubjectDefinition[];
  relationTypes?: RelationTypeDefinition[];
  visualizationTypes?: string[];
  symbolNamespaces?: string[];
  unitSystems?: string[];
}

interface SubjectDefinition {
  id: string;
  domainId: string;
  title: LocalizedText;
  description: LocalizedText;
  parentId?: string;
  colorToken?: string;
  defaultLearningPath?: string;
  supportedContentTypes?: string[];
  supportedVisualizationTypes?: string[];
}
```

注册表在构建时完成唯一性和引用校验。页面、导航、搜索 facet 和图谱图例从 registry 读取。架构测试注入一个测试领域，证明无须修改核心页面和查询逻辑。

## 8. 概念、文档与内容类型

Concept 是跨语言知识实体；Document 是特定 locale、深度和内容类型的可发布文档。

```text
concept: linear-transformation
documents:
  zh-CN/linear-transformations
  en/linear-transformations
```

`packages/content/src/concepts.ts` 是独立 Concept Catalog；概念不再从 MDX 反向推导。目录节点从 `schemaVersion: 1` 起版本化，包含本地化标题与摘要、可审阅大纲、domain/subject、难度、先修与后续、带说明的关系、推荐路径、readiness、预计学习时长、文章状态和可选文档映射。`articleStatus: planned` 是合法状态，不要求创建占位 MDX；已有文章通过 `(locale, documentId)` 显式映射到同一 Concept ID。

当前读者目录有 415 个具体概念，并映射到 288 篇中文正文。正文的发布状态和人工审阅状态保持分离：`published` 正文可被搜索引擎索引，`preview` 正文可公开阅读但必须显示“预览稿／待人工审校”，并输出 `noindex, follow`；`hidden` 内容不进入任何读者 facade。

一个核心概念可对应零至多个文档；ID 不阻止未来拆分证明、实验、历史和应用页面。Concept 的生命周期与 Document 的 `draft/reviewed` 审阅状态分别校验，不能用空文章伪装覆盖率。

ContentKind 包括 concept、theorem、method、derivation、experiment、proof、problem-set、reference、paper-guide、biography、historical-note、dataset、software-tool。路由委托给 Content Renderer Registry，不编写大型 `switch`。

## 9. 内容编译管线

```mermaid
flowchart LR
  source["MDX/YAML/JSON"] --> schema["Zod Schema"]
  schema --> refs["跨 registry 与链接校验"]
  refs --> compile["MDX/remark/rehype/KaTeX"]
  compile --> hash["稳定内容哈希"]
  hash --> docs["静态页面数据"]
  hash --> index["搜索索引"]
  hash --> graph["图谱数据"]
  hash --> nav["导航与路径"]
```

管线必须检测重复 ID、缺失字段、无效领域/学科、无效 Concept、断裂先修、先修环、文档映射与文章状态不一致、required planned 概念缺少大纲或关系说明、学习路径乱序/路径外先修、无效可视化/资源、日期、难度、空摘要、断链和不支持 Schema 版本。

MDX 组件使用白名单。内容中不嵌入大型脚本，受信内容也不绕过类型与 Schema。

## 10. 数据访问

页面通过抽象仓库访问内容：

```ts
interface ContentRepository {
  getConcept(id: string): Promise<ConceptEntity | null>;
  listConcepts(filter?: ConceptFilter): Promise<ConceptEntity[]>;
  getDocument(id: string, locale: string): Promise<ContentDocument | null>;
  getDocumentForConcept(id: string, locale: string): Promise<ContentDocument | null>;
  listDocuments(filter?: ContentFilter): Promise<ContentDocument[]>;
  getRelations(id: string): Promise<KnowledgeRelation[]>;
  search(query: SearchQuery): Promise<SearchResult[]>;
}
```

一期 adapter 读取构建产物，不在页面请求中直接遍历文件系统。未来可替换为 CMS、数据库、远程 API 或混合数据源，而不改页面接口。

应用只使用两组经过结构过滤的 facade：

- `readerContentRepository`、`readerCurriculumRepository`、`readerConceptById`：供教材目录、正文、站内搜索、知识图谱和旧 URL 跳转使用，包含 `published + preview`，排除 `hidden`。
- `publicContentRepository`、`publicCurriculumRepository`、`publicConceptById`：供 sitemap、正式资源索引和其他搜索引擎可索引边界使用，只包含 `published`。

两组 facade 均在 `packages/content` 内投影并清理反向引用；页面不得导入完整编辑仓库。预览内容扩大的是站内可读范围，不改变正式发布或人工审阅事实。

## 11. 知识关系

Relation 是一等数据，至少支持：prerequisite、depends-on、generalizes、special-case-of、equivalent-to、contrasts-with、derived-from、used-in、motivates、approximates、historically-related、implemented-by、validated-by、applied-to。

每条关系含 from、to、type、可本地化 note、strength 和 bidirectional。构建时校验端点、类型和不允许的环；图谱和文章局部关系视图共用同一数据。

## 12. 符号、方程、单位与常数

- Symbol 以 namespace 隔离同形异义符号。
- Equation 记录变量、假设、领域、学科、相关概念、推导、极限和应用。
- Unit 使用可序列化定义；运行时 conversion adapter 与 YAML/JSON 数据分离。
- PhysicalConstant 保存值、单位、不确定度和来源。
- 物理实验参数必须显示单位并在模型入口验证。

一期建立接口、索引和基础页面，不承诺完整计算机代数或单位换算引擎。

## 13. 搜索架构

构建时生成 locale 独立索引。SearchDocument 有 namespaced ID、kind、title、summary、domain、subject、locale、URL、读者侧 `isPreview` 标记和 keywords。正文、正文内定理与可读学习路径从 reader facade 生成，因此 288 篇上架正文均可站内检索；资源、公式、符号与实验仍只从 published 边界生成。客户端不接收 `publicationStatus`、`editorialStatus` 或其他内部编辑字段。

完整索引由缓存的 `base-catalog` 端点按需加载：首页和空白搜索页不内嵌或渲染全目录，只有用户开始检索时才请求。搜索结果页是站内工具，固定输出 `noindex, follow` 且不进入 sitemap，避免将预览稿通过聚合页交给外部索引。

分词策略：

1. 中文优先 `Intl.Segmenter`。
2. 无 API 时使用确定性 n-gram/字符回退。
3. 规范化大小写、Unicode、LaTeX 命令、符号、连字符和旧译名。
4. title、alias、symbol、keyword、summary 使用不同权重。
5. 查询结果按 locale、类型、学科和难度过滤。

最近搜索仅保存在本机，并允许清除；不需要账户。

## 14. 知识图谱架构

图谱输入来自 reader facade 的文档、Concept Catalog 与 Relation，不从渲染后的 HTML 推断。`published` 与 `preview` 节点均可进入读者图谱，`hidden` 节点被排除；输出只包含公开 URL 和展示字段，不序列化发布或编辑状态。布局与视图分离，节点多时使用：

- 视口裁剪和局部邻域
- 标签 level of detail
- 关系类型过滤
- 当前学习路径子图
- 布局结果缓存

图谱颜色来自领域 token，但颜色同时配合节点形状、图例和关系线型。

八条学习路径保存在独立路径目录中。每条路径显式声明受众、路径外先修、阶段目标、预计时长、检查点、练习和后续路径；路径顺序必须满足每个节点的直接先修已经出现，或被列为路径外先修。validator 同时检查路径 ID、节点存在性、重复节点、顺序、检查点、练习和 `nextPath` 环。

## 15. 可视化和仿真

文章通过稳定 ID 引用插件。插件注册表可以动态 import，实现交互岛懒加载。

```text
definition → mathematical model → simulation state → timeline
→ renderer → controls → accessibility/export adapter
```

Simulation Runtime 提供统一 execute API，使 UI 不关心任务运行于主线程、Worker、WASM、Pyodide 或后端。任务输入、输出和版本可序列化；Worker 支持取消、超时、进度、种子、快照和过期结果隔离。

详细接口见 [visualization-guide.md](visualization-guide.md)。

## 16. 服务端与客户端边界

默认使用 Server Components 和静态生成：

- 内容读取、MDX 编译、metadata、导航、索引构建在服务端/构建时。
- 搜索命令面板、主题切换、抽屉、实验和局部图谱是客户端岛。
- Three.js、Pyodide、训练 Worker 不进入普通文章首屏 bundle。
- URL 状态解析在客户端运行时再次校验，不信任 query string。

## 17. Cloudflare 运行时

- 目标是 workerd 兼容 ESM 输出。
- 避免无必要 Node-only API 和中间件依赖。
- 当前应用不依赖 D1/R2；各实例的托管绑定在部署环境中维护。
- 静态资源由内容哈希控制长期缓存；HTML/metadata 缓存策略在上线前用实际响应头验证。
- public production 使用 `one-forth.com`，preview 与生产 metadata 不混淆。

当前官方参考：

- [Cloudflare Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Pages Custom Domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

平台细节必须以实施时官方文档和实际工具版本为准。

## 18. 性能策略

- 静态正文 + 懒加载交互岛。
- 图片响应式，字体子集化或系统回退。
- 离屏动画暂停或降频。
- rAF、Worker、WebGL、事件监听和 ResizeObserver 可清理。
- 搜索索引按 locale 分割；图谱不一次渲染全部标签。
- 内容编译使用稳定哈希，并预留缓存、增量索引和局部失效。
- 使用可测的 bundle 与 Web Vitals 预算，并记录真实验证结果。

## 19. 错误与安全

- 解析错误包含文档/registry ID 和字段路径。
- InteractiveFigure 有错误边界，不让单个实验破坏全文。
- Worker 任务可取消并设置超时；限制 CodeCell 输出。
- URL 和 MDX 输入经过 Schema；外链使用安全属性。
- 不提交 token、密钥、账户 ID 或部署凭据。
- 一期无账户和写 API，减少攻击面。

## 20. 架构验收

`pnpm test:architecture` 最终至少证明：

- package 依赖方向合法。
- 核心代码没有学科条件分支。
- 测试领域注册后导航、搜索和图谱自动出现。
- Concept ID 不绑定 locale 路径。
- MDX 不直接 import 实验。
- React 组件不包含已标识的复杂算法。
- 物理实验参数具有单位。
- Schema 变更有迁移入口。

## 21. 决策记录

| 决策                             | 状态               | 说明                                             |
| -------------------------------- | ------------------ | ------------------------------------------------ |
| pnpm workspace + Turbo           | 已实现             | 根工作区统一编排 13 个 package                   |
| apps/web 保留 Vinext/Worker 兼容 | 已实现             | 输出 RSC Worker 与静态资源                       |
| 本地 Git 内容仓库                | 已确定一期         | 不引入 CMS/数据库                                |
| 构建时本地搜索                   | 已确定一期         | 无付费 API，静态可部署                           |
| D1/R2                            | 一期不启用         | 本地内容仓库无需数据库或对象存储                 |
| Pyodide                          | 可选骨架           | 只按需 Worker 加载                               |
| 生产 canonical 为 apex           | 已确定             | `https://one-forth.com`                          |
| 许可证                           | MIT / CC BY-SA 4.0 | 程序代码与原创教材分别授权；第三方资源保留原许可 |
