import type { LocalizedText } from "@one-forth/registry";
import { extendedVisualizationManifest } from "./extended-manifest";

export interface SliderControl {
  readonly kind: "slider";
  readonly id: string;
  readonly label: LocalizedText;
  readonly minimum: number;
  readonly maximum: number;
  readonly step: number;
  readonly unit?: string;
}

export interface NumberControl {
  readonly kind: "number";
  readonly id: string;
  readonly label: LocalizedText;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly step?: number;
  readonly unit?: string;
}

export interface SelectControl {
  readonly kind: "select";
  readonly id: string;
  readonly label: LocalizedText;
  readonly options: readonly { readonly value: string; readonly label: LocalizedText }[];
}

export interface ToggleControl {
  readonly kind: "toggle";
  readonly id: string;
  readonly label: LocalizedText;
}

export interface ButtonControl {
  readonly kind: "button";
  readonly id: string;
  readonly label: LocalizedText;
}

export interface VectorControl {
  readonly kind: "vector";
  readonly id: string;
  readonly label: LocalizedText;
  readonly dimensions: number;
}

export interface MatrixControl {
  readonly kind: "matrix";
  readonly id: string;
  readonly label: LocalizedText;
  readonly rows: number;
  readonly columns: number;
}

export type VisualizationControl =
  | SliderControl
  | NumberControl
  | SelectControl
  | ToggleControl
  | ButtonControl
  | VectorControl
  | MatrixControl;

export interface VisualizationAccessibilityAdapter<TState, TModel> {
  describe(state: TState, model: TModel): string;
  tabularData?(state: TState, model: TModel): readonly Readonly<Record<string, string | number>>[];
}

export interface VisualizationExportAdapter<TState, TModel> {
  toSvg?(state: TState, model: TModel): string;
  toPng?(state: TState, model: TModel): Promise<Blob>;
}

export interface VisualizationPlugin<TState, TModel> {
  readonly id: string;
  readonly domain: string;
  readonly renderer: "svg" | "canvas" | "webgl" | "hybrid";
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly controls: readonly VisualizationControl[];
  createInitialState(): TState;
  validateState(state: unknown): TState;
  createModel(state: TState): TModel;
  serializeState(state: TState): string;
  deserializeState(value: string): TState;
  readonly accessibility: VisualizationAccessibilityAdapter<TState, TModel>;
  readonly export?: VisualizationExportAdapter<TState, TModel>;
}

export interface VisualizationScientificReview {
  readonly observationGoal: LocalizedText;
  readonly mathematicalModel: LocalizedText;
  readonly assumptions: readonly LocalizedText[];
  readonly procedure: readonly LocalizedText[];
  readonly expectedPhenomena: readonly LocalizedText[];
  readonly numericalValidation: readonly LocalizedText[];
  readonly limitations: readonly LocalizedText[];
  readonly relatedConceptIds: readonly string[];
}

export interface VisualizationManifestEntry {
  readonly id: string;
  readonly domain: string;
  readonly renderer: "svg" | "canvas" | "webgl" | "hybrid";
  readonly title: LocalizedText;
  readonly description: LocalizedText;
  readonly scientificReview: VisualizationScientificReview;
}

export const visualizationManifest: readonly VisualizationManifestEntry[] = [
  {
    id: "linear-transform-2d",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "二维线性变换", en: "2D linear transformation" },
    description: { "zh-CN": "观察矩阵如何移动网格、基向量与有向面积。" },
    scientificReview: {
      observationGoal: {
        "zh-CN": "比较二维矩阵对网格、标准基和单位正方形有向面积的共同作用。",
      },
      mathematicalModel: {
        "zh-CN":
          "矩阵按 $A(t)=(1-t)I+tA$ 插值。两支基向量是 $A(t)$ 的两列，$\\det A(t)$ 表示有向面积倍率，$|\\det A(t)|$ 表示面积倍率。",
      },
      assumptions: [
        { "zh-CN": "矩阵为实 $2\\times2$ 矩阵，作用对象是欧氏平面中的列向量。" },
        {
          "zh-CN": "矩阵按元素在 $I$ 与 $A$ 之间插值。中间矩阵可能不可逆，也可能改变长度和方向。",
        },
      ],
      procedure: [
        { "zh-CN": "选择单位、旋转、缩放、剪切、反射、投影、秩一或零矩阵。" },
        { "zh-CN": "播放或单步改变 $t$，比较基向量终点、网格和 $\\det A(t)$。" },
        { "zh-CN": "在奇异点与方向翻转前后读取秩、有向面积和普通面积，并导出当前图形复核。" },
      ],
      expectedPhenomena: [
        {
          "zh-CN":
            "$\\det A>0$ 时方向保持，$\\det A<0$ 时有向面积变号，$\\det A=0$ 时平面压缩到直线或原点。",
        },
        { "zh-CN": "投影矩阵满足 $A^2=A$；秩一投影和零矩阵的二维面积倍率均为零。" },
      ],
      numericalValidation: [
        { "zh-CN": "确定性测试覆盖单位、旋转、对角缩放、剪切、反射、秩一投影和零矩阵。" },
        { "zh-CN": "测试分别核对插值端点、矩阵列与基向量、det、有向面积、秩和投影幂等性。" },
      ],
      limitations: [
        { "zh-CN": "二维线性映射保持原点，直线的像是直线或点。" },
        { "zh-CN": "旋转预设只指定终点矩阵，中间的插值矩阵通常还会产生缩放。" },
      ],
      relatedConceptIds: ["linear-transformation"],
    },
  },
  {
    id: "gradient-descent",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "梯度下降", en: "Gradient descent" },
    description: { "zh-CN": "比较学习率与动量如何改变优化轨迹。" },
    scientificReview: {
      observationGoal: {
        "zh-CN": "比较学习率和 heavy-ball 动量对同一正定二次目标轨迹、损失与稳定性的影响。",
      },
      mathematicalModel: {
        "zh-CN":
          "目标为 $f(x)=\\frac12 x^{\\mathsf T}Hx$，其中 $H=\\begin{pmatrix}0.8&0.25\\\\0.25&2.5\\end{pmatrix}$。更新为 $v_{k+1}=\\beta v_k-\\eta Hx_k$，$x_{k+1}=x_k+v_{k+1}$；$\\beta=0$ 时得到普通梯度下降。",
      },
      assumptions: [
        {
          "zh-CN": "$H$ 固定、对称且正定，梯度为 $Hx$；初值与迭代次数由当前链接中的参数确定。",
        },
        { "zh-CN": "稳定性分类只针对该线性递推，不推广到随机优化或一般非凸目标。" },
      ],
      procedure: [
        { "zh-CN": "固定初值，依次选择稳定区间、临界边界和不稳定区间的学习率。" },
        { "zh-CN": "单步读取位置、速度、梯度和损失，再加入动量比较暂时上升与长期稳定性。" },
        { "zh-CN": "暂停后改变参数并重放，检查同一初值是否产生同一轨迹。" },
      ],
      expectedPhenomena: [
        {
          "zh-CN": "稳定学习率使每个 Hessian 特征模态衰减；临界学习率使最大曲率模态不再渐近衰减。",
        },
        { "zh-CN": "超过解析上界后至少一个模态放大；动量可造成暂时损失上升，稳定不等于逐步单调。" },
      ],
      numericalValidation: [
        {
          "zh-CN":
            "测试核对 Hessian 特征值、第一步和动量递推，并以矩阵幂闭式结果复算普通梯度下降。",
        },
        {
          "zh-CN":
            "稳定、临界和不稳定学习率均有确定性断言，轨迹中的损失与绘制等高线使用同一目标函数。",
        },
      ],
      limitations: [
        { "zh-CN": "实验使用二维凸二次函数，其 Hessian 特征值决定梯度下降的稳定步长区间。" },
        {
          "zh-CN": "轨迹超出视窗时会被截断。可结合损失值和步长的稳定区间判断迭代状态。",
        },
      ],
      relatedConceptIds: ["gradient-descent"],
    },
  },
  {
    id: "gradient-field",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "方向导数与梯度场", en: "Directional derivative and gradient field" },
    description: { "zh-CN": "移动观察点和方向，比较梯度、方向向量与方向导数。" },
    scientificReview: {
      observationGoal: {
        "zh-CN": "在同一点比较梯度向量、单位方向向量与标量方向导数，并用差分独立复算。",
      },
      mathematicalModel: {
        "zh-CN":
          "我们计算曲面的解析梯度，并用 $D_u f(x)=\\nabla f(x)\\cdot u$ 求方向导数，其中 $\\|u\\|=1$。中心差分 $\\frac{f(x+hu)-f(x-hu)}{2h}$ 用于比较数值误差。",
      },
      assumptions: [
        { "zh-CN": "曲面在观察点附近可微，最陡上升方向使用标准欧氏内积和对应范数定义。" },
        { "zh-CN": "方向向量必须非零；差分步长相对观察点尺度选取。" },
      ],
      procedure: [
        { "zh-CN": "选择椭圆碗面、鞍面或耦合二次面，并调整观察点。" },
        {
          "zh-CN": "旋转单位向量 $u$，比较 $\\nabla f$、$\\nabla f\\cdot u$、中心差分和绝对误差。",
        },
        { "zh-CN": "将 $u$ 与 $\\nabla f$ 同向或反向对齐，观察方向导数的最大值与最小值。" },
      ],
      expectedPhenomena: [
        { "zh-CN": "梯度是向量，方向导数是内积得到的标量；驻点的梯度和全部方向导数均为零。" },
        { "zh-CN": "在欧氏内积下，单位方向与梯度同向时方向导数等于 $\\|\\nabla f\\|$。" },
      ],
      numericalValidation: [
        { "zh-CN": "三个曲面的解析梯度均与双侧中心差分比较，并显示当前点的误差。" },
        { "zh-CN": "测试覆盖任意长度方向的归一化、零方向拒绝、驻点与解析/数值方向导数一致性。" },
      ],
      limitations: [
        { "zh-CN": "曲面均为平滑二次示例；不可微点和非欧氏度量需要另行定义方向导数与最陡方向。" },
        { "zh-CN": "箭头表示方向，各曲面的屏幕长度采用独立缩放。" },
      ],
      relatedConceptIds: ["gradient"],
    },
  },
  {
    id: "backprop-computation-graph",
    domain: "machine-learning",
    renderer: "svg",
    title: { "zh-CN": "反向传播计算图", en: "Backpropagation graph" },
    description: { "zh-CN": "沿计算图分步检查局部导数与累积梯度。" },
    scientificReview: {
      observationGoal: {
        "zh-CN": "沿小型标量计算图区分前向值、局部导数、上游梯度、分支贡献和累计参数梯度。",
      },
      mathematicalModel: {
        "zh-CN":
          "前向计算为 $z=wx+b$、$\\hat y=\\varphi(z)$、$L=\\frac12(\\hat y-y^*)^2+\\frac12\\lambda w^2$。权重梯度为 $\\frac{\\partial L}{\\partial w}=(\\hat y-y^*)\\varphi^{\\prime}(z)x+\\lambda w$。",
      },
      assumptions: [
        { "zh-CN": "实验使用单输入、单输出的标量计算图。" },
        { "zh-CN": "ReLU 在 $z=0$ 不可微；差分模板跨过折点时不报告有效梯度核验。" },
      ],
      procedure: [
        { "zh-CN": "调整 $x$、$w$、$b$、目标、激活函数和 $L_2$ 系数，逐步执行前向与反向阶段。" },
        {
          "zh-CN":
            "读取 $\\varphi^{\\prime}(z)$、$\\partial L/\\partial z$、权重两条分支贡献及其累计值。",
        },
        { "zh-CN": "比较 $x$、$w$、$b$ 的解析梯度与中心有限差分相对误差。" },
      ],
      expectedPhenomena: [
        {
          "zh-CN":
            "共享参数收到的梯度等于所有有效路径贡献之和；偏置和输入梯度由同一上游梯度继续传播。",
        },
        { "zh-CN": "重复因子示例显示：绝对值小于 1 的局部导数连续相乘时，梯度逐渐缩小。" },
      ],
      numericalValidation: [
        {
          "zh-CN":
            "多组 tanh、sigmoid 与 ReLU 参数对 $x$、$w$、$b$ 做中心有限差分，记录最大相对误差。",
        },
        { "zh-CN": "测试单独复算数据分支、正则分支和累计权重梯度，并检查 ReLU 折点的拒绝条件。" },
      ],
      limitations: [
        { "zh-CN": "沿计算图将各节点的局部导数相乘，可得到输出对输入的导数。" },
        { "zh-CN": "重复因子示例假设各层局部导数相同；一般网络需要逐层计算并相乘。" },
      ],
      relatedConceptIds: ["backpropagation"],
    },
  },
  {
    id: "neural-decision-boundary",
    domain: "machine-learning",
    renderer: "canvas",
    title: { "zh-CN": "神经网络决策边界", en: "Neural decision boundary" },
    description: { "zh-CN": "训练小型网络并观察分类边界。" },
    scientificReview: {
      observationGoal: {
        "zh-CN": "观察固定种子的小型 2→隐藏层→1 网络如何拟合 XOR 或双月二维样本。",
      },
      mathematicalModel: {
        "zh-CN":
          "隐藏层使用 $\\tanh$、sigmoid 或 ReLU，输出概率为 $\\hat y=\\operatorname{sigmoid}(z)$，单样本损失为 $L=-y\\log\\hat y-(1-y)\\log(1-\\hat y)$。SGD 按固定种子生成的样本顺序更新参数。",
      },
      assumptions: [
        { "zh-CN": "数据是二维合成玩具样本，显示的准确率是当前训练集准确率。" },
        { "zh-CN": "数据、初始化和训练顺序由同一整数种子确定。" },
      ],
      procedure: [
        { "zh-CN": "选择数据集、隐藏宽度、激活函数、学习率、训练轮数和种子，然后开始训练。" },
        { "zh-CN": "沿时间轴读取同一参数快照的边界、交叉熵和准确率。" },
        { "zh-CN": "使用相同状态重新训练，比较数据点、快照和最终指标是否一致。" },
      ],
      expectedPhenomena: [
        { "zh-CN": "非线性隐藏层能形成弯曲边界；不同种子或优化参数可能到达不同训练结果。" },
        { "zh-CN": "学习率过大时，损失或参数可能快速增大，训练出现发散。" },
      ],
      numericalValidation: [
        {
          "zh-CN":
            "纯模型测试复算种子化数据、同种子重放、训练快照、损失、准确率、取消与无效快照拒绝。",
        },
        {
          "zh-CN":
            "画布与指标使用同一预测函数；主线程从收到的权重重新计算指标，不信任 Worker 自报数值。",
        },
      ],
      limitations: [
        { "zh-CN": "分类边界和准确率对应当前二维样本。" },
        { "zh-CN": "网络使用逐样本 SGD 更新参数。" },
      ],
      relatedConceptIds: ["perceptron-mlp"],
    },
  },
  {
    id: "wave-equation-1d",
    domain: "physics",
    renderer: "svg",
    title: { "zh-CN": "一维波动方程", en: "One-dimensional wave equation" },
    description: { "zh-CN": "改变波速、频率和初始条件，观察位移随时间传播。" },
    scientificReview: {
      observationGoal: {
        "zh-CN": "比较行波、固定端驻波和周期高斯脉冲怎样满足 $u_{tt}=c^2u_{xx}$ 及各自边界条件。",
      },
      mathematicalModel: {
        "zh-CN":
          "行波为 $A\\sin(kx-\\omega t)$，驻波为 $A\\sin(\\pi x/L)\\cos(2\\pi ft)$，其中 $L=c/(2f)$。高斯脉冲以 24 个空间谐波表示，在 $10\\,\\mathrm{m}$ 周期区间内以速度 $c$ 平移。",
      },
      assumptions: [
        {
          "zh-CN":
            "介质均匀，波速 $c$ 为正常数，忽略耗散、驱动和色散。位移、长度、时间的单位分别为 $\\mathrm m$、$\\mathrm m$、$\\mathrm s$。",
        },
        {
          "zh-CN": "高斯模式没有单一频率参数；驻波使用零初速度，行波和高斯的初速度由传播方向确定。",
        },
      ],
      procedure: [
        { "zh-CN": "选择解析解族，调节振幅、波速，以及只在单频模式中有效的频率。" },
        { "zh-CN": "播放或单步时间，比较初始位移、初始速度、区间和边界说明。" },
        { "zh-CN": "读取有限差分对解析公式的 PDE 残差和适用模式的端点误差。" },
      ],
      expectedPhenomena: [
        {
          "zh-CN":
            "行波以速度 $c$ 平移；固定端驻波两端始终为零；周期脉冲跨过右端后从左端连续出现。",
        },
        { "zh-CN": "改变振幅线性缩放位移；高斯模式不响应已隐藏的频率参数。" },
      ],
      numericalValidation: [
        { "zh-CN": "测试复算行波相移、驻波两端节点与周期、高斯周期连续性和初始速度。" },
        {
          "zh-CN":
            "中心差分仅诊断解析解的归一化 PDE 残差；动画采样间隔不被描述为求解器步长或 CFL 稳定条件。",
        },
      ],
      limitations: [
        { "zh-CN": "模型采用恒定波速、线性介质和零阻尼。行波视窗显示无限直线上的一段波形。" },
        { "zh-CN": "周期高斯波形由 24 项谐波近似。残差来自对解析波形的采样和差分计算。" },
      ],
      relatedConceptIds: ["wave-equation"],
    },
  },
  {
    id: "fourier-harmonic-superposition",
    domain: "physics",
    renderer: "svg",
    title: { "zh-CN": "傅里叶谐波叠加", en: "Fourier harmonic superposition" },
    description: { "zh-CN": "逐项加入不同频率的正弦分量，观察部分和逼近周期波形。" },
    scientificReview: {
      observationGoal: {
        "zh-CN": "逐项比较方波、三角波和锯齿波的正弦级数、部分和误差与间断点附近行为。",
      },
      mathematicalModel: {
        "zh-CN":
          "目标函数的周期均为 $2\\pi$。方波的奇次系数为 $4/(\\pi n)$，三角波的奇次系数为 $8(-1)^{(n-1)/2}/(\\pi^2n^2)$，锯齿波的系数为 $2(-1)^{n+1}/(\\pi n)$。",
      },
      assumptions: [
        { "zh-CN": "目标函数按奇函数约定定义；间断点取左右极限的中值 0。" },
        { "zh-CN": "RMSE 使用一个周期内不重复端点的 2048 个中点样本。" },
      ],
      procedure: [
        { "zh-CN": "选择目标波形，逐项增加谐波并读取最新项、最高频次和部分和。" },
        { "zh-CN": "调整相位，比较目标与部分和的同相平移及中点网格 RMSE。" },
        { "zh-CN": "在方波或锯齿波跳点附近观察振荡宽度与峰值超调。" },
      ],
      expectedPhenomena: [
        { "zh-CN": "三角波系数按 $1/n^2$ 衰减，比含跳跃的波形更快逼近目标。" },
        { "zh-CN": "Gibbs 振荡区随项数增加而变窄，但归一化峰值超调不会简单单调消失。" },
      ],
      numericalValidation: [
        { "zh-CN": "测试核对前三组系数、奇偶性、谐波顺序、$2\\pi$ 周期、跳点中值和相位等价性。" },
        {
          "zh-CN":
            "远离跳点的部分和、三角波误差衰减、重复端点排除和 Gibbs 超调均以确定性网格复算。",
        },
      ],
      limitations: [
        { "zh-CN": "部分和保留有限项谐波。RMSE 表示采样点上的均方根误差，跳点误差需单独观察。" },
        { "zh-CN": "峰值位置和超调由离散采样估计，其精度受采样间距影响。" },
      ],
      relatedConceptIds: ["fourier-series"],
    },
  },
  {
    id: "attention-weight-matrix",
    domain: "machine-learning",
    renderer: "svg",
    title: { "zh-CN": "注意力权重矩阵", en: "Attention weight matrix" },
    description: { "zh-CN": "比较 token 间分数、softmax 权重和因果掩码的作用。" },
    scientificReview: {
      observationGoal: {
        "zh-CN": "沿缩放点积注意力的完整计算链检查分数、掩码、行归一化和加权输出。",
      },
      mathematicalModel: {
        "zh-CN":
          "我们先计算 $S=QK^{\\mathsf T}/\\sqrt{d_k}$，再施加掩码并按温度 $\\tau$ 缩放。逐行计算 $A=\\operatorname{softmax}(S/\\tau)$，输出为 $AV$。",
      },
      assumptions: [
        {
          "zh-CN":
            "示例矩阵固定且维度相容，温度为正；因果掩码只允许每个查询读取当前位置及之前的键。",
        },
        { "zh-CN": "实验使用固定 token 向量计算注意力矩阵。" },
      ],
      procedure: [
        { "zh-CN": "选择查询 token，调整 softmax 温度，并切换双向或因果掩码。" },
        {
          "zh-CN": "展开数值流程表，逐项核对 $Q$、$K$、$V$、原始分数、缩放分数、mask、权重和输出。",
        },
        { "zh-CN": "比较所选行的权重和、被掩码位置与 output 的维度。" },
      ],
      expectedPhenomena: [
        { "zh-CN": "每一行未掩码权重之和为 1，因果掩码后的未来位置权重精确为 0。" },
        { "zh-CN": "较低温度使分布更尖锐；$V$ 改变加权输出内容而不改变由 $Q$、$K$ 生成的权重。" },
      ],
      numericalValidation: [
        {
          "zh-CN":
            "测试独立复算 $\\sqrt{d_k}$ 缩放、稳定 softmax、行和、掩码零值、矩阵维度与加权输出。",
        },
        { "zh-CN": "无效温度、全掩码行和不相容矩阵维度会被运行时校验拒绝。" },
      ],
      limitations: [
        { "zh-CN": "注意力权重表示当前查询对各个值向量的加权系数。" },
        { "zh-CN": "实验使用固定的小矩阵，展示单次注意力计算。" },
      ],
      relatedConceptIds: ["attention-mechanism"],
    },
  },
  ...extendedVisualizationManifest,
];

export function visualizationExists(id: string): boolean {
  return visualizationManifest.some((entry) => entry.id === id);
}

export function encodeVisualizationState(state: Readonly<Record<string, unknown>>): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeVisualizationState(value: string): unknown {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
