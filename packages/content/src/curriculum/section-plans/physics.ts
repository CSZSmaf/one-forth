export const physicsSectionPlans: Readonly<Record<string, readonly [string, string, string]>> = {
  "p00-quantities-dimensions": [
    "基本量、导出量与量纲矩阵",
    "SI 单位换算和量纲齐次性",
    "Buckingham Π 群与无量纲控制参数",
  ],
  "p00-scaling-estimation": [
    "幂律尺度与相似变换",
    "Fermi 估算中的主导量级",
    "极限尺度检查与近似项舍弃",
  ],
  "p00-measurement-errors": [
    "系统误差、随机误差与仪器分辨率",
    "零点校准、响应曲线与溯源链",
    "重复测量的偏差诊断与残差图",
  ],
  "p00-uncertainty-propagation": [
    "协方差矩阵与一阶误差传播",
    "加权最小二乘和参数置信区间",
    "非线性拟合的 Monte Carlo 不确定度",
  ],
  "p00-model-assumptions": [
    "质点、刚体与连续介质的理想化尺度",
    "对称性如何筛选候选守恒量",
    "失效尺度、边界效应与模型适用域",
  ],
  "p00-measurement-modeling-review": [
    "单摆周期的量纲建模与小角近似",
    "校准数据到参数估计的完整链路",
    "量纲、残差和极限情形的交叉核验",
  ],

  "p01-kinematics": [
    "位矢、速度与加速度的参考系变换",
    "曲线运动的切向—法向分解",
    "相对运动轨迹与 Galilean 变换",
  ],
  "p01-newton-laws": [
    "Newton 三定律与惯性系判别",
    "自由体图、约束力与摩擦模型",
    "连接体和变质量系统的运动方程",
  ],
  "p01-work-energy": [
    "线积分定义的功与功率",
    "保守力、势能和路径无关性",
    "功—能定理在约束运动中的应用",
  ],
  "p01-momentum-collisions": [
    "冲量—动量定理与质心运动",
    "弹性和非弹性碰撞的守恒方程",
    "二维散射的实验室系与质心系",
  ],
  "p01-rigid-rotation": [
    "角速度、转动惯量张量与平行轴定理",
    "力矩方程和角动量守恒",
    "无滑动滚动与陀螺进动",
  ],
  "p01-mechanics-review": [
    "Newton 引力势与壳层定理",
    "Kepler 轨道、有效势与逃逸条件",
    "能量—动量方法联解多体近似",
  ],

  "p02-variational-principle": [
    "作用量变分与固定端点条件",
    "Euler–Lagrange 方程从一阶变分导出",
    "测地线和最短光程的变分实例",
  ],
  "p02-constraints-symmetry": [
    "广义坐标与完整约束消元",
    "Lagrange 乘子给出的约束反力",
    "连续对称变换与 Noether 守恒荷",
  ],
  "p02-hamilton-equations": [
    "Legendre 变换与共轭动量",
    "Hamilton 正则方程的相空间流",
    "Hamilton–Jacobi 方程与作用量函数",
  ],
  "p02-canonical-transformations": [
    "Poisson 括号代数与运动常数",
    "生成函数构造正则变换",
    "Liouville 定理和相空间体积保持",
  ],
  "p02-phase-space-chaos": [
    "定点线性化与稳定性特征值",
    "Poincaré 截面和周期轨道",
    "Lyapunov 指数、分岔与确定性混沌",
  ],
  "p02-analytical-mechanics-review": [
    "双摆 Lagrange 方程与能量核对",
    "Hamilton 流中的可积性和共振",
    "从稳定岛到混沌海的数值相图",
  ],

  "p03-harmonic-oscillator": [
    "简谐振子的相位轨道与能量交换",
    "阻尼比、临界阻尼和衰减包络",
    "受迫响应、共振峰与品质因数",
  ],
  "p03-coupled-normal-modes": [
    "耦合振子的质量矩阵与刚度矩阵",
    "广义特征值问题和简正坐标",
    "拍频、模态叠加与初值响应",
  ],
  "p03-wave-parameters-superposition": [
    "行波的波数、频率、相位与相速度",
    "叠加原理、波包和群速度",
    "色散关系决定的波形展宽",
  ],
  "p03-wave-equation": [
    "弦微元受力与一维波动方程的推导",
    "行波、固定端模态与初边值条件",
    "能量守恒、CFL 条件与数值色散",
  ],
  "p03-interference-diffraction": [
    "双缝相干条件与条纹可见度",
    "Fraunhofer 衍射和孔径傅里叶变换",
    "光栅分辨本领与空间频谱滤波",
  ],
  "p03-waves-optics-review": [
    "Fermat 原理与透镜成像公式",
    "Jones 向量、偏振器与波片",
    "几何光学极限和波动效应分界",
  ],

  "p04-coulomb-gauss": [
    "Coulomb 叠加与连续电荷积分",
    "电场通量和 Gauss 定律",
    "球、柱、平面对称电场的选面策略",
  ],
  "p04-potential-boundaries": [
    "电势梯度、Poisson 与 Laplace 方程",
    "导体边界条件和唯一性定理",
    "分离变量与镜像电荷法",
  ],
  "p04-steady-magnetic": [
    "Biot–Savart 定律和 Ampère 环路",
    "磁矢势、规范选择与磁通",
    "带电粒子在匀强磁场中的回旋",
  ],
  "p04-induction-circuits": [
    "Faraday–Lenz 定律与动生电动势",
    "Maxwell 位移电流和电荷连续性",
    "RLC 暂态、共振与复阻抗响应",
  ],
  "p04-maxwell-waves": [
    "四条 Maxwell 方程的微分形式",
    "真空波动方程与横波约束",
    "电磁波的偏振、阻抗和辐射压",
  ],
  "p04-electromagnetism-review": [
    "介电极化、磁化与束缚源",
    "Poynting 定理和场能输运",
    "反射折射边界条件与 Fresnel 系数",
  ],

  "p05-equilibrium-state": [
    "热平衡、温标与第零定律",
    "p–V–T 状态方程和热膨胀系数",
    "准静态路径与状态空间曲线",
  ],
  "p05-first-law": [
    "内能、热量与功的符号约定",
    "闭合系统第一定律和焓",
    "等压、等容、绝热过程的能量平衡",
  ],
  "p05-second-law": [
    "Kelvin–Planck 与 Clausius 表述",
    "Carnot 循环效率和绝对温标",
    "Clausius 不等式与可逆性判据",
  ],
  "p05-entropy-production": [
    "熵的路径积分和状态函数性质",
    "热传导、混合与自由膨胀的熵产生",
    "局域熵平衡和不可逆通量",
  ],
  "p05-free-energies": [
    "Helmholtz 与 Gibbs 自由能的自然变量",
    "Maxwell 关系由热力学势导出",
    "化学势相等与多相平衡",
  ],
  "p05-thermodynamics-review": [
    "热容、压缩率和膨胀系数恒等式",
    "Clapeyron 方程与一级相变曲线",
    "临界点附近的响应函数异常",
  ],

  "p06-microcanonical": [
    "等能面、微观态数与相空间测度",
    "Boltzmann 熵和最概然宏观态",
    "理想气体微正则温度与压强",
  ],
  "p06-canonical": ["热浴耦合与 Boltzmann 权重", "配分函数导出能量和热容", "能量涨落与系统尺度"],
  "p06-grand-canonical": [
    "粒子库、逸度与巨配分函数",
    "粒子数涨落和压强势",
    "吸附平衡中的化学势控制",
  ],
  "p06-bose-fermi": [
    "Bose 与 Fermi 占据数的推导",
    "Bose–Einstein 凝聚和临界温度",
    "简并 Fermi 气、Fermi 能与态密度",
  ],
  "p06-critical-phenomena": [
    "序参量、对称破缺与 Landau 自由能",
    "临界指数、标度律和关联长度",
    "Ising 模型的磁化曲线与有限尺寸效应",
  ],
  "p06-statistical-physics-review": [
    "Green–Kubo 关系连接涨落与输运",
    "Langevin 方程和扩散系数",
    "响应函数、关联函数与谱密度",
  ],

  "p07-states-observables": [
    "Hilbert 空间、归一化态与射线",
    "Hermitian 算符和谱分解",
    "位置表象、动量表象与 Fourier 变换",
  ],
  "p07-measurement-uncertainty": [
    "Born 概率与投影测量",
    "对易子、兼容观测量与共同本征态",
    "Robertson 不确定关系及高斯饱和态",
  ],
  "p07-schrodinger-equation": [
    "时间依赖 Schrödinger 方程和幺正演化",
    "定态分离与能量本征方程",
    "概率流守恒和连续性方程",
  ],
  "p07-one-dimensional-systems": [
    "无限深势阱的离散能级",
    "势垒隧穿的透射系数",
    "阶跃势散射与边界匹配",
  ],
  "p07-angular-momentum-spin": [
    "角动量代数和升降算符",
    "自旋一半测量与 Bloch 球",
    "Boson、Fermion 交换对称性和 Pauli 原理",
  ],
  "p07-quantum-mechanics-review": [
    "非简并微扰的能级修正",
    "Rayleigh–Ritz 变分上界",
    "WKB 相位积分与转折点连接",
  ],

  "p08-lorentz-transform": [
    "Einstein 同步与 Lorentz 变换",
    "固有时、时空间隔与因果锥",
    "时间膨胀和长度收缩的事件图",
  ],
  "p08-relativistic-dynamics": [
    "四速度、四动量与质能关系",
    "相对论碰撞中的不变量质量",
    "电磁场张量的参考系变换",
  ],
  "p08-tensors-curvature": [
    "度规张量、指标升降与协变导数",
    "Levi-Civita 联络和测地偏离",
    "Riemann 曲率、Ricci 张量与标量曲率",
  ],
  "p08-equivalence-geodesics": [
    "局域惯性系与等效原理",
    "测地线方程和自由落体",
    "引力红移、钟速差与实验检验",
  ],
  "p08-einstein-field-equations": [
    "Einstein 张量和应力—能量张量",
    "场方程的 Newton 极限",
    "Schwarzschild 解的视界与轨道",
  ],
  "p08-relativity-review": [
    "黑洞因果结构和光子球",
    "Friedmann 方程与宇宙膨胀",
    "引力波的横向潮汐响应",
  ],

  "p09-kinematics-stress": [
    "形变梯度、应变率与物质导数",
    "Cauchy 应力张量和牵引向量",
    "本构关系与客观性要求",
  ],
  "p09-conservation-laws": [
    "控制体质量守恒和连续方程",
    "Cauchy 动量方程与体力",
    "总能量方程和内能耗散",
  ],
  "p09-euler-bernoulli": [
    "无黏 Euler 方程与流线",
    "Bernoulli 积分的适用条件",
    "环量、涡量输运与 Kelvin 定理",
  ],
  "p09-navier-stokes": [
    "Newton 黏性定律和 Navier–Stokes 方程",
    "平面 Poiseuille 流与剪切应力",
    "Reynolds 数、无量纲化和相似流",
  ],
  "p09-boundary-layers-instability": [
    "Prandtl 边界层尺度与分离",
    "相似解和阻力系数缩放",
    "Kelvin–Helmholtz 与 Rayleigh–Bénard 不稳定性",
  ],
  "p09-fluid-mechanics-review": [
    "浅水波和声波的线性化",
    "能量级联、Kolmogorov 尺度与湍流谱",
    "连续介质方程的激波与弱解",
  ],

  "p10-crystal-structure": [
    "Bravais 点阵、晶胞与空间群",
    "倒易点阵和第一 Brillouin 区",
    "Bragg 条件与 X 射线衍射峰",
  ],
  "p10-phonons": ["一维晶格色散与声学支", "正则模量子化和声子占据", "Debye 模型的低温热容"],
  "p10-free-electrons": [
    "Drude 输运、弛豫时间与电导率",
    "Sommerfeld 自由电子气与 Fermi 面",
    "Hall 效应和载流子符号测量",
  ],
  "p10-band-theory": [
    "Bloch 定理和能带形成",
    "有效质量、空穴与半导体掺杂",
    "费米面拓扑与金属绝缘体判别",
  ],
  "p10-magnetism-superconductivity": [
    "交换相互作用与铁磁序",
    "Ginzburg–Landau 序参量和磁通穿透",
    "Meissner 效应、临界场与涡旋",
  ],
  "p10-condensed-matter-review": [
    "Berry 相位、Chern 数与边缘态",
    "拓扑绝缘体的能隙反演",
    "量子 Hall 电导的整数平台",
  ],

  "p11-discretization-validation": [
    "有限差分截断误差与收敛阶",
    "稳定性、一致性和 Lax 等价框架",
    "网格加密、基准解与误差预算",
  ],
  "p11-particles-fields": [
    "辛积分保持 Hamilton 结构",
    "Poisson 方程的有限元离散",
    "粒子—网格耦合和电荷沉积",
  ],
  "p11-monte-carlo": [
    "伪随机数、估计量方差与置信区间",
    "Metropolis–Hastings 重要性采样",
    "自相关时间、热化与有效样本量",
  ],
  "p11-molecular-dynamics": [
    "Verlet 算法和周期边界条件",
    "势能截断、邻居表与能量漂移",
    "温度压强估计及径向分布函数",
  ],
  "p11-parallel-reproducible": [
    "领域分解与通信开销模型",
    "强缩放、弱缩放和 roofline 测量",
    "固定种子、环境锁定与结果复现",
  ],
  "p11-computational-physics-review": [
    "Ising Monte Carlo 的临界温度实验",
    "N 体积分的精度—性能权衡",
    "数值日志、守恒残差与复现实验包",
  ],

  "p12-classical-fields": [
    "场作用量密度与 Euler–Lagrange 场方程",
    "时空平移对应的能动量张量",
    "连续内部对称性和 Noether 流",
  ],
  "p12-klein-gordon-dirac": [
    "Klein–Gordon 方程与相对论色散",
    "Dirac 矩阵、旋量与反粒子",
    "守恒四流和正频负频解",
  ],
  "p12-field-quantization": [
    "Klein–Gordon 场的模展开与量子化",
    "产生湮灭算符和 Fock 空间",
    "真空能、正规序与粒子数算符",
  ],
  "p12-interactions-diagrams": [
    "相互作用绘景和 Dyson 展开",
    "散射振幅、截面与相空间因子",
    "Feynman 规则和树级图计数",
  ],
  "p12-gauge-standard-model": [
    "局域规范不变性与协变导数",
    "SU(3)×SU(2)×U(1) 相互作用结构",
    "Higgs 机制与规范玻色子质量",
  ],
  "p12-particle-field-review": [
    "粒子谱、量子数与守恒反应",
    "离散对称性 C、P、T 的检验",
    "有效场论的能标截断与低能展开",
  ],
};
