# One Forth 内容成熟度与索引策略

## 1. 统一成熟度

```ts
type ContentMaturity = "planned" | "outline" | "draft" | "reviewed" | "verified";
```

| 状态       | 定义                                             | 默认搜索               | 默认 sitemap/index                             |
| ---------- | ------------------------------------------------ | ---------------------- | ---------------------------------------------- |
| `planned`  | 只有概念元数据和知识关系，没有可学习正文         | 排除                   | `noindex, follow`，排除 sitemap                |
| `outline`  | 主题专用章节计划，尚无完整正文                   | 排除                   | `noindex, follow`，排除 sitemap                |
| `draft`    | 正文、例题、练习和来源基本完整，仍需独立人工审阅 | 可显式纳入，不默认推荐 | 默认 `noindex, follow`；重要公开草稿需显式例外 |
| `reviewed` | 有可追溯的人类内容审阅记录                       | 纳入                   | `index, follow`，纳入 sitemap                  |
| `verified` | 人工审阅后，关键公式、数值和实验也有验证记录     | 纳入并优先             | `index, follow`，纳入 sitemap                  |

自动检查不能授予人工审阅状态。没有真实人工审阅记录时，不得标记内容为 `reviewed` 或 `verified`。

## 2. 主题专用大纲门槛

公开访问的 `outline` 至少包含：具体章节问题、使用的定义、待推导公式、计划例题、准确先修连接和计划核对的可靠资源。只替换概念名称的通用四段模板不构成主题专用大纲。

`planned` 与模板化 `outline`：

- 可以作为图谱计划节点；
- 页面明确显示“课程规划”；
- 不进入默认搜索、首页推荐、最近更新和公开 sitemap；
- 不能以完整文章的视觉或 metadata 呈现。

## 3. 审阅与修订记录

```yaml
revisionHistory:
  - date: 2026-07-11
    type: substantive
    summary: 具体说明正文、数学或引用发生的变化
```

`type` 取值：`substantive`、`mathematical-correction`、`citation-update`、`style`、`metadata-migration`。首页最近更新只消费前三类中确有正文含义变化的记录，单独改日期、状态、格式或批量大纲不显示。

## 4. 单一策略来源

搜索构建器、首页推荐、最近更新、页面 robots metadata、sitemap 和索引验证必须调用同一成熟度策略函数，禁止各自复制状态数组。

## 5. 迁移要求

修改内容 Schema 时：

1. 增加 schema 版本；
2. 提供幂等 migration；
3. 保留概念 ID 和 URL；
4. 对旧状态建立显式映射；
5. 运行迁移检查、内容校验和生成物一致性检查；
6. 报告所有无法自动判断的人类审阅状态，不猜测。
