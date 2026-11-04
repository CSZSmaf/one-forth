import { computingLearningPaths } from "./computing-learning-paths";
import type { LocalizedText } from "@one-forth/registry";
import { conceptById, conceptCatalog } from "./concepts";
import { curriculumData } from "./curriculum/data";
import { migrateLearningPathV2ToV3 } from "./learning-path-migration";
import { seriesLearningExerciseByBookId } from "./series-learning-exercises";

export interface LegacyLearningPathCheckpointV2 {
  readonly id: string;
  readonly afterConceptId: string;
  readonly prompt: LocalizedText;
}

export interface LegacyLearningPathExerciseV2 {
  readonly id: string;
  readonly title: LocalizedText;
  readonly conceptIds: readonly string[];
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly prompt: LocalizedText;
  readonly hint: LocalizedText;
  readonly workedSolution: LocalizedText;
  /** A short, reproducible substitution or invariant check for the worked solution. */
  readonly verification: LocalizedText;
}

export interface LegacyLearningPathV2 {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly audience: LocalizedText;
  /** Concepts that learners are expected to know before entering this path. */
  readonly prerequisites: readonly string[];
  readonly stageGoals: readonly LocalizedText[];
  readonly conceptIds: readonly string[];
  readonly estimatedHours: number;
  readonly checkpoints: readonly LegacyLearningPathCheckpointV2[];
  readonly exercises: readonly LegacyLearningPathExerciseV2[];
  readonly nextPath?: string;
}

export interface LearningPathCheckpoint {
  readonly id: string;
  readonly afterChapterId: string;
  readonly prompt: LocalizedText;
}

export interface LearningPathExercise {
  readonly id: string;
  readonly title: LocalizedText;
  readonly chapterIds: readonly string[];
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly prompt: LocalizedText;
  readonly hint: LocalizedText;
  readonly workedSolution: LocalizedText;
  /** A short, reproducible substitution or invariant check for the worked solution. */
  readonly verification: LocalizedText;
}

interface LearningPathFields {
  readonly id: string;
  readonly title: LocalizedText;
  readonly summary: LocalizedText;
  readonly audience: LocalizedText;
  readonly prerequisiteChapterIds: readonly string[];
  readonly stageGoals: readonly LocalizedText[];
  /** Curated canonical nodes; this is the only ordered sequence used by the route. */
  readonly chapterIds: readonly string[];
  readonly estimatedHours: number;
  readonly checkpoints: readonly LearningPathCheckpoint[];
  readonly exercises: readonly LearningPathExercise[];
  readonly nextPath?: string;
}

export interface LearningPathV3 extends LearningPathFields {
  readonly schemaVersion: 3;
  readonly routeKind?: never;
  readonly sections?: never;
}

export interface LearningPathSection {
  readonly id: string;
  readonly bookId?: string;
  readonly title: LocalizedText;
  readonly goal: LocalizedText;
  readonly chapterIds: readonly string[];
}

export interface LearningPathV4 extends LearningPathFields {
  readonly schemaVersion: 4;
  readonly routeKind: "topic" | "series";
  readonly sections: readonly LearningPathSection[];
}

export type LearningPath = LearningPathV3 | LearningPathV4;

export interface LearningPathConceptProjection {
  /**
   * Derived, alphabetized compatibility projection for legacy subject discovery.
   * It is not a route order and must never drive path rendering.
   */
  readonly conceptIds: readonly string[];
}

export type DiscoverableLearningPath = LearningPathV4 & LearningPathConceptProjection;

export interface LearningPathAlias {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly targetBookId: string;
  readonly reason: LocalizedText;
}

export const requiredRoundTwoLearningPathIds = [
  "calculus-foundations",
  "linear-algebra-foundations",
  "probability-statistics-foundations",
  "mathematics-for-machine-learning",
  "linear-models-to-neural-networks",
  "perceptron-to-transformer",
  "generative-models-foundations",
  "mathematical-physics-methods",
] as const;

export const legacyLearningPathsV2: readonly LegacyLearningPathV2[] = [
  {
    schemaVersion: 2,
    id: "calculus-foundations",
    title: { "zh-CN": "高等数学基础", en: "Calculus foundations" },
    summary: { "zh-CN": "从函数极限进入一元微积分，再过渡到多变量变化率和微分方程。" },
    audience: { "zh-CN": "完成中学代数与基本函数学习，希望系统掌握连续变化语言的学习者。" },
    prerequisites: ["sets-and-mappings", "sequences-and-series", "vectors", "vector-operations"],
    stageGoals: [
      { "zh-CN": "用极限给出连续、导数和积分的严格定义。" },
      { "zh-CN": "使用链式法则、偏导和梯度分析复合多变量函数。" },
      { "zh-CN": "把局部变化与累积量连接到常微分方程。" },
    ],
    conceptIds: [
      "functions-and-graphs",
      "limits-and-continuity",
      "derivatives-and-differentials",
      "chain-rule",
      "integrals-and-accumulation",
      "fundamental-theorem-calculus",
      "partial-derivatives",
      "directional-derivative",
      "gradient",
      "taylor-expansion",
      "ordinary-differential-equations",
    ],
    estimatedHours: 22,
    checkpoints: [
      {
        id: "calculus-local-change",
        afterConceptId: "chain-rule",
        prompt: { "zh-CN": "解释极限如何把平均变化率变成瞬时变化率，并推导一个复合函数的导数。" },
      },
      {
        id: "calculus-multivariable",
        afterConceptId: "gradient",
        prompt: { "zh-CN": "从方向导数公式说明梯度方向结论所需的内积与可微条件。" },
      },
    ],
    exercises: [
      {
        id: "calculus-piecewise-analysis",
        title: { "zh-CN": "分段函数的连续与可微性" },
        conceptIds: ["limits-and-continuity", "derivatives-and-differentials"],
        difficulty: 2,
        prompt: {
          "zh-CN":
            "设 f(x)=ax+b（x<1），f(x)=x²（x≥1）。求 a、b，使 f 在 x=1 处连续且可微，并写出用左右极限与左右导数检验答案的过程。",
        },
        hint: {
          "zh-CN": "先令左右函数值相等，再令左右导数相等；两条方程分别约束 a+b 与 a。",
        },
        workedSolution: {
          "zh-CN":
            "连续要求 a+b=1。左侧导数为 a，右侧导数为 2x，在 x=1 处等于 2，因此 a=2，进而 b=-1。所求左段为 2x-1。",
        },
        verification: {
          "zh-CN":
            "代回可得左极限 2×1-1=1，右侧函数值 1²=1；左导数为 2，右导数 2×1=2，两项条件同时成立。",
        },
      },
      {
        id: "calculus-gradient-model",
        title: { "zh-CN": "构造并解释一个二维目标函数的梯度" },
        conceptIds: ["partial-derivatives", "directional-derivative", "gradient"],
        difficulty: 3,
        prompt: {
          "zh-CN":
            "对 f(x,y)=x²+xy+2y²，求点 (1,-1) 处的梯度，并计算沿单位方向 u=(3/5,4/5) 的方向导数。说明结果的正负意味着什么。",
        },
        hint: {
          "zh-CN": "分别对 x、y 求偏导，再把点坐标代入；方向导数是梯度与单位方向的内积。",
        },
        workedSolution: {
          "zh-CN":
            "∂f/∂x=2x+y，∂f/∂y=x+4y，所以 ∇f(1,-1)=(1,-3)。方向导数为 (1,-3)·(3/5,4/5)=3/5-12/5=-9/5，表示沿 u 的微小正向移动会使 f 下降。",
        },
        verification: {
          "zh-CN":
            "先核对 ‖u‖²=9/25+16/25=1，再直接计算内积得 -9/5；单位方向与梯度公式的前提均满足。",
        },
      },
    ],
    nextPath: "mathematics-for-machine-learning",
  },
  {
    schemaVersion: 2,
    id: "linear-algebra-foundations",
    title: { "zh-CN": "线性代数基础", en: "Linear algebra foundations" },
    summary: { "zh-CN": "从向量和矩阵建立线性空间语言，进入方程组、特征结构与低秩分解。" },
    audience: { "zh-CN": "希望理解矩阵计算、机器学习表示和数值方法基础的学习者。" },
    prerequisites: [],
    stageGoals: [
      { "zh-CN": "用线性组合、张成和基描述有限维空间。" },
      { "zh-CN": "把矩阵同时理解为线性方程组和线性映射。" },
      { "zh-CN": "使用正交投影、特征分解和 SVD 分析数据结构。" },
    ],
    conceptIds: [
      "vectors",
      "vector-operations",
      "linear-combinations",
      "vector-spaces",
      "span-and-basis",
      "matrices",
      "matrix-operations",
      "matrix-multiplication",
      "linear-systems",
      "gaussian-elimination",
      "linear-transformation",
      "determinants",
      "matrix-rank",
      "null-space",
      "eigenvalues-eigenvectors",
      "orthogonality",
      "orthogonal-projection",
      "least-squares",
      "gram-schmidt-process",
      "singular-value-decomposition",
    ],
    estimatedHours: 30,
    checkpoints: [
      {
        id: "linear-algebra-coordinate-system",
        afterConceptId: "span-and-basis",
        prompt: { "zh-CN": "判断一组向量是否构成基，并解释坐标为何依赖基而向量本身不依赖。" },
      },
      {
        id: "linear-algebra-structure",
        afterConceptId: "eigenvalues-eigenvectors",
        prompt: { "zh-CN": "用行列式、秩和特征向量分别说明一个线性变换保留或丢失了什么。" },
      },
    ],
    exercises: [
      {
        id: "linear-algebra-solve-and-interpret",
        title: { "zh-CN": "求解方程组并解释解空间" },
        conceptIds: ["linear-systems", "gaussian-elimination", "null-space"],
        difficulty: 2,
        prompt: {
          "zh-CN":
            "求解方程组 x+y+z=2，2x+2y+2z=4，x-y=0。写出参数形式，并指出对应齐次方程解空间的一组基。",
        },
        hint: {
          "zh-CN": "第二式是第一式的两倍；由第三式先得到 x=y，再选一个自由参数。",
        },
        workedSolution: {
          "zh-CN":
            "令 x=y=t，则 z=2-2t，所以解为 (x,y,z)=(0,0,2)+t(1,1,-2)。对应齐次方程的零空间是一维的，一组基为 {(1,1,-2)}。",
        },
        verification: {
          "zh-CN":
            "把参数解代回：t+t+(2-2t)=2，第二式等于 4，且 t-t=0；方向向量代入齐次方程后每个右端均为 0。",
        },
      },
      {
        id: "linear-algebra-low-rank",
        title: { "zh-CN": "用 SVD 构造低秩近似" },
        conceptIds: ["matrix-rank", "orthogonality", "singular-value-decomposition"],
        difficulty: 3,
        prompt: {
          "zh-CN":
            "矩阵 A=diag(3,1)。写出它的奇异值分解，并给出最佳秩一近似 A₁ 及 Frobenius 范数误差。",
        },
        hint: {
          "zh-CN": "该矩阵已是非负对角矩阵；秩一截断只保留最大的奇异值及其左右奇异向量。",
        },
        workedSolution: {
          "zh-CN":
            "可取 U=I、Σ=diag(3,1)、V=I，奇异值为 3 和 1。保留首项得到 A₁=diag(3,0)，误差 A-A₁=diag(0,1)，故 ‖A-A₁‖F=1。",
        },
        verification: {
          "zh-CN": "直接相乘 UΣVᵀ=A；A₁ 只有一个非零奇异值所以秩为 1，误差平方和为 0²+1²=1。",
        },
      },
    ],
    nextPath: "mathematics-for-machine-learning",
  },
  {
    schemaVersion: 2,
    id: "probability-statistics-foundations",
    title: { "zh-CN": "概率统计基础", en: "Probability and statistics foundations" },
    summary: { "zh-CN": "从事件与条件概率进入随机变量、极限定理、估计和假设检验。" },
    audience: { "zh-CN": "需要为数据分析、机器学习或随机建模建立概率推断基础的学习者。" },
    prerequisites: [
      "sets-and-mappings",
      "logic-and-quantifiers",
      "functions-and-graphs",
      "integrals-and-accumulation",
      "sequences-and-series",
      "optimization-objectives",
    ],
    stageGoals: [
      { "zh-CN": "使用条件概率和 Bayes 定理更新不确定性。" },
      { "zh-CN": "从分布计算期望、方差与联合依赖。" },
      { "zh-CN": "由抽样分布构造估计、区间和检验。" },
    ],
    conceptIds: [
      "probability-axioms",
      "combinatorial-probability",
      "conditional-probability",
      "bayes-theorem",
      "random-variables-distributions",
      "discrete-distributions",
      "continuous-distributions",
      "joint-distributions",
      "expectation-variance-covariance",
      "law-large-numbers",
      "central-limit-theorem",
      "sampling-distributions",
      "statistical-estimation",
      "maximum-likelihood-estimation",
      "confidence-intervals",
      "hypothesis-testing",
    ],
    estimatedHours: 28,
    checkpoints: [
      {
        id: "probability-conditioning",
        afterConceptId: "bayes-theorem",
        prompt: { "zh-CN": "为一个诊断问题写出先验、似然、证据和后验，并解释基率。" },
      },
      {
        id: "statistics-sampling",
        afterConceptId: "sampling-distributions",
        prompt: { "zh-CN": "说明样本均值的标准误如何随样本量变化，以及中心极限定理提供了什么。" },
      },
    ],
    exercises: [
      {
        id: "probability-joint-model",
        title: { "zh-CN": "从联合分布计算边缘、条件与协方差" },
        conceptIds: ["joint-distributions", "expectation-variance-covariance"],
        difficulty: 3,
        prompt: {
          "zh-CN":
            "二元随机变量 X、Y 只取 0 或 1，联合概率依次为 P(0,0)=0.1、P(0,1)=0.2、P(1,0)=0.3、P(1,1)=0.4。求 P(X=1)、P(Y=1)、P(X=1|Y=1) 与 Cov(X,Y)。",
        },
        hint: {
          "zh-CN": "先按行列求边缘概率；对 0-1 变量有 E[X]=P(X=1)，且 E[XY]=P(X=1,Y=1)。",
        },
        workedSolution: {
          "zh-CN":
            "P(X=1)=0.3+0.4=0.7，P(Y=1)=0.2+0.4=0.6，P(X=1|Y=1)=0.4/0.6=2/3。E[XY]=0.4，因此 Cov(X,Y)=0.4-(0.7)(0.6)=-0.02。",
        },
        verification: {
          "zh-CN":
            "四个格子的概率和为 1；条件分布中 P(X=0|Y=1)=1/3，与 2/3 相加为 1；协方差计算为 0.40-0.42=-0.02。",
        },
      },
      {
        id: "statistics-inference-design",
        title: { "zh-CN": "设计一个估计区间与检验流程" },
        conceptIds: ["statistical-estimation", "confidence-intervals", "hypothesis-testing"],
        difficulty: 4,
        prompt: {
          "zh-CN":
            "100 次独立试验中成功 60 次。用正态近似给出成功率的 95% Wald 区间，并检验 H₀:p=0.5 对 H₁:p≠0.5（显著性水平 0.05）。同时说明近似方法的限制。",
        },
        hint: {
          "zh-CN": "区间标准误用 √[p̂(1-p̂)/n]；原假设检验的标准误应在 p₀=0.5 下计算。",
        },
        workedSolution: {
          "zh-CN":
            "p̂=0.60。区间标准误 √(0.6×0.4/100)≈0.04899，故 95% Wald 区间为 0.60±1.96×0.04899≈[0.504,0.696]。检验统计量 z=(0.60-0.50)/√(0.5×0.5/100)=2.00，双侧 p 值约 0.0455，因此在 0.05 水平拒绝 H₀。Wald 区间在样本小或比例接近 0、1 时可能不可靠。",
        },
        verification: {
          "zh-CN":
            "区间端点均在 [0,1] 内；z=2.00 对应双侧尾概率约 2×0.02275=0.0455，小于 0.05，与检验结论一致。",
        },
      },
    ],
    nextPath: "mathematics-for-machine-learning",
  },
  {
    schemaVersion: 2,
    id: "mathematics-for-machine-learning",
    title: { "zh-CN": "机器学习数学基础", en: "Mathematics for machine learning" },
    summary: { "zh-CN": "把线性代数、多变量微分、概率矩和优化连接为机器学习的统一计算语言。" },
    audience: { "zh-CN": "已经接触基础微积分和矩阵，希望进入模型训练机制的学习者。" },
    prerequisites: [
      "linear-combinations",
      "directional-derivative",
      "random-variables-distributions",
      "orthogonal-projection",
      "linear-systems",
      "first-order-optimality",
    ],
    stageGoals: [
      { "zh-CN": "用向量和矩阵表达数据、参数与线性模型。" },
      { "zh-CN": "用梯度和概率矩解释训练目标的局部变化与噪声。" },
      { "zh-CN": "推导最小二乘与梯度下降的基本更新。" },
    ],
    conceptIds: [
      "vectors",
      "matrices",
      "linear-transformation",
      "gradient",
      "expectation-variance-covariance",
      "least-squares",
      "gradient-descent",
    ],
    estimatedHours: 14,
    checkpoints: [
      {
        id: "ml-math-linear-model",
        afterConceptId: "linear-transformation",
        prompt: { "zh-CN": "把一个批量线性预测写成矩阵乘法，并标出每个张量的形状。" },
      },
      {
        id: "ml-math-optimization",
        afterConceptId: "gradient-descent",
        prompt: { "zh-CN": "从平方损失推导一个参数更新，并说明步长过大时的行为。" },
      },
    ],
    exercises: [
      {
        id: "ml-math-least-squares",
        title: { "zh-CN": "从投影到最小二乘回归" },
        conceptIds: ["least-squares", "linear-transformation"],
        difficulty: 2,
        prompt: {
          "zh-CN":
            "用模型 y=b+wx 拟合三个点 (0,1)、(1,3)、(2,5)。写出设计矩阵、最小二乘参数和残差，并用正规方程核验。",
        },
        hint: {
          "zh-CN": "把每个样本写成一行 [1,x]；这三个点恰好共线，先观察斜率再检查 Xᵀr。",
        },
        workedSolution: {
          "zh-CN":
            "X=[[1,0],[1,1],[1,2]]，y=[1,3,5]ᵀ。直线为 y=1+2x，所以参数 (b,w)=(1,2)，预测恰为 [1,3,5]ᵀ，残差 r=y-Xβ=0。",
        },
        verification: {
          "zh-CN": "计算 Xβ 得 [1,3,5]ᵀ；因此 Xᵀr=[0,0]ᵀ，正规方程 XᵀXβ=Xᵀy 成立，残差平方和为 0。",
        },
      },
      {
        id: "ml-math-noisy-gradient",
        title: { "zh-CN": "比较确定梯度与带噪梯度" },
        conceptIds: ["expectation-variance-covariance", "gradient", "gradient-descent"],
        difficulty: 3,
        prompt: {
          "zh-CN":
            "在参数 θ=2、学习率 η=0.1 时，四个样本给出的梯度为 1、3、-1、1。求样本梯度均值与总体方差，比较用均值更新一次和随机选一个梯度更新的结果。",
        },
        hint: {
          "zh-CN": "先求四个数的算术平均；总体方差的分母取 4。每次更新都使用 θ₊=θ-ηg。",
        },
        workedSolution: {
          "zh-CN":
            "梯度均值为 (1+3-1+1)/4=1，总体方差为 [0²+2²+(-2)²+0²]/4=2。均值更新得到 θ₊=1.9；四种随机单样本更新分别为 1.9、1.7、2.1、1.9，平均仍为 1.9，但单次更新有波动。",
        },
        verification: {
          "zh-CN":
            "四个随机更新的均值 (1.9+1.7+2.1+1.9)/4=1.9，恰与均值梯度更新相同；梯度平方偏差之和为 8，除以 4 得 2。",
        },
      },
    ],
    nextPath: "linear-models-to-neural-networks",
  },
  {
    schemaVersion: 2,
    id: "linear-models-to-neural-networks",
    title: { "zh-CN": "从线性模型到神经网络", en: "From linear models to neural networks" },
    summary: { "zh-CN": "从监督学习和线性分类进入损失、泛化、多层感知机与反向传播。" },
    audience: { "zh-CN": "完成机器学习数学基础，希望理解神经网络为何能够训练的学习者。" },
    prerequisites: [
      "functions-and-graphs",
      "probability-axioms",
      "least-squares",
      "expectation-variance-covariance",
      "conditional-probability",
      "maximum-likelihood-estimation",
      "sampling-distributions",
      "optimization-objectives",
      "linear-transformation",
      "derivatives-and-differentials",
      "chain-rule",
      "graph-algorithms",
    ],
    stageGoals: [
      { "zh-CN": "比较回归、分类和评价指标的建模目标。" },
      { "zh-CN": "区分经验风险、过拟合与正则化的作用。" },
      { "zh-CN": "沿计算图推导多层网络的反向梯度。" },
    ],
    conceptIds: [
      "supervised-learning",
      "linear-regression",
      "logistic-regression",
      "loss-functions",
      "model-evaluation",
      "overfitting-generalization",
      "regularization",
      "empirical-risk-minimization",
      "perceptron-mlp",
      "activation-functions",
      "computation-graphs",
      "backpropagation",
    ],
    estimatedHours: 24,
    checkpoints: [
      {
        id: "linear-models-objectives",
        afterConceptId: "loss-functions",
        prompt: { "zh-CN": "为回归和二分类分别选择输出解释、损失函数与评价指标。" },
      },
      {
        id: "neural-model-gradient",
        afterConceptId: "backpropagation",
        prompt: { "zh-CN": "为两层感知机画出计算图并逐节点计算局部导数。" },
      },
    ],
    exercises: [
      {
        id: "linear-models-bias-variance",
        title: { "zh-CN": "诊断过拟合并选择正则化" },
        conceptIds: ["model-evaluation", "overfitting-generalization", "regularization"],
        difficulty: 2,
        prompt: {
          "zh-CN":
            "同一数据划分上，三种多项式模型的（训练误差，验证误差）分别为：1 次 (4.2,4.8)、3 次 (1.1,1.5)、9 次 (0.1,4.9)。选择用于当前验证分布的模型，诊断另外两者，并说明 L2 正则化主要会怎样影响 9 次模型。",
        },
        hint: {
          "zh-CN": "模型选择只比较验证误差；同时观察训练误差和验证误差的差距来区分欠拟合与过拟合。",
        },
        workedSolution: {
          "zh-CN":
            "应选择 3 次模型，因为验证误差 1.5 最小。1 次模型训练与验证误差都高，表现为欠拟合；9 次模型训练误差极低但验证误差升高，表现为过拟合。L2 正则化惩罚大系数，通常会降低 9 次模型的有效复杂度。",
        },
        verification: {
          "zh-CN":
            "验证误差的数值排序是 1.5<4.8<4.9；训练—验证差距依次为 0.6、0.4、4.8，9 次模型的泛化差距显著最大。",
        },
      },
      {
        id: "mlp-backpropagation",
        title: { "zh-CN": "手算小型 MLP 的前向值与反向梯度" },
        conceptIds: ["perceptron-mlp", "activation-functions", "backpropagation"],
        difficulty: 4,
        prompt: {
          "zh-CN":
            "输入 x=(1,2)。隐藏层预激活 z=(x₁+x₂,x₁-x₂)，激活 h=ReLU(z)，输出 ŷ=2h₁-h₂，目标 y=4，损失 L=(ŷ-y)²/2。计算前向值、输出权重梯度与输入梯度。",
        },
        hint: {
          "zh-CN": "先确定两个 ReLU 门的导数；反向时从 ∂L/∂ŷ=ŷ-y 开始逐层乘局部导数。",
        },
        workedSolution: {
          "zh-CN":
            "z=(3,-1)，h=(3,0)，ŷ=6，L=2，且 ∂L/∂ŷ=2。对输出权重 (2,-1) 的梯度为 2h=(6,0)。传到 h 的梯度为 (4,-2)，经过 ReLU 门得到 ∂L/∂z=(4,0)。由 z₁=x₁+x₂、z₂=x₁-x₂，输入梯度为 (4,4)。",
        },
        verification: {
          "zh-CN":
            "沿方向 (ε,0) 扰动输入且保持 ReLU 门不变时，ŷ 增量为 2ε、损失一阶增量约 (ŷ-y)2ε=4ε，与 ∂L/∂x₁=4 一致；x₂ 同理。",
        },
      },
    ],
    nextPath: "perceptron-to-transformer",
  },
  {
    schemaVersion: 2,
    id: "perceptron-to-transformer",
    title: { "zh-CN": "从感知机到 Transformer", en: "From perceptron to Transformer" },
    summary: { "zh-CN": "沿梯度流、卷积、循环、注意力和残差结构理解现代神经网络。" },
    audience: { "zh-CN": "已经理解反向传播，希望系统比较主要神经网络架构的学习者。" },
    prerequisites: [
      "linear-transformation",
      "supervised-learning",
      "loss-functions",
      "functions-and-graphs",
      "derivatives-and-differentials",
      "expectation-variance-covariance",
      "matrix-multiplication",
      "chain-rule",
      "graph-algorithms",
      "stochastic-gradient-descent",
      "adaptive-optimizers",
      "conditional-probability",
      "vectors",
      "trigonometric-functions",
    ],
    stageGoals: [
      { "zh-CN": "解释初始化、归一化与残差连接如何影响梯度传播。" },
      { "zh-CN": "比较卷积、循环和注意力对结构先验的编码方式。" },
      { "zh-CN": "拆解 Transformer 的自注意力、位置和前馈子层。" },
    ],
    conceptIds: [
      "perceptron-mlp",
      "activation-functions",
      "initialization-gradient-flow",
      "computation-graphs",
      "backpropagation",
      "neural-network-optimization",
      "batch-normalization",
      "residual-connections",
      "convolutional-neural-networks",
      "recurrent-networks-lstm-gru",
      "sequence-modeling",
      "attention-mechanism",
      "self-attention",
      "positional-encoding",
      "transformer",
    ],
    estimatedHours: 32,
    checkpoints: [
      {
        id: "deep-learning-gradient-flow",
        afterConceptId: "residual-connections",
        prompt: { "zh-CN": "比较初始化、批归一化和残差连接改善深层训练的不同机制。" },
      },
      {
        id: "transformer-attention",
        afterConceptId: "transformer",
        prompt: { "zh-CN": "写出多头自注意力的形状变化，并解释位置编码为何必要。" },
      },
    ],
    exercises: [
      {
        id: "architecture-comparison",
        title: { "zh-CN": "为图像和长序列任务比较 CNN、RNN 与注意力" },
        conceptIds: [
          "convolutional-neural-networks",
          "recurrent-networks-lstm-gru",
          "attention-mechanism",
        ],
        difficulty: 3,
        prompt: {
          "zh-CN":
            "把三种结构先验与架构配对：A. 局部共享卷积核；B. 按时间递推的隐藏状态；C. 任意位置间直接计算内容相关权重。再为二维局部纹理识别、严格在线逐步预测、长距离依赖检索各选一种首选架构并说明理由。",
        },
        hint: {
          "zh-CN": "关注每种架构原生限制的信息流：局部邻域、顺序状态，或全局两两交互。",
        },
        workedSolution: {
          "zh-CN":
            "A 对应 CNN，B 对应 RNN，C 对应注意力。二维局部纹理优先 CNN，因为空间局部性与权重共享匹配任务；严格在线逐步预测优先 RNN，因为状态可随新输入递推；长距离依赖检索优先注意力，因为远距离位置可直接交互。",
        },
        verification: {
          "zh-CN":
            "逐项检查信息路径：CNN 单层只访问局部感受野，RNN 的第 t 步只需上一状态与当前输入，注意力分数矩阵包含每个查询到所有键的条目；三种描述一一对应。",
        },
      },
      {
        id: "transformer-block",
        title: { "zh-CN": "逐层追踪一个 Transformer 块" },
        conceptIds: [
          "self-attention",
          "positional-encoding",
          "residual-connections",
          "transformer",
        ],
        difficulty: 4,
        prompt: {
          "zh-CN":
            "批量 B=2、序列长度 T=4、模型维度 d_model=8，使用 h=2 个注意力头，因此每头 d_k=4。写出分头后的 Q、K、V、注意力分数、拼接输出以及残差相加前后的张量形状。",
        },
        hint: {
          "zh-CN": "每个头把最后一维 8 拆成 2×4；每个查询位置都要与同一头的 4 个键位置计算分数。",
        },
        workedSolution: {
          "zh-CN":
            "分头后的 Q、K、V 形状均为 (B,h,T,d_k)=(2,2,4,4)。QKᵀ 的分数形状为 (2,2,4,4)，乘 V 后每头输出仍为 (2,2,4,4)。拼接两头得到 (2,4,8)，输出投影不改变该形状，因此可与输入残差相加，结果仍为 (2,4,8)。",
        },
        verification: {
          "zh-CN":
            "检查最后维度 h×d_k=2×4=8；分数矩阵的末两维分别是查询位置数 T=4 和键位置数 T=4；残差两侧形状完全相同。",
        },
      },
    ],
    nextPath: "generative-models-foundations",
  },
  {
    schemaVersion: 2,
    id: "generative-models-foundations",
    title: { "zh-CN": "生成模型入门", en: "Generative models foundations" },
    summary: { "zh-CN": "比较潜变量、重建、对抗、流、能量、得分和扩散等生成建模路线。" },
    audience: { "zh-CN": "具有概率和神经网络基础，希望理解现代生成模型差异的学习者。" },
    prerequisites: [
      "random-variables-distributions",
      "maximum-likelihood-estimation",
      "neural-network-optimization",
      "joint-distributions",
      "bayesian-inference",
      "perceptron-mlp",
      "loss-functions",
      "principal-component-analysis",
      "logistic-regression",
      "model-evaluation",
      "conditional-probability",
      "sequence-modeling",
      "jacobian-matrix",
      "determinants",
      "optimization-objectives",
      "monte-carlo-methods",
      "gradient",
      "continuous-distributions",
      "markov-chains",
    ],
    stageGoals: [
      { "zh-CN": "区分显式密度、隐式生成和潜变量模型的训练目标。" },
      { "zh-CN": "解释 VAE、GAN 与归一化流各自的可计算量和限制。" },
      { "zh-CN": "从得分函数和 Markov 过程理解扩散模型。" },
    ],
    conceptIds: [
      "generative-models",
      "latent-variable-models",
      "autoencoders",
      "variational-autoencoders",
      "binary-classification",
      "generative-adversarial-networks",
      "autoregressive-generative-models",
      "normalizing-flows",
      "energy-based-models",
      "score-matching",
      "diffusion-models",
    ],
    estimatedHours: 28,
    checkpoints: [
      {
        id: "generative-likelihood-latent",
        afterConceptId: "variational-autoencoders",
        prompt: { "zh-CN": "说明潜变量边缘似然为何困难，以及 VAE 的证据下界如何处理它。" },
      },
      {
        id: "generative-diffusion",
        afterConceptId: "diffusion-models",
        prompt: { "zh-CN": "把前向加噪、得分学习和反向采样三个阶段连接为完整生成过程。" },
      },
    ],
    exercises: [
      {
        id: "generative-objective-table",
        title: { "zh-CN": "比较 VAE、GAN、Flow 和扩散模型的目标与采样" },
        conceptIds: [
          "variational-autoencoders",
          "generative-adversarial-networks",
          "normalizing-flows",
          "diffusion-models",
        ],
        difficulty: 3,
        prompt: {
          "zh-CN":
            "将四条特征与 VAE、GAN、归一化流、扩散模型一一配对：①优化变分下界；②生成器与判别器对抗；③可逆变换配合 Jacobian 行列式给出精确似然；④从噪声开始多步去噪。并指出哪一种通常可直接计算精确对数似然。",
        },
        hint: {
          "zh-CN": "分别寻找“变分”“对抗”“可逆变换”“逐步去噪”四个定义性关键词。",
        },
        workedSolution: {
          "zh-CN":
            "①VAE，②GAN，③归一化流，④扩散模型。四者中，归一化流通过可逆映射和变量替换公式通常能直接计算精确对数似然；VAE 优化的是下界，GAN 不以显式似然为训练目标，常见扩散实现使用多步生成。",
        },
        verification: {
          "zh-CN":
            "逐项核对训练所需量：VAE 含编码分布与 KL 项，GAN 含生成器/判别器两方目标，Flow 需要可逆 Jacobian，扩散采样按时间步反演；四个线索没有重复归属。",
        },
      },
      {
        id: "generative-score-process",
        title: { "zh-CN": "从一维分布推导得分并设计去噪步骤" },
        conceptIds: ["score-matching", "diffusion-models"],
        difficulty: 4,
        prompt: {
          "zh-CN":
            "目标密度为 N(0,4)。推导得分 s(x)=d log p(x)/dx，计算 s(2)，并用简化更新 x₊=x+εs(x)、ε=0.4 做一步去噪。判断这一步是否朝高密度区域移动。",
        },
        hint: {
          "zh-CN": "忽略与 x 无关的常数，log p(x)=-x²/(2σ²)+常数，且 σ²=4。",
        },
        workedSolution: {
          "zh-CN":
            "log p(x)=-x²/8+常数，所以 s(x)=-x/4。s(2)=-0.5，更新得到 x₊=2+0.4×(-0.5)=1.8。由于均值为 0，这一步减小了 |x|，向更高密度区域移动。",
        },
        verification: {
          "zh-CN":
            "更新前 x²=4，更新后 x²=3.24；在 log p(x)=-x²/8+常数中，负二次项由 -0.5 增至 -0.405，因此对数密度确实增加 0.095。",
        },
      },
    ],
  },
  {
    schemaVersion: 2,
    id: "mathematical-physics-methods",
    title: { "zh-CN": "数学物理方法基础", en: "Mathematical physics methods" },
    summary: { "zh-CN": "由微分方程、本征函数和傅里叶方法进入波动、边值问题与基础量子模型。" },
    audience: { "zh-CN": "完成多变量微积分和线性代数，希望进入波动与量子方程的学习者。" },
    prerequisites: [
      "derivatives-and-differentials",
      "integrals-and-accumulation",
      "partial-differential-equations",
      "orthogonality",
      "trigonometric-functions",
      "functions-and-graphs",
      "linear-combinations",
      "partial-derivatives",
      "newton-laws",
      "eigenvalues-eigenvectors",
      "complex-numbers",
      "vector-spaces",
      "probability-axioms",
      "linear-transformation",
      "hamiltonian-mechanics",
    ],
    stageGoals: [
      { "zh-CN": "把初值、边值和本征值问题区分为不同的解选择机制。" },
      { "zh-CN": "用傅里叶与 Sturm–Liouville 展开解释线性波动的模态结构。" },
      { "zh-CN": "把同一边值与本征函数语言迁移到无限深方势阱。" },
    ],
    conceptIds: [
      "ordinary-differential-equations",
      "boundary-value-problems",
      "sturm-liouville",
      "fourier-series",
      "harmonic-oscillator",
      "wave-parameters",
      "superposition-principle",
      "wave-equation",
      "boundary-conditions-waves",
      "standing-waves",
      "normal-modes",
      "quantum-states",
      "operators-observables",
      "schrodinger-equation",
      "infinite-square-well",
    ],
    estimatedHours: 34,
    checkpoints: [
      {
        id: "math-physics-eigenmodes",
        afterConceptId: "normal-modes",
        prompt: { "zh-CN": "从固定端边界推导允许波数，并说明本征函数正交性如何展开任意初始形状。" },
      },
      {
        id: "math-physics-quantum-well",
        afterConceptId: "infinite-square-well",
        prompt: { "zh-CN": "比较弦驻波与势阱波函数的边界条件、本征值和物理解释。" },
      },
    ],
    exercises: [
      {
        id: "wave-mode-expansion",
        title: { "zh-CN": "展开弦的初始位移并预测时间演化" },
        conceptIds: ["fourier-series", "wave-equation", "normal-modes"],
        difficulty: 4,
        prompt: {
          "zh-CN":
            "长度为 L、两端固定、波速为 c 的弦满足零初速度，初位移 u(x,0)=3sin(πx/L)-2sin(2πx/L)。写出 u(x,t)，并求 t=L/(2c) 时的位移。",
        },
        hint: {
          "zh-CN": "零初速度使每个正弦空间模态只乘 cos(ωₙt)，其中 ωₙ=nπc/L。",
        },
        workedSolution: {
          "zh-CN":
            "u(x,t)=3sin(πx/L)cos(πct/L)-2sin(2πx/L)cos(2πct/L)。当 t=L/(2c) 时，两个时间因子分别为 cos(π/2)=0 与 cos(π)=-1，所以 u(x,t)=2sin(2πx/L)。",
        },
        verification: {
          "zh-CN":
            "令 t=0 可恢复给定初位移，时间导数在 t=0 为 0；令 x=0 或 x=L 时所有正弦项为 0，固定端边界在任意时刻均成立。",
        },
      },
      {
        id: "square-well-spectrum",
        title: { "zh-CN": "求无限深方势阱前三个本征态" },
        conceptIds: ["schrodinger-equation", "boundary-value-problems", "infinite-square-well"],
        difficulty: 4,
        prompt: {
          "zh-CN":
            "粒子处于 0<x<L 的一维无限深方势阱。写出前三个归一化定态波函数与能量，并给出 E₁:E₂:E₃。",
        },
        hint: {
          "zh-CN": "边界条件 ψ(0)=ψ(L)=0 把波数限制为 kₙ=nπ/L；归一化常数由正弦平方积分确定。",
        },
        workedSolution: {
          "zh-CN":
            "对 n=1,2,3，ψₙ(x)=√(2/L)sin(nπx/L)，Eₙ=n²π²ℏ²/(2mL²)。因此前三个能量分别为 E₁、4E₁、9E₁，比例 E₁:E₂:E₃=1:4:9。",
        },
        verification: {
          "zh-CN":
            "每个 ψₙ 在 x=0、L 都为 0；∫₀ᴸ|ψₙ|²dx=(2/L)(L/2)=1；把 kₙ=nπ/L 代入 E=ℏ²k²/(2m) 得到 n² 能级规律。",
        },
      },
    ],
  },
];

export const learningPathAliases: readonly LearningPathAlias[] = [
  {
    schemaVersion: 1,
    id: "calculus-foundations",
    targetBookId: "m02",
    reason: { "zh-CN": "该基础课程已经由《单变量微积分》教材承接。" },
  },
  {
    schemaVersion: 1,
    id: "linear-algebra-foundations",
    targetBookId: "m04",
    reason: { "zh-CN": "该基础课程已经由《线性代数》教材承接。" },
  },
  {
    schemaVersion: 1,
    id: "probability-statistics-foundations",
    targetBookId: "m05",
    reason: { "zh-CN": "该基础课程从《概率论》教材开始，并由教材系列继续组织统计内容。" },
  },
];

export const requiredTopicalLearningPathIds = [
  "mathematics-for-machine-learning",
  "linear-models-to-neural-networks",
  "perceptron-to-transformer",
  "generative-models-foundations",
  "mathematical-physics-methods",
  "scientific-machine-learning",
  "analysis-real-complex-functional",
  "algebra-and-discrete-structures",
  "geometry-and-topology",
  "numerical-analysis-and-optimization",
  "probability-to-mathematical-statistics",
  "classical-to-analytical-mechanics",
  "waves-and-electromagnetism",
  "thermodynamics-and-statistical-physics",
  "quantum-mechanics-to-field-theory",
  "computer-science-foundations",
  "computer-systems",
  "networks-and-databases",
] as const;

export const requiredSeriesLearningPathIds = [
  "mathematics-complete",
  "physics-complete",
  "computer-science-complete",
  "artificial-intelligence-complete",
] as const;

const legacyLearningPathById = new Map(
  legacyLearningPathsV2.map((path) => [path.id, path] as const),
);

function resolveCanonicalChapterId(conceptId: string): string | undefined {
  return conceptById.get(conceptId)?.canonicalLocation.chapterId;
}

function requireLegacyLearningPath(id: string): LegacyLearningPathV2 {
  const path = legacyLearningPathById.get(id);
  if (!path) throw new Error(`Missing legacy learning path "${id}"`);
  return path;
}

function withConceptProjection(path: LearningPathV4): DiscoverableLearningPath {
  const chapterIds = new Set(path.chapterIds);
  return {
    ...path,
    conceptIds: conceptCatalog
      .filter((concept) => chapterIds.has(concept.canonicalLocation.chapterId))
      .map((concept) => concept.id)
      .sort(),
  };
}

const curriculumChapterById = new Map(
  curriculumData.chapters.map((chapter) => [chapter.id, chapter] as const),
);

export function migrateLearningPathV3ToV4(
  path: LearningPathV3,
  routeKind: "topic" | "series" = "topic",
  authoredSections?: readonly LearningPathSection[],
): LearningPathV4 {
  const sectionCount = Math.max(1, Math.min(path.stageGoals.length, path.chapterIds.length));
  const sections =
    authoredSections ??
    Array.from({ length: sectionCount }, (_, index) => {
      const start = Math.floor((index * path.chapterIds.length) / sectionCount);
      const end = Math.floor(((index + 1) * path.chapterIds.length) / sectionCount);
      return {
        id: `${path.id}-stage-${index + 1}`,
        title: { "zh-CN": `阶段 ${index + 1}` },
        goal: path.stageGoals[index] ?? path.summary,
        chapterIds: path.chapterIds.slice(start, end),
      } satisfies LearningPathSection;
    });
  return {
    ...path,
    schemaVersion: 4,
    routeKind,
    sections,
  };
}

const seriesPathMetadata: Readonly<
  Record<
    string,
    {
      readonly id: (typeof requiredSeriesLearningPathIds)[number];
      readonly title: LocalizedText;
      readonly summary: LocalizedText;
      readonly audience: LocalizedText;
    }
  >
> = {
  mathematics: {
    id: "mathematics-complete",
    title: { "zh-CN": "数学学习路线", en: "Complete mathematics series" },
    summary: { "zh-CN": "按教材顺序学习数学基础、分析、代数、几何、概率统计与数值方法。" },
    audience: { "zh-CN": "希望系统完成 One Forth 数学教材，并以每册复习章检查掌握程度的学习者。" },
  },
  physics: {
    id: "physics-complete",
    title: { "zh-CN": "物理学习路线", en: "Complete physics series" },
    summary: { "zh-CN": "从量纲与测量出发，依次学习力学、场、热、量子、相对论与计算物理。" },
    audience: { "zh-CN": "具备微积分和线性代数基础，希望建立完整本科物理结构的学习者。" },
  },
  "computer-science": {
    id: "computer-science-complete",
    title: { "zh-CN": "计算机学习路线", en: "Computer science curriculum" },
    summary: { "zh-CN": "依次学习编程、算法、计算机组成、操作系统、网络与数据库。" },
    audience: { "zh-CN": "适合具备基础代数知识、准备学习计算机专业课程的读者。" },
  },
  "artificial-intelligence": {
    id: "artificial-intelligence-complete",
    title: { "zh-CN": "人工智能学习路线", en: "Artificial intelligence curriculum" },
    summary: { "zh-CN": "学习机器学习、神经网络、生成模型、强化学习与智能体。" },
    audience: { "zh-CN": "适合具备编程、线性代数、微积分和概率基础的读者。" },
  },
};

function buildSeriesLearningPath(seriesId: string): LearningPathV4 {
  const series = curriculumData.series.find((candidate) => candidate.id === seriesId);
  const metadata = seriesPathMetadata[seriesId];
  if (!series || !metadata)
    throw new Error(`Missing learning-path series metadata for ${seriesId}`);
  const books = series.bookIds.map((bookId) => {
    const book = curriculumData.books.find((candidate) => candidate.id === bookId);
    if (!book) throw new Error(`Series ${seriesId} references missing book ${bookId}`);
    return book;
  });
  const chapterIdsByBook = new Map(
    books.map((book) => {
      const partOrderById = new Map(book.partIds.map((partId, index) => [partId, index] as const));
      return [
        book.id,
        curriculumData.chapters
          .filter((chapter) => chapter.bookId === book.id)
          .sort(
            (left, right) =>
              (partOrderById.get(left.partId) ?? Number.MAX_SAFE_INTEGER) -
                (partOrderById.get(right.partId) ?? Number.MAX_SAFE_INTEGER) ||
              left.order - right.order ||
              left.id.localeCompare(right.id, "en"),
          )
          .map((chapter) => chapter.id),
      ] as const;
    }),
  );
  const sections: readonly LearningPathSection[] = books.map((book) => ({
    id: `${metadata.id}-${book.id}`,
    bookId: book.id,
    title: book.title,
    goal: book.introduction,
    chapterIds: chapterIdsByBook.get(book.id) ?? [],
  }));
  const chapterIds = sections.flatMap((section) => section.chapterIds);
  const routeChapterIds = new Set(chapterIds);
  const prerequisiteChapterIds = [
    ...new Set(
      chapterIds.flatMap(
        (chapterId) =>
          curriculumChapterById
            .get(chapterId)
            ?.prerequisiteChapterIds.filter(
              (prerequisiteId) => !routeChapterIds.has(prerequisiteId),
            ) ?? [],
      ),
    ),
  ];
  const checkpoints: readonly LearningPathCheckpoint[] = books.map((book) => ({
    id: `${metadata.id}-${book.id}-checkpoint`,
    afterChapterId: book.reviewChapterId,
    prompt: {
      "zh-CN": `完成《${book.title["zh-CN"]}》后，检查各章练习的解答，并说明计算中使用的条件。`,
    },
  }));
  const exercises: readonly LearningPathExercise[] = books.map((book) => {
    const bookChapterIds = chapterIdsByBook.get(book.id) ?? [];
    const spec = seriesLearningExerciseByBookId[book.id];
    if (!spec) {
      throw new Error(`Missing authored series synthesis exercise for ${book.id}`);
    }
    if (spec.sourceChapterId !== book.reviewChapterId) {
      throw new Error(
        `Series synthesis exercise ${book.id} must be sourced from review chapter ${book.reviewChapterId}`,
      );
    }
    const sourceChapter = curriculumChapterById.get(spec.sourceChapterId);
    if (!sourceChapter || sourceChapter.plannedExercises.length === 0) {
      throw new Error(
        `Series synthesis exercise ${book.id} needs a real review-chapter exercise blueprint`,
      );
    }
    if (spec.chapterIds.length < 2 || !spec.chapterIds.includes(book.reviewChapterId)) {
      throw new Error(
        `Series synthesis exercise ${book.id} must connect multiple chapters including ${book.reviewChapterId}`,
      );
    }
    const bookChapterIdSet = new Set(bookChapterIds);
    const foreignChapterId = spec.chapterIds.find((chapterId) => !bookChapterIdSet.has(chapterId));
    if (foreignChapterId) {
      throw new Error(
        `Series synthesis exercise ${book.id} references chapter ${foreignChapterId} outside the book`,
      );
    }
    return {
      id: `${metadata.id}-${book.id}-synthesis`,
      title: { "zh-CN": `《${book.title["zh-CN"]}》综合练习` },
      chapterIds: spec.chapterIds,
      difficulty: book.level === "foundation" ? 3 : book.level === "undergraduate" ? 4 : 5,
      prompt: { "zh-CN": spec.prompt },
      hint: { "zh-CN": spec.hint },
      workedSolution: { "zh-CN": spec.workedSolution },
      verification: { "zh-CN": spec.verification },
    };
  });
  const estimatedMinutes = chapterIds.reduce(
    (total, chapterId) => total + (curriculumChapterById.get(chapterId)?.estimatedMinutes ?? 0),
    0,
  );
  return {
    schemaVersion: 4,
    id: metadata.id,
    title: metadata.title,
    summary: metadata.summary,
    audience: metadata.audience,
    prerequisiteChapterIds,
    stageGoals: books.map((book) => book.introduction),
    chapterIds,
    estimatedHours: Math.max(1, Math.ceil(estimatedMinutes / 60)),
    checkpoints,
    exercises,
    routeKind: "series",
    sections,
  };
}

/**
 * Keep a topical route topologically consistent with the canonical textbook
 * graph. Route-internal prerequisites are moved before their dependants while
 * prerequisites outside the route are declared explicitly at the route
 * boundary. The sort is stable for otherwise unrelated chapters.
 */
function alignPathWithCurriculum(path: LearningPathV3): LearningPathV3 {
  const routeChapterIds = new Set(path.chapterIds);
  const remaining = [...path.chapterIds];
  const orderedChapterIds: string[] = [];
  const completed = new Set<string>();

  while (remaining.length > 0) {
    const readyIndex = remaining.findIndex((chapterId) => {
      const chapter = curriculumChapterById.get(chapterId);
      if (!chapter) return true;
      return chapter.prerequisiteChapterIds.every(
        (prerequisiteId) => !routeChapterIds.has(prerequisiteId) || completed.has(prerequisiteId),
      );
    });
    if (readyIndex < 0) {
      throw new Error(`Learning path "${path.id}" contains a canonical prerequisite cycle`);
    }
    const [chapterId] = remaining.splice(readyIndex, 1);
    if (!chapterId) continue;
    orderedChapterIds.push(chapterId);
    completed.add(chapterId);
  }

  const prerequisiteChapterIds = [...path.prerequisiteChapterIds];
  const declaredPrerequisites = new Set(prerequisiteChapterIds);
  for (const chapterId of orderedChapterIds) {
    const chapter = curriculumChapterById.get(chapterId);
    if (!chapter) continue;
    for (const prerequisiteId of chapter.prerequisiteChapterIds) {
      if (routeChapterIds.has(prerequisiteId) || declaredPrerequisites.has(prerequisiteId))
        continue;
      declaredPrerequisites.add(prerequisiteId);
      prerequisiteChapterIds.push(prerequisiteId);
    }
  }

  return {
    ...path,
    prerequisiteChapterIds,
    chapterIds: orderedChapterIds,
  };
}

const scientificMachineLearningPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "scientific-machine-learning",
  title: { "zh-CN": "科学机器学习", en: "Scientific machine learning" },
  summary: {
    "zh-CN": "从微分方程、数值离散与计算图中选取必要节点，进入物理约束学习、神经算子和科学验证。",
    en: "A focused route from differential equations, numerical discretization, and computation graphs to physics-informed learning, neural operators, and scientific validation.",
  },
  audience: {
    "zh-CN":
      "具备多变量微积分、线性代数和基础神经网络知识，希望研究科学计算与机器学习交叉方法的学习者。",
    en: "Learners with multivariable calculus, linear algebra, and neural-network foundations who want to study scientific machine learning.",
  },
  prerequisiteChapterIds: [
    "m03-partials-gradient",
    "m04-linear-maps-matrices",
    "a04-backpropagation",
  ],
  stageGoals: [
    { "zh-CN": "区分连续方程、离散求解器、数据观测与可学习模型各自承担的角色。" },
    { "zh-CN": "写出物理信息神经网络的方程残差、边界残差和数据残差，并检查量纲。" },
    { "zh-CN": "比较有限维函数拟合与算子学习，说明网格变化时需要验证的泛化边界。" },
  ],
  chapterIds: [
    "m09-heat-wave-laplace",
    "m10-ode-pde-numerics",
    "a04-computation-graphs",
    "a14-differentiable-physics",
    "a14-pinn",
    "a14-deeponet",
    "a14-neural-operators",
    "a14-inverse-uncertainty",
    "a14-scientific-ml-review",
  ],
  estimatedHours: 20,
  checkpoints: [
    {
      id: "scientific-ml-residuals",
      afterChapterId: "a14-pinn",
      prompt: {
        "zh-CN":
          "为一个含初值和边界条件的偏微分方程分别写出内部、初值、边界与数据残差，并说明各损失权重为何不能掩盖量纲差异。",
      },
    },
    {
      id: "scientific-ml-operators",
      afterChapterId: "a14-neural-operators",
      prompt: {
        "zh-CN":
          "比较固定网格上的点值回归与从输入函数到解函数的算子学习，并列出跨网格评估必须报告的误差和稳定性检查。",
      },
    },
  ],
  exercises: [
    {
      id: "scientific-ml-ode-residual",
      title: { "zh-CN": "检查一维衰减方程的物理残差" },
      chapterIds: ["a04-computation-graphs", "a14-differentiable-physics", "a14-pinn"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "方程 u'(x)+u(x)=0 满足 u(0)=1。取候选族 uₐ(x)=exp(-ax)，推导内部残差和边界残差，并求使两者同时为零的 a。说明自动微分在这一步计算什么。",
      },
      hint: {
        "zh-CN": "先对 exp(-ax) 关于 x 求导；边界残差直接代入 x=0，内部残差保留为 x 的函数。",
      },
      workedSolution: {
        "zh-CN":
          "uₐ'(x)=-a exp(-ax)，所以内部残差 r(x)=(1-a)exp(-ax)。边界残差 b=uₐ(0)-1=0。由于指数函数不为零，r 对所有 x 为零当且仅当 a=1。自动微分计算的是候选函数对输入 x 的导数，并把该导数代入方程残差。",
      },
      verification: {
        "zh-CN":
          "令 a=1 后，r(x)=0 且 b=0；再令 a=0 可得 r(x)=1，说明残差公式能识别不满足微分方程的常数候选。",
      },
    },
    {
      id: "scientific-ml-fourier-mode",
      title: { "zh-CN": "用解析模态校验科学模型输出" },
      chapterIds: [
        "m09-heat-wave-laplace",
        "m10-ode-pde-numerics",
        "a14-neural-operators",
        "a14-inverse-uncertainty",
      ],
      difficulty: 4,
      prompt: {
        "zh-CN":
          "周期区间上的热方程 uₜ=νuₓₓ 取初值 sin(2πx)，ν=0.1。写出 t=0.5 时的解析解，并给出用该解检查神经算子输出的相对 L2 误差方案。",
      },
      hint: {
        "zh-CN": "正弦模态的二阶导数会带来 -(2π)²，时间振幅因此按 exp(-(2π)²νt) 衰减。",
      },
      workedSolution: {
        "zh-CN":
          "解析解为 u(x,t)=exp(-4π²νt)sin(2πx)。代入 ν=0.1、t=0.5，振幅为 exp(-0.2π²)，约等于 0.139。把同一网格上的预测值与解析值作差，计算其离散 L2 范数，再除以解析值的离散 L2 范数即可得到相对误差。",
      },
      verification: {
        "zh-CN":
          "t=0 时振幅恢复为 1；对解析式分别求 t 与 x 的导数可得 uₜ=-4π²νu、νuₓₓ=-4π²νu，两边一致。",
      },
    },
  ],
};

const analysisRealComplexFunctionalPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "analysis-real-complex-functional",
  title: {
    "zh-CN": "实分析、复分析与泛函分析",
    en: "Advanced analysis: real, complex, and functional analysis",
  },
  summary: {
    "zh-CN": "依次学习测度与积分、全纯函数与留数、赋范空间与算子谱理论。",
    en: "A sequential route through measure and integration, holomorphic functions and residues, and normed spaces with operator spectral theory.",
  },
  audience: {
    "zh-CN": "已掌握多变量微积分与线性代数，希望以严格证明方式进入现代分析三大支柱的学习者。",
    en: "Learners with multivariable calculus and linear algebra who want a proof-based entry into the three pillars of modern analysis.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    { "zh-CN": "用实数完备性、一致收敛与测度论语言判定极限与积分换序、Lp 收敛各自需要的假设。" },
    {
      "zh-CN":
        "由 Cauchy–Riemann 方程与幂级数识别全纯函数，并用 Cauchy 公式和留数定理计算围道积分与实积分。",
    },
    {
      "zh-CN":
        "在 Banach 与 Hilbert 空间中运用 Hahn–Banach、一致有界、正交投影和紧自伴算子谱定理分析具体问题。",
    },
  ],
  chapterIds: [
    "m12-real-completeness",
    "m12-function-sequences",
    "m12-measure-measurable",
    "m12-lebesgue-integration",
    "m12-lp-product-measures",
    "m12-real-analysis-review",
    "m13-complex-differentiation",
    "m13-power-series",
    "m13-cauchy-theorems",
    "m13-residue-calculus",
    "m13-conformal-continuation",
    "m13-complex-analysis-review",
    "m16-banach-spaces",
    "m16-fundamental-theorems",
    "m16-hilbert-spaces",
    "m16-compact-self-adjoint",
    "m16-spectral-theorem",
    "m16-functional-analysis-review",
  ],
  estimatedHours: 24,
  checkpoints: [
    {
      id: "analysis-measure-integration-check",
      afterChapterId: "m12-real-analysis-review",
      prompt: {
        "zh-CN":
          "给出一个逐点收敛但不一致收敛的函数列，说明它是否允许交换极限与积分，并用控制收敛定理给出可以换序的充分条件。",
      },
    },
    {
      id: "analysis-spectrum-check",
      afterChapterId: "m16-functional-analysis-review",
      prompt: {
        "zh-CN":
          "对 Hilbert 空间上的紧自伴算子，陈述其谱的实性、特征向量正交性与展开定理，并举一个非自伴算子说明结论会如何失效。",
      },
    },
  ],
  exercises: [
    {
      id: "analysis-uniform-convergence-integral",
      title: { "zh-CN": "判断函数列换序并计算极限积分" },
      chapterIds: ["m12-function-sequences", "m12-lebesgue-integration"],
      difficulty: 4,
      prompt: {
        "zh-CN":
          "设 fₙ(x)=n²x e^{-n x}，x∈[0,1]。判断 fₙ 是否一致收敛到 0，并分别计算 lim ∫₀¹ fₙ(x)dx 与 ∫₀¹ lim fₙ(x)dx，解释二者为何不同。",
      },
      hint: {
        "zh-CN":
          "先求逐点极限，再用 x=1/n 处的取值检验 sup 范数；积分用换元 t=n x 化为 Gamma 型积分。",
      },
      workedSolution: {
        "zh-CN":
          "固定 x>0 时 n²x e^{-n x}→0，x=0 处恒为 0，故逐点极限为 0。但 fₙ 在 x=1/n 处取值 n/e→∞，sup 不趋于 0，故不一致收敛。换元 t=n x 得 ∫₀¹ fₙ(x)dx=∫₀ⁿ t e^{-t}dt→1，而 ∫₀¹ 0 dx=0，两者不等。控制收敛定理在此不适用：任何逐点控制函数 g 都满足 g(x)≥supₙ n²x e^{-n x}=4e^{-2}/x，而 ∫₀¹ 1/x dx 发散。",
      },
      verification: {
        "zh-CN":
          "数值检查 n=10：∫₀¹⁰ t e^{-t}dt=1-11e^{-10}≈0.9995，已接近 1；若被积函数改为 n x e^{-n x}，换元后积分含因子 1/n 而趋于 0，换序成立，与直接计算一致。",
      },
    },
    {
      id: "analysis-residue-real-integral",
      title: { "zh-CN": "用留数定理计算经典实积分" },
      chapterIds: ["m13-cauchy-theorems", "m13-residue-calculus"],
      difficulty: 4,
      prompt: {
        "zh-CN":
          "计算 I=∫₀^∞ dx/(1+x²)²。把它写成全实轴积分的一半，取上半平面半圆围道，求内部极点的留数并给出 I 的值。",
      },
      hint: {
        "zh-CN": "被积函数为偶函数；1/(1+z²)² 在 z=i 处有二阶极点，留数用一阶导数公式计算。",
      },
      workedSolution: {
        "zh-CN":
          "I=(1/2)∫_{-∞}^{∞}dx/(1+x²)²。f(z)=1/((z-i)²(z+i)²) 在上半平面仅有 z=i 处二阶极点，留数为 d/dz[(z+i)^{-2}] 在 z=i 的值，即 -2/(2i)³=1/(4i)。由留数定理，闭合围道积分等于 2πi·1/(4i)=π/2。大圆弧上 |f|=O(R^{-4}) 而弧长 O(R)，弧段积分随 R→∞ 趋于 0，故实轴积分为 π/2，I=π/4。",
      },
      verification: {
        "zh-CN":
          "独立核对：换元 x=tan θ 把 I 化为 ∫₀^{π/2} cos²θ dθ=π/4，与留数结果一致；被积函数非负，π/4≈0.785 的量级与函数图像面积相符。",
      },
    },
  ],
};

const algebraAndDiscreteStructuresPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "algebra-and-discrete-structures",
  title: { "zh-CN": "代数与离散结构", en: "Algebra and discrete structures" },
  summary: {
    "zh-CN": "先以群、环、域与模建立抽象代数框架，再回到计数、递推、图论与偏序等有限离散结构。",
    en: "Build the abstract-algebra framework of groups, rings, fields, and modules, then turn to finite discrete structures: counting, recurrences, graphs, and posets.",
  },
  audience: {
    "zh-CN": "具备数学证明基础，希望系统学习代数结构并连接组合与图论方法的学习者。",
    en: "Learners comfortable with mathematical proof who want a systematic study of algebraic structures connected to combinatorics and graph theory.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    { "zh-CN": "用群、环、域的定义与同构定理分析代数结构，并在多项式环与有限域上完成具体计算。" },
    { "zh-CN": "对有限离散结构选择计数、递推、图论或偏序工具，并用双计数、构造与反例检验结论。" },
  ],
  chapterIds: [
    "m14-groups-subgroups",
    "m14-homomorphisms-actions",
    "m14-rings-ideals",
    "m14-fields-polynomials",
    "m14-modules-structure",
    "m14-abstract-algebra-review",
    "m07-counting-principles",
    "m07-recurrences-generating-functions",
    "m07-graphs-connectivity",
    "m07-matching-coloring",
    "m07-posets-boolean",
    "m07-discrete-review",
  ],
  estimatedHours: 16,
  checkpoints: [
    {
      id: "algebra-discrete-structures-check",
      afterChapterId: "m14-abstract-algebra-review",
      prompt: {
        "zh-CN":
          "陈述群同态基本定理与 Lagrange 定理，并各举一个例子说明正规子群条件与阶数整除性在结论中为何缺一不可。",
      },
    },
    {
      id: "algebra-discrete-graph-check",
      afterChapterId: "m07-discrete-review",
      prompt: {
        "zh-CN":
          "给定一个二部图匹配问题，说明 Hall 条件如何判定完美匹配存在，并给出容斥原理在同一类计数问题中的不同用途。",
      },
    },
  ],
  exercises: [
    {
      id: "algebra-discrete-lagrange-order",
      title: { "zh-CN": "用 Lagrange 定理限制有限群的元素阶" },
      chapterIds: ["m14-groups-subgroups", "m14-homomorphisms-actions"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "设 G 是 12 阶群，a∈G。列出 a 的可能阶；若 G 为循环群 Z₁₂，分别求元素 8 的阶和 G 中生成元的个数。",
      },
      hint: {
        "zh-CN":
          "元素阶等于其生成循环子群的阶，必整除 |G|；Zₙ 中元素 k 的阶为 n/gcd(n,k)，生成元与 n 互素。",
      },
      workedSolution: {
        "zh-CN":
          "由 Lagrange 定理，a 的阶整除 12，故可能值为 1、2、3、4、6、12。在 Z₁₂ 中，ord(8)=12/gcd(12,8)=12/4=3。生成元个数为模 12 简化剩余系的元素数 φ(12)=12(1-1/2)(1-1/3)=4，即 1、5、7、11。",
      },
      verification: {
        "zh-CN":
          "直接验证 ord(8)：8+8+8=24≡0 (mod 12)，而 8 与 16 均不同余 0，阶确为 3；1、5、7、11 恰为全部与 12 互素的剩余类，计数与 φ(12)=4 一致。",
      },
    },
    {
      id: "algebra-discrete-inclusion-exclusion",
      title: { "zh-CN": "容斥原理推导错排数公式" },
      chapterIds: ["m07-counting-principles", "m07-recurrences-generating-functions"],
      difficulty: 3,
      prompt: {
        "zh-CN": "用容斥原理推导 n 个元素错排（无不动点的置换）数 Dₙ 的显式公式，并计算 D₄ 的值。",
      },
      hint: {
        "zh-CN":
          "设 Aᵢ 为固定第 i 个元素的置换集合，错排数等于全部置换数减去 Aᵢ 之并，k 个集合交的大小为 (n-k)!。",
      },
      workedSolution: {
        "zh-CN":
          "由容斥原理，Dₙ=Σ_{k=0}^{n} (-1)^k C(n,k)(n-k)!=n! Σ_{k=0}^{n} (-1)^k/k!。代入 n=4：D₄=24(1-1+1/2-1/6+1/24)=24·(9/24)=9。",
      },
      verification: {
        "zh-CN":
          "直接枚举得 D₂=1、D₃=2，再用递推 Dₙ=(n-1)(Dₙ₋₁+Dₙ₋₂) 计算 D₄=3(2+1)=9，与容斥公式一致；n! 乘以部分和也逼近 n!/e，符合渐近比例。",
      },
    },
  ],
};

const geometryAndTopologyPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "geometry-and-topology",
  title: { "zh-CN": "拓扑与微分几何", en: "Topology and differential geometry" },
  summary: {
    "zh-CN": "从点集拓扑的紧致与连通出发，经光滑流形与微分形式，进入 Riemann 度量、测地线与曲率。",
    en: "From compactness and connectedness in point-set topology, through smooth manifolds and differential forms, to Riemannian metrics, geodesics, and curvature.",
  },
  audience: {
    "zh-CN": "具备多变量微积分与实分析基础，希望理解流形上的分析与现代几何语言的学习者。",
    en: "Learners with multivariable calculus and real analysis who want to understand analysis on manifolds and the language of modern geometry.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    { "zh-CN": "用开集、基、紧致与连通的定义判断具体空间的拓扑性质，并说明连续映射保持哪些性质。" },
    {
      "zh-CN":
        "在光滑流形上通过坐标图、切空间与微分形式进行计算，并陈述 Stokes 定理的定向与边界条件。",
    },
    {
      "zh-CN":
        "由 Riemann 度量与 Levi-Civita 联络写出测地线方程，并用截面曲率比较不同空间的几何行为。",
    },
  ],
  chapterIds: [
    "m15-topological-spaces",
    "m15-compact-connected",
    "m15-smooth-manifolds",
    "m15-differential-forms",
    "m15-metrics-curvature",
    "m15-topology-geometry-review",
  ],
  estimatedHours: 10,
  checkpoints: [
    {
      id: "geometry-topology-manifold-check",
      afterChapterId: "m15-differential-forms",
      prompt: {
        "zh-CN":
          "以单位球面 S² 为例说明坐标图覆盖、切空间构造和 2-形式积分的定向约定，并写出 Stokes 定理在此情形化为边界积分的条件。",
      },
    },
    {
      id: "geometry-topology-curvature-check",
      afterChapterId: "m15-topology-geometry-review",
      prompt: {
        "zh-CN":
          "比较平面、球面与双曲平面的截面曲率符号，并说明曲率符号如何影响测地三角形的内角和与测地线的聚散行为。",
      },
    },
  ],
  exercises: [
    {
      id: "geometry-topology-compact-image",
      title: { "zh-CN": "紧致性在连续映射下的保持与反例" },
      chapterIds: ["m15-topological-spaces", "m15-compact-connected"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "证明：若 X 紧致且 f:X→Y 连续，则 f(X) 紧致。再举一例说明把定义域换成开区间后结论失效，并指出证明中哪一步用到紧致性。",
      },
      hint: {
        "zh-CN":
          "从 f(X) 的任一开覆盖出发，用连续性把它拉回为 X 的开覆盖；反例可取开区间的恒等嵌入。",
      },
      workedSolution: {
        "zh-CN":
          "设 {Vₐ} 是 f(X) 的开覆盖，则 {f⁻¹(Vₐ)} 是 X 的开覆盖，由紧致性取有限子覆盖 f⁻¹(V₁),…,f⁻¹(Vₙ)，于是 V₁,…,Vₙ 覆盖 f(X)。反例：f(x)=x 把 (0,1) 映入 ℝ，像 (0,1) 非紧致——开覆盖 {(1/n,1)} 无有限子覆盖。证明中提取有限子覆盖这一步正是对定义域紧致性的使用，缺少它结论不成立。",
      },
      verification: {
        "zh-CN":
          "改用闭区间 [0,1] 的恒等映射，像 [0,1] 由 Heine–Borel 定理紧致，与定理一致；反例中 (0,1) 在 ℝ 中非闭，与 Heine–Borel 判据对紧致集的刻画吻合。",
      },
    },
    {
      id: "geometry-topology-stokes-circle",
      title: { "zh-CN": "单位圆盘上验证 Stokes 定理" },
      chapterIds: ["m15-smooth-manifolds", "m15-differential-forms"],
      difficulty: 4,
      prompt: {
        "zh-CN":
          "设 ω=-y dx+x dy，D 为单位圆盘，边界 ∂D 取逆时针定向。分别计算 ∫_{∂D} ω 与 ∫_D dω，验证 Stokes 定理 ∫_{∂D}ω=∫_D dω。",
      },
      hint: {
        "zh-CN": "外微分 dω=2 dx∧dy；边界用参数 x=cos t、y=sin t，把 ω 拉回到参数区间。",
      },
      workedSolution: {
        "zh-CN":
          "dω=-dy∧dx+dx∧dy=2 dx∧dy，故 ∫_D dω=2·Area(D)=2π。边界上 dx=-sin t dt、dy=cos t dt，于是 ω=sin²t dt+cos²t dt=dt，∫₀^{2π}dt=2π。两侧相等，Stokes 公式成立，这正是平面 Green 定理的形式。",
      },
      verification: {
        "zh-CN":
          "把 ω 换成 x dy，则 ∫_{∂D} x dy=π=Area(D)，与 d(x dy)=dx∧dy 给出的面积公式一致；定向改为顺时针时两侧同时变号，等式保持。",
      },
    },
  ],
};

const numericalAnalysisOptimizationPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "numerical-analysis-and-optimization",
  title: { "zh-CN": "数值分析与最优化", en: "Numerical analysis and optimization" },
  summary: {
    "zh-CN":
      "用误差与稳定性分析组织数值线性代数、逼近与微分方程离散，再进入凸优化、对偶与信息度量。",
    en: "Error and stability analysis for numerical linear algebra, approximation, and discretized differential equations, followed by convex optimization, duality, and information measures.",
  },
  audience: {
    "zh-CN": "适合学习数值算法与误差分析的读者。",
    en: "Learners who need to turn continuous mathematical models into reliable algorithms and judge the trustworthiness of computed results.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    {
      "zh-CN":
        "用条件数、稳定性与截断误差分析评估浮点计算、线性求解、插值积分和微分方程离散的可信度。",
    },
    { "zh-CN": "识别凸结构并选择合适的一阶方法，用 KKT 条件与对偶关系检验候选解的最优性。" },
  ],
  chapterIds: [
    "m10-floating-point-errors",
    "m10-linear-system-solvers",
    "m10-interpolation-approximation",
    "m10-quadrature-differentiation",
    "m10-ode-pde-numerics",
    "m10-numerical-analysis-review",
    "m11-optimization-models",
    "m11-convexity-subgradients",
    "m11-gradient-descent",
    "m11-constraints-duality",
    "m11-entropy-divergence",
    "m11-optimization-information-review",
  ],
  estimatedHours: 16,
  checkpoints: [
    {
      id: "numerical-optimization-stability-check",
      afterChapterId: "m10-numerical-analysis-review",
      prompt: {
        "zh-CN":
          "对一个线性方程组求解流程，分别说明问题条件数、算法后向稳定性与迭代法谱半径各自控制什么误差，并给出网格加密实验应报告的量。",
      },
    },
    {
      id: "numerical-optimization-kkt-check",
      afterChapterId: "m11-optimization-information-review",
      prompt: {
        "zh-CN":
          "写出一个带等式与不等式约束凸问题的 KKT 条件，并说明如何用原始可行性、对偶可行性、驻点与互补松弛验证候选点最优。",
      },
    },
  ],
  exercises: [
    {
      id: "numerical-optimization-condition-number",
      title: { "zh-CN": "估计病态矩阵求解的误差放大" },
      chapterIds: ["m10-floating-point-errors", "m10-linear-system-solvers"],
      difficulty: 4,
      prompt: {
        "zh-CN":
          "矩阵 A=[[1,1/2],[1/2,1/3]]（2 阶 Hilbert 矩阵），右端扰动满足 ‖δb‖₂/‖b‖₂≤10⁻⁴。用 2-范数条件数估计解的相对误差上界，并说明该上界的实际含义。",
      },
      hint: {
        "zh-CN": "对称正定矩阵的 2-范数条件数等于最大与最小特征值之比；先求 A 的特征值。",
      },
      workedSolution: {
        "zh-CN":
          "A 的特征方程为 λ²-(4/3)λ+1/12=0，解得 λ=(4±√13)/6，故 κ₂(A)=(4+√13)/(4-√13)=(29+8√13)/3≈19.28。扰动理论给出 ‖δx‖/‖x‖≤κ₂(A)·‖δb‖/‖b‖≈19.28×10⁻⁴≈1.9×10⁻³。含义是：右端万分之一的相对扰动，最坏可放大为解约千分之二的相对误差，放大因子由问题本身而非算法决定。",
      },
      verification: {
        "zh-CN":
          "直接求逆得 A⁻¹=[[4,-6],[-6,12]]，取 b=(1,1)ᵀ 与 δb=(10⁻⁴,0)ᵀ 实际求解，x 的相对变化不超过上界；当 b 沿最大特征向量、δb 沿最小特征向量方向时放大接近 κ₂(A)，说明上界可达。",
      },
    },
    {
      id: "numerical-optimization-gradient-descent",
      title: { "zh-CN": "二次凸函数上梯度下降的收缩因子" },
      chapterIds: ["m11-convexity-subgradients", "m11-gradient-descent"],
      difficulty: 4,
      prompt: {
        "zh-CN":
          "对 f(x)=½ xᵀQx，Q=diag(1,10)，使用精确线搜索的梯度下降。写出迭代格式，说明收缩因子由条件数 κ=10 决定的形式，并估计把误差 ‖xₖ-x*‖_Q 缩小 10⁴ 倍所需的迭代量级。",
      },
      hint: {
        "zh-CN":
          "梯度为 Qx，最优步长 αₖ=(gₖᵀgₖ)/(gₖᵀQgₖ)；二次问题上精确线搜索每步收缩不超过 (κ-1)/(κ+1)。",
      },
      workedSolution: {
        "zh-CN":
          "迭代为 xₖ₊₁=xₖ-αₖgₖ，gₖ=Qxₖ，αₖ=(gₖᵀgₖ)/(gₖᵀQgₖ)。这里 κ=λ_max/λ_min=10，误差满足 ‖xₖ-x*‖_Q≤((κ-1)/(κ+1))ᵏ‖x₀-x*‖_Q=(9/11)ᵏ‖x₀-x*‖_Q。要求 (9/11)ᵏ≤10⁻⁴ 得 k≥4ln10/ln(11/9)≈46，即需要数十次迭代，条件数直接决定收敛快慢。",
      },
      verification: {
        "zh-CN":
          "数值核对首步：x₀=(10,1)ᵀ 时 g₀=(10,10)ᵀ，α₀=200/1100=2/11，x₁=(90/11,-9/11)ᵀ，f 由 55 降至 8910/242≈36.8，比值恰为 (9/11)²，与理论收缩因子一致。",
      },
    },
  ],
};

const probabilityToStatisticsPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "probability-to-mathematical-statistics",
  title: { "zh-CN": "概率论到数理统计", en: "From probability theory to mathematical statistics" },
  summary: {
    "zh-CN": "从概率空间与随机变量进入极限定理，再以抽样分布统一估计、置信区间、检验与统计决策。",
    en: "From probability spaces and random variables through limit theorems, then estimation, confidence intervals, testing, and statistical decision unified by sampling distributions.",
  },
  audience: {
    "zh-CN": "具备微积分基础，希望把概率模型与数据推断连成一条严格链条的学习者。",
    en: "Learners with calculus who want to connect probabilistic modeling and data-driven inference in one rigorous chain.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    {
      "zh-CN":
        "在概率空间上建立随机变量模型，计算期望与协方差，并用大数定律和中心极限定理给出近似成立的条件。",
    },
    { "zh-CN": "从抽样分布出发构造估计、置信区间与检验，并用偏差、功效和覆盖率比较统计程序。" },
  ],
  chapterIds: [
    "m05-axioms-counting",
    "m05-conditional-bayes",
    "m05-random-variables-distributions",
    "m05-expectation-covariance",
    "m05-laws-large-numbers-clt",
    "m05-probability-review",
    "m06-samples-statistics",
    "m06-point-estimation",
    "m06-confidence-intervals",
    "m06-hypothesis-testing",
    "m06-linear-model-inference",
    "m06-statistics-review",
  ],
  estimatedHours: 16,
  checkpoints: [
    {
      id: "probability-statistics-limit-check",
      afterChapterId: "m05-probability-review",
      prompt: {
        "zh-CN":
          "区分依概率收敛与依分布收敛，并说明大数定律和中心极限定理对样本均值分别给出什么精度信息。",
      },
    },
    {
      id: "probability-statistics-inference-check",
      afterChapterId: "m06-statistics-review",
      prompt: {
        "zh-CN":
          "对正态均值问题写出置信区间与双侧检验的对偶关系，并解释覆盖率 95% 的重复抽样含义而非单次概率含义。",
      },
    },
  ],
  exercises: [
    {
      id: "probability-statistics-clt-approximation",
      title: { "zh-CN": "中心极限定理估计样本均值偏差概率" },
      chapterIds: ["m05-expectation-covariance", "m05-laws-large-numbers-clt"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "X₁,…,X₁₀₀ 独立同分布，均值 2、方差 9。用中心极限定理近似 P(X̄>2.9)，并说明近似的依据与误差来源。",
      },
      hint: {
        "zh-CN": "样本均值近似服从 N(2, 9/100)，标准化为标准正态后查分布函数。",
      },
      workedSolution: {
        "zh-CN":
          "X̄ 近似服从 N(2,0.09)，标准误 0.3，故 P(X̄>2.9)≈1-Φ((2.9-2)/0.3)=1-Φ(3)≈1-0.99865=0.00135。依据是有限方差独立同分布情形的中心极限定理；误差来自正态近似对尾部的偏差，三阶矩有界时 Berry–Esseen 界给出 O(1/√n) 量级的分布函数误差。",
      },
      verification: {
        "zh-CN":
          "若总体恰为正态，则 X̄ 精确服从 N(2,0.09)，近似值即为精确值；重复模拟 10⁵ 次抽样，超过 2.9 的频率应稳定在约 0.0013 附近。",
      },
    },
    {
      id: "probability-statistics-confidence-interval",
      title: { "zh-CN": "正态样本均值的 t 置信区间" },
      chapterIds: ["m06-samples-statistics", "m06-confidence-intervals"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "某正态总体抽取 n=16 的样本，x̄=10.4，样本标准差 s=2.0。构造均值 μ 的 95% 置信区间，并解释为何使用 t 分布而不是标准正态。",
      },
      hint: {
        "zh-CN": "方差未知时枢轴量 T=(X̄-μ)/(S/√n) 服从 t(n-1)，查 t(15) 的 0.975 分位数。",
      },
      workedSolution: {
        "zh-CN":
          "t_{0.975}(15)=2.131，区间为 x̄±t·s/√n=10.4±2.131×2/4=10.4±1.066，即 (9.33,11.47)。总体方差未知而用样本方差代替后，枢轴量分子为正态、分母含独立卡方变量的平方根，比值服从 t(15) 而非标准正态；n 增大时 t 分布趋向正态。",
      },
      verification: {
        "zh-CN":
          "若误用 z_{0.975}=1.96，半宽为 0.98，区间更窄，小样本覆盖率将低于 95%；t 区间更宽正是对方差估计不确定性的补偿，可用模拟重复抽样核对覆盖率。",
      },
    },
  ],
};

const classicalToAnalyticalMechanicsPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "classical-to-analytical-mechanics",
  title: { "zh-CN": "经典力学到分析力学", en: "From classical to analytical mechanics" },
  summary: {
    "zh-CN":
      "从 Newton 力学与守恒定律出发，过渡到变分原理、Lagrange 与 Hamilton 形式以及相空间方法。",
    en: "From Newtonian mechanics and conservation laws to variational principles, the Lagrangian and Hamiltonian formalisms, and phase-space methods.",
  },
  audience: {
    "zh-CN": "具备微积分与常微分方程基础，希望掌握理论物理通用力学语言的学习者。",
    en: "Learners with calculus and ordinary differential equations who want the mechanical language used across theoretical physics.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    {
      "zh-CN": "用 Newton 定律、能量与动量守恒建立质点和刚体模型，并检查参考系、约束力与系统边界。",
    },
    {
      "zh-CN":
        "用变分原理、Lagrange 与 Hamilton 形式重写约束系统动力学，并由连续对称性读出守恒量。",
    },
  ],
  chapterIds: [
    "p01-kinematics",
    "p01-newton-laws",
    "p01-work-energy",
    "p01-momentum-collisions",
    "p01-rigid-rotation",
    "p01-mechanics-review",
    "p02-variational-principle",
    "p02-constraints-symmetry",
    "p02-hamilton-equations",
    "p02-canonical-transformations",
    "p02-phase-space-chaos",
    "p02-analytical-mechanics-review",
  ],
  estimatedHours: 16,
  checkpoints: [
    {
      id: "mechanics-conservation-check",
      afterChapterId: "p01-mechanics-review",
      prompt: {
        "zh-CN":
          "对一个碰撞加摆动的复合过程，说明哪一阶段用动量守恒、哪一阶段用机械能守恒，以及两条守恒律各自的适用条件。",
      },
    },
    {
      id: "mechanics-lagrange-check",
      afterChapterId: "p02-analytical-mechanics-review",
      prompt: {
        "zh-CN":
          "对一个含完整约束的系统写出广义坐标与 Lagrangian，指出循环坐标对应的守恒量，并与 Newton 形式中约束力的处理比较。",
      },
    },
  ],
  exercises: [
    {
      id: "mechanics-energy-pendulum",
      title: { "zh-CN": "能量守恒求单摆最低点速度与张力" },
      chapterIds: ["p01-work-energy", "p01-rigid-rotation"],
      difficulty: 2,
      prompt: {
        "zh-CN":
          "长 L 的单摆从水平位置由静止释放，摆锤质量 m。用机械能守恒求摆锤经过最低点时的速率，并求此时绳中张力。",
      },
      hint: {
        "zh-CN": "重力势能下降 mgL 全部转化为动能；最低点处张力与重力之差提供向心力。",
      },
      workedSolution: {
        "zh-CN":
          "取最低点为零势能面，初始势能 mgL，故 ½mv²=mgL，得 v=√(2gL)。最低点圆周运动要求 T-mg=mv²/L=2mg，所以 T=3mg。",
      },
      verification: {
        "zh-CN":
          "量纲检查：gL 的量纲为 (m/s²)·m=m²/s²，开方确为速率；张力 3mg 与 L 无关，可由 L→0 时 v→0 而 T→3mg 的极限保持自洽，亦与逐点列 Newton 方程一致。",
      },
    },
    {
      id: "mechanics-lagrangian-atwood",
      title: { "zh-CN": "Lagrange 方程求 Atwood 机加速度" },
      chapterIds: ["p02-variational-principle", "p02-constraints-symmetry"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "Atwood 机：轻滑轮两侧挂质量 m₁ 与 m₂（m₁>m₂），绳长不变。取 m₁ 下降距离 q 为广义坐标，写出 Lagrangian 并由 Euler–Lagrange 方程求加速度。",
      },
      hint: {
        "zh-CN": "绳长约束把两质量的速度都化为 q̇；q 增大时 m₁ 下降，势能减少 (m₁-m₂)gq。",
      },
      workedSolution: {
        "zh-CN":
          "动能 T=½(m₁+m₂)q̇²，势能 V=-(m₁-m₂)gq，故 L=½(m₁+m₂)q̇²+(m₁-m₂)gq。Euler–Lagrange 方程 d/dt(∂L/∂q̇)=∂L/∂q 给出 (m₁+m₂)q̈=(m₁-m₂)g，即 q̈=(m₁-m₂)g/(m₁+m₂)。",
      },
      verification: {
        "zh-CN":
          "对每个物体列 Newton 方程：m₁g-T=m₁a、T-m₂g=m₂a，相加消去张力得同一结果；极限 m₂→m₁ 时 a→0、m₂→0 时 a→g，均符合物理直觉。",
      },
    },
  ],
};

const wavesAndElectromagnetismPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "waves-and-electromagnetism",
  title: { "zh-CN": "振动波动与电磁学", en: "Oscillations, waves, and electromagnetism" },
  summary: {
    "zh-CN": "由振子、简正模与波动方程进入干涉衍射，再统一静电、磁场、感应与 Maxwell 电磁波。",
    en: "From oscillators, normal modes, and the wave equation to interference and diffraction, then a unified treatment of electrostatics, magnetism, induction, and Maxwell's electromagnetic waves.",
  },
  audience: {
    "zh-CN": "具备微积分与经典力学基础，希望系统学习波动现象与经典场论的学习者。",
    en: "Learners with calculus and classical mechanics who want a systematic study of wave phenomena and classical field theory.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    { "zh-CN": "用简正模、行波参数与波动方程描述振动和波的传播，并由边界条件确定允许频谱。" },
    {
      "zh-CN": "从 Coulomb 定律到 Maxwell 方程统一分析电磁场，计算场、势、感应电动势与电磁波能流。",
    },
  ],
  chapterIds: [
    "p03-harmonic-oscillator",
    "p03-coupled-normal-modes",
    "p03-wave-parameters-superposition",
    "p03-wave-equation",
    "p03-interference-diffraction",
    "p03-waves-optics-review",
    "p04-coulomb-gauss",
    "p04-potential-boundaries",
    "p04-steady-magnetic",
    "p04-induction-circuits",
    "p04-maxwell-waves",
    "p04-electromagnetism-review",
  ],
  estimatedHours: 16,
  checkpoints: [
    {
      id: "waves-em-mode-check",
      afterChapterId: "p03-waves-optics-review",
      prompt: {
        "zh-CN":
          "比较耦合振子简正模与固定端弦驻波的本征值结构，说明边界条件在这两个问题中扮演什么角色。",
      },
    },
    {
      id: "waves-em-maxwell-check",
      afterChapterId: "p04-electromagnetism-review",
      prompt: {
        "zh-CN":
          "由真空 Maxwell 方程推导电磁波速 c=1/√(ε₀μ₀)，并写出平面波中 E、B 与传播方向的相对取向和能流方向。",
      },
    },
  ],
  exercises: [
    {
      id: "waves-em-normal-mode",
      title: { "zh-CN": "两耦合振子的简正频率与模态" },
      chapterIds: ["p03-harmonic-oscillator", "p03-coupled-normal-modes"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "两个质量 m 由三根相同弹簧（劲度 k）串联在两堵固定墙之间。求系统的两个简正频率与对应模态形状。",
      },
      hint: {
        "zh-CN": "运动方程写成 m ẍ=-Kx，刚度矩阵 K=k[[2,-1],[-1,2]]，求其本征值与本征向量。",
      },
      workedSolution: {
        "zh-CN":
          "由 det(K-mω²I)=0 得 (2k-mω²)²-k²=0，故 mω²=k 或 3k，ω₁=√(k/m)、ω₂=√(3k/m)。对应本征向量为 (1,1)（同相平动）与 (1,-1)（反相伸缩）；反相模中中间弹簧被额外拉伸，恢复力更强，故频率更高。",
      },
      verification: {
        "zh-CN":
          "同相模中间弹簧无形变，系统等效为单弹簧振子，频率 √(k/m) 合理；反相模中点可视为固定，两侧等效弹簧并联给出 √3 倍频，与本征值结果一致。",
      },
    },
    {
      id: "waves-em-gauss-field",
      title: { "zh-CN": "Gauss 定律求无限大带电平面的电场" },
      chapterIds: ["p04-coulomb-gauss", "p04-potential-boundaries"],
      difficulty: 2,
      prompt: {
        "zh-CN":
          "无限大均匀带电平面，面电荷密度 σ。用 Gauss 定律求平面两侧的电场强度，并解释结果为何与距离无关。",
      },
      hint: {
        "zh-CN": "取穿过平面的对称柱面为高斯面，通量只来自两个底面，侧面积通量为零。",
      },
      workedSolution: {
        "zh-CN":
          "由对称性，电场垂直于平面且两侧等大同向（背离平面，σ>0）。取底面积 A 的柱面，通量 Φ=2EA，包围电荷 σA，Gauss 定律给出 2EA=σA/ε₀，故 E=σ/(2ε₀)。结果不含距离，因为无限大平面的场线不随距离稀释，通量密度保持恒定。",
      },
      verification: {
        "zh-CN":
          "量纲核对：σ/ε₀ 的量纲为 (C/m²)/(C²/(N·m²))=N/C，确为电场单位；与点电荷场随 1/r² 衰减对比，说明无限大平面对称性是距离无关结论的前提。",
      },
    },
  ],
};

const thermodynamicsStatisticalPhysicsPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "thermodynamics-and-statistical-physics",
  title: { "zh-CN": "热力学与统计物理", en: "Thermodynamics and statistical physics" },
  summary: {
    "zh-CN": "先用状态量与熵建立宏观热力学，再从微观态计数与系综理论导出同一套宏观规律并研究相变。",
    en: "Macroscopic thermodynamics built from state variables and entropy, then derived again from microscopic state counting and ensemble theory, ending with phase transitions.",
  },
  audience: {
    "zh-CN": "具备概率与力学基础，希望理解热现象微观统计来源的学习者。",
    en: "Learners with probability and mechanics who want to understand the microscopic statistical origin of thermal phenomena.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    { "zh-CN": "用状态量、热力学定律和熵产生分析宏观过程，并用自由能判据判断自发方向与相平衡。" },
    { "zh-CN": "从微观态计数与系综权重推导宏观热力学量，并比较经典统计与量子统计的适用极限。" },
  ],
  chapterIds: [
    "p05-equilibrium-state",
    "p05-first-law",
    "p05-second-law",
    "p05-entropy-production",
    "p05-free-energies",
    "p05-thermodynamics-review",
    "p06-microcanonical",
    "p06-canonical",
    "p06-grand-canonical",
    "p06-bose-fermi",
    "p06-critical-phenomena",
    "p06-statistical-physics-review",
  ],
  estimatedHours: 16,
  checkpoints: [
    {
      id: "thermal-statistical-entropy-check",
      afterChapterId: "p05-thermodynamics-review",
      prompt: {
        "zh-CN": "区分熵传递与熵产生，并用自由膨胀例子说明孤立系统熵增如何量化过程的不可逆性。",
      },
    },
    {
      id: "thermal-statistical-ensemble-check",
      afterChapterId: "p06-statistical-physics-review",
      prompt: {
        "zh-CN":
          "比较微正则、正则与巨正则系综的约束条件与权重形式，并说明为什么热力学极限下它们给出一致的状态方程。",
      },
    },
  ],
  exercises: [
    {
      id: "thermal-statistical-carnot",
      title: { "zh-CN": "Carnot 热机效率与热量平衡" },
      chapterIds: ["p05-second-law", "p05-entropy-production"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "Carnot 热机在 T_h=600 K 与 T_c=300 K 之间工作，每循环从高温热源吸热 1200 J。求效率、对外做功与排向低温热源的热量，并验证熵平衡。",
      },
      hint: {
        "zh-CN": "可逆 Carnot 循环的效率只由温度比决定；熵平衡要求 Q_h/T_h=Q_c/T_c。",
      },
      workedSolution: {
        "zh-CN":
          "η=1-T_c/T_h=1-1/2=0.5，做功 W=ηQ_h=600 J，排热 Q_c=Q_h-W=600 J。熵检查：Q_h/T_h=2 J/K，Q_c/T_c=2 J/K，高温热源失熵与低温热源得熵相等，工质循环熵变为零，总熵产生为零，符合可逆过程。",
      },
      verification: {
        "zh-CN":
          "能量守恒：W+Q_c=1200 J=Q_h 成立；若把排热误算为 300 J，则 Q_c/T_c=1 J/K≠2 J/K，Clausius 等式被破坏，可据此自查账目。",
      },
    },
    {
      id: "thermal-statistical-two-level",
      title: { "zh-CN": "二能级系统的配分函数与能量饱和" },
      chapterIds: ["p06-microcanonical", "p06-canonical"],
      difficulty: 4,
      prompt: {
        "zh-CN":
          "N 个可区分二能级粒子，能级 0 与 ε，置于温度 T。写出单粒子配分函数、总平均能量 U 与高温极限，并解释高温时能量为何饱和。",
      },
      hint: {
        "zh-CN": "Z₁=1+e^{-βε}，平均能量由 -∂ln Z/∂β 给出，再乘 N。",
      },
      workedSolution: {
        "zh-CN":
          "Z₁=1+e^{-βε}，单粒子平均能量 ⟨ε₁⟩=ε e^{-βε}/(1+e^{-βε})=ε/(e^{βε}+1)，故 U=Nε/(e^{ε/k_BT}+1)。高温极限 βε→0 时 e^{βε}→1，U→Nε/2。饱和原因是能级有上界：温度再高，占据数只是趋向两能级等概，平均能量不可能越过 Nε/2 继续线性增长。",
      },
      verification: {
        "zh-CN":
          "低温极限 T→0 时 e^{βε}→∞，U→0，所有粒子回到基态，与物理预期一致；ε/(e^{βε}+1) 也是 Fermi 分布在单能级平均占据数上的形式，可交叉核对。",
      },
    },
  ],
};

const quantumToFieldTheoryPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "quantum-mechanics-to-field-theory",
  title: { "zh-CN": "量子力学到场论导论", en: "From quantum mechanics to field theory" },
  summary: {
    "zh-CN":
      "从量子态、测量与 Schrödinger 方程进入角动量与近似方法，再过渡到经典场、正则量子化与规范理论。",
    en: "From quantum states, measurement, and the Schrödinger equation through angular momentum and approximation methods, then on to classical fields, canonical quantization, and gauge theory.",
  },
  audience: {
    "zh-CN": "具备线性代数与力学基础，希望从单粒子量子力学走向相对论性量子场的学习者。",
    en: "Learners with linear algebra and mechanics who want to progress from single-particle quantum mechanics to relativistic quantum fields.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    { "zh-CN": "用 Hilbert 空间、算符与 Schrödinger 方程描述量子态、测量以及一维束缚与散射问题。" },
    { "zh-CN": "从经典场作用量进入正则量子化与微扰散射，理解粒子解释与规范对称性的来源。" },
  ],
  chapterIds: [
    "p07-states-observables",
    "p07-measurement-uncertainty",
    "p07-schrodinger-equation",
    "p07-one-dimensional-systems",
    "p07-angular-momentum-spin",
    "p07-quantum-mechanics-review",
    "p12-classical-fields",
    "p12-klein-gordon-dirac",
    "p12-field-quantization",
    "p12-interactions-diagrams",
    "p12-gauge-standard-model",
    "p12-particle-field-review",
  ],
  estimatedHours: 18,
  checkpoints: [
    {
      id: "quantum-field-measurement-check",
      afterChapterId: "p07-quantum-mechanics-review",
      prompt: {
        "zh-CN":
          "陈述 Born 规则与投影测量公设，并用对易子说明两个可观测量能够同时具有确定值的条件。",
      },
    },
    {
      id: "quantum-field-quantization-check",
      afterChapterId: "p12-particle-field-review",
      prompt: {
        "zh-CN":
          "比较谐振子升降算符与 Klein–Gordon 场量子化中产生湮灭算符的角色，并说明 Fock 空间的粒子数解释依赖什么结构。",
      },
    },
  ],
  exercises: [
    {
      id: "quantum-field-uncertainty",
      title: { "zh-CN": "高斯波包的不确定关系定量验证" },
      chapterIds: ["p07-states-observables", "p07-measurement-uncertainty"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "一维高斯波包 ψ(x)=(πa²)^{-1/4}exp(-x²/(2a²))。计算 Δx 与 Δp，验证 Heisenberg 不确定关系，并说明它是否饱和。",
      },
      hint: {
        "zh-CN":
          "⟨x²⟩ 直接对 |ψ|² 积分；动量不确定度可用 p=-iℏ∂_x 计算 ⟨p²⟩，或在动量空间读高斯宽度。",
      },
      workedSolution: {
        "zh-CN":
          "⟨x⟩=0，⟨x²⟩=a²/2，故 Δx=a/√2。由 ⟨p⟩=0、⟨p²⟩=ℏ²/(2a²) 得 Δp=ℏ/(a√2)。乘积 ΔxΔp=ℏ/2，恰好达到 Robertson 关系 ΔxΔp≥ℏ/2 的下界，说明最小不确定高斯态使不等式饱和。",
      },
      verification: {
        "zh-CN":
          "动量空间波函数仍为高斯形，宽度 ℏ/a，宽度乘积与 a 无关，与计算一致；对非高斯态（如无限深方势阱基态）重复计算，乘积大于 ℏ/2，说明饱和是高斯形的特征。",
      },
    },
    {
      id: "quantum-field-kg-dispersion",
      title: { "zh-CN": "Klein-Gordon 方程的色散关系" },
      chapterIds: ["p12-classical-fields", "p12-klein-gordon-dirac"],
      difficulty: 4,
      prompt: {
        "zh-CN":
          "实标量场 φ 满足 Klein–Gordon 方程 (□+m²)φ=0（取 ℏ=c=1）。代入平面波 φ∝e^{-iωt+ik·x}，推导色散关系，并说明正负频率解在量子化后的物理解释。",
      },
      hint: {
        "zh-CN": "□=∂_t²-∇²；代入平面波后得到 ω 与 k、m 之间的代数关系。",
      },
      workedSolution: {
        "zh-CN":
          "代入得 (-ω²+k²+m²)φ=0，故 ω²=k²+m²，即 ω=±√(k²+m²)。正频率解对应能量 E=√(k²+m²) 的粒子模，负频率解是其复共轭；正则量子化后正频率部分配湮灭算符、负频率部分配产生算符，实场的自共轭条件把二者绑定为同一粒子，反粒子即粒子本身。",
      },
      verification: {
        "zh-CN":
          "静止极限 k=0 时 E=m，恢复 c 后即 Einstein 质能关系 E=mc²；非相对论极限 E≈m+k²/(2m)，给出静止能量加经典动能，与预期一致。",
      },
    },
  ],
};

const computerScienceFoundationsPath: LearningPathV3 = {
  schemaVersion: 3,
  id: "computer-science-foundations",
  title: { "zh-CN": "计算机科学基础", en: "Computer science foundations" },
  summary: {
    "zh-CN": "学习程序设计、数据结构、算法复杂度、数据处理与实验设计。",
    en: "A route through programming, data structures, algorithmic complexity, and the engineering of data pipelines, experiment design, and reproducible computing.",
  },
  audience: {
    "zh-CN": "适合准备学习科学计算、机器学习或科研软件开发的读者。",
    en: "Learners who want a verifiable foundation for scientific computing, machine learning, or research software development.",
  },
  prerequisiteChapterIds: [],
  stageGoals: [
    { "zh-CN": "编写科学计算程序，并记录依赖、运行环境与随机种子。" },
    { "zh-CN": "依据数据规模选择数据结构与算法，用渐近复杂度与正确性论证比较候选方案。" },
    { "zh-CN": "设计数据处理流程与随机化实验，报告效应量、不确定度和实验记录。" },
  ],
  chapterIds: [
    "c00-programs-types-control",
    "c00-collections-files",
    "c00-arrays-vectorization",
    "c00-visualization-experiments",
    "c00-testing-version-control",
    "c00-programming-review",
    "c01-sequences-trees",
    "c01-hash-graphs",
    "c01-divide-greedy",
    "c01-dynamic-graph-algorithms",
    "c01-complexity-computability",
    "c01-algorithms-review",
    "c02-data-quality-cleaning",
    "c02-transformation-provenance",
    "c02-controls-randomization",
    "c02-metrics-comparisons",
    "c02-tracking-packaging",
    "c02-data-experiment-review",
  ],
  estimatedHours: 22,
  checkpoints: [
    {
      id: "cs-foundations-program-check",
      afterChapterId: "c00-programming-review",
      prompt: {
        "zh-CN":
          "对一个数值脚本，说明如何用单元测试、性质测试和固定随机种子保证结果可复现，并列出必须记录的依赖与环境信息。",
      },
    },
    {
      id: "cs-foundations-experiment-check",
      afterChapterId: "c02-data-experiment-review",
      prompt: {
        "zh-CN":
          "为一个算法对比实验设计随机化方案与主指标，说明多重比较带来的错误率风险，以及制品发布应包含哪些版本与校验信息。",
      },
    },
  ],
  exercises: [
    {
      id: "cs-foundations-complexity-sorting",
      title: { "zh-CN": "排序算法的渐近复杂度与常数因子" },
      chapterIds: ["c01-divide-greedy", "c01-complexity-computability"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "对随机排列的 n 个元素，比较归并排序与插入排序的比较次数量级；当 n=10⁶ 时估算两者基本操作次数的比值，并说明常数因子在何种情形下会让插入排序更快。",
      },
      hint: {
        "zh-CN":
          "归并排序比较次数约 n log₂ n，插入排序最坏与平均均为 Θ(n²)；小 n 或近乎有序输入时常数项主导。",
      },
      workedSolution: {
        "zh-CN":
          "归并排序约 n log₂ n 次比较，n=10⁶ 时约 2×10⁷；插入排序平均约 n²/4=2.5×10¹¹，两者相差约 10⁴ 量级。插入排序常数小、额外空间为 O(1)，且对近乎有序数据为 O(n)，故当 n 很小（经验上数十个元素）或输入几乎有序时反而更快，这也是混合排序在小分段切换到插入排序的原因。",
      },
      verification: {
        "zh-CN":
          "用递推 T(n)=2T(n/2)+n 展开归并排序恰得 n log₂ n；对 n=64 的小输入实测两种实现的比较计数，可复现插入排序的常数优势，与渐近分析互补。",
      },
    },
    {
      id: "cs-foundations-hash-load-factor",
      title: { "zh-CN": "哈希表装载因子与期望探测长度" },
      chapterIds: ["c01-sequences-trees", "c01-hash-graphs"],
      difficulty: 3,
      prompt: {
        "zh-CN":
          "开放寻址哈希表容量 m=1024，已存入 n=768 个键。计算装载因子 α，并用均匀散列假设下不成功查找的期望探测数 1/(1-α) 估计探测次数，说明 α 接近 1 时性能为何急剧恶化。",
      },
      hint: {
        "zh-CN": "α=n/m；均匀散列下每次探测命中空闲槽的概率为 1-α，期望探测数为其倒数。",
      },
      workedSolution: {
        "zh-CN":
          "α=768/1024=0.75，期望探测数 1/(1-α)=4 次。当 α→1 时空闲槽比例趋于零，聚集效应使连续被占区间越来越长，期望探测数发散，因此实现通常设定装载因子上限（如 0.7），超过即扩容并重新散列。",
      },
      verification: {
        "zh-CN":
          "α=0.5 时公式给 2 次、α=0.9 时给 10 次，单调性与直觉一致；用随机键模拟插入并统计平均探测长度，可与 1/(1-α) 曲线逐点对比核对。",
      },
    },
  ],
};

const authoredTopicalPathsV3: readonly LearningPathV3[] = [
  scientificMachineLearningPath,
  analysisRealComplexFunctionalPath,
  algebraAndDiscreteStructuresPath,
  geometryAndTopologyPath,
  numericalAnalysisOptimizationPath,
  probabilityToStatisticsPath,
  classicalToAnalyticalMechanicsPath,
  wavesAndElectromagnetismPath,
  thermodynamicsStatisticalPhysicsPath,
  quantumToFieldTheoryPath,
  computerScienceFoundationsPath,
  ...computingLearningPaths,
];

const authoredTopicalPathIds = new Set(authoredTopicalPathsV3.map((path) => path.id));

const migratedTopicalPaths = requiredTopicalLearningPathIds
  .filter((id) => !authoredTopicalPathIds.has(id))
  .map((id) => migrateLearningPathV2ToV3(requireLegacyLearningPath(id), resolveCanonicalChapterId));

const topicalLearningPathsV4 = [...migratedTopicalPaths, ...authoredTopicalPathsV3]
  .map(alignPathWithCurriculum)
  .map((path) => {
    const sections: LearningPathSection[] = [];
    for (const chapterId of path.chapterIds) {
      const chapter = curriculumChapterById.get(chapterId);
      const book = curriculumData.books.find((candidate) => candidate.id === chapter?.bookId);
      if (!book) throw new Error(`Missing book for path chapter ${path.id}/${chapterId}`);
      const previous = sections.at(-1);
      if (previous?.bookId === book.id) {
        sections[sections.length - 1] = {
          ...previous,
          chapterIds: [...previous.chapterIds, chapterId],
        };
      } else {
        sections.push({
          id: `${path.id}-stage-${sections.length + 1}`,
          bookId: book.id,
          title: book.title,
          goal: book.introduction,
          chapterIds: [chapterId],
        });
      }
    }
    return migrateLearningPathV3ToV4(
      path,
      "topic",
      sections.map((section, index) => ({
        ...section,
        goal:
          sections.length === path.stageGoals.length
            ? (path.stageGoals[index] ?? section.goal)
            : section.goal,
      })),
    );
  });

const seriesLearningPathsV4 = curriculumData.series.map((series) =>
  buildSeriesLearningPath(series.id),
);

export const learningPaths: readonly DiscoverableLearningPath[] = [
  ...topicalLearningPathsV4,
  ...seriesLearningPathsV4,
].map(withConceptProjection);

export const learningPathById: ReadonlyMap<string, DiscoverableLearningPath> = new Map(
  learningPaths.map((path) => [path.id, path] as const),
);

export const learningPathAliasById: ReadonlyMap<string, LearningPathAlias> = new Map(
  learningPathAliases.map((alias) => [alias.id, alias] as const),
);
