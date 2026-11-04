# One Forth 可视化指南

状态：第一阶段已实现并作为持续实验规范
更新日期：2026-07-11

## 1. 目标

交互可视化用于把数学状态、推导和参数变化变得可观察，不替代定义、证明或实验数据。所有正式实验复用同一框架，避免每篇文章产生互不兼容的动画。

第一阶段交付五个实验：二维线性变换、梯度下降、反向传播计算图、神经网络决策边界和一维波动方程。

## 2. 架构分层

```text
visualization definition
→ mathematical model
→ simulation state
→ timeline controller
→ renderer
→ controls
→ accessibility description
→ export adapter
```

- Definition：ID、标题、说明、状态 Schema、控件与能力。
- Model：纯数学/数值逻辑，无 React 和 DOM。
- Simulation State：可序列化的数学状态和任务状态。
- Timeline：播放进度、速度、前后单步、暂停和重置。
- Renderer：只把 model 投影到 SVG、Canvas 或 WebGL。
- Controls：由统一 Schema 生成，显示值和单位。
- Accessibility：文本替代、数据摘要和键盘说明。
- Export：PNG/SVG 的插件特定实现。

数学状态与动画时间轴必须分离。同一个数学状态在暂停、reduced motion、导出和测试中应产生一致结果。

## 3. 注册接口

目标接口：

```ts
interface VisualizationPlugin<TState, TModel> {
  id: string;
  version: number;
  domain: string;
  renderer: "svg" | "canvas" | "webgl" | "hybrid";
  createInitialState(): TState;
  validateState(state: unknown): TState;
  createModel(state: TState): TModel;
  controls: VisualizationControl[];
  serializeState(state: TState): string;
  deserializeState(value: string): TState;
  accessibility: VisualizationAccessibilityAdapter<TState, TModel>;
  export: VisualizationExportAdapter<TState, TModel>;
}
```

文章只能通过 ID 引用：

```mdx
<InteractiveFigure id="linear-transform-2d" />
```

Registry 负责存在性、ID 唯一性、domain/subject 能力和动态 import。MDX 不直接 import 实现。

## 4. 控件模型

统一支持：

```text
SliderControl
NumberControl
SelectControl
ToggleControl
ButtonControl
VectorControl
MatrixControl
```

每个控件定义稳定 ID、标签、说明、默认值、合法范围、步长、单位和可选预设。

- Slider 同时提供键盘和数值输入方式。
- Matrix/Vector 支持逐元素编辑、粘贴、错误定位和恢复默认。
- 参数变化先经过运行时 Schema，再进入 model。
- 非法 URL 值回退到最近合法状态或默认值，并向用户说明。
- 控件分组通过标题、对齐和分隔线组织，不用每个参数一个卡片。

## 5. InteractiveFigure 外壳

所有正式实验必须提供：

- 标题和说明
- 主画布
- 参数面板与当前参数
- 播放、暂停、前进、后退和重置
- 动画速度
- 固定随机种子（随机实验）
- URL 状态分享
- 全屏
- PNG 和 SVG 导出
- 键盘操作与快捷键帮助
- 文本替代与数据摘要
- 加载、空、运行、完成、取消、发散和错误状态
- 错误边界
- 性能/降级提示

能力不能以失效按钮伪装。Canvas/WebGL 插件仍需通过 export adapter 生成可用 SVG 表达；若某设计无法满足，应在实现阶段更换 renderer 或补矢量导出，而不是降低验收口径。

## 6. URL 状态

- 状态有显式版本，序列化结果稳定且可比较。
- 只写复现实验所需参数，不写瞬时 hover/focus。
- 反序列化不信任输入：验证类型、范围、矩阵尺寸、枚举、种子和长度。
- 默认状态尽量省略，避免 URL 过长。
- 旧版本通过 migration 或清晰回退处理。
- 分享 URL 在新会话中重建同一数学状态。
- locale 切换时保留兼容的实验状态。

相关 unit 与 E2E 必须覆盖 round-trip、非法值、旧版本和默认值。

## 7. 确定性随机数

随机实验使用 `math-core` 的显式 seed PRNG，不使用散落的 `Math.random()`。

- 相同版本、输入和种子产生相同数据与结果。
- seed 可见、可编辑、可重置并写入分享状态。
- Worker 与主线程使用相同 PRNG 规则。
- 视觉回归固定种子。
- 算法升级若改变结果，增加任务/状态版本。

## 8. Timeline

Timeline 管理播放状态和离散步，不直接持有领域公式。

```text
idle → playing ↔ paused → complete
                  ↘ reset
```

训练任务另有：running、completed、cancelled、diverged、error。

- 前后单步可复算或从有界快照恢复。
- reset 恢复初始数学状态、时间和任务状态。
- 速度只影响展示节奏，不改变算法结果。
- 标签显示当前 step/time 和单位。
- 离开视口暂停或降频；返回后不跳过不可解释状态。
- reduced motion 可改为离散状态切换，但功能完整。

## 9. Simulation Runtime

```ts
interface SimulationTask<TInput, TOutput> {
  id: string;
  version: number;
  run(input: TInput, context: SimulationContext): Promise<TOutput>;
}
```

调用示例：

```ts
simulationRuntime.execute("wave-equation-1d", input);
```

Runtime 负责：

- Worker 调度和任务 ID
- `AbortSignal`/取消
- 超时
- 进度
- 固定种子
- 有界快照
- 结果缓存
- 过期任务隔离
- 错误序列化和资源清理

UI 不关心任务运行于主线程、Worker、WASM、Pyodide 或未来后端。快速纯函数可同步运行，训练和 PDE 演化进入 Worker。

## 10. Renderer 选择

### SVG

适合函数、几何、向量、矩阵、计算图、坐标轴和少量路径。优点是语义、清晰缩放和原生 SVG 导出。

### Canvas

适合大量采样点、训练数据、决策边界和高频绘制。必须提供文本/数据替代，并维护单独矢量导出模型。

### WebGL

只用于真实需要 3D 的曲面或场。二维梯度下降默认优先 SVG/Canvas 等高线。必须释放 geometry、material、texture、renderer 和监听器。

### D3

用于比例尺、坐标轴、路径、布局、缩放和拖拽；避免让 D3 与 React 同时拥有同一 DOM 子树。

## 11. 绘图规则

- 坐标轴有名称、刻度、单位和合理范围。
- 关键数值同时以文本显示。
- 数学对象颜色使用设计系统 token，不在插件中随意指定。
- 颜色之外使用箭头、线型、形状、标记和标签。
- 缩放/平移不隐藏返回默认视图入口。
- 画布 resize 不改变数学状态。
- HiDPI Canvas 按 devicePixelRatio 清晰绘制但限制像素预算。

## 12. 键盘和触摸

统一最低操作：

- Space：播放/暂停（焦点不在文本输入时）
- 左/右方向键：前后单步
- Home：重置到初始状态
- `?` 或帮助按钮：显示快捷键
- Esc：退出全屏/关闭面板

快捷键在实现时进行冲突检查并可本地化。拖拽必须有数值输入替代；触摸画布避免阻断页面滚动。

## 13. 文本替代

Accessibility Adapter 至少生成：

- 实验目的和当前状态
- 参数和值及单位
- 画面中主要对象和关系
- 当前步骤发生的变化
- 关键趋势或异常状态
- 可下载或可展开的数据摘要

文本不是简单“这是一个图”。屏幕阅读器用户应能理解参数变化的数学意义。

## 14. 导出

- PNG 输出当前视觉状态、合适分辨率和背景/透明选项。
- SVG 输出当前数学对象、坐标、标签和必要 metadata。
- 导出内容不包含 hover、焦点环或被截断控件。
- 文件名包含实验 ID 和必要的短状态标识，不包含个人信息。
- 导出前使用当前合法 model，不从屏幕像素反推数据。
- 导出测试验证 MIME、尺寸、非空内容和固定状态稳定性。

## 15. 性能与清理

- 插件动态加载，普通文章首屏不含其他实验代码。
- Three.js、Pyodide 和训练 Worker 不进入通用 bundle。
- 重计算不在初次 hydration 自动执行。
- 参数快速变化采用取消/合并策略。
- Canvas/WebGL 离屏后暂停或降频。
- 清理 rAF、Worker、timeout、事件监听、observer 和 GPU 资源。
- 给出合理点数/迭代上限和降级提示。
- `pnpm analyze` 验证共享 shell 与插件 chunk 边界。

## 16. 二维线性变换

ID：`linear-transform-2d`

必须包含：二维网格、输入/输出基向量、2×2 矩阵编辑、拖动基向量、单位矩阵到目标矩阵插值、行列式、面积缩放、方向翻转、旋转/缩放/剪切/投影预设、奇异矩阵压缩、前后单步。

模型测试：矩阵乘法、行列式、面积比、方向、奇异性、预设和插值端点。

## 17. 梯度下降

ID：`gradient-descent`

必须包含：二维等高线（默认）或按需三维损失面、学习率、动量、初始点、迭代次数、梯度向量、优化轨迹、损失曲线、普通 GD/动量切换，并解释发散、振荡和缓慢收敛。

速度只改变动画，不改变迭代序列。测试覆盖解析梯度、有限差分抽查、收敛/发散 fixture、动量状态和轨迹确定性。

## 18. 反向传播计算图

ID：`backpropagation-graph`

必须包含：真实小型计算图、前向/反向单步、局部导数、累计梯度、链式法则、可编辑输入/权重/偏置/激活、梯度消失示例，并视觉区分数值、张量、局部梯度和总梯度。

测试使用有限差分验证解析梯度，并覆盖分支图的梯度累加。

## 19. 神经网络决策边界

ID：`neural-network-decision-boundary`

必须包含：XOR/双月数据、隐藏层宽度、激活函数、学习率、epoch、种子、训练点、决策边界、损失、准确率以及 running/completed/diverged/cancelled/error 状态。

训练进入 Worker；任何新参数变化取消旧任务，旧任务结果不能覆盖新状态。测试覆盖种子、取消、状态转换、损失边界和输出网格尺寸。

## 20. 一维波动方程

ID：`wave-equation-1d`

必须包含：物理插件注册、振幅、频率、波速、初始条件、时间演化、位移曲线、波动方程、单位、前后单步、URL 状态和按需加载。

模型明确空间/时间离散、边界条件、稳定性条件和单位。测试覆盖初始条件、边界、确定性、时间步、基础守恒/误差性质和非法参数。

## 21. 测试矩阵

每个插件至少有：

- model unit
- state Schema 与 URL round-trip
- controls component
- timeline
- 键盘
- reset 与 fixed seed
- error boundary
- export
- 响应式/触摸关键路径
- a11y 文本摘要
- 视觉快照（固定时间、种子、动画状态和数据）
- 资源清理/取消测试（适用时）

视觉回归不能替代数学测试；数学测试也不能替代人工图形检查。

## 22. 插件完成清单

- [ ] ID、version、domain、renderer 注册且唯一。
- [ ] 数学模型不依赖 React/DOM。
- [ ] 状态可序列化、可校验、可迁移。
- [ ] 所有参数有范围、单位、说明和默认值。
- [ ] 播放、暂停、前进、后退、重置完整。
- [ ] 随机结果有固定种子。
- [ ] Worker 可取消且隔离过期结果。
- [ ] 键盘、触摸和 reduced motion 可用。
- [ ] 文本替代和数据摘要有数学意义。
- [ ] PNG/SVG 导出可用。
- [ ] 离屏/卸载后资源清理。
- [ ] model、component、E2E、visual tests 真实通过。
- [ ] 文章只通过 ID 引用。

本文件是目标接口和验收规范，不表示五个实验已经实现。
