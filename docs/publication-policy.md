# 正文发布政策

## 资格

`publicationStatus: published` 是公开交付声明，不是编辑荣誉或人工审阅声明。章节必须同时满足以下条件：

1. 有完整、原创、主题专用正文，标题与二三级标题具体，无占位句、TODO、课程规划或生产说明。
2. 摘要准确；学习目标、预备知识、难度和预计时间与正文一致。
3. 术语先定义，主要符号有解释；定理条件、推导步骤、矩阵维度、概率范围、单位和量纲正确。
4. 需要计算的主题包含完整例题；练习覆盖正文核心目标，答案或核验结果经过复算。
5. 资源真实可访问，元数据逐字段核对，来源支持引用所在的具体陈述。
6. 内部链接、语义锚点、可视化 ID、资源 ID 和旧 URL 映射可解析。
7. 上一章与下一章只指向其他已发布章节；首尾边界回到本册目录。
8. 页面可构建；移动端无页面级横向溢出；键盘、焦点、公式和画布替代信息符合现有无障碍契约。
9. 内容风格检查无未解释的高危项，相似度审计无跨主题模板复用。
10. `validate:publication`、`validate:content`、`test:scientific`、`check:links` 与相关构建门禁通过。

## 状态转换

```text
hidden/planned -> hidden/outline -> preview/draft -> preview/checked
                                              |              |
                                              +---- quality gate ----> published/(draft|checked)

published/checked -> published/reviewed -> published/verified
```

发布与编辑两轴不强制同步。自动化工具不得授予 `reviewed` 或 `verified`；没有真实人工审阅记录时，内部状态保持诚实。发布撤回可把内容改为 `hidden`，但必须保留 URL 处置和回滚记录。

## 公开投影

- `hidden`：不进入路由参数、目录、搜索、图谱、索引、学习路径、推荐、sitemap 或客户端 bundle。
- `preview`：仅开发环境或授权预览入口可读，强制 `noindex, nofollow`；不接受普通查询参数解锁。
- `published`：进入公开课程投影和索引；metadata、canonical、OG 与 sitemap URL 从 `siteConfig.url` 生成。

公开正文不显示 `EditorialStatus`、内部检查项、人工审阅空缺、Schema、迁移历史或内容完成率。最近实质修订日期、真实作者/维护机构和已核实来源属于学习可信度信息，可以显示；纯 metadata migration 或样式调整不冒充实质修订。

## 撤回与重定向

发现数学错误、来源失效、权利问题或严重无障碍回归时，先将章节撤至 `hidden` 或受控 `preview`。若内容已被另一章完整吸收，使用永久重定向到语义锚点；若只是未完成，临时重定向至本册目录；无可信目标时返回 404。不得用占位页维持 200 状态。
