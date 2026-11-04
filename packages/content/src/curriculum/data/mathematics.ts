import { chapter, part } from "../blueprint";
import type { BookBlueprint, SeriesBlueprint } from "../blueprint";

export const mathematicsBooks: readonly BookBlueprint[] = [
  {
    code: "M00",
    slug: "mathematical-language-sets-proofs",
    title: "数学语言、集合与证明",
    summary: "命题与量词、集合与映射、关系、数学归纳法和证明方法。",
    level: "foundation",
    parts: [
      part("language-sets", "第一编 数学语言与集合", [
        chapter("logic-propositions", "命题、量词与逻辑联结词", "logic-propositions"),
        chapter("sets-mappings", "集合、映射与关系", "sets-and-mappings"),
      ]),
      part("proof-methods", "第二编 证明与递归结构", [
        chapter("proof-strategies", "直接证明、反证法与构造法", "proof-strategies"),
        chapter("relations-induction", "等价关系、序关系与数学归纳法", "relations-induction"),
      ]),
      part("foundations-review", "第三编 基础结构与综合复习", [
        chapter(
          "countability-structures",
          "有限性、可数性与基本代数结构",
          "countability-structures",
        ),
        chapter("language-proof-review", "数学语言与证明综合复习", "language-proof-review"),
      ]),
    ],
  },
  {
    code: "M01",
    slug: "algebra-functions-analytic-geometry",
    title: "代数、函数与解析几何",
    summary: "方程与不等式、初等函数、直线与圆锥曲线。",
    level: "foundation",
    parts: [
      part("algebra", "第一编 代数式与方程", [
        chapter("equations-inequalities", "方程、不等式与绝对值", "equations-and-inequalities"),
        chapter("polynomials-rational", "多项式、因式分解与有理式", "polynomials"),
      ]),
      part("functions", "第二编 函数与变换", [
        chapter("functions-graphs", "函数、变换与图像", "functions-and-graphs"),
        chapter(
          "exponential-logarithmic",
          "指数函数、对数函数与复合函数",
          "exponential-logarithmic-functions",
        ),
      ]),
      part("analytic-geometry", "第三编 坐标几何与综合复习", [
        chapter("lines-conics", "直线、圆锥曲线与参数方程", "coordinate-geometry"),
        chapter(
          "algebra-functions-review",
          "代数、函数与解析几何综合复习",
          "algebra-functions-review",
        ),
      ]),
    ],
  },
  {
    code: "M02",
    slug: "single-variable-calculus",
    title: "单变量微积分",
    summary: "数列与函数极限、导数与微分、积分与无穷级数。",
    level: "undergraduate",
    parts: [
      part("limits", "第一编 极限与连续", [
        chapter("sequences-limits", "数列极限与收敛判据", "sequences-and-series"),
        chapter("function-limits-continuity", "函数极限与连续性", "limits-and-continuity"),
      ]),
      part("differentiation", "第二编 微分学", [
        chapter("derivatives-differentials", "导数与微分", "derivatives-and-differentials"),
        chapter("derivative-applications", "中值定理与导数应用", "derivative-applications"),
      ]),
      part("integration", "第三编 积分与综合复习", [
        chapter("definite-integral-accumulation", "定积分与累积", "integrals-and-accumulation"),
        chapter(
          "single-variable-review",
          "积分方法、无穷级数与单变量微积分复习",
          "single-variable-calculus-review",
        ),
      ]),
    ],
  },
  {
    code: "M03",
    slug: "multivariable-calculus-vector-analysis",
    title: "多变量微积分与向量分析",
    summary: "多变量函数、局部线性化、多重积分和向量场积分定理。",
    level: "undergraduate",
    parts: [
      part(
        "multivariable-differentiation",
        "第一编 多变量微分",
        [
          chapter(
            "several-variable-functions",
            "多变量函数、极限与连续",
            "several-variable-functions",
            "围绕多变量函数、极限与连续，本章从欧氏空间中的邻域和路径出发，判断联合极限、连续性与紧集上的极值，并辨认仅凭有限路径无法证明的边界。",
          ),
          chapter(
            "partials-gradient",
            "偏导数、方向导数与梯度",
            "gradient",
            "偏导数、方向导数与梯度由全微分统一起来，并利用 Jacobian、链式法则与 Hessian 处理局部变化和临界点。",
          ),
        ],
        "由邻域与联合极限进入全微分、梯度、Jacobian 和 Hessian，建立点附近的一阶与二阶模型。",
      ),
      part(
        "multiple-integrals",
        "第二编 多重积分",
        [
          chapter(
            "double-triple-integrals",
            "二重积分、三重积分与变量替换",
            "multiple-integrals",
            "围绕二重积分、三重积分与变量替换，本章从 Riemann 型区域累积进入 Fubini 换序、质量与质心以及极、柱、球坐标。",
          ),
          chapter(
            "line-surface-integrals",
            "曲线积分与曲面积分",
            "line-integrals",
            "曲线积分与曲面积分用参数速度和切向量叉积构造弧长与面积元，再处理保守场、功、环流、通量及取向。",
          ),
        ],
        "先在二维、三维区域上累积标量量，再把积分域转到参数曲线和曲面，区分面积、功、环流与通量。",
      ),
      part(
        "vector-calculus",
        "第三编 向量分析与综合复习",
        [
          chapter(
            "green-stokes-gauss",
            "Green、Stokes 与 Gauss 定理",
            "green-stokes-gauss",
            "Green、Stokes 与 Gauss 定理在边界、光滑性与取向逐项核对后计算环流与通量，并用奇点反例划清适用范围。",
          ),
          chapter(
            "multivariable-review",
            "多变量微积分与向量分析综合复习",
            "multivariable-calculus-review",
            "多变量微积分与向量分析综合复习按问题对象选择局部微分、多重积分、边界积分或积分定理，并以约束极值、守恒律与单位检查串联全册方法。",
          ),
        ],
        "用 Green、Stokes 与 Gauss 定理连接边界积分和内部微分量，并在综合题中核对正则性、取向与单位。",
      ),
    ],
  },
  {
    code: "M04",
    slug: "linear-algebra",
    title: "线性代数",
    summary: "向量空间、矩阵运算、线性方程组、线性映射与特征结构。",
    level: "undergraduate",
    parts: [
      part(
        "vectors-matrices",
        "第一编 向量、矩阵与方程组",
        [
          chapter(
            "vectors-coordinates",
            "向量、坐标与线性组合",
            "vectors",
            "向量、坐标与线性组合从向量空间公理进入张成、线性无关、基与坐标，并用内积、正交和投影补充欧氏几何结构。",
          ),
          chapter(
            "matrices-operations",
            "矩阵及其运算",
            "matrices",
            "矩阵及其运算以形状和列向量解释加法、转置、分块与乘法，随后建立单位矩阵、逆矩阵和正交矩阵的运算边界。",
          ),
        ],
        "先区分向量本身与基下坐标，再把多组线性组合组织成矩阵，为方程组的统一表示准备语言和运算。",
      ),
      part(
        "systems-determinants",
        "第二编 方程组与行列式",
        [
          chapter(
            "linear-systems",
            "线性方程组的解结构",
            "linear-systems",
            "线性方程组的解结构用消元和简化行阶梯形判定相容性、参数化全部解，并以秩、零空间、秩—零化度和最小二乘解释精确解与近似解。",
          ),
          chapter(
            "determinants-volume",
            "行列式与体积缩放",
            "determinants",
            "行列式与体积缩放从多线性、交替性和归一化刻画行列式，追踪行变换与乘法规则，并连接有向体积、满秩和可逆性。",
          ),
        ],
        "先用行变换揭示解集和子空间结构，再用一个标量编码方阵的有向体积倍率与可逆性。",
      ),
      part(
        "maps-spectral",
        "第三编 线性映射与特征结构",
        [
          chapter(
            "linear-maps-matrices",
            "线性映射及其矩阵表示",
            "linear-transformations",
            "线性映射及其矩阵表示从保持线性组合的抽象映射进入核、像、矩阵表示、复合与逆，并用换基和相似矩阵区分对象与坐标。",
          ),
          chapter(
            "eigenstructure-review",
            "特征值、特征向量、对角化与综合复习",
            "eigenvalues-eigenvectors",
            "特征值、特征向量、对角化与综合复习以不变方向、特征空间和重数判断对角化，处理矩阵幂、实对称谱定理与二次型，并联结全册方法。",
          ),
        ],
        "把坐标矩阵还原为线性映射，再寻找最适合该映射的特征基，以谱分解组织反复作用和二次型。",
      ),
    ],
  },
  {
    code: "M05",
    slug: "probability",
    title: "概率论",
    summary: "概率空间、随机变量及其分布、期望、方差与极限定理。",
    level: "undergraduate",
    prerequisiteBookIds: ["m00", "m01", "m02"],
    parts: [
      part("probability-space", "第一编 概率空间", [
        chapter(
          "axioms-counting",
          "概率公理与组合概率",
          "probability-axioms",
          "概率公理与组合概率从样本空间、事件族和概率测度出发，推导基本运算规则，再说明只有在等可能假设成立时才能用排列组合计算概率。",
        ),
        chapter(
          "conditional-bayes",
          "条件概率、独立性与贝叶斯公式",
          "conditional-probability",
          "条件概率、独立性与贝叶斯公式通过缩小信息范围建立乘法公式、全概率分解和 Bayes 更新，并严格区分互斥、独立、条件独立与两两独立。",
        ),
      ]),
      part("random-variables", "第二编 随机变量", [
        chapter(
          "random-variables-distributions",
          "随机变量与分布",
          "random-variables-distributions",
        ),
        chapter("expectation-covariance", "期望、方差与协方差", "expectation-variance-covariance"),
      ]),
      part("limit-theorems", "第三编 极限定理与综合复习", [
        chapter(
          "laws-large-numbers-clt",
          "大数定律与中心极限定理",
          "law-large-numbers",
          "大数定律与中心极限定理区分依概率、几乎处处和依分布收敛，在明确矩条件后解释样本平均的稳定性、标准化和正态近似边界。",
        ),
        chapter(
          "probability-review",
          "概率模型、随机变量与极限定理综合复习",
          "probability-review",
          "概率模型、随机变量与极限定理综合复习以完整建模案例串联计数、条件化、联合分布、矩、精确概率与极限定理近似，并用独立复算检查模型选择和误差来源。",
        ),
      ]),
    ],
  },
  {
    code: "M06",
    slug: "mathematical-statistics",
    title: "数理统计",
    summary: "抽样分布、参数估计、置信区间、假设检验与线性模型推断。",
    level: "undergraduate",
    prerequisiteBookIds: ["m04", "m05"],
    parts: [
      part("sampling-estimation", "第一编 抽样与估计", [
        chapter(
          "samples-statistics",
          "样本、统计量与抽样分布",
          "sampling-distributions",
          "样本、统计量与抽样分布从统计模型和 iid 随机样本出发，建立经验分布、次序统计量、标准误、正态样本枢轴与充分性，并说明抽样设计如何改变分布。",
        ),
        chapter(
          "point-estimation",
          "点估计、充分性与信息量",
          "statistical-estimation",
          "点估计、充分性与信息量比较矩估计和最大似然，以偏差、方差、均方误差、一致性和信息下界评价估计量，并处理参数相关支持的边界。",
        ),
      ]),
      part("interval-testing", "第二编 区间与检验", [
        chapter(
          "confidence-intervals",
          "置信区间与枢轴量",
          "confidence-intervals",
          "置信区间与枢轴量从重复抽样覆盖率出发，推导正态均值、方差和比例区间，比较 z、t、卡方、Wald 与 Wilson 方法的条件和误差。",
        ),
        chapter(
          "hypothesis-testing",
          "假设检验、功效与多重比较",
          "hypothesis-testing",
          "假设检验、功效与多重比较区分两类错误、功效与 p 值，连接 Neyman–Pearson、区间反演、精确离散检验和族错误率控制。",
        ),
      ]),
      part("models-review", "第三编 统计模型与综合复习", [
        chapter(
          "linear-model-inference",
          "线性模型中的统计推断",
          "linear-model-inference",
          "线性模型中的统计推断以设计矩阵、正交投影和误差条件组织最小二乘、方差分析、系数检验、残差诊断、均值响应区间与预测区间。",
        ),
        chapter(
          "statistics-review",
          "估计、检验与统计决策综合复习",
          "statistics-review",
          "估计、检验与统计决策综合复习以贯穿案例统一抽样分布、似然、区间、功效、预测和损失决策，并分别报告数值误差、抽样误差与模型偏离。",
        ),
      ]),
    ],
  },
  {
    code: "M07",
    slug: "discrete-mathematics-combinatorics-graphs",
    title: "离散数学、组合与图论",
    summary: "计数、递推、图、匹配、着色、偏序与布尔代数。",
    level: "undergraduate",
    prerequisiteBookIds: ["m00"],
    parts: [
      part("counting", "第一编 计数与递推", [
        chapter(
          "counting-principles",
          "计数原理、容斥与鸽巢原理",
          "counting-principles",
          "计数原理、容斥与鸽巢原理从结果对象和一致粒度出发，使用加法、乘法、双射与双计数处理排列组合，并推导一般容斥、错排和广义鸽巢结论。",
        ),
        chapter(
          "recurrences-generating-functions",
          "递推关系与生成函数",
          "recurrences-generating-functions",
          "递推关系与生成函数以初值和常系数线性递推为起点，比较特征根与普通生成函数方法，并用形式幂级数和系数提取解释卷积与组合类编码。",
        ),
      ]),
      part("graph-theory", "第二编 图与网络", [
        chapter(
          "graphs-connectivity",
          "图、路径、连通性与树",
          "graphs-connectivity",
          "图、路径、连通性与树从有限简单无向图的度数与握手定理出发，区分游走、迹、路和圈，建立树与生成树判据，并在非负权条件下讨论最短路。",
        ),
        chapter(
          "matching-coloring",
          "匹配、覆盖与图着色",
          "matching-coloring",
          "匹配、覆盖与图着色通过二部图的增广路和 Hall 条件研究最大匹配，说明 Kőnig 对偶的适用范围，再以团数、最大度和反例界定正常点着色的上下界。",
        ),
      ]),
      part("discrete-structures", "第三编 离散结构与综合复习", [
        chapter(
          "posets-boolean",
          "偏序集、格与布尔代数",
          "posets-boolean",
          "偏序集、格与布尔代数区分可比性、链、反链和上下界，说明何时 meet 与 join 存在，并在子集格中检验分配律、补元、对偶和局部有限偏序上的 Möbius 反演。",
        ),
        chapter(
          "discrete-review",
          "组合、图论与离散证明综合复习",
          "discrete-review",
          "组合、图论与离散证明综合复习以有限调度系统贯通双射计数、递推、DAG 可达、任务匹配、冲突着色、先修偏序与布尔约束，并逐项复核证明方法和反例边界。",
        ),
      ]),
    ],
  },
  {
    code: "M08",
    slug: "ordinary-differential-equations-dynamical-systems",
    title: "常微分方程与动力系统",
    summary: "初值问题、线性系统、相平面、稳定性与分岔。",
    level: "undergraduate",
    prerequisiteBookIds: ["m02", "m04"],
    parts: [
      part("first-order-odes", "第一编 一阶方程", [
        chapter(
          "existence-uniqueness",
          "初值问题、存在唯一性与方向场",
          "existence-uniqueness",
          "把微分方程连同初值写成局部演化问题，用方向场解释解曲线，并区分连续性保证的存在与局部 Lipschitz 条件保证的唯一性。",
        ),
        chapter(
          "first-order-methods",
          "可分离、线性与恰当方程",
          "first-order-methods",
          "按方程结构选择变量分离、积分因子与恰当微分方法，逐步处理定义域、积分常数、初值代入和隐式解的有效区间。",
        ),
      ]),
      part("linear-systems", "第二编 高阶方程与线性系统", [
        chapter(
          "higher-order-linear",
          "高阶线性方程与常系数方法",
          "higher-order-linear",
          "由叠加原理和线性无关解构造通解，使用特征方程处理实根、重根与共轭复根，并用待定系数法求典型受迫响应。",
        ),
        chapter(
          "phase-plane-linear",
          "线性系统、矩阵指数与相平面",
          "phase-plane-linear",
          "把高阶方程改写为一阶系统，通过矩阵指数、特征值与特征向量描述轨线，并按谱结构区分结点、鞍点、螺旋点和中心。",
        ),
      ]),
      part("nonlinear-dynamics", "第三编 非线性动力学与综合复习", [
        chapter(
          "stability-bifurcation",
          "稳定性、Lyapunov 方法与分岔",
          "stability-bifurcation",
          "用扰动定义稳定与渐近稳定，结合线性化和 Lyapunov 函数判断平衡点，并以一维正规形说明鞍结、跨临界与叉形分岔。",
        ),
        chapter(
          "dynamical-systems-review",
          "常微分方程与动力系统综合复习",
          "dynamical-systems-review",
          "从建模、解法、相平面到稳定性组织同一动力问题，比较解析解、定性结论和数值近似各自能回答的问题及其适用边界。",
        ),
      ]),
    ],
  },
  {
    code: "M09",
    slug: "fourier-analysis-partial-differential-equations",
    title: "傅里叶分析与偏微分方程",
    summary: "正交展开、傅里叶变换，以及热、波动和 Laplace 方程。",
    level: "advanced",
    prerequisiteBookIds: ["m02", "m03", "m08"],
    parts: [
      part("fourier-series-foundations", "第一编 傅里叶级数", [
        chapter(
          "orthogonal-expansions",
          "正交函数系与 Fourier 系数",
          "orthogonal-expansions",
          "把有限维正交投影推广到函数空间，使用内积计算 Fourier 系数，并由 Bessel 不等式与 Parseval 等式检验截断展开的能量误差。",
        ),
        chapter("fourier-series", "傅里叶级数、收敛与 Gibbs 现象", "fourier-series"),
      ]),
      part("fourier-transform", "第二编 傅里叶变换", [
        chapter(
          "transform-convolution",
          "傅里叶变换与卷积",
          "transform-convolution",
          "固定变换约定后推导平移、缩放、微分与卷积性质，比较时域局部化和频域带宽，并用可积函数的直接计算核对常数因子。",
        ),
        chapter(
          "distributions-sampling",
          "广义函数、采样与 Poisson 求和",
          "distributions-sampling",
          "以测试函数定义分布和 Dirac delta 的作用，解释分布导数，再在带限条件下推导采样重建、混叠与 Poisson 求和之间的关系。",
        ),
      ]),
      part("pdes", "第三编 偏微分方程与综合复习", [
        chapter(
          "heat-wave-laplace",
          "热方程、波动方程与 Laplace 方程",
          "heat-wave-laplace",
          "比较抛物型、双曲型与椭圆型方程的初边值数据，使用分离变量和本征函数展开构造解，并以能量衰减、能量守恒或最大值原理核对结果。",
        ),
        chapter(
          "fourier-pde-review",
          "傅里叶方法与偏微分方程综合复习",
          "fourier-pde-review",
          "围绕初边值问题串联正交投影、级数与变换、卷积、分布和采样，依据区域、边界、正则性与收敛要求选择方法。",
        ),
      ]),
    ],
  },
  {
    code: "M10",
    slug: "numerical-analysis-scientific-computing",
    title: "数值分析与科学计算",
    summary: "浮点误差、线性求解、插值、数值积分与微分方程离散。",
    level: "undergraduate",
    prerequisiteBookIds: ["m02", "m04", "m08"],
    parts: [
      part("errors-linear-algebra", "第一编 误差与数值线性代数", [
        chapter(
          "floating-point-errors",
          "浮点数、条件数与误差传播",
          "floating-point-errors",
          "从舍入模型和机器精度出发，区分问题条件数、算法稳定性、前向误差与后向误差，并分析消去性相减和尺度失衡。",
        ),
        chapter(
          "linear-system-solvers",
          "线性方程组的直接与迭代解法",
          "linear-system-solvers",
          "比较带主元消元与 LU 分解、Jacobi 与 Gauss–Seidel 等方法，使用残差、条件数和谱半径判断解的可信度与迭代收敛。",
        ),
      ]),
      part("approximation", "第二编 逼近与积分", [
        chapter(
          "interpolation-approximation",
          "插值、多项式逼近与样条",
          "interpolation-approximation",
          "由 Lagrange 与 Newton 形式构造插值多项式，解释余项与 Runge 现象，再用分段低次多项式和三次样条控制局部误差。",
        ),
        chapter(
          "quadrature-differentiation",
          "数值积分与数值微分",
          "quadrature-differentiation",
          "从插值公式推导梯形、Simpson 与差分格式，使用 Taylor 展开计算截断误差，并说明微分对测量噪声的放大作用。",
        ),
      ]),
      part("numerical-dynamics", "第三编 数值动力学与综合复习", [
        chapter(
          "ode-pde-numerics",
          "常微分与偏微分方程数值方法",
          "ode-pde-numerics",
          "从 Euler 与 Runge–Kutta 时间推进进入有限差分离散，区分一致性、稳定性和收敛性，并比较显式格式的步长限制与隐式格式的线性求解成本。",
        ),
        chapter(
          "numerical-analysis-review",
          "稳定性、收敛性与科学计算综合复习",
          "numerical-analysis-review",
          "围绕一个科学计算流程连接浮点误差、线性求解、插值积分和微分方程离散，使用残差、网格加密与独立方法报告数值证据。",
        ),
      ]),
    ],
  },
  {
    code: "M11",
    slug: "optimization-information-theory",
    title: "最优化与信息论",
    summary: "凸优化、梯度方法、约束与对偶、熵和信息度量。",
    level: "undergraduate",
    prerequisiteBookIds: ["m03", "m04", "m05"],
    parts: [
      part("optimization-foundations", "第一编 优化问题与凸性", [
        chapter(
          "optimization-models",
          "优化模型、可行域与最优性",
          "optimization-models",
          "从决策变量、目标与约束建立优化模型，区分可行、局部与全局最优，并使用梯度、方向导数和法向条件表达一阶必要条件。",
        ),
        chapter(
          "convexity-subgradients",
          "凸集、凸函数与次梯度",
          "convexity-subgradients",
          "用线段判据、Jensen 不等式和一阶支撑不等式识别凸性，把梯度推广为次梯度，并说明凸问题中局部最优与全局最优的关系。",
        ),
      ]),
      part("optimization-methods", "第二编 优化算法", [
        chapter("gradient-descent", "一阶优化与梯度下降", "gradient-descent"),
        chapter(
          "constraints-duality",
          "约束优化、KKT 条件与对偶性",
          "constraints-duality",
          "由 Lagrange 函数构造对偶下界，在明确约束资格后使用 KKT 条件，并通过原始可行性、对偶可行性、驻点与互补松弛核对候选解。",
        ),
      ]),
      part("information-theory", "第三编 信息度量与综合复习", [
        chapter(
          "entropy-divergence",
          "熵、互信息与散度",
          "entropy-divergence",
          "从自信息与期望定义熵，推导联合熵、条件熵和互信息关系，使用 KL 散度刻画分布差异并明确对数底与绝对连续条件。",
        ),
        chapter(
          "optimization-information-review",
          "最优化与信息论综合复习",
          "optimization-information-review",
          "以概率分布上的约束优化贯通凸性、对偶、梯度方法、熵和散度，比较几何最优性与信息度量在推导中的不同角色。",
        ),
      ]),
    ],
  },
  {
    code: "M12",
    slug: "real-analysis-measure-theory",
    title: "实分析与测度论",
    summary: "实数完备性、函数列收敛、测度、Lebesgue 积分与 Lp 空间。",
    level: "advanced",
    prerequisiteBookIds: ["m00", "m02", "m03"],
    parts: [
      part("real-analysis", "第一编 实数与函数列", [
        chapter(
          "real-completeness",
          "实数完备性、紧致性与连续性",
          "real-completeness",
          "由上确界公理建立单调收敛与 Cauchy 完备性，在度量空间中比较闭、有界、序列紧致与紧致，并说明连续函数保持紧致性的条件。",
        ),
        chapter(
          "function-sequences",
          "函数列、一致收敛与交换极限",
          "function-sequences",
          "区分逐点与一致收敛，使用一致 Cauchy 判据和 Weierstrass M 判别，并分别陈述极限与连续、积分、微分交换所需条件。",
        ),
      ]),
      part("measure-integration", "第二编 测度与积分", [
        chapter(
          "measure-measurable",
          "测度、可测集与可测函数",
          "measure-measurable",
          "从 sigma 代数和可列可加测度定义测度空间，构造 Borel 可测结构，并用逆像判据、简单函数与几乎处处语言描述可测函数。",
        ),
        chapter(
          "lebesgue-integration",
          "Lebesgue 积分与收敛定理",
          "lebesgue-integration",
          "由非负简单函数定义 Lebesgue 积分，再扩展到可积函数，比较单调收敛、Fatou 引理和控制收敛的假设与结论。",
        ),
      ]),
      part("lp-spaces", "第三编 函数空间与综合复习", [
        chapter(
          "lp-product-measures",
          "Lp 空间、乘积测度与 Fubini 定理",
          "lp-product-measures",
          "在几乎处处等价类上建立 Lp 范数，使用 Hölder 与 Minkowski 不等式，并区分 Tonelli 与 Fubini 对非负函数和可积函数的不同要求。",
        ),
        chapter(
          "real-analysis-review",
          "实分析与测度论综合复习",
          "real-analysis-review",
          "围绕极限与积分换序问题串联完备性、一致收敛、可测性、Lebesgue 积分、Lp 控制和乘积测度，并用反例检查缺失假设。",
        ),
      ]),
    ],
  },
  {
    code: "M13",
    slug: "complex-analysis",
    title: "复分析",
    summary: "全纯函数、复积分、幂级数、留数、保角映射与解析延拓。",
    level: "advanced",
    prerequisiteBookIds: ["m03", "m12"],
    parts: [
      part("holomorphic", "第一编 复函数与全纯性", [
        chapter(
          "complex-differentiation",
          "复微分、Cauchy–Riemann 方程与全纯函数",
          "complex-differentiation",
          "从复差商的方向无关性推导 Cauchy–Riemann 方程，区分必要与充分条件，并连接全纯函数、调和分量与局部保角性质。",
        ),
        chapter(
          "power-series",
          "幂级数、初等复函数与局部表示",
          "power-series",
          "研究复幂级数的收敛圆、逐项微分与唯一性，定义指数、三角与对数分支，并说明零点阶数和局部 Taylor 表示。",
        ),
      ]),
      part("contour-integration", "第二编 复积分", [
        chapter(
          "cauchy-theorems",
          "Cauchy 定理与积分公式",
          "cauchy-theorems",
          "由曲线积分、原函数与单连通条件建立 Cauchy 定理，再用积分公式推导高阶导数、均值性质、最大模与 Liouville 结论。",
        ),
        chapter(
          "residue-calculus",
          "孤立奇点、Laurent 级数与留数",
          "residue-calculus",
          "使用 Laurent 主部区分可去奇点、极点与本性奇点，计算留数并应用留数定理求围道积分、实积分和零极点计数。",
        ),
      ]),
      part("mapping-continuation", "第三编 映射与综合复习", [
        chapter(
          "conformal-continuation",
          "保角映射与解析延拓",
          "conformal-continuation",
          "用非零导数刻画局部保角，分析 Möbius 变换和典型区域映射，再以恒等定理和重叠域一致性解释解析延拓及分支障碍。",
        ),
        chapter(
          "complex-analysis-review",
          "复分析方法综合复习",
          "complex-analysis-review",
          "围绕一个复积分问题连接全纯性、幂级数、Cauchy 公式、Laurent 展开、留数、保角映射和解析延拓，并核对区域与方向条件。",
        ),
      ]),
    ],
  },
  {
    code: "M14",
    slug: "abstract-algebra",
    title: "抽象代数",
    summary: "群、环、域、模，以及同态、商结构与 Galois 理论。",
    level: "advanced",
    parts: [
      part("groups", "第一编 群论", [
        chapter(
          "groups-subgroups",
          "群、子群与循环结构",
          "groups-subgroups",
          "从运算封闭、结合律、单位元和逆元定义群，使用子群判别、生成元、陪集与 Lagrange 定理分析循环群及有限群的基本结构。",
        ),
        chapter(
          "homomorphisms-actions",
          "群同态、商群与群作用",
          "homomorphisms-actions",
          "以核与像刻画群同态，用正规子群构造商群并证明第一同构定理，再通过轨道、稳定子与类方程组织群作用。",
        ),
      ]),
      part("rings-fields", "第二编 环与域", [
        chapter(
          "rings-ideals",
          "环、理想与商环",
          "rings-ideals",
          "区分交换环、整环、单位与零因子，以理想保证商运算良定义，并用环同态的核、像和对应定理连接商环结构。",
        ),
        chapter(
          "fields-polynomials",
          "域扩张、多项式与有限域",
          "fields-polynomials",
          "研究域上的多项式整除与不可约性，通过极大理想和不可约多项式构造扩域，并说明有限域的特征、维数与元素个数。",
        ),
      ]),
      part("modules-galois", "第三编 模与综合复习", [
        chapter(
          "modules-structure",
          "模、线性表示与结构定理",
          "modules-structure",
          "把向量空间推广为环上的模，比较子模、商模与同态，并用有限生成主理想整环模的结构定理统一整数矩阵和线性算子分解。",
        ),
        chapter(
          "abstract-algebra-review",
          "群、环、域与 Galois 思想综合复习",
          "abstract-algebra-review",
          "围绕对称、商结构与多项式可解性串联群、环、理想、域扩张和模，并以 Galois 对应展示子群与中间域的反向关系。",
        ),
      ]),
    ],
  },
  {
    code: "M15",
    slug: "topology-differential-geometry",
    title: "拓扑与微分几何",
    summary: "拓扑空间、连续映射、光滑流形、微分形式、度量与曲率。",
    level: "advanced",
    parts: [
      part("topology", "第一编 点集拓扑", [
        chapter(
          "topological-spaces",
          "拓扑空间、基与连续映射",
          "topological-spaces",
          "由开集公理定义拓扑，用基、子空间、积空间和商空间生成新拓扑，并比较开集逆像、闭集逆像与邻域语言下的连续性。",
        ),
        chapter(
          "compact-connected",
          "紧致性、连通性与分离公理",
          "compact-connected",
          "使用开覆盖和分离刻画紧致与连通，区分 Hausdorff、正则和正规条件，并分析连续映射如何保持紧致性与连通性。",
        ),
      ]),
      part("manifolds", "第二编 光滑流形", [
        chapter(
          "smooth-manifolds",
          "流形、坐标图与切空间",
          "smooth-manifolds",
          "以相容坐标图定义光滑流形和光滑映射，通过曲线等价类或导子构造切空间，并用微分、浸入和浸没描述局部结构。",
        ),
        chapter(
          "differential-forms",
          "微分形式、外微分与 Stokes 定理",
          "differential-forms",
          "从余切空间和交替张量构造微分形式，定义拉回、楔积与外微分，并在定向带边流形上陈述和应用广义 Stokes 定理。",
        ),
      ]),
      part("geometry", "第三编 曲率与综合复习", [
        chapter(
          "metrics-curvature",
          "Riemann 度量、测地线与曲率",
          "metrics-curvature",
          "由切空间内积定义 Riemann 度量，使用 Levi-Civita 联络和测地线方程研究最短路径，再以截面曲率、Ricci 曲率和标量曲率描述弯曲。",
        ),
        chapter(
          "topology-geometry-review",
          "拓扑与微分几何综合复习",
          "topology-geometry-review",
          "围绕曲面或流形上的全局问题串联拓扑、紧致连通、坐标图、切空间、微分形式、Stokes 定理、度量、测地线与曲率。",
        ),
      ]),
    ],
  },
  {
    code: "M16",
    slug: "functional-analysis-operator-theory",
    title: "泛函分析与算子理论",
    summary: "赋范空间、Hilbert 空间、线性算子与谱理论。",
    level: "advanced",
    parts: [
      part("normed-spaces", "第一编 赋范空间", [
        chapter(
          "banach-spaces",
          "赋范空间、Banach 空间与有界算子",
          "banach-spaces",
          "以范数、Cauchy 列和完备性定义 Banach 空间，比较典型序列与函数空间，并证明线性算子连续、有界和有限算子范数之间的等价。",
        ),
        chapter(
          "fundamental-theorems",
          "Hahn–Banach、开映射与一致有界原理",
          "fundamental-theorems",
          "在明确的实或复标量条件下使用 Hahn–Banach 延拓泛函，再由 Baire 范畴定理推导一致有界、开映射和闭图定理。",
        ),
      ]),
      part("hilbert-operators", "第二编 Hilbert 空间与算子", [
        chapter(
          "hilbert-spaces",
          "Hilbert 空间、正交投影与对偶",
          "hilbert-spaces",
          "由完备内积空间建立正交分解和最佳逼近，研究正交规范族与基，并用 Riesz 表示定理识别连续线性泛函。",
        ),
        chapter(
          "compact-self-adjoint",
          "紧算子与自伴算子",
          "compact-self-adjoint",
          "以有界集像的相对紧致性定义紧算子，比较有限秩逼近与弱收敛，并研究 Hilbert 空间中伴随、自伴、正算子的谱性质。",
        ),
      ]),
      part("spectral-theory", "第三编 谱理论与综合复习", [
        chapter(
          "spectral-theorem",
          "谱、预解式与谱定理",
          "spectral-theorem",
          "用可逆性定义算子的预解集和谱，区分点谱与连续现象，并证明紧自伴算子具有实特征值和正交特征向量展开。",
        ),
        chapter(
          "functional-analysis-review",
          "泛函分析与算子理论综合复习",
          "functional-analysis-review",
          "围绕积分算子和边值问题串联完备性、对偶、三大基本定理、Hilbert 投影、紧性、自伴性、谱与 Fredholm 选择。",
        ),
      ]),
    ],
  },
] as const;

export const mathematicsSeries: SeriesBlueprint = {
  id: "mathematics",
  slug: "mathematics",
  title: "数学",
  summary: "数学基础、分析、代数、几何、概率统计、数值方法与最优化。",
  books: mathematicsBooks,
};
