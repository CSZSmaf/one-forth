const zh = (value: string) => ({ "zh-CN": value });

/**
 * Second-generation experiments.  The manifest intentionally contains only
 * scientific metadata; the web application resolves renderers through its
 * lazy descriptor registry.
 */
export const extendedVisualizationManifest = [
  {
    id: "probability-sampling-convergence",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "概率抽样与收敛", en: "Sampling convergence" },
    description: zh("使用固定随机种子重复 Bernoulli 抽样，比较样本均值与理论概率。"),
    scientificReview: {
      observationGoal: zh(
        "观察独立同分布 Bernoulli 样本的累计均值如何围绕真实概率波动并逐步稳定。",
      ),
      mathematicalModel: zh(
        "令 $X_i\\sim\\operatorname{Bernoulli}(p)$，逐步计算样本均值 $\\bar X_n=\\frac1n\\sum_{i=1}^n X_i$，并与 $\\mathbb E[X_i]=p$ 比较。",
      ),
      assumptions: [
        zh("抽样由确定性伪随机序列复现，同一整数种子产生完全相同的样本。"),
        zh("样本相互独立且参数 $p$ 在整个实验期间保持不变。"),
      ],
      procedure: [
        zh("设置成功概率和随机种子。"),
        zh("播放或单步增加样本并观察累计均值。"),
        zh("重置后用同一种子核对轨迹，用不同种子比较有限样本波动。"),
      ],
      expectedPhenomena: [
        zh("样本增多时，累计均值在 $p$ 附近波动，典型波动尺度约按 $n^{-1/2}$ 缩小。"),
        zh("不同种子产生不同轨迹，而相同种子的状态和导出结果一致。"),
      ],
      numericalValidation: [
        zh("逐项复算成功次数、累计均值和绝对误差，并检查均值始终位于 [0,1]。"),
        zh("相同状态重复建模必须逐点相等，终点计数必须等于曲线最后一项。"),
      ],
      limitations: [
        zh("同一条轨迹中的误差可以增大或减小。大数定律描述样本量趋于无穷时的收敛。"),
        zh("更换种子可比较不同样本序列的波动。"),
      ],
      relatedConceptIds: ["law-large-numbers"],
    },
  },
  {
    id: "confidence-coverage",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "置信区间覆盖率", en: "Confidence interval coverage" },
    description: zh("重复生成正态样本，检查给定置信水平的区间覆盖频率。"),
    scientificReview: {
      observationGoal: zh("区分单个置信区间是否覆盖真值与大量重复实验中的长期覆盖比例。"),
      mathematicalModel: zh(
        "对已知 $\\sigma=1$ 的正态总体，用 $\\bar X\\pm z_{1-\\alpha/2}/\\sqrt n$ 构造均值置信区间，统计包含总体均值的区间比例。",
      ),
      assumptions: [
        zh("每次实验含 24 个相互独立的 N(0,1) 观测。"),
        zh("临界值由标准正态分布的数值近似计算，总体标准差视为已知。"),
      ],
      procedure: [
        zh("设置名义置信水平与随机种子。"),
        zh("逐次生成样本并记录区间是否包含 μ=0。"),
        zh("比较累计覆盖率、名义水平和二项抽样标准误。"),
      ],
      expectedPhenomena: [
        zh("有限重复下覆盖率围绕名义水平随机波动。"),
        zh("重复次数增加时覆盖率通常稳定，但不要求精确等于名义水平。"),
      ],
      numericalValidation: [
        zh("每个区间端点由同一批样本均值独立复算。"),
        zh("覆盖次数必须为整数且不超过已完成实验数，覆盖率必须位于 [0,1]。"),
      ],
      limitations: [
        zh("此处区间使用已知方差的独立正态样本。"),
        zh("重复次数有限时，经验覆盖率与名义置信水平存在抽样误差。"),
      ],
      relatedConceptIds: ["confidence-intervals"],
    },
  },
  {
    id: "phase-space-chaos",
    domain: "physics",
    renderer: "svg",
    title: { "zh-CN": "相空间与混沌", en: "Phase space and chaos" },
    description: zh("比较 logistic 映射的相邻初值轨迹与有限时间 Lyapunov 指标。"),
    scientificReview: {
      observationGoal: zh("观察确定性非线性映射中邻近初值的收敛、周期行为与敏感依赖。"),
      mathematicalModel: zh(
        "迭代 $x_{n+1}=rx_n(1-x_n)$，同步推进初值相差 $10^{-8}$ 的两条轨迹。有限时间 Lyapunov 指数取 $\\log|r(1-2x_n)|$ 的平均值。",
      ),
      assumptions: [
        zh("$r\\in[3.2,4]$，初值位于 $(0,1)$。"),
        zh("数值轨迹使用双精度浮点数，长时间后会受到舍入和有限状态空间影响。"),
      ],
      procedure: [
        zh("调节 $r$ 并固定种子生成初值。"),
        zh("在 $(x_n,x_{n+1})$ 返回映射中逐步加入轨道点，用对角线识别不动点与周期结构。"),
        zh("在周期窗口和混沌区比较相空间点集与有限时间 Lyapunov 指标。"),
      ],
      expectedPhenomena: [
        zh("部分参数产生稳定周期轨道，接近 4 的参数通常表现出明显敏感依赖。"),
        zh("正的有限时间指标对应局部扰动平均指数放大，但短轨迹可能误判。"),
      ],
      numericalValidation: [
        zh("每一步检查 $x_n$ 与扰动轨迹均在 $[0,1]$ 内。"),
        zh("轨迹更新、距离和导数对数由同一映射逐项复算。"),
      ],
      limitations: [
        zh("系统按 logistic 迭代式离散演化。"),
        zh("初值误差和浮点舍入会影响长期轨迹。"),
      ],
      relatedConceptIds: ["phase-space-chaos"],
    },
  },
  {
    id: "coulomb-gauss-field",
    domain: "physics",
    renderer: "svg",
    title: { "zh-CN": "库仑场与 Gauss 通量", en: "Coulomb field and Gauss flux" },
    description: zh("叠加多个偏心电荷的矢量场，并在 Gaussian 圆上逐点核对通量。"),
    scientificReview: {
      observationGoal: zh("观察多个正负偏心电荷的矢量场叠加，并比较圆周求积通量与包围净电荷。"),
      mathematicalModel: zh(
        "二维归一化电场为 $E(r)=\\sum_i q_i(r-r_i)/|r-r_i|^2$。沿高斯圆逐点积分 $E\\cdot n\\,\\mathrm ds$，并与 $\\oint E\\cdot n\\,\\mathrm ds=2\\pi Q_{\\mathrm{enclosed}}$ 比较。",
      ),
      assumptions: [
        zh("三个线电荷固定在不同偏心位置，介质均匀并使用归一化单位。"),
        zh("种子只旋转等角圆周求积网格，不改变电荷、半径或解析包围电荷。"),
      ],
      procedure: [
        zh("设置 Gaussian 圆半径和采样种子。"),
        zh("读取多个电荷叠加后的局部矢量，并逐点加入 $E\\cdot n\\,\\mathrm ds$。"),
        zh("改变半径跨越电荷位置，比较完整数值通量与独立的 2πQ_enclosed 基准。"),
      ],
      expectedPhenomena: [
        zh("局部场方向和强度受全部电荷影响，不能由单一径向公式描述。"),
        zh("完整圆周通量只随被圆包围的净电荷改变，圆外电荷的总通量贡献为零。"),
      ],
      numericalValidation: [
        zh("逐样本叠加各电荷的矢量场，计算 $E\\cdot n\\,\\mathrm ds$ 并保留其符号。"),
        zh("完整积分残差按 |Φ_num−2πQ_enclosed| 计算；相同种子必须复现同一旋转网格。"),
      ],
      limitations: [
        zh("这里计算二维线电荷截面上的场与圆周通量，场强随距离按反比衰减。"),
        zh("归一化单位省略 SI 常数；Gaussian 圆不得穿过电荷奇点。"),
      ],
      relatedConceptIds: ["coulomb-gauss"],
    },
  },
  {
    id: "quantum-measurement",
    domain: "physics",
    renderer: "svg",
    title: { "zh-CN": "量子态测量", en: "Quantum measurement" },
    description: zh("从归一化量子比特态重复取样，比较 Born 概率与观测频率。"),
    scientificReview: {
      observationGoal: zh("区分态振幅、Born 概率与有限次测量得到的经验频率。"),
      mathematicalModel: zh(
        "状态为 $|\\psi\\rangle=\\cos(\\theta/2)|0\\rangle+\\sin(\\theta/2)|1\\rangle$，测量概率为 $P(1)=\\sin^2(\\theta/2)$。固定种子生成重复投影测量的结果。",
      ),
      assumptions: [
        zh("每次测量都重新制备同一纯态，测量基为 $\\{|0\\rangle,|1\\rangle\\}$。"),
        zh("忽略退相干、读出误差和制备误差。"),
      ],
      procedure: [
        zh("设置 Bloch 极角和随机种子。"),
        zh("单步或播放增加测量次数。"),
        zh("比较态范数 $|a|^2+|b|^2$、理论 $P(1)$ 与累计频率。"),
      ],
      expectedPhenomena: [
        zh("观测值每次只能是 0 或 1，经验频率随样本数增加围绕 Born 概率波动。"),
        zh("$\\theta=0$ 或 $\\theta=\\pi$ 时结果确定，中间角度产生随机结果。"),
      ],
      numericalValidation: [
        zh("每个角度检查态范数 $|a|^2+|b|^2=1$。"),
        zh("累计 1 的次数与曲线终点一致，频率始终位于 [0,1]。"),
      ],
      limitations: [
        zh("模型使用单量子比特纯态和投影测量。"),
        zh("测量结果按 Born 概率取样，模型假设理想测量。"),
      ],
      relatedConceptIds: ["measurement-uncertainty"],
    },
  },
  {
    id: "algorithm-complexity-trace",
    domain: "computer-science",
    renderer: "svg",
    title: { "zh-CN": "算法复杂度轨迹", en: "Algorithm complexity trace" },
    description: zh("逐轮执行插入排序，核对比较次数、移动次数和二次上界。"),
    scientificReview: {
      observationGoal: zh("把抽象渐近复杂度与一次确定输入上的真实基本操作轨迹联系起来。"),
      mathematicalModel: zh(
        "对固定种子生成的排列执行插入排序，逐轮累计键比较与元素移动次数，并与前缀长度 $n$ 的二次上界比较。",
      ),
      assumptions: [
        zh("数组元素互异，比较和移动按代码中的明确规则计数。"),
        zh("渐近上界描述输入规模增长，不承诺每个随机实例都达到最坏情况。"),
      ],
      procedure: [
        zh("设置数组长度和种子。"),
        zh("逐轮推进插入排序并读取累计操作数。"),
        zh("重放同一输入，比较实际轨迹与二次上界。"),
      ],
      expectedPhenomena: [
        zh("已排序前缀始终保持有序。"),
        zh("随机输入通常低于最坏二次上界，但累计操作数不会随轮次减少。"),
      ],
      numericalValidation: [
        zh("每轮检查前缀有序且仍为原输入元素的排列。"),
        zh("独立累计比较和移动次数，并检查二者不超过实现对应的有限上界。"),
      ],
      limitations: [
        zh("轨迹展示插入排序在当前输入上的比较和移动操作。"),
        zh("纵轴统计基本操作次数，实际运行时间还取决于实现与硬件。"),
      ],
      relatedConceptIds: ["complexity-computability"],
    },
  },
  {
    id: "ode-stability-convergence",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "ODE 稳定性与收敛", en: "ODE stability and convergence" },
    description: zh("比较显式 Euler 解、解析衰减解和稳定因子。"),
    scientificReview: {
      observationGoal: zh("观察步长如何同时影响显式 Euler 方法的离散误差和线性稳定性。"),
      mathematicalModel: zh(
        "对 $y^{\\prime}=-y$ 使用 Euler 更新 $y_{n+1}=(1-h)y_n$，初值 $y_0\\in[0.75,1.25]$ 由种子确定。解析解为 $y(t)=y_0e^{-t}$，稳定条件为 $|1-h|<1$。",
      ),
      assumptions: [
        zh("方程为无量纲线性测试方程，种子决定初值，步长在单条轨迹中保持不变。"),
        zh("稳定性判断针对该测试方程，不自动推广到刚性系统或高阶方法。"),
      ],
      procedure: [
        zh("设置步长 $h$ 与固定种子，并记录由种子产生的初值。"),
        zh("逐步比较数值解和解析解。"),
        zh("保持种子不变，跨越 $h=2$ 的稳定边界，观察放大因子和误差。"),
      ],
      expectedPhenomena: [
        zh("$0<h<2$ 时离散解渐近衰减，$h>2$ 时误差交替放大。"),
        zh("稳定不等于高精度；较大的稳定步长仍可能有明显离散误差。"),
      ],
      numericalValidation: [
        zh("每一步独立复算 Euler 递推和解析值。"),
        zh("显示的稳定分类必须与 $|1-h|$ 的解析条件一致。"),
      ],
      limitations: [
        zh("稳定区间针对当前线性标量测试方程。"),
        zh("时间轴标出离散步点，相邻点之间用直线连接。"),
      ],
      relatedConceptIds: ["ode-pde-numerics"],
    },
  },
  {
    id: "pinn-residual-training",
    domain: "interdisciplinary",
    renderer: "svg",
    title: { "zh-CN": "PINN 残差训练", en: "PINN residual training" },
    description: zh("对满足边界条件的试探函数执行残差梯度下降，并核对解析解。"),
    scientificReview: {
      observationGoal: zh("把微分方程残差、边界约束、参数更新和解误差放在同一条可复算训练轨迹中。"),
      mathematicalModel: zh(
        "求解 $-u^{\\prime\\prime}=2$，边界条件为 $u(0)=u(1)=0$。取 $u_a(x)=ax(1-x)$，残差损失为 $L=4(a-1)^2$，通过梯度下降更新 $a$。",
      ),
      assumptions: [
        zh("试探函数满足两端 Dirichlet 边界，解析解包含在这个单参数函数族中。"),
        zh("学习率固定，不包含随机批次、自动微分误差或优化器状态。"),
      ],
      procedure: [
        zh("设置学习率和决定初始参数的种子。"),
        zh("逐步更新参数并读取残差损失。"),
        zh("比较参数 $a$、边界误差和对解析解的最大误差。"),
      ],
      expectedPhenomena: [
        zh("稳定学习率下 $a$ 收敛到 1，残差和解误差共同下降。"),
        zh("边界误差在全部步骤中精确为零，这是试探函数结构保证而非训练结果。"),
      ],
      numericalValidation: [
        zh("每步使用 $\\mathrm dL/\\mathrm da=8(a-1)$ 独立复算参数更新。"),
        zh("检查损失非负、边界值为零，并在网格上复算最大解误差。"),
      ],
      limitations: [
        zh("训练只更新试探函数中的一个参数，并与解析解比较。"),
        zh("残差与解误差分别计算，用于比较优化目标和最终解的精度。"),
      ],
      relatedConceptIds: ["pinn"],
    },
  },
  {
    id: "function-graph-transform",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "函数图象变换", en: "Function graph transformations" },
    description: zh("观察函数图像的伸缩与平移，追踪对应点的位置。"),
    scientificReview: {
      observationGoal: zh("观察纵向伸缩、横向伸缩及平移对 $y=f(x)$ 的图像和对应点位置的影响。"),
      mathematicalModel: zh(
        "图象变换为 $y=af(b(x-h))+k$，目标参数为 $(a,b,k)=(1.6,0.5,-1)$，滑杆设置 $h$。参数从 $(1,1,0,0)$ 插值到目标值，点 $(x_0,f(x_0))$ 移到 $(h+x_0/b,af(x_0)+k)$。",
      ),
      assumptions: [
        zh("种子从 $x^2$、$\\sin x$、$|x|$ 中选择基函数，变换参数由控件设置。"),
        zh("中间帧按参数插值生成，终点对应设置的函数变换。"),
      ],
      procedure: [
        zh("固定种子选定基函数，读取变换前后两条图象。"),
        zh("播放或单步推进插值，观察伸缩与平移同时施加时图象的走向。"),
        zh("调节水平位移 $h$，核对点 $(0,f(0))$ 变换后的位置 $(h,af(0)+k)$。"),
      ],
      expectedPhenomena: [
        zh("$b=0.5$ 时图像横向伸长至原来的 2 倍；$a=1.6$ 时纵坐标变为原来的 1.6 倍。"),
        zh("横向位移为 $h$；$h>0$ 时图像向右移动，$h<0$ 时向左移动。"),
      ],
      numericalValidation: [
        zh("对独立取样的 $x_0$ 核对点映射：函数在 $h+x_0/b$ 处的值应等于 $af(x_0)+k$。"),
        zh("在 $x=h$ 处，变换后的函数值应为 $af(0)+k$，与横向伸缩参数 $b$ 无关。"),
      ],
      limitations: [
        zh("滑杆调节 $h$，$a$、$b$、$k$ 保持固定。"),
        zh("每个图象点按给定的坐标变换规则移动。"),
      ],
      relatedConceptIds: ["functions-and-graphs"],
    },
  },
  {
    id: "riemann-sum-convergence",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "黎曼和逼近定积分", en: "Riemann sums approaching the integral" },
    description: zh("比较左、右、中点法则的误差随分割数的下降，并与经典误差界核对。"),
    scientificReview: {
      observationGoal: zh(
        "观察左、右、中点法则的误差 $|S_n-I|$ 随分割数 $n$ 的变化，并与先验误差界比较。",
      ),
      mathematicalModel: zh(
        "在固定区间 $[a,b]$ 上计算左、右、中点和 $S_n$，并与解析积分 $I$ 比较。端点法则误差界为 $M_1(b-a)^2/(2n)$，中点法则为 $M_2(b-a)^3/(24n^2)$，其中 $M_1=\\max|f^{\\prime}|$、$M_2=\\max|f^{\\prime\\prime}|$。",
      ),
      assumptions: [
        zh(
          "种子选择 $x^2$ 在 $[0,1]$、$\\sin x$ 在 $[0,\\pi]$ 或 $e^x$ 在 $[0,1]$ 上的积分；$I$、$M_1$、$M_2$ 由解析式给出。",
        ),
        zh("被积函数足够光滑，使各法则的经典误差估计成立。"),
      ],
      procedure: [
        zh("选择左、右或中点法则，逐步增加分割数 $n$。"),
        zh("比较实测误差曲线与对应阶的误差界曲线。"),
        zh("切换法则，比较一阶收敛与二阶收敛的差别。"),
      ],
      expectedPhenomena: [
        zh("左、右法则的误差约按 $1/n$ 下降，中点法则约按 $1/n^2$ 下降。"),
        zh("实测误差始终位于误差界曲线之下，而界通常偏保守。"),
      ],
      numericalValidation: [
        zh("每个 $S_n$ 由求和独立复算，$I$ 由原函数在端点的值相减得到。"),
        zh("逐步核对 $|S_n-I|$ 是否小于当前法则的先验误差界。"),
      ],
      limitations: [
        zh("三个被积函数均光滑，适用所列的经典求积误差界。"),
        zh("误差界由整个积分区间上的导数上界计算，实际误差可以更小。"),
      ],
      relatedConceptIds: ["integrals-and-accumulation"],
    },
  },
  {
    id: "birthday-paradox-simulation",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "生日悖论模拟", en: "Birthday paradox simulation" },
    description: zh("固定种子抽取 n 人生日组，比较经验碰撞频率与精确理论概率。"),
    scientificReview: {
      observationGoal: zh(
        "区分单组是否发生碰撞与大量重复抽组后的长期碰撞频率，并把频率与精确理论概率对照。",
      ),
      mathematicalModel: zh(
        "每组从 365 个等可能日期中独立抽取 $n$ 个生日，理论碰撞概率为 $p(n)=1-\\prod_{i=0}^{n-1}(365-i)/365$。逐组更新出现相同生日的频率。",
      ),
      assumptions: [
        zh("生日在 365 个日期上均匀且相互独立，忽略闰年与季节分布。"),
        zh("抽样由确定性伪随机序列复现，同一整数种子产生完全相同的组序列。"),
      ],
      procedure: [
        zh("设置每组人数 $n$ 与随机种子。"),
        zh("播放或单步增加组数，观察累计碰撞频率围绕 $p(n)$ 的波动。"),
        zh("把 $n$ 调到 23 附近，核对理论概率超过 $1/2$ 的位置。"),
      ],
      expectedPhenomena: [
        zh("$n=23$ 时理论碰撞概率约为 0.5073，$n=50$ 时约为 0.9704。"),
        zh("有限组数的经验频率在理论值两侧波动，不要求单调接近。"),
      ],
      numericalValidation: [
        zh("理论概率用连乘积与对数和求指数两条路径独立计算并核对一致。"),
        zh("碰撞组数必须为整数且不超过已抽组数，经验频率必须位于 [0,1]。"),
      ],
      limitations: [
        zh("模型假设 365 个日期等概率出现。"),
        zh("可用连乘公式的精确概率比较有限次模拟的频率。"),
      ],
      relatedConceptIds: ["counting-principles"],
    },
  },
  {
    id: "damped-oscillator-regimes",
    domain: "mathematics",
    renderer: "svg",
    title: { "zh-CN": "阻尼振动的三种 regime", en: "Three regimes of damped oscillation" },
    description: zh("改变阻尼系数，比较欠阻尼、临界阻尼与过阻尼的解析位移曲线和包络。"),
    scientificReview: {
      observationGoal: zh("观察阻尼比 $\\zeta$ 在 1 两侧变化时，位移曲线的振荡与衰减速度。"),
      mathematicalModel: zh(
        "取 $m=1\\,\\mathrm{kg}$、$k=1\\,\\mathrm{N/m}$，求解 $mx^{\\prime\\prime}+cx^{\\prime}+kx=0$。固有频率为 $\\omega_0=\\sqrt{k/m}=1\\,\\mathrm{rad/s}$，阻尼比为 $\\zeta=c/(2\\sqrt{mk})$，按 $\\zeta<1$、$\\zeta=1$、$\\zeta>1$ 选择对应解析解。",
      ),
      assumptions: [
        zh(
          "弹簧与阻尼器均为线性元件，无外力作用。初始位移为 $x(0)=1\\,\\mathrm m$，初始速度 $v(0)$ 由种子在 $[-1,1]\\,\\mathrm{m/s}$ 内确定。",
        ),
        zh(
          "$c=2\\,\\mathrm{kg/s}$ 时采用临界阻尼的重根解；实现中将 $|\\zeta-1|\\le10^{-9}$ 归入该分支。",
        ),
      ],
      procedure: [
        zh("调节阻尼系数 $c$，单位为 $\\mathrm{kg/s}$，比较三种阻尼状态。"),
        zh("播放或单步推进时间，比较位移曲线与解析包络上界。"),
        zh("读取 $\\zeta$、$\\omega_0$ 与阻尼频率 $\\omega_d$，核对阻尼类型。"),
      ],
      expectedPhenomena: [
        zh(
          "$\\zeta<1$ 时位移以 $\\omega_d=\\omega_0\\sqrt{1-\\zeta^2}$ 振荡，包络为 $\\pm\\sqrt{x_0^2+B^2}e^{-\\zeta\\omega_0t}$。",
        ),
        zh("相同初值下临界阻尼比过阻尼更快回到平衡位置附近，过阻尼的慢模态拖出长尾。"),
      ],
      numericalValidation: [
        zh(
          "对每个采样时刻，用解析导数复算残差 $mx^{\\prime\\prime}+cx^{\\prime}+kx$，并与机器精度比较。",
        ),
        zh("逐步比较 $|x(t)|$ 与对应解析包络的上界。"),
      ],
      limitations: [
        zh("模型描述线性单自由度系统的自由阻尼振动。"),
        zh("包络是幅值上界，不代表每个时刻都达到该值。"),
      ],
      relatedConceptIds: ["harmonic-oscillator"],
    },
  },
  {
    id: "projectile-motion",
    domain: "physics",
    renderer: "svg",
    title: { "zh-CN": "抛体运动", en: "Projectile motion" },
    description: zh("改变发射角，追踪无阻力抛体的轨迹、射程、最大高度与飞行时间。"),
    scientificReview: {
      observationGoal: zh(
        "把水平和竖直两个独立分运动合成为轨迹，并核对射程、最大高度与飞行时间的解析公式。",
      ),
      mathematicalModel: zh(
        "取 $g=9.80665\\,\\mathrm{m/s^2}$，位置为 $x=v_0\\cos\\theta\\,t$、$y=v_0\\sin\\theta\\,t-gt^2/2$。射程为 $R=v_0^2\\sin(2\\theta)/g$，最大高度为 $H=(v_0\\sin\\theta)^2/(2g)$，飞行时间为 $T=2v_0\\sin\\theta/g$。",
      ),
      assumptions: [
        zh("忽略空气阻力、风、地球曲率与自转，重力加速度保持 $g=9.80665\\,\\mathrm{m/s^2}$。"),
        zh(
          "发射点与落点同高，地面为 $y=0$；初速度 $v_0$ 由种子在 $[12,28]\\,\\mathrm{m/s}$ 内确定。",
        ),
      ],
      procedure: [
        zh("设置发射角 $\\theta$ 与种子，读取 $v_0$、射程、最大高度和飞行时间。"),
        zh("播放或单步推进时间，比较当前位置、速度方向与整条解析轨迹。"),
        zh("在 $45^\\circ$ 两侧取互补角，比较相同 $v_0$ 下的射程。"),
      ],
      expectedPhenomena: [
        zh(
          "互补角 $\\theta$ 与 $90^\\circ-\\theta$ 给出相同射程，$\\theta=45^\\circ$ 时射程最大。",
        ),
        zh("轨迹关于最高点前后对称，顶点处竖直分速度为零而水平分速度不变。"),
      ],
      numericalValidation: [
        zh("逐采样点核对轨迹 $y=x\\tan\\theta-gx^2/(2v_0^2\\cos^2\\theta)$。"),
        zh(
          "逐采样点核对单位质量机械能 $\\frac12(v_x^2+v_y^2)+gy=\\frac12v_0^2$，并检查终点满足 $x(T)=R$、$y(T)=0$。",
        ),
      ],
      limitations: [
        zh("模型假设重力加速度恒定、空气阻力为零。"),
        zh("相同射程的互补角具有不同的飞行时间与最大高度。"),
      ],
      relatedConceptIds: ["kinematics"],
    },
  },
  {
    id: "maxwell-speed-distribution",
    domain: "physics",
    renderer: "svg",
    title: { "zh-CN": "麦克斯韦速率分布", en: "Maxwell speed distribution" },
    description: zh("调节温度，比较平衡态理想气体的速率分布与三种特征速率。"),
    scientificReview: {
      observationGoal: zh(
        "观察温度升高时 Maxwell 速率分布如何展宽右移，并区分最概然、平均与方均根速率。",
      ),
      mathematicalModel: zh(
        "速率密度为 $f(v)=4\\pi(M/(2\\pi RT))^{3/2}v^2e^{-Mv^2/(2RT)}$，其中 $R=8.314462618\\,\\mathrm{J/(mol\\cdot K)}$。特征速率为 $v_p=\\sqrt{2RT/M}$、$\\langle v\\rangle=\\sqrt{8RT/(\\pi M)}$ 和 $v_{\\mathrm{rms}}=\\sqrt{3RT/M}$。",
      ),
      assumptions: [
        zh("气体处于热平衡且无整体流动，分子间作用除瞬时碰撞外可忽略（经典理想气体）。"),
        zh(
          "种子从氦气、氮气、氧气、氩气中选择气体及其摩尔质量 $M$，单位为 $\\mathrm{kg/mol}$；参考分布温度为 $300\\,\\mathrm K$。",
        ),
      ],
      procedure: [
        zh("设置温度 $T$ 与种子，读取气体种类和三个特征速率。"),
        zh("推进速率扫描，观察分布曲线的展开和三个标记的相对位置。"),
        zh("改变温度或气体，比较 $v_p$、$\\langle v\\rangle$、$v_{\\mathrm{rms}}$ 的变化。"),
      ],
      expectedPhenomena: [
        zh(
          "三种特征速率均与 $\\sqrt{T/M}$ 成正比，且满足 $v_p<\\langle v\\rangle<v_{\\mathrm{rms}}$。",
        ),
        zh("温度升高或摩尔质量减小时分布变宽、峰位右移、峰高下降。"),
      ],
      numericalValidation: [
        zh("在 $[0,8v_p]$ 上数值积分 $f(v)$，要求与归一化值 $1$ 的偏差小于 $10^{-6}$。"),
        zh(
          "核对比例 $\\langle v\\rangle/v_p=2/\\sqrt\\pi$ 与 $v_{\\mathrm{rms}}/v_p=\\sqrt{3/2}$。",
        ),
      ],
      limitations: [
        zh("分布适用于经典非简并气体，描述大量分子的速率统计。"),
        zh("单次取样得到一个分子速率，多次取样形成速率分布。"),
      ],
      relatedConceptIds: ["canonical"],
    },
  },
  {
    id: "least-squares-regression",
    domain: "machine-learning",
    renderer: "svg",
    title: { "zh-CN": "最小二乘线性回归", en: "Least-squares linear regression" },
    description: zh("逐步加入固定种子散点，观察闭式解斜率、截距与残差平方和的变化。"),
    scientificReview: {
      observationGoal: zh(
        "观察样本逐个加入时闭式最小二乘解如何更新，以及斜率、截距误差随样本量的典型下降。",
      ),
      mathematicalModel: zh(
        "生成 $y_i=0.8+1.2x_i+\\sigma\\varepsilon_i$，其中 $\\varepsilon_i$ 为固定种子的标准正态样本。最小二乘系数为 $\\hat\\beta_1=\\frac{\\sum_i(x_i-\\bar x)(y_i-\\bar y)}{\\sum_i(x_i-\\bar x)^2}$、$\\hat\\beta_0=\\bar y-\\hat\\beta_1\\bar x$，残差平方和为 $\\mathrm{RSS}=\\sum_i(y_i-\\hat\\beta_0-\\hat\\beta_1x_i)^2$。",
      ),
      assumptions: [
        zh(
          "$x$ 由种子在 $[0,10]$ 上均匀抽取；噪声与 $x$ 独立，均值为零且同方差，$\\sigma$ 由参数控制。",
        ),
        zh("样本量小于 2 时不报告斜率拟合，仅按截距模型展示均值线。"),
      ],
      procedure: [
        zh("设置噪声尺度 $\\sigma$ 与种子，逐点加入样本。"),
        zh("比较当前拟合线、真实生成线和残差平方和的变化。"),
        zh("改变 $\\sigma$ 后用同一种子重放，比较误差曲线的量级。"),
      ],
      expectedPhenomena: [
        zh(
          "$\\sigma=0$ 时闭式解在机器精度内复现真实参数；$\\sigma$ 增大时误差曲线整体抬升但仍趋降。",
        ),
        zh("单个离群点可能暂时明显拉动直线，继续加样后影响被稀释。"),
      ],
      numericalValidation: [
        zh("核对正规方程的正交条件 $\\sum_i r_i=0$ 与 $\\sum_i x_i r_i=0$，容差按数据尺度缩放。"),
        zh("RSS 由残差直接求和复算且非负；相同状态重复建模必须逐点相等。"),
      ],
      limitations: [
        zh("噪声相互独立，服从方差固定的高斯分布。"),
        zh("界面显示当前样本的拟合结果；预测误差可在独立样本上评估。"),
      ],
      relatedConceptIds: ["least-squares"],
    },
  },
  {
    id: "epsilon-greedy-bandit",
    domain: "machine-learning",
    renderer: "svg",
    title: { "zh-CN": "ε-greedy 多臂老虎机", en: "ε-greedy multi-armed bandit" },
    description: zh("固定种子运行 ε-greedy，比较平均奖励、最优臂选择率与渐近理论值。"),
    scientificReview: {
      observationGoal: zh(
        "观察探索概率 $\\varepsilon$ 如何同时影响短期平均奖励与长期最优臂选择率。",
      ),
      mathematicalModel: zh(
        "取 $K=4$ 个臂，奖励服从 $N(\\mu_i,1)$，均值由种子确定。每步以概率 $\\varepsilon$ 均匀探索，否则从 $\\arg\\max_i Q_i$ 中均匀选择，并更新样本均值；渐近期望奖励为 $(1-\\varepsilon)\\mu^*+\\varepsilon\\bar\\mu$，最优臂选择率为 $1-\\varepsilon+\\varepsilon/K$。",
      ),
      assumptions: [
        zh("各臂奖励独立、分布平稳，样本均值估计没有模型偏差。"),
        zh("渐近值假设 $Q$ 已收敛到真实均值，只描述长期行为。"),
      ],
      procedure: [
        zh("设置 $\\varepsilon$ 与种子，逐步增加拉杆次数。"),
        zh("比较平均奖励曲线与渐近线 $(1-\\varepsilon)\\mu^*+\\varepsilon\\bar\\mu$。"),
        zh("读取最优臂选择率，与渐近率 $1-\\varepsilon+\\varepsilon/K$ 对照。"),
      ],
      expectedPhenomena: [
        zh(
          "$\\varepsilon=0$ 时可能长期选择次优臂；$\\varepsilon$ 增大时，长期平均奖励趋近均匀探索的平均值 $\\bar\\mu$。",
        ),
        zh("有限步数下曲线在渐近值附近波动，早期估计误差主导偏差。"),
      ],
      numericalValidation: [
        zh("臂均值由种子独立重算，动作计数之和必须等于已执行步数。"),
        zh(
          "累计平均奖励由奖励序列独立复算，渐近线满足 $(1-\\varepsilon)\\mu^*+\\varepsilon\\bar\\mu\\le\\mu^*$。",
        ),
      ],
      limitations: [
        zh("各臂的奖励服从参数固定的高斯分布。"),
        zh("比较 $\\varepsilon$ 时，可更换多个种子，观察回报均值和波动。"),
      ],
      relatedConceptIds: ["q-learning"],
    },
  },
] as const;
