# 公开内容与编辑系统分离

## 两个互不替代的状态轴

```ts
export type PublicationStatus = "hidden" | "preview" | "published";

export type EditorialStatus = "planned" | "outline" | "draft" | "checked" | "reviewed" | "verified";
```

`PublicationStatus` 是交付决策，回答“普通读者能否通过公开站点使用这份内容”。`EditorialStatus` 是内部工作流事实，回答“内容当前处于哪一个生产与复核阶段”。二者不得互相推导：一篇经编辑核对的文章仍可因授权或发布时间而 `hidden`；一篇完整且可公开的文章也可在内部保持 `draft`，表示尚无独立人工审阅。

## 可见性矩阵

| 发布状态    | 生产公开路由                      | 普通导航 | 普通搜索 | sitemap | robots              | 客户端内容载荷 |
| ----------- | --------------------------------- | -------- | -------- | ------- | ------------------- | -------------- |
| `hidden`    | 不生成；旧 URL 按映射重定向或 404 | 否       | 否       | 否      | 不适用              | 否             |
| `preview`   | 仅开发环境或签名预览入口          | 否       | 否       | 否      | `noindex, nofollow` | 仅明确预览会话 |
| `published` | 是                                | 是       | 是       | 是      | `index, follow`     | 只含学习字段   |

普通客户端可接收教材名称、章节编号、标题、摘要、预备知识、目标、时间、难度、正文目录、已发布前后章节、个人阅读进度、最近实质修订日期与已核实资源。它不得接收编辑状态、规划字段、生产队列、内部 ID、Schema 版本、迁移记录、构建日期、CI 状态或待审阅任务。

## 数据边界

1. `packages/content` 保存完整内部模型和迁移逻辑。
2. 公开投影函数在服务端把内部实体转换为 `Published*` DTO；DTO 类型不包含编辑字段。
3. `apps/web` 的路由、metadata、sitemap、搜索和图谱只依赖公开投影。
4. 客户端组件只接收显式 DTO，不接收 `ContentDocument`、`CurriculumChapter` 或 Concept 内部实体。
5. 内部编辑预览必须使用独立入口和显式环境开关；生产默认关闭，普通查询参数不能开启。

## URL 策略

处理旧章节 URL 时按顺序判定：

1. 对应 `published` 正文：保持 canonical URL 并正常渲染。
2. 内容已合并：使用版本化映射永久重定向到新章节及语义锚点。
3. 未完成但所在教材存在公开承接页面：临时重定向到该教材目录。
4. 没有可信目标：不生成静态参数，运行时返回 404。

不渲染“正在建设”“课程规划”或内部提纲页。重定向映射保留原路径、目标、原因、类型和生效版本，并由 `validate:redirects` 检查环、链和断点。

## Schema 与迁移

- 课程和内容 Schema 均提升版本；旧 `status` 只由迁移函数读取，不在新实体中继续作为混合状态。
- 旧 `planned | outline` 迁移为 `publicationStatus: hidden`，并保留同名 `editorialStatus`。
- 旧 `draft | reviewed | verified` 只在正文满足发布门槛并由迁移清单明确列出时迁移为 `published`；否则迁移为 `preview` 或 `hidden`。
- 迁移必须幂等、可测试，不伪造人工审阅者，也不自动提升 `EditorialStatus`。

## 单一事实来源

导航、搜索、图谱、术语表、学科目录、学习路径、上一章/下一章、metadata、robots 和 sitemap 必须调用同一公开资格判定。页面组件不得自行用 `contentId`、旧成熟度或文件存在性猜测公开状态。
