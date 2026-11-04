import { chapter, part } from "../blueprint";
import type { BookBlueprint, SeriesBlueprint } from "../blueprint";

export const physicsBooks: readonly BookBlueprint[] = [
  {
    code: "P00",
    slug: "physical-quantities-measurement-modeling",
    title: "物理量、测量与数学建模",
    summary: "物理量与单位、测量误差、不确定度、尺度估算与模型假设。",
    level: "foundation",
    prerequisiteBookIds: ["m00", "m01"],
    parts: [
      part("quantities-units", "第一编 物理量与单位", [
        chapter(
          "quantities-dimensions",
          "物理量、量纲与单位制",
          "quantities-dimensions",
          "物理量、量纲与单位制要求区分量本身、数值和单位；本章用 SI 基本量与导出单位表达测量结果，并以量纲齐次性检查公式和换算。",
        ),
        chapter(
          "scaling-estimation",
          "尺度分析、数量级与估算",
          "scaling-estimation",
          "尺度分析、数量级与估算：十进数量级、上下界、尺度律和无量纲比，以及量纲分析的适用范围。",
        ),
      ]),
      part("measurement", "第二编 测量与不确定度", [
        chapter(
          "measurement-errors",
          "测量误差、分辨率与校准",
          "measurement-errors",
          "测量误差、分辨率与校准：随机误差、系统误差、重复测量，以及准确度、精密度和不确定度。",
        ),
        chapter(
          "uncertainty-propagation",
          "不确定度传播与数据拟合",
          "uncertainty-propagation",
          "不确定度传播与数据拟合从测量方程出发处理独立或相关输入，比较最坏界与标准不确定度，再以残差和权重检验直线模型的假设。",
        ),
      ]),
      part("modeling", "第三编 建模与综合复习", [
        chapter(
          "model-assumptions",
          "理想化、守恒量与模型边界",
          "model-assumptions",
          "理想化、守恒量与模型边界把研究对象、系统边界、状态量、相互作用和近似写成可检验假设，利用守恒与对称组织方程，并用极限情形识别适用域。",
        ),
        chapter(
          "measurement-modeling-review",
          "测量、量纲与数学建模综合复习",
          "measurement-modeling-review",
          "测量、量纲与数学建模综合复习以一项完整实验为线索，串联单位选择、尺度估算、校准、测量方程、不确定度传播、残差诊断和模型修订。",
        ),
      ]),
    ],
  },
  {
    code: "P01",
    slug: "classical-mechanics",
    title: "经典力学",
    summary: "运动学、Newton 定律、功与能量、动量、刚体转动与引力。",
    level: "undergraduate",
    prerequisiteBookIds: ["p00", "m02", "m04"],
    parts: [
      part("kinematics-forces", "第一编 运动与力", [
        chapter(
          "kinematics",
          "质点运动学与参考系",
          "kinematics",
          "质点运动学与参考系用位置、位移、速度和加速度描述一维及二维运动，连接图像、导数、积分与相对运动，并持续核对分量和单位。",
        ),
        chapter(
          "newton-laws",
          "Newton 定律、受力分析与约束",
          "newton-laws",
          "Newton 定律、受力分析与约束从惯性系中的三条定律出发建立自由体图，区分相互作用力与约束力，并求解摩擦、斜面、绳张力和圆周运动。",
        ),
      ]),
      part("conservation", "第二编 守恒定律", [
        chapter(
          "work-energy",
          "功、势能与机械能守恒",
          "work-energy",
          "功、势能与机械能守恒由力的路径积分定义功并推导动能定理，再以保守力和势能组织能量账目，同时保留非保守力做功与功率。",
        ),
        chapter(
          "momentum-collisions",
          "动量、冲量与碰撞",
          "momentum-collisions",
          "动量、冲量与碰撞借助冲量—动量定理和系统内力抵消建立守恒关系，并在实验室系与质心系中比较一维、二维、弹性和非弹性过程。",
        ),
      ]),
      part("rotation-gravity", "第三编 转动、引力与综合复习", [
        chapter(
          "rigid-rotation",
          "刚体转动、角动量与转动惯量",
          "rigid-rotation",
          "刚体转动、角动量与转动惯量从角运动学过渡到力矩和转动动力学，以角动量守恒处理耦合过程，并比较纯滚动的平动与转动能量。",
        ),
        chapter(
          "mechanics-review",
          "引力、轨道与经典力学综合复习",
          "mechanics-review",
          "引力、轨道与经典力学综合复习选取轨道、碰撞和刚体系统，联合运用运动学、受力、功—能、动量、角动量与万有引力，并检查参考系和系统边界。",
        ),
      ]),
    ],
  },
  {
    code: "P02",
    slug: "analytical-mechanics-nonlinear-dynamics",
    title: "分析力学与非线性动力学",
    summary: "变分原理、Lagrange 与 Hamilton 方程、正则变换和混沌。",
    level: "advanced",
    prerequisiteBookIds: ["p01", "m08"],
    parts: [
      part("lagrangian", "第一编 Lagrange 力学", [
        chapter(
          "variational-principle",
          "最小作用量原理与 Euler–Lagrange 方程",
          "variational-principle",
          "最小作用量原理与 Euler–Lagrange 方程从泛函的一阶变分推导运动方程，把经典轨迹表述为固定端点下的作用量驻值，并核对自然边界条件。",
        ),
        chapter(
          "constraints-symmetry",
          "广义坐标、约束与 Noether 定理",
          "constraints-symmetry",
          "广义坐标、约束与 Noether 定理使用虚位移和 Lagrange 乘子处理完整约束，再从连续对称的无穷小变换推导对应守恒量。",
        ),
      ]),
      part("hamiltonian", "第二编 Hamilton 力学", [
        chapter(
          "hamilton-equations",
          "Legendre 变换与 Hamilton 方程",
          "hamilton-equations",
          "Legendre 变换与 Hamilton 方程在 Hessian 非退化条件下由 Lagrangian 引入共轭动量和 Hamiltonian，并把二阶构型空间动力学改写为相空间中的一阶方程。",
        ),
        chapter(
          "canonical-transformations",
          "Poisson 括号与正则变换",
          "canonical-transformations",
          "Poisson 括号与正则变换用括号代数表达可观测量的演化与守恒，比较各类生成函数，并以辛形式是否保持判定坐标变换的正则性。",
        ),
      ]),
      part("nonlinear", "第三编 非线性动力学与综合复习", [
        chapter(
          "phase-space-chaos",
          "相空间、Poincaré 截面与混沌",
          "phase-space-chaos",
          "相空间、Poincaré 截面与混沌从固定点、线性稳定性和相流出发，引入截面、Lyapunov 指数与分岔图，并辨别确定性混沌、不可积和随机性。",
        ),
        chapter(
          "analytical-mechanics-review",
          "分析力学与非线性动力学综合复习",
          "analytical-mechanics-review",
          "分析力学与非线性动力学综合复习围绕受约束系统，串联变分原理、对称守恒、Legendre 变换、Hamilton 方程、Poisson 括号和相空间诊断。",
        ),
      ]),
    ],
  },
  {
    code: "P03",
    slug: "oscillations-waves-optics",
    title: "振动、波与光学",
    summary: "振子、简正模、波动方程、干涉、衍射与光学分辨率。",
    level: "undergraduate",
    prerequisiteBookIds: ["p01", "m08", "m09"],
    parts: [
      part("oscillations", "第一编 振动", [
        chapter(
          "harmonic-oscillator",
          "简谐振子、阻尼与受迫振动",
          "harmonic-oscillator",
          "简谐振子、阻尼与受迫振动由线性回复力建立基准模型，以相位和能量描述自由运动，再比较阻尼衰减、受迫响应、共振峰与瞬态。",
        ),
        chapter(
          "coupled-normal-modes",
          "耦合振子与简正模",
          "coupled-normal-modes",
          "耦合振子与简正模把多自由度线性系统写成质量矩阵与刚度矩阵的广义本征问题，利用正交模态解耦运动并解释拍频和能量交换。",
        ),
      ]),
      part("waves", "第二编 波动", [
        chapter(
          "wave-parameters-superposition",
          "行波、相位、叠加与色散",
          "wave-parameters-superposition",
          "行波、相位、叠加与色散以振幅、频率、波数和相位参数化传播过程，通过叠加构造干涉与波包，并由色散关系区分相速度和群速度。",
        ),
        chapter(
          "wave-equation",
          "一维波动方程与边界条件",
          "wave-equation-1d",
          "一维波动方程与边界条件从弦微元受力推导偏微分方程，比较行波、固定端模态和能量流，并用边界条件与有限差分稳定性核验解。",
        ),
      ]),
      part("optics", "第三编 光学与综合复习", [
        chapter(
          "interference-diffraction",
          "干涉、衍射与傅里叶光学",
          "interference-diffraction",
          "干涉、衍射与傅里叶光学由相干叠加推导双缝及多缝条纹，再用 Huygens–Fresnel 思想和 Fourier 变换分析单缝、光栅与远场图样。",
        ),
        chapter(
          "waves-optics-review",
          "几何光学、偏振与波动综合复习",
          "waves-optics-review",
          "几何光学、偏振与波动综合复习以光学测量为任务，串联振动模态、行波色散、波动方程、干涉衍射、偏振和几何光学近似的适用范围。",
        ),
      ]),
    ],
  },
  {
    code: "P04",
    slug: "electromagnetism",
    title: "电磁学",
    summary: "静电场、稳恒磁场、电磁感应、Maxwell 方程与电磁波。",
    level: "undergraduate",
    prerequisiteBookIds: ["p03", "m03"],
    parts: [
      part("electrostatics", "第一编 静电学", [
        chapter(
          "coulomb-gauss",
          "Coulomb 定律、电场与 Gauss 定律",
          "coulomb-gauss",
          "Coulomb 定律、电场与 Gauss 定律由点电荷作用和叠加原理定义电场，推广到连续电荷分布，再用电通量求解高对称场。",
        ),
        chapter(
          "potential-boundaries",
          "电势、Poisson 方程与边值问题",
          "potential-boundaries",
          "电势、Poisson 方程与边值问题从保守静电场定义电势和势能，推导 Poisson 与 Laplace 方程，并结合导体边界、唯一性定理和镜像法求解。",
        ),
      ]),
      part("magnetism-induction", "第二编 磁场与感应", [
        chapter(
          "steady-magnetic",
          "稳恒电流、磁场与矢势",
          "steady-magnetic",
          "稳恒电流、磁场与矢势从电流密度及连续性出发，联系 Lorentz 力、Biot–Savart 与 Ampère 定律，并以磁通和矢势表征场结构。",
        ),
        chapter(
          "induction-circuits",
          "电磁感应、位移电流与电路响应",
          "induction-circuits",
          "电磁感应、位移电流与电路响应依据 Faraday 定律和 Lenz 方向分析两类感应电动势，建立电感及 RC/RL/RLC 动态，并补入位移电流。",
        ),
      ]),
      part("maxwell-theory-review", "第三编 Maxwell 理论与综合复习", [
        chapter(
          "maxwell-waves",
          "Maxwell 方程与电磁波",
          "maxwell-waves",
          "Maxwell 方程与电磁波统一比较积分形式和微分形式，由真空方程导出横向电磁波、传播速度、能量密度及 Poynting 向量。",
        ),
        chapter(
          "electromagnetism-review",
          "介质、能流与电磁学综合复习",
          "electromagnetism-review",
          "介质、能流与电磁学综合复习：电磁边界条件、极化与磁化、Maxwell 方程和能量守恒。",
        ),
      ]),
    ],
  },
  {
    code: "P05",
    slug: "thermodynamics",
    title: "热力学",
    summary: "平衡态、热力学定律、熵、热力学势与相平衡。",
    level: "undergraduate",
    prerequisiteBookIds: ["p00", "m02"],
    parts: [
      part("states-first-law", "第一编 状态与能量", [
        chapter(
          "equilibrium-state",
          "平衡态、状态方程与准静态过程",
          "equilibrium-state",
          "定义系统、环境、状态量和热平衡，区分广延与强度量，并用状态方程和过程路径描述准静态变化及其限制。",
        ),
        chapter(
          "first-law",
          "热力学第一定律与能量传递",
          "first-law",
          "统一约定热与功的符号，由能量守恒建立封闭系统第一定律，分析定容、定压、等温和绝热过程以及热容与焓。",
        ),
      ]),
      part("entropy", "第二编 熵与不可逆性", [
        chapter(
          "second-law",
          "热力学第二定律与 Carnot 循环",
          "second-law",
          "比较 Kelvin–Planck 与 Clausius 表述，构造可逆 Carnot 循环，推导热机和制冷机效率上限及热力学温标。",
        ),
        chapter(
          "entropy-production",
          "熵、不可逆过程与熵产生",
          "entropy-production",
          "由 Clausius 关系定义熵差，区分熵传递与内部熵产生，使用熵平衡分析自由膨胀、有限温差传热和耗散过程。",
        ),
      ]),
      part("potentials", "第三编 热力学势与综合复习", [
        chapter(
          "free-energies",
          "自由能、Maxwell 关系与相平衡",
          "free-energies",
          "通过 Legendre 变换构造焓、Helmholtz 与 Gibbs 自由能，由全微分推导 Maxwell 关系和自发判据，并进入化学势与相平衡。",
        ),
        chapter(
          "thermodynamics-review",
          "响应函数、相变与热力学综合复习",
          "thermodynamics-review",
          "围绕热力过程和相变联合使用状态方程、第一与第二定律、熵产生、自由能、响应函数和 Clapeyron 关系。",
        ),
      ]),
    ],
  },
  {
    code: "P06",
    slug: "statistical-physics",
    title: "统计物理",
    summary: "微观态计数、统计系综、量子统计、涨落与相变。",
    level: "advanced",
    prerequisiteBookIds: ["p05", "m05"],
    parts: [
      part("ensembles", "第一编 系综与配分函数", [
        chapter(
          "microcanonical",
          "微正则系综与熵的统计解释",
          "microcanonical",
          "从微观态、宏观约束与等概率先验建立微正则系综，用态数定义熵，并由复合系统最概然条件导出温度和平衡。",
        ),
        chapter(
          "canonical",
          "正则系综、配分函数与涨落",
          "canonical",
          "由小系统与热库的能量交换推导 Gibbs 权重，用配分函数计算自由能、平均能量和响应，并建立能量涨落关系。",
        ),
      ]),
      part("quantum-statistics", "第二编 量子统计", [
        chapter(
          "grand-canonical",
          "巨正则系综与化学势",
          "grand-canonical",
          "允许系统与热粒子库交换能量和粒子，从最大熵条件得到巨正则权重，以巨配分函数计算平均粒子数、压强与涨落。",
        ),
        chapter(
          "bose-fermi",
          "Bose–Einstein 与 Fermi–Dirac 统计",
          "bose-fermi",
          "由全同粒子的对称性和占据数建立 Bose 与 Fermi 分布，比较经典极限，并分析光子气体、简并费米气和 Bose 凝聚。",
        ),
      ]),
      part("phase-transitions", "第三编 相变与综合复习", [
        chapter(
          "critical-phenomena",
          "相变、序参量与临界现象",
          "critical-phenomena",
          "使用序参量和 Landau 自由能描述对称性破缺，研究关联长度、临界指数、尺度律与普适性，并给出重整化群的概念图景。",
        ),
        chapter(
          "statistical-physics-review",
          "输运、涨落与统计物理综合复习",
          "statistical-physics-review",
          "围绕粒子系统串联微正则、正则和巨正则系综、量子统计、涨落—响应、Boltzmann 输运、相变和临界尺度。",
        ),
      ]),
    ],
  },
  {
    code: "P07",
    slug: "quantum-mechanics",
    title: "量子力学",
    summary: "量子态、算符、测量、时间演化、角动量与近似方法。",
    level: "advanced",
    prerequisiteBookIds: ["p03", "m04", "m16"],
    parts: [
      part("postulates", "第一编 量子态与测量", [
        chapter(
          "states-observables",
          "Hilbert 空间、量子态与可观测量",
          "states-observables",
          "从复 Hilbert 空间中的射线建立纯态，以自伴算符表示可观测量，连接谱分解、期望值、概率振幅和表象变换。",
        ),
        chapter(
          "measurement-uncertainty",
          "测量、对易关系与不确定性",
          "measurement-uncertainty",
          "用 Born 规则、投影测量和密度算符描述统计预言与测后态，推导对易子控制的 Robertson 不确定关系并辨析测量误差。",
        ),
      ]),
      part("dynamics", "第二编 量子动力学", [
        chapter(
          "schrodinger-equation",
          "Schrödinger 方程与时间演化",
          "schrodinger-equation",
          "从 Hamilton 算符生成幺正时间演化，比较 Schrödinger、Heisenberg 与相互作用表象，并分析守恒量、定态和概率流。",
        ),
        chapter(
          "one-dimensional-systems",
          "一维势阱、隧穿与散射",
          "one-dimensional-systems",
          "通过无限深与有限深势阱、势垒和分段常势求解一维定态方程，计算束缚态、透射反射和量子隧穿的适用边界。",
        ),
      ]),
      part("symmetry-approximation", "第三编 对称性与综合复习", [
        chapter(
          "angular-momentum-spin",
          "角动量、自旋与全同粒子",
          "angular-momentum-spin",
          "由旋转生成元和角动量代数构造轨道角动量与自旋，使用加法规则和对称化原理分析复合系统及全同粒子。",
        ),
        chapter(
          "quantum-mechanics-review",
          "微扰、变分与量子力学综合复习",
          "quantum-mechanics-review",
          "围绕态、测量、时间演化、一维体系、角动量和全同粒子，联合使用定态微扰、变分原理与选择定则解决近似量子问题。",
        ),
      ]),
    ],
  },
  {
    code: "P08",
    slug: "special-general-relativity-foundations",
    title: "狭义相对论与广义相对论基础",
    summary: "Lorentz 变换、相对论动力学、等效原理与 Einstein 场方程。",
    level: "advanced",
    prerequisiteBookIds: ["p01", "p04", "m15"],
    parts: [
      part("special-relativity", "第一编 狭义相对论", [
        chapter(
          "lorentz-transform",
          "Lorentz 变换与时空间隔",
          "lorentz-transform",
          "从相对性原理与光速不变建立 Lorentz 变换，以 Minkowski 图和不变量分析同时性、时间膨胀、长度收缩及因果结构。",
        ),
        chapter(
          "relativistic-dynamics",
          "四矢量、相对论动力学与电磁场",
          "relativistic-dynamics",
          "用四速度、四动量和能量动量不变量重写动力学，分析碰撞与衰变，并由电磁场张量理解不同惯性系中的电磁场变换。",
        ),
      ]),
      part("spacetime-geometry", "第二编 时空几何", [
        chapter(
          "tensors-curvature",
          "张量、联络与曲率",
          "tensors-curvature",
          "从坐标变换下的不变量要求建立度量、协变导数、Christoffel 符号和 Riemann 曲率，区分坐标效应与真实时空曲率。",
        ),
        chapter(
          "equivalence-geodesics",
          "等效原理、测地线与引力红移",
          "equivalence-geodesics",
          "由等效原理进入局部惯性系和测地线方程，使用固有时分析自由落体、潮汐效应、引力红移及弱场极限。",
        ),
      ]),
      part("einstein-equations", "第三编 场方程与综合复习", [
        chapter(
          "einstein-field-equations",
          "Einstein 场方程与典型解",
          "einstein-field-equations",
          "由局域能量动量守恒和几何恒等式理解 Einstein 场方程，检验 Newton 极限，并分析 Schwarzschild 解与 FLRW 时空的对称性约化。",
        ),
        chapter(
          "relativity-review",
          "黑洞、宇宙学与相对论综合复习",
          "relativity-review",
          "串联时空间隔、四动量、曲率、测地线和场方程，比较黑洞视界、轨道效应、引力波与膨胀宇宙中的可观测量和模型边界。",
        ),
      ]),
    ],
  },
  {
    code: "P09",
    slug: "fluid-mechanics-continuum",
    title: "流体力学与连续介质",
    summary: "连续介质运动学、守恒方程、黏性流、边界层与流动稳定性。",
    level: "advanced",
    prerequisiteBookIds: ["p01", "m03", "m09"],
    parts: [
      part("continuum", "第一编 连续介质基础", [
        chapter(
          "kinematics-stress",
          "连续介质运动学、应变与应力",
          "kinematics-stress",
          "从物质与空间描述建立速度梯度、应变率和体积变化，用 Cauchy 应力张量及牵引定理连接内力、法向应力和剪切应力。",
        ),
        chapter(
          "conservation-laws",
          "质量、动量与能量守恒方程",
          "conservation-laws",
          "由控制质量和控制体积表述推导连续性方程、Cauchy 动量方程与能量方程，明确通量、源项、边界条件和单位。",
        ),
      ]),
      part("fluid-equations", "第二编 流体方程", [
        chapter(
          "euler-bernoulli",
          "Euler 方程、Bernoulli 定理与涡量",
          "euler-bernoulli",
          "在无黏假设下由动量守恒得到 Euler 方程，沿流线推导 Bernoulli 关系，并用涡量、环量和势流辨析其适用条件。",
        ),
        chapter(
          "navier-stokes",
          "Navier–Stokes 方程与黏性流",
          "navier-stokes",
          "以 Newton 黏性本构闭合动量方程，分析不可压 Navier–Stokes 方程、无量纲化、Reynolds 数及 Couette、Poiseuille 等精确流动。",
        ),
      ]),
      part("flows-instability", "第三编 流动与综合复习", [
        chapter(
          "boundary-layers-instability",
          "边界层、相似性与流动不稳定性",
          "boundary-layers-instability",
          "由高 Reynolds 数尺度分析得到边界层方程，使用相似变量和线性扰动研究分离、剪切层失稳以及稳定性判据的限制。",
        ),
        chapter(
          "fluid-mechanics-review",
          "波、湍流与连续介质综合复习",
          "fluid-mechanics-review",
          "串联运动学、应力、守恒律、无黏与黏性流，比较表面波、可压缩效应、湍流统计和连续介质模型中的尺度与闭合问题。",
        ),
      ]),
    ],
  },
  {
    code: "P10",
    slug: "solid-state-condensed-matter-foundations",
    title: "固体物理与凝聚态基础",
    summary: "晶体结构、声子、自由电子、能带、磁性与超导。",
    level: "advanced",
    prerequisiteBookIds: ["p06", "p07"],
    parts: [
      part("crystals-phonons", "第一编 晶体与晶格振动", [
        chapter(
          "crystal-structure",
          "晶体结构、倒易点阵与衍射",
          "crystal-structure",
          "从 Bravais 点阵、基元和对称操作描述晶体，以倒易点阵和结构因子推导 Laue、Bragg 衍射条件并解释系统消光。",
        ),
        chapter(
          "phonons",
          "晶格振动、声子与热容",
          "phonons",
          "由一维单原子与双原子链的耦合振动得到色散关系，将正规模量子化为声子，并比较 Einstein、Debye 热容模型。",
        ),
      ]),
      part("electrons-solids", "第二编 固体中的电子", [
        chapter(
          "free-electrons",
          "自由电子气与输运",
          "free-electrons",
          "用 Sommerfeld 自由电子模型和 Fermi–Dirac 分布计算态密度、Fermi 能及低温热容，并以弛豫时间近似分析电导与热导。",
        ),
        chapter(
          "band-theory",
          "能带理论、半导体与费米面",
          "band-theory",
          "由周期势中的 Bloch 定理建立能带，比较近自由电子与紧束缚图景，使用 Fermi 面和有效质量解释金属、绝缘体与半导体。",
        ),
      ]),
      part("collective", "第三编 集体现象与综合复习", [
        chapter(
          "magnetism-superconductivity",
          "磁性、超导与序参量",
          "magnetism-superconductivity",
          "从局域磁矩、交换作用和自发对称性破缺理解磁性，以 London、Ginzburg–Landau 与 BCS 图景连接超导序参量和可观测效应。",
        ),
        chapter(
          "condensed-matter-review",
          "拓扑相与凝聚态基础综合复习",
          "condensed-matter-review",
          "串联晶格、声子、电子能带、输运和序参量，比较对称性破缺与拓扑分类，并明确有效准粒子模型及测量证据的边界。",
        ),
      ]),
    ],
  },
  {
    code: "P11",
    slug: "computational-physics",
    title: "计算物理",
    summary: "物理模型的离散化、随机模拟、分子动力学与并行计算。",
    level: "advanced",
    prerequisiteBookIds: ["p01", "m10", "c00"],
    parts: [
      part("numerical-modeling", "第一编 数值建模", [
        chapter(
          "discretization-validation",
          "离散化、误差预算与模型验证",
          "discretization-validation",
          "把物理模型转为可计算离散问题，区分建模误差、离散误差、舍入误差和统计误差，并用收敛研究、守恒检查及基准解验证实现。",
        ),
        chapter(
          "particles-fields",
          "粒子系统与场方程计算",
          "particles-fields",
          "比较粒子推进、网格场求解和粒子—网格耦合，分析时间积分、边界条件、邻域搜索、稳定性和守恒量监测。",
        ),
      ]),
      part("stochastic", "第二编 随机模拟与分子动力学", [
        chapter(
          "monte-carlo",
          "Monte Carlo、重要性采样与误差估计",
          "monte-carlo",
          "由随机样本均值建立 Monte Carlo 估计，使用重要性采样和 Metropolis–Hastings 处理稀有区域与系综采样，并诊断自相关和有效样本量。",
        ),
        chapter(
          "molecular-dynamics",
          "分子动力学与统计量计算",
          "molecular-dynamics",
          "由相互作用势和 Newton 方程构建分子动力学，比较 Verlet 积分、边界条件与恒温方法，并从轨迹估计热力学和输运统计量。",
        ),
      ]),
      part("performance", "第三编 计算实验与综合复习", [
        chapter(
          "parallel-reproducible",
          "并行计算、可复现性与性能测量",
          "parallel-reproducible",
          "用任务与数据分解设计并行计算，区分强弱扩展、吞吐和延迟，记录随机种子、环境、输入、版本与硬件以支持结果复现。",
        ),
        chapter(
          "computational-physics-review",
          "计算物理综合项目与复习",
          "computational-physics-review",
          "围绕一个可审计计算实验串联模型、离散化、误差预算、确定性与随机算法、性能测量、数据产物和可复现报告。",
        ),
      ]),
    ],
  },
  {
    code: "P12",
    slug: "particle-physics-field-theory-introduction",
    title: "粒子物理与场论导论",
    summary: "相对论性场、场量子化、规范对称性、散射与标准模型。",
    level: "research",
    prerequisiteBookIds: ["p07", "p08", "m14"],
    parts: [
      part("relativistic-fields", "第一编 相对论性场", [
        chapter(
          "classical-fields",
          "经典场、作用量与 Noether 流",
          "classical-fields",
          "把有限自由度作用量推广到场的 Lagrange 密度，推导 Euler–Lagrange 场方程和能量动量张量，并由连续对称性得到 Noether 流。",
        ),
        chapter(
          "klein-gordon-dirac",
          "Klein–Gordon 场与 Dirac 场",
          "klein-gordon-dirac",
          "由相对论色散关系建立 Klein–Gordon 方程，线性化得到 Dirac 方程，分析 Lorentz 协变性、守恒流、反粒子和自旋结构。",
        ),
      ]),
      part("quantized-fields", "第二编 量子场与相互作用", [
        chapter(
          "field-quantization",
          "自由场量子化与粒子解释",
          "field-quantization",
          "将自由场分解为动量模并施加正则对易或反对易关系，以产生湮灭算符、Fock 空间和传播子建立粒子与反粒子解释。",
        ),
        chapter(
          "interactions-diagrams",
          "相互作用、散射与 Feynman 图",
          "interactions-diagrams",
          "由相互作用表象和 Dyson 展开组织微扰论，将 Wick 收缩编码为 Feynman 图，并连接散射振幅、截面、衰变率与近似阶数。",
        ),
      ]),
      part("standard-model", "第三编 规范理论与综合复习", [
        chapter(
          "gauge-standard-model",
          "规范对称性与标准模型结构",
          "gauge-standard-model",
          "从局域相位不变性引入规范场和协变导数，概述非 Abel 规范结构、自发对称性破缺以及标准模型粒子与相互作用表示。",
        ),
        chapter(
          "particle-field-review",
          "粒子物理与场论导论综合复习",
          "particle-field-review",
          "串联场作用量、相对论波动方程、自由场量子化、微扰散射和规范对称性，并以量纲、守恒律和实验可观测量限制有效理论解释。",
        ),
      ]),
    ],
  },
] as const;

export const physicsSeries: SeriesBlueprint = {
  id: "physics",
  slug: "physics",
  title: "物理",
  summary: "测量、力学、电磁学、热学、量子力学、相对论与现代物理。",
  books: physicsBooks,
};
