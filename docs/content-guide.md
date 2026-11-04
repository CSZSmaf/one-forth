# One Forth 内容指南

教材写作与审阅规范。
更新日期：2026-07-11

## 1. 内容目标

One Forth 内容必须让读者完成从直觉到严谨、从公式到实验、从教材到研究资源的连续学习。内容不是 SEO 卡片、百科复制、论文链接堆栈或只有动画没有理论的演示。

所有正文应原创、可核查、适合长期维护。

## 2. 概念与文档

Concept 是语言无关的知识实体；Document 是特定 locale、内容类型和深度的文章。

```text
Concept ID: linear-transformation
Document ID: zh-CN/linear-transformations
```

- Concept ID 使用稳定英文 kebab-case，不包含 locale。
- Document ID 包含 locale 和可读 slug。
- 翻译文档通过 `translationOf` 指向同一 Concept ID。
- 路径可变化，Concept ID 不随 URL 变化。
- 多个文档可以逐步覆盖同一概念的初级、高级、证明、实验、历史和应用。

## 3. 内容类型

```text
concept
theorem
method
derivation
experiment
proof
problem-set
reference
paper-guide
biography
historical-note
dataset
software-tool
```

每种类型通过 Content Renderer Registry 选择语义布局。不要为不同类型复制路由，也不要把所有类型套进同一教程模板。

## 4. 目录约定

目标内容目录：

```text
content/
  zh-CN/
    mathematics/
    physics/
    computer-science/
    machine-learning/
    interdisciplinary/
  en/
  concepts/
  resources/
  equations/
  symbols/
  units/
  constants/
  learning-paths/
```

不创建无内容的空目录。内容文件名使用 kebab-case；关系、资源和 registry 引用使用 ID，不使用相对文件路径作为长期标识。

## 5. Frontmatter

每篇 MDX 必须使用当前版本的 Schema。目标基线：

```yaml
schemaVersion: 1
id: linear-transformations
conceptId: linear-transformation
kind: concept
title: 线性变换
shortTitle: 线性变换
summary: 从空间运动理解矩阵
domain: mathematics
subject: linear-algebra
level: undergraduate
difficulty: 2
estimatedMinutes: 35
status: draft
authors:
  - core-team
reviewers: []
prerequisites:
  - vectors
  - matrices
relations:
  - type: used-in
    target: neural-networks
learningObjectives:
  - 理解线性变换的几何意义
  - 使用矩阵表示二维线性变换
tags:
  - vector
  - matrix
  - geometry
visualizations:
  - linear-transform-2d
resources: []
symbolNamespaces:
  - math.linear-algebra
lastReviewed: null
```

示例中的作者 ID 只是 registry 标识，不表示已有人类审阅。新内容默认 `draft`；只有真实审阅完成后才写 `reviewed` 和有效 `lastReviewed`。

## 6. Schema 校验

`pnpm validate:content` 最终必须检查：

- Schema 版本和必填字段
- 全局/命名空间 ID 重复
- domain、subject、Concept、resource、visualization 是否存在
- difficulty、estimatedMinutes、status 和日期范围
- prerequisite 是否存在及是否形成环
- relation 端点和类型是否合法
- summary 和 learningObjectives 是否为空
- 内部链接和 ConceptLink 是否断裂
- symbol namespace、单位和方程引用是否合法
- locale、translationOf 和翻译状态是否一致

Schema 变更必须增加 migration，并由 fixture 证明旧版本可诊断或迁移。

## 7. 核心文章结构

一篇核心文章按以下顺序组织，但允许为学科内容调整局部节奏：

1. 本页目标
2. 为什么需要这个概念
3. 直觉解释及其边界
4. 交互演示
5. 严格定义和假设
6. 数学推导或证明
7. 具体例题
8. 常见误区
9. 算法或代码
10. 参数实验
11. 练习与解答
12. 与其他知识的关系
13. 已核实经典资源
14. 后续学习

直觉必须明确其适用范围，动画不作为证明。推导不得跳过影响理解的关键步骤，也不应为追求篇幅机械展开每个代数变形。

## 8. 第一期七篇内容

### 六篇核心文章

1. **向量：从箭头到高维空间**
   覆盖几何向量、坐标、线性组合、内积、高维解释，并作为线性变换与梯度的先修。

2. **线性变换：把矩阵看作空间运动**
   嵌入二维线性变换实验，覆盖基、矩阵作用、行列式、面积、方向与奇异矩阵。

3. **导数、方向导数与梯度**
   从一维变化率过渡到方向导数和梯度，说明梯度方向的假设与局限。

4. **梯度下降：模型为什么能够学习**
   嵌入梯度下降实验，覆盖学习率、收敛、振荡、发散、动量和损失轨迹。

5. **反向传播：链式法则如何训练神经网络**
   嵌入计算图实验，区分局部导数、总梯度、张量和值，包含梯度消失示例。

6. **注意力机制：从加权平均到自注意力**
   覆盖 query/key/value、缩放点积、softmax、矩阵形式和常见误解，不宣称注意力等同解释。

### 数学物理内容

7. **一维波动方程：从局部振动到波的传播**
   嵌入波动方程原型，说明变量、初始/边界条件、单位、传播速度、时间演化和数值/解析边界。

至少四篇核心文章嵌入正式实验；第七篇嵌入物理原型。

## 9. MDX 组件

允许的核心组件：

```text
Intuition
Definition
Theorem
Lemma
Proof
Derivation
Example
CounterExample
Misconception
Callout
Exercise
Solution
Quiz
Checkpoint
ResourceCard
Citation
ConceptLink
Equation
Symbol
InteractiveFigure
ParameterPanel
CodeCell
Tabs
Details
```

组件必须保留语义 HTML、标题层级和键盘行为。MDX 中不写大型脚本，不直接 import 实验，不用 CSS 模拟错误语义。

## 10. 数学写作

- 首次出现的符号必须定义。
- 文章声明使用的 symbol namespace。
- 同一符号在不同学科可有不同含义，但必须通过 namespace 消歧。
- 标量、向量、矩阵、随机变量和集合使用一致排版。
- 定理列出假设，不把结论从适用条件中拆开。
- 公式、定理、图和表采用稳定编号，文内通过引用组件链接。
- 方程记录变量、假设、领域、相关主题、极限情况和应用。
- 物理量给出单位；量纲未知或归一化时明确说明。
- 数值例子可复算，必要时给出误差与精度。

## 11. 代码写作

- 代码说明算法，不用无关框架样板淹没核心思想。
- 标明输入、输出、形状、单位和随机种子。
- 示例结果必须来自可执行代码或明确标为示意，不伪造运行结果。
- CodeCell 的运行接口与展示分离。
- Python/Pyodide 只有用户触发后加载，在 Worker 中运行，限制输出并可终止。
- 普通文章即使不运行代码也应完整可读。

## 12. 练习与解答

每篇核心文章至少包含概念检查、计算/推导和迁移应用三类练习。难度与前置知识一致。

- Exercise 明确任务、条件和期望形式。
- Solution 不只给答案，展示关键推理。
- Quiz 反馈解释错误原因，不只显示对错。
- 不使用虚构分数、排行榜或学习数据。

## 13. 关系与学习路径

使用 Relation Registry 中的关系，不把所有连接写成“先修”。关系 note 说明为何相关。

学习路径引用 Concept ID，包含顺序、分支、目标和完成标准，不复制文章正文。文章“前后学习”由关系和路径数据共同生成。

## 14. 资源与论文

Resource 支持 paper、book、lecture、dataset、software、simulation、historical-source、encyclopedia-entry。

每条资源尽量包含：

- 标题、作者、年份、类型
- 出版社、venue 或版本
- 为什么重要
- 阅读前提
- 官方链接
- DOI/arXiv（适用时）
- 开源代码（适用时）
- 站内相关 Concept
- `verifiedAt`

不得伪造 DOI、作者顺序、年份、会议、期刊、URL 或仓库。无法核实则保留明确 TODO，不用相似论文补位。

引用验证分两步：

1. 资源身份和元数据真实。
2. 资源确实支持引用所在句子的主张。

优先第一方来源和权威教材。不要大段复制受版权保护内容或图表。

## 15. 作者与审阅

- Authors/Reviewers 引用独立人员或团队 registry。
- 自动生成工具不能冒充作者或审阅者。
- `draft`：结构或事实尚未完成。
- `in-review`：已提交真实审阅。
- `reviewed`：数学、引用、语言和交互链接均有人类复核。
- `deprecated`：保留重定向和替代文档说明。

`lastReviewed` 是实际审阅日期，不是构建日期。

## 16. 国际化

- 简体中文为第一阶段默认 locale，英文只建立接口和少量 fixture。
- UI 文案、组件标签、aria-label 和错误信息来自 locale 资源。
- 专有名词首次出现时可给中英文对照。
- 翻译不能机械复制中文语序；数学符号和 Concept ID 保持一致。
- `translationStatus` 真实反映 draft/reviewed。
- locale 缺失时使用明确回退策略，不产生错误 canonical。

## 17. 链接与重定向

- 站内链接使用 ConceptLink 或内容路由 helper。
- 构建时检查断链和不受支持 locale。
- 修改 slug 时保留显式 redirect map。
- 外链提供可理解的链接文本，不使用“点击这里”。
- 不在正文硬编码完整 `one-forth.com` URL；canonical 和内部 URL 由配置生成。

## 18. 创建流程

目标流程：

```bash
pnpm new:topic
pnpm validate:content
pnpm validate:registry
pnpm check:links
```

步骤：

1. 搜索现有 Concept 和 alias，避免重复概念。
2. 注册 Concept、domain/subject 和必要关系。
3. 生成 frontmatter 和文章骨架。
4. 写数学内容、例题、误区和练习。
5. 注册并核实资源。
6. 通过 ID 嵌入实验。
7. 运行校验、渲染和页面 E2E。
8. 进行数学、引用、语言、无障碍和视觉审阅。
9. 真实更新状态和 `lastReviewed`。

目标命令在相应 Checkpoint 落地；当前是否可运行见进度日志。

## 19. 内容验收清单

- [ ] 标题、摘要、目标和前置知识具体。
- [ ] 直觉没有替代定义/证明。
- [ ] 符号、形状、单位和假设一致。
- [ ] 推导可跟随且结论边界准确。
- [ ] 例题可复算，数据不伪造。
- [ ] 误区解释错误原因。
- [ ] 练习覆盖理解、计算和迁移。
- [ ] 关系类型准确，不只使用 prerequisite。
- [ ] 实验 ID、资源 ID 和站内链接存在。
- [ ] 引用身份及支持关系已核实。
- [ ] 作者、审阅和日期真实。
- [ ] 键盘、移动端和无实验加载时仍可学习。
- [ ] `validate:content`、`validate:registry`、`check:links` 真实通过。

内容质量以正文和可追溯审阅记录为依据。
