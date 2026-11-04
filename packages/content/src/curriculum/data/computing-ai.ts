import { chapter, part } from "../blueprint";
import type { BookBlueprint, SeriesBlueprint } from "../blueprint";

export const computingAiBooks: readonly BookBlueprint[] = [
  {
    code: "C00",
    slug: "programming-scientific-computing-foundations",
    title: "编程与科学计算基础",
    summary: "程序设计、数据表示、数组计算、测试、版本管理与数值实验。",
    level: "foundation",
    prerequisiteBookIds: ["m00", "m01"],
    parts: [
      part("programming", "第一编 程序与数据", [
        chapter(
          "programs-types-control",
          "程序、类型、控制流与函数",
          "programs-types-control",
          "程序、类型、控制流与函数：从表达式、变量和类型建立程序状态，使用分支、循环与函数分解问题，并通过前置条件、返回值和作用域说明计算契约。",
        ),
        chapter(
          "collections-files",
          "集合数据、文件与错误处理",
          "collections-files",
          "集合数据、文件与错误处理：使用序列、映射和集合组织数据，设计文本与结构化文件读写流程，并用异常、资源清理和输入验证处理失败路径。",
        ),
      ]),
      part("scientific-programming", "第二编 科学编程", [
        chapter(
          "arrays-vectorization",
          "数组、向量化与数值精度",
          "arrays-vectorization",
          "数组、向量化与数值精度：用形状、轴、广播和切片表示批量数值计算，比较向量化与循环的语义及成本，并识别浮点表示、溢出和舍入误差。",
        ),
        chapter(
          "visualization-experiments",
          "数据可视化与计算实验",
          "visualization-experiments",
          "数据可视化与计算实验：实验变量、图形编码、参数扫描，以及数据和随机种子的记录。",
        ),
      ]),
      part("reproducibility", "第三编 工程基础与综合复习", [
        chapter(
          "testing-version-control",
          "测试、版本控制与环境管理",
          "testing-version-control",
          "测试、版本控制与环境管理：用单元测试、性质检查和回归样例验证程序，使用版本控制组织可审查变更，并锁定依赖、运行命令和环境以支持复现。",
        ),
        chapter(
          "programming-review",
          "编程与科学计算综合项目",
          "programming-review",
          "编程与科学计算综合项目：程序分解、数据结构、数组计算、可视化、异常处理、测试与版本管理。",
        ),
      ]),
    ],
  },
  {
    code: "C01",
    slug: "data-structures-algorithms-complexity",
    title: "数据结构、算法与复杂度",
    summary: "数据结构、排序、动态规划、图算法、复杂度与可计算性。",
    level: "undergraduate",
    prerequisiteBookIds: ["c00", "m07"],
    parts: [
      part("structures", "第一编 数据结构", [
        chapter(
          "sequences-trees",
          "序列、栈、队列、树与堆",
          "sequences-trees",
          "序列、栈、队列、树与堆：以抽象数据类型和不变量比较数组、链表、栈、队列、搜索树及堆，分析基本操作的正确性、时间复杂度和存储代价。",
        ),
        chapter(
          "hash-graphs",
          "哈希表、图与并查集",
          "hash-graphs",
          "哈希表、图与并查集：用散列函数与冲突策略实现字典，以邻接结构表示图，并通过并查集和摊还分析支持动态连通性。",
        ),
      ]),
      part("algorithms", "第二编 算法设计", [
        chapter(
          "divide-greedy",
          "分治、贪心与排序",
          "divide-greedy",
          "分治、贪心与排序从子问题结构建立递推和合并步骤，证明比较排序的复杂度，并用交换论证或切分性质验证贪心选择。",
        ),
        chapter(
          "dynamic-graph-algorithms",
          "动态规划与图算法",
          "dynamic-graph-algorithms",
          "动态规划与图算法：通过状态、转移和最优子结构构造动态规划，使用遍历、最短路和最小生成树算法处理图问题并证明正确性。",
        ),
      ]),
      part("complexity", "第三编 复杂度与综合复习", [
        chapter(
          "complexity-computability",
          "渐近复杂度、归约与可计算性",
          "complexity-computability",
          "渐近复杂度、归约与可计算性：用渐近上界、下界和摊还成本比较算法，通过多项式时间归约理解困难性，并由停机问题说明可计算性的根本边界。",
        ),
        chapter(
          "algorithms-review",
          "数据结构与算法综合复习",
          "algorithms-review",
          "数据结构与算法综合复习围绕问题建模、不变量、正确性和复杂度选择方法，比较分治、贪心、动态规划与图算法的适用条件。",
        ),
      ]),
    ],
  },
  {
    code: "C02",
    slug: "data-processing-experiment-design-reproducibility",
    title: "数据处理、实验设计与可复现计算",
    summary: "数据清理、变换记录、实验设计、统计比较与环境管理。",
    level: "undergraduate",
    prerequisiteBookIds: ["c00", "m06"],
    parts: [
      part("data-pipelines", "第一编 数据管线", [
        chapter(
          "data-quality-cleaning",
          "数据质量、清理与模式验证",
          "data-quality-cleaning",
          "数据质量、清理与模式验证从研究问题定义质量规则，检查类型、范围、唯一性、缺失和重复，保留原始值与清理决策并避免把异常机械删除。",
        ),
        chapter(
          "transformation-provenance",
          "数据变换、血缘与版本",
          "transformation-provenance",
          "数据变换、血缘与版本：把筛选、连接、聚合和派生变量组织为可重复管线，记录输入版本、模式、变换参数和血缘以支持回溯与重算。",
        ),
      ]),
      part("experiments", "第二编 实验设计", [
        chapter(
          "controls-randomization",
          "对照、随机化与功效分析",
          "controls-randomization",
          "对照、随机化与功效分析由研究问题和处理单元出发，设计随机分配、阻断与盲法，并使用效应量、方差、显著性水平和功效规划样本量。",
        ),
        chapter(
          "metrics-comparisons",
          "指标、统计比较与多重检验",
          "metrics-comparisons",
          "指标、统计比较与多重检验：预先定义主指标和比较单位，选择与设计匹配的区间和检验，报告效应量与不确定度并控制重复比较带来的错误率。",
        ),
      ]),
      part("reproducible-workflows", "第三编 可复现工作流与综合复习", [
        chapter(
          "tracking-packaging",
          "实验追踪、环境封装与制品",
          "tracking-packaging",
          "实验追踪、环境封装与制品：把代码、配置、数据版本、随机种子、运行环境、指标和产物绑定为可查询记录，以清单、校验和与复现命令封装制品。",
        ),
        chapter(
          "data-experiment-review",
          "数据处理与实验设计综合复习",
          "data-experiment-review",
          "数据处理与实验设计综合复习围绕一个可审计研究问题，串联质量检查、变换血缘、随机化设计、统计比较、实验追踪和制品发布，并区分探索与确认。",
        ),
      ]),
    ],
  },
  {
    code: "A00",
    slug: "machine-learning-problems-data-evaluation",
    title: "机器学习问题、数据与评估",
    summary: "学习任务、数据划分、损失函数、评估指标与基线。",
    level: "undergraduate",
    prerequisiteBookIds: ["c02", "m05", "m06"],
    parts: [
      part("problems-data", "第一编 学习问题与数据", [
        chapter("supervised-problems", "监督学习任务、样本与标签", "supervised-learning"),
        chapter(
          "data-splits-leakage",
          "训练、验证、测试与数据泄漏",
          "data-splits-leakage",
          "训练、验证、测试与数据泄漏：按真实部署单位与时间关系划分数据，识别特征、预处理、重复实体与超参数选择中的信息泄漏。",
        ),
      ]),
      part("risk-metrics", "第二编 风险与评估", [
        chapter("loss-risk-evaluation", "损失函数、风险与评估", "loss-functions"),
        chapter(
          "metrics-baselines",
          "分类、回归指标与基线",
          "metrics-baselines",
          "分类、回归指标与基线根据任务代价选择评价量，构造可解释参照，并以区间、不平衡诊断和阈值曲线报告差异。",
        ),
      ]),
      part("reliable-evaluation", "第三编 可靠评估与综合复习", [
        chapter(
          "shift-uncertainty",
          "分布偏移、置信区间与不确定性",
          "shift-uncertainty",
          "分布偏移、置信区间与不确定性：区分协变量、标签和概念偏移，使用重采样区间、分组评估与校准诊断量化性能不确定性并限定外推。",
        ),
        chapter(
          "ml-problems-review",
          "机器学习问题与评估综合复习",
          "ml-problems-review",
          "机器学习问题与评估综合复习从任务、样本、标签与损失开始，串联数据切分、基线、指标、阈值、不确定性和分布偏移，形成不泄漏的评估协议。",
        ),
      ]),
    ],
  },
  {
    code: "A01",
    slug: "linear-models-statistical-learning",
    title: "线性模型与统计学习",
    summary: "线性回归、逻辑回归、正则化、泛化误差与容量控制。",
    level: "undergraduate",
    prerequisiteBookIds: ["a00", "m04", "m06", "m11"],
    parts: [
      part("regression-classification", "第一编 回归与分类", [
        chapter("linear-regression", "线性回归、最小二乘与正规方程", "linear-regression"),
        chapter("logistic-regression", "Logistic 回归与概率分类", "logistic-regression"),
      ]),
      part("generalization", "第二编 复杂度与泛化", [
        chapter(
          "overfitting-generalization",
          "过拟合、泛化与模型选择",
          "overfitting-generalization",
        ),
        chapter("regularization", "正则化、偏差与方差", "regularization"),
      ]),
      part("statistical-learning", "第三编 统计学习理论与综合复习", [
        chapter(
          "empirical-risk-capacity",
          "经验风险、容量与一致收敛",
          "empirical-risk-capacity",
          "经验风险、容量与一致收敛：从经验风险与真实风险差异进入假设类容量、集中界和一致收敛，解释结构风险最小化及泛化界的条件与局限。",
        ),
        chapter(
          "linear-learning-review",
          "线性模型与统计学习综合复习",
          "linear-learning-review",
          "线性模型与统计学习综合复习联合最小二乘、概率分类、正则化、偏差方差和容量控制分析学习流程，并用独立评估区分拟合与泛化。",
        ),
      ]),
    ],
  },
  {
    code: "A02",
    slug: "kernel-tree-ensemble-methods",
    title: "核方法、树模型与集成学习",
    summary: "核方法、支持向量机、决策树、随机森林与梯度提升。",
    level: "undergraduate",
    prerequisiteBookIds: ["a01", "m11"],
    parts: [
      part("kernels", "第一编 核方法", [
        chapter(
          "feature-maps-kernels",
          "特征映射、正定核与再生核空间",
          "feature-maps-kernels",
          "特征映射、正定核与再生核空间从内积表示建立正定核与 Gram 矩阵，解释核技巧、再生性质和核选择的适用边界。",
        ),
        chapter(
          "support-vector-machines",
          "最大间隔与支持向量机",
          "support-vector-machines",
          "最大间隔与支持向量机：由几何间隔和软间隔优化推导分类器，对偶化后使用核函数，并分析正则参数、尺度与类别重叠。",
        ),
      ]),
      part("trees", "第二编 树模型", [
        chapter(
          "decision-trees",
          "决策树、划分准则与剪枝",
          "decision-trees",
          "决策树、划分准则与剪枝通过递归划分和不纯度下降构建分类回归树，并分析停止、剪枝、缺失值处理和树模型的不稳定性。",
        ),
        chapter(
          "random-forests",
          "随机森林与袋装集成",
          "random-forests",
          "随机森林与袋装集成：用 bootstrap 样本和随机特征去相关多棵树，通过袋外估计评估泛化并解释特征重要度的偏差。",
        ),
      ]),
      part("boosting", "第三编 Boosting 与综合复习", [
        chapter(
          "gradient-boosting",
          "AdaBoost、梯度提升与残差拟合",
          "gradient-boosting",
          "AdaBoost、梯度提升与残差拟合把弱学习器逐步组合为加法模型，比较样本权重更新与函数空间梯度下降，并分析学习率、深度与过拟合。",
        ),
        chapter(
          "kernel-tree-review",
          "核方法、树模型与集成学习综合复习",
          "kernel-tree-review",
          "核方法、树模型与集成学习综合复习比较核方法、单树、袋装与提升在归纳偏置、复杂度、校准、解释和计算成本上的差异。",
        ),
      ]),
    ],
  },
  {
    code: "A03",
    slug: "unsupervised-learning-probabilistic-graphical-models",
    title: "无监督学习与概率图模型",
    summary: "聚类、降维、潜变量模型、概率图模型与近似推断。",
    level: "advanced",
    prerequisiteBookIds: ["a01", "m05"],
    parts: [
      part("unsupervised", "第一编 聚类与降维", [
        chapter(
          "clustering",
          "聚类目标、K 均值与密度方法",
          "clustering",
          "聚类目标、K 均值与密度方法：比较不同聚类范式的目标、距离、初始化与超参数，并使用稳定性和外部语义限制簇解释。",
        ),
        chapter(
          "pca-manifolds",
          "主成分分析与流形降维",
          "pca-manifolds",
          "主成分分析与流形降维由协方差谱分解与最佳低秩逼近推导 PCA，并比较局部流形方法中的邻域、尺度与可视化失真。",
        ),
      ]),
      part("graphical-models", "第二编 概率图模型", [
        chapter(
          "directed-undirected",
          "贝叶斯网络与 Markov 随机场",
          "directed-undirected",
          "贝叶斯网络与 Markov 随机场用有向无环图和无向图编码条件独立性，因子化联合分布并区分生成方向、Markov 性与因果解释。",
        ),
        chapter(
          "exact-inference",
          "变量消元、消息传递与精确推断",
          "exact-inference",
          "变量消元、消息传递与精确推断：通过因子运算和树上消息计算边缘与条件概率，分析消元顺序和树宽带来的复杂度。",
        ),
      ]),
      part("latent-inference", "第三编 潜变量与综合复习", [
        chapter(
          "em-variational",
          "EM 算法与变分推断",
          "em-variational",
          "EM 算法与变分推断由潜变量对数似然下界推导 E/M 步，再把难解后验转为变分优化，并分析局部最优与近似偏差。",
        ),
        chapter(
          "unsupervised-pgm-review",
          "无监督学习与概率图模型综合复习",
          "unsupervised-pgm-review",
          "无监督学习与概率图模型综合复习串联聚类、降维、图因子化、精确推断、EM 与变分方法，区分可识别性、近似误差和语义验证。",
        ),
      ]),
    ],
  },
  {
    code: "A04",
    slug: "neural-networks-backpropagation",
    title: "神经网络与反向传播",
    summary: "感知机、激活函数、多层网络、计算图与反向传播。",
    level: "undergraduate",
    prerequisiteBookIds: ["a01", "m04", "m11"],
    parts: [
      part("network-building-blocks", "第一编 网络构件", [
        chapter("perceptron-mlp", "感知机与多层感知器", "perceptron-mlp"),
        chapter("activation-functions", "激活函数与非线性表示", "activation-functions"),
      ]),
      part("differentiation", "第二编 计算图与梯度", [
        chapter(
          "computation-graphs",
          "计算图、链式法则与局部导数",
          "computation-graphs",
          "计算图、链式法则与局部导数：把复合函数表示为有向无环图，沿拓扑序计算前向值，并用局部 Jacobian 和链式法则组织导数。",
        ),
        chapter("backpropagation", "反向传播与反向模式自动微分", "backpropagation"),
      ]),
      part("training-basics", "第三编 训练基础与综合复习", [
        chapter(
          "initialization-gradient-flow",
          "参数初始化与梯度传播",
          "initialization-gradient-flow",
          "参数初始化与梯度传播用方差传播分析初始化尺度，诊断梯度消失与爆炸，并比较激活、归一化和残差路径对信号传递的影响。",
        ),
        chapter(
          "neural-backprop-review",
          "神经网络与反向传播综合复习",
          "neural-backprop-review",
          "神经网络与反向传播综合复习串联网络表示、激活函数、计算图、反向传播和初始化，以梯度检查和小数据过拟合测试验证实现。",
        ),
      ]),
    ],
  },
  {
    code: "A05",
    slug: "deep-learning-optimization-engineering",
    title: "深度学习优化与工程方法",
    summary: "随机优化、归一化、正则化、调试与分布式训练。",
    level: "advanced",
    prerequisiteBookIds: ["a04", "c02"],
    parts: [
      part("optimization", "第一编 深度优化", [
        chapter(
          "sgd-momentum-adaptive",
          "随机梯度、动量与自适应方法",
          "sgd-momentum-adaptive",
          "从小批量梯度噪声进入 SGD、动量、RMSProp 与 Adam，比较更新公式、偏差修正、稳定性和泛化诊断。",
        ),
        chapter(
          "schedules-second-order",
          "学习率调度与二阶近似",
          "schedules-second-order",
          "使用预热、衰减与周期调度控制步长，以曲率、Hessian 向量积和预条件理解二阶信息的成本与近似。",
        ),
      ]),
      part("stability", "第二编 训练稳定性", [
        chapter(
          "normalization",
          "归一化方法与尺度控制",
          "normalization",
          "比较批、层与组归一化的统计轴、训练推理差异和尺度不变性，分析小批量与分布漂移下的限制。",
        ),
        chapter(
          "regularization-augmentation",
          "正则化、数据增强与早停",
          "regularization-augmentation",
          "联合权重衰减、随机失活、增强与早停控制有效复杂度，确保增强保留标签语义并由独立验证选择强度。",
        ),
      ]),
      part("engineering", "第三编 训练工程与综合复习", [
        chapter(
          "mixed-precision-distributed",
          "混合精度、分布式训练与检查点",
          "mixed-precision-distributed",
          "用损失缩放和主权重管理低精度训练，比较数据与模型并行通信，并设计包含优化器、随机状态和数据位置的检查点。",
        ),
        chapter(
          "deep-learning-engineering-review",
          "调试、复现实验与工程方法综合复习",
          "deep-learning-engineering-review",
          "围绕可靠训练运行串联优化、调度、归一化、正则化、混合精度、分布式、检查点、监控与复现实验。",
        ),
      ]),
    ],
  },
  {
    code: "A06",
    slug: "convolutional-neural-networks-computer-vision",
    title: "卷积神经网络与计算机视觉",
    summary: "卷积算子、视觉架构、目标检测、分割与视觉 Transformer。",
    level: "advanced",
    prerequisiteBookIds: ["a04", "a05"],
    parts: [
      part("convolution", "第一编 卷积表示", [
        chapter(
          "convolution-operators",
          "离散卷积、感受野与参数共享",
          "convolution-operators",
          "从离散互相关、步幅、填充与膨胀计算输出形状和感受野，解释局部连接、平移等变与参数共享。",
        ),
        chapter(
          "cnn-architectures",
          "卷积网络架构与残差连接",
          "cnn-architectures",
          "比较卷积块、下采样、归一化和残差连接的结构作用，分析宽度、深度、分辨率与计算预算。",
        ),
      ]),
      part("vision-tasks", "第二编 视觉任务", [
        chapter(
          "detection",
          "目标检测与多尺度特征",
          "detection",
          "把分类扩展为类别与边界框联合预测，比较一阶段和两阶段检测、多尺度特征、匹配、抑制与 mAP 评估。",
        ),
        chapter(
          "segmentation",
          "语义分割、实例分割与密集预测",
          "segmentation",
          "以全卷积编码器—解码器产生像素预测，区分语义与实例分割，并分析上采样、跳连、类别不平衡和边界指标。",
        ),
      ]),
      part("vision-representations", "第三编 视觉表示与综合复习", [
        chapter(
          "vision-transformers",
          "视觉 Transformer 与混合架构",
          "vision-transformers",
          "把图像切分为 token 并使用自注意力建模全局关系，比较卷积与视觉 Transformer 的归纳偏置、数据规模和复杂度。",
        ),
        chapter(
          "computer-vision-review",
          "几何、数据偏差与计算机视觉综合复习",
          "computer-vision-review",
          "串联卷积、残差、检测、分割与视觉 Transformer，结合几何变换、数据偏差、鲁棒性和计算成本评估系统。",
        ),
      ]),
    ],
  },
  {
    code: "A07",
    slug: "sequence-models-attention-transformers",
    title: "序列模型、注意力与 Transformer",
    summary: "循环网络、注意力、Transformer、序列训练与长序列计算。",
    level: "advanced",
    prerequisiteBookIds: ["a04", "a05"],
    parts: [
      part("sequence-models", "第一编 序列表示", [
        chapter(
          "rnns-gating",
          "循环网络、门控单元与状态传播",
          "rnns-gating",
          "用递归隐藏状态表示序列，分析时间反向传播、梯度路径，并由 LSTM 与 GRU 门控控制记忆和遗忘。",
        ),
        chapter(
          "sequence-training",
          "序列损失、教师强制与解码",
          "sequence-training",
          "按条件概率分解序列损失，比较教师强制与自由运行，使用贪心、束搜索和采样解码并诊断暴露偏差。",
        ),
      ]),
      part("attention", "第二编 注意力机制", [
        chapter("attention-mechanism", "缩放点积注意力与掩码", "attention-mechanism"),
        chapter(
          "multihead-positional",
          "多头注意力与位置表示",
          "multihead-positional",
          "把 query、key、value 投影到多个子空间并行计算注意力，比较绝对、相对、旋转位置表示及长度外推。",
        ),
      ]),
      part("transformers", "第三编 Transformer 与综合复习", [
        chapter(
          "transformer-architecture",
          "编码器、解码器与 Transformer 架构",
          "transformer-architecture",
          "组装多头注意力、前馈网络、残差与归一化，比较编码器、因果解码器和编码器—解码器掩码及训练目标。",
        ),
        chapter(
          "sequence-transformer-review",
          "长序列、效率与 Transformer 综合复习",
          "sequence-transformer-review",
          "串联循环、序列训练、注意力、位置与 Transformer，分析长上下文复杂度、缓存、近似注意力和评估边界。",
        ),
      ]),
    ],
  },
  {
    code: "A08",
    slug: "representation-self-supervised-learning",
    title: "表示学习与自监督学习",
    summary: "表示学习、对比学习、掩码预测、度量学习与跨模态预训练。",
    level: "advanced",
    prerequisiteBookIds: ["a06", "a07"],
    parts: [
      part("representations", "第一编 表示与度量", [
        chapter(
          "representation-objectives",
          "表示学习目标、相似度与不变性",
          "representation-objectives",
          "把表示学习写成保持任务信息、压缩无关变化的目标，比较重建、预测、对比和不变性约束及其失效方式。",
        ),
        chapter(
          "metric-learning",
          "度量学习、孪生网络与三元组损失",
          "metric-learning",
          "从成对与三元组监督学习嵌入距离，推导对比损失和间隔损失，并讨论采样、塌缩和检索评价。",
        ),
      ]),
      part("self-supervision", "第二编 自监督目标", [
        chapter(
          "contrastive-learning",
          "对比学习、负样本与信息瓶颈",
          "contrastive-learning",
          "推导 InfoNCE 目标，分析增强视图、批内负样本、温度和投影头如何共同决定表示的对齐与均匀性。",
        ),
        chapter(
          "masked-prediction",
          "掩码预测与上下文建模",
          "masked-prediction",
          "通过遮蔽部分输入构造条件预测任务，比较离散 token、连续 patch 与自回归目标，并检查预训练和下游任务错位。",
        ),
      ]),
      part("pretraining", "第三编 预训练与综合复习", [
        chapter(
          "multimodal-pretraining",
          "跨模态对齐与预训练迁移",
          "multimodal-pretraining",
          "用成对数据对齐图像、文本等模态，比较双塔与融合架构，并分析零样本迁移、数据噪声和评价泄漏。",
        ),
        chapter(
          "representation-review",
          "表示质量、坍塌与自监督学习综合复习",
          "representation-review",
          "串联目标、度量、对比、掩码与跨模态预训练，通过线性探测、检索和迁移实验判断表示质量及坍塌风险。",
        ),
      ]),
    ],
  },
  {
    code: "A09",
    slug: "generative-models",
    title: "生成模型",
    summary: "自回归模型、变分自编码器、生成对抗网络、归一化流与扩散模型。",
    level: "advanced",
    prerequisiteBookIds: ["a03", "a07"],
    parts: [
      part("likelihood-latent", "第一编 似然与潜变量", [
        chapter(
          "autoregressive-models",
          "自回归生成与序列似然",
          "autoregressive-models",
          "按变量顺序分解联合分布，计算教师强制下的精确似然，并比较采样顺序、暴露偏差和生成成本。",
        ),
        chapter(
          "variational-autoencoders",
          "变分自编码器与证据下界",
          "variational-autoencoders",
          "从边缘似然推导证据下界和重参数化梯度，解释重建项、KL 项、后验塌缩与潜空间插值。",
        ),
      ]),
      part("implicit-invertible", "第二编 隐式与可逆生成", [
        chapter(
          "generative-adversarial",
          "生成对抗网络与散度最小化",
          "generative-adversarial",
          "把生成器和判别器写成极小极大博弈，分析散度、模式崩溃、梯度饱和与对抗训练评价。",
        ),
        chapter(
          "normalizing-flows",
          "正规化流与可逆变换",
          "normalizing-flows",
          "用变量替换公式组合可逆映射和 Jacobian 行列式，在精确似然、采样效率与架构约束之间权衡。",
        ),
      ]),
      part("diffusion", "第三编 扩散模型与综合复习", [
        chapter(
          "score-diffusion",
          "得分匹配、扩散过程与反向采样",
          "score-diffusion",
          "由逐步加噪过程构造去噪训练目标，连接噪声预测与得分匹配，并比较反向采样步数和误差。",
        ),
        chapter(
          "generative-models-review",
          "生成质量、覆盖与生成模型综合复习",
          "generative-models-review",
          "统一比较自回归、VAE、GAN、流和扩散的似然、样本质量、覆盖、推理代价与可验证边界。",
        ),
      ]),
    ],
  },
  {
    code: "A10",
    slug: "reinforcement-learning",
    title: "强化学习",
    summary: "Markov 决策过程、价值方法、策略梯度与离线强化学习。",
    level: "advanced",
    prerequisiteBookIds: ["a01", "m05", "m11"],
    parts: [
      part("mdp-values", "第一编 决策过程与价值", [
        chapter(
          "markov-decision-processes",
          "Markov 决策过程与 Bellman 方程",
          "markov-decision-processes",
          "形式化状态、动作、转移、奖励和折扣回报，推导策略价值、最优价值与 Bellman 方程。",
        ),
        chapter(
          "dynamic-programming-td",
          "动态规划、Monte Carlo 与时序差分",
          "dynamic-programming-td",
          "比较模型已知时的动态规划、完整回报的 Monte Carlo 与自举的时序差分，并分析偏差—方差。",
        ),
      ]),
      part("control", "第二编 控制与策略", [
        chapter(
          "q-learning",
          "Q-learning、探索与函数逼近",
          "q-learning",
          "推导离策略 Q-learning 更新，比较探索策略与经验回放，并解释函数逼近下的不稳定来源。",
        ),
        chapter(
          "policy-gradients",
          "策略梯度、actor–critic 与优势估计",
          "policy-gradients",
          "从对数导数技巧推导策略梯度，用基线和优势降低方差，并组装 actor–critic 更新。",
        ),
      ]),
      part("advanced-rl", "第三编 高级强化学习与综合复习", [
        chapter(
          "model-offline-rl",
          "基于模型、离线与多智能体强化学习",
          "model-offline-rl",
          "比较学习环境模型、固定数据集策略优化与多智能体交互，重点分析模型偏差、分布外动作和非平稳性。",
        ),
        chapter(
          "reinforcement-learning-review",
          "稳定性、评估与强化学习综合复习",
          "reinforcement-learning-review",
          "串联 MDP、价值估计、Q-learning、策略梯度和离线方法，以多种子、置信区间和离线评估检查结论。",
        ),
      ]),
    ],
  },
  {
    code: "A11",
    slug: "graph-neural-networks-geometric-deep-learning",
    title: "图神经网络与几何深度学习",
    summary: "图信号、消息传递、谱方法、等变网络与图动力学。",
    level: "advanced",
    prerequisiteBookIds: ["a04", "m07", "m15"],
    parts: [
      part("graph-learning", "第一编 图表示", [
        chapter(
          "graph-signals",
          "图、图信号与节点表示",
          "graph-signals",
          "把节点、边和全局属性组织为图信号，比较邻接、Laplacian、局部统计与初始节点表示。",
        ),
        chapter(
          "message-passing",
          "消息传递与图卷积",
          "message-passing",
          "将消息、聚合和更新写成统一算子，分析置换不变性、感受野、读出函数与表达能力。",
        ),
      ]),
      part("geometric", "第二编 几何归纳偏置", [
        chapter(
          "invariance-equivariance",
          "不变性、等变性与群作用",
          "invariance-equivariance",
          "用群作用定义不变与等变映射，解释对称性约束如何减少假设空间，并核对坐标系和表示选择。",
        ),
        chapter(
          "spectral-geometric",
          "谱图方法与流形学习",
          "spectral-geometric",
          "从图 Laplacian 谱构造滤波和嵌入，联系流形假设、局部几何与空间消息传递。",
        ),
      ]),
      part("graph-systems", "第三编 图任务与综合复习", [
        chapter(
          "graph-generation-dynamics",
          "图生成、图动力学与物理系统",
          "graph-generation-dynamics",
          "建模边、节点和状态随时间变化的图系统，比较生成顺序、守恒约束和物理归纳偏置。",
        ),
        chapter(
          "geometric-deep-learning-review",
          "表达能力、过平滑与几何学习综合复习",
          "geometric-deep-learning-review",
          "综合图信号、消息传递、对称性和谱几何，诊断过平滑、过压缩、表达界限与数据泄漏。",
        ),
      ]),
    ],
  },
  {
    code: "A12",
    slug: "large-language-multimodal-agents",
    title: "大语言模型、多模态模型与智能体",
    summary: "语言建模、多模态模型、检索增强、工具调用与智能体评估。",
    level: "advanced",
    prerequisiteBookIds: ["a07", "a08", "a09"],
    parts: [
      part("language-models", "第一编 大语言模型", [
        chapter(
          "language-modeling-scaling",
          "语言建模、tokenization 与规模规律",
          "language-modeling-scaling",
          "从 tokenization 和自回归损失出发解释预训练，读取经验规模律时区分参数、数据、计算和评价边界。",
        ),
        chapter(
          "instruction-adaptation",
          "指令微调、偏好优化与上下文学习",
          "instruction-adaptation",
          "比较监督指令微调、偏好建模与策略优化，分析上下文学习、数据质量和目标错位。",
        ),
      ]),
      part("multimodal", "第二编 多模态模型", [
        chapter(
          "vision-language",
          "视觉语言对齐与多模态生成",
          "vision-language",
          "比较双塔对比对齐、跨注意力和多模态生成目标，检查配对数据偏差、零样本迁移与幻觉。",
        ),
        chapter(
          "retrieval-grounding",
          "检索增强、引用与事实落地",
          "retrieval-grounding",
          "把检索器、索引、生成器和引用追踪组成可审计链路，区分召回失败、上下文冲突与生成失真。",
        ),
      ]),
      part("agents", "第三编 智能体与综合复习", [
        chapter(
          "tools-memory-planning",
          "工具调用、记忆与任务规划",
          "tools-memory-planning",
          "把工具模式、状态记忆和计划执行建模为受约束循环，处理权限、错误恢复、终止条件与可追踪性。",
        ),
        chapter(
          "llm-agents-review",
          "系统评估、故障模式与智能体综合复习",
          "llm-agents-review",
          "综合语言、多模态、检索和工具链，以任务成功率、成本、延迟、安全边界和可复现轨迹评价智能体。",
        ),
      ]),
    ],
  },
  {
    code: "A13",
    slug: "interpretability-uncertainty-alignment-safety",
    title: "可解释性、不确定性、对齐与安全",
    summary: "特征归因、机制解释、校准、分布外检测、对齐与安全评估。",
    level: "research",
    prerequisiteBookIds: ["a05", "a12"],
    parts: [
      part("interpretability", "第一编 解释与归因", [
        chapter(
          "feature-attribution",
          "特征归因、显著性与反事实",
          "feature-attribution",
          "比较梯度、扰动、Shapley 归因和反事实解释，检查基线、相关特征与解释忠实度。",
        ),
        chapter(
          "mechanistic-interpretability",
          "表示探测与机制可解释性",
          "mechanistic-interpretability",
          "用探针、激活干预和电路假设研究内部机制，区分相关性证据、因果证据与可读故事。",
        ),
      ]),
      part("uncertainty", "第二编 不确定性与稳健性", [
        chapter(
          "calibration-ood",
          "校准、分布外检测与选择性预测",
          "calibration-ood",
          "计算可靠性图与校准误差，比较温度缩放、分布外分数和选择性预测，并避免测试集调参。",
        ),
        chapter(
          "robustness-attacks",
          "鲁棒性、对抗攻击与防御评估",
          "robustness-attacks",
          "从威胁模型构造对抗扰动，比较白盒与黑盒攻击、防御和自适应评估，避免梯度遮蔽误判。",
        ),
      ]),
      part("alignment-safety", "第三编 对齐与安全综合复习", [
        chapter(
          "alignment-objectives",
          "对齐目标、反馈与奖励建模",
          "alignment-objectives",
          "把偏好数据、奖励模型和策略目标分开，分析代理目标、奖励黑客、分布偏移和反馈者差异。",
        ),
        chapter(
          "safety-governance-review",
          "安全评测、系统边界与治理综合复习",
          "safety-governance-review",
          "把技术评测、使用情境、风险登记和治理责任连接起来，以证据等级、残余风险和监测计划收口。",
        ),
      ]),
    ],
  },
  {
    code: "A14",
    slug: "scientific-machine-learning-pinn-neural-operators",
    title: "科学机器学习、PINN 与神经算子",
    summary: "可微分物理、物理信息神经网络、神经算子与逆问题。",
    level: "research",
    prerequisiteBookIds: ["m09", "m10", "p11", "a05"],
    parts: [
      part("physics-informed", "第一编 物理约束学习", [
        chapter(
          "differentiable-physics",
          "可微物理、自动微分与守恒约束",
          "differentiable-physics",
          "区分对离散模拟器求导和直接学习代理模型，推导切线或伴随梯度并检查单位、守恒和离散误差。",
        ),
        chapter(
          "pinn",
          "物理信息神经网络与残差训练",
          "pinn",
          "把微分方程、初边值条件和观测写成复合损失，分析采样、尺度失衡、频谱偏差与残差不足。",
        ),
      ]),
      part("operator-learning", "第二编 算子学习", [
        chapter(
          "deeponet",
          "DeepONet 与算子逼近",
          "deeponet",
          "用 branch net 编码输入函数、trunk net 编码查询位置，解释算子逼近、传感器选择和离散化依赖。",
        ),
        chapter(
          "neural-operators",
          "Fourier 神经算子与网格泛化",
          "neural-operators",
          "在函数空间中学习解算子，推导 Fourier 层并检查网格变化、频谱截断、边界条件和零样本超分辨率。",
        ),
      ]),
      part("scientific-validation", "第三编 科学验证与综合复习", [
        chapter(
          "inverse-uncertainty",
          "逆问题、数据同化与不确定性",
          "inverse-uncertainty",
          "联合前向模型、观测算子、正则化与概率推断求解逆问题，区分参数、观测和模型不确定性。",
        ),
        chapter(
          "scientific-ml-review",
          "基准、外推边界与科学机器学习综合复习",
          "scientific-ml-review",
          "综合可微模拟、PINN 与算子学习，以守恒、网格收敛、外推、成本和不确定性量化评价科学模型。",
        ),
      ]),
    ],
  },
] as const;

export const computingAiSeries: SeriesBlueprint = {
  id: "computing-ai",
  slug: "computing-ai",
  title: "计算与人工智能",
  summary: "编程与算法、机器学习、深度学习、生成模型、智能体与科学机器学习。",
  books: computingAiBooks,
};
