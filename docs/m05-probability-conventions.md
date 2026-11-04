# M05《概率论》符号、条件与章节边界约定

本文件约束 M05 六章的概率空间、分布、矩与收敛记号。正文仍须在对象首次出现处解释符号和条件；本表用于跨章一致性、数值复算和科学审查，不发送到公开客户端。

## 章节边界

| 章                                      | 正文 Concept                      | 主要职责                                                                 |
| --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| 01 概率公理与组合概率                   | `probability-axioms`              | 样本空间、事件族、概率公理、导出公式、计数原则和等可能模型               |
| 02 条件概率、独立性与贝叶斯公式         | `conditional-probability`         | 条件概率、乘法公式、全概率、Bayes、事件独立和条件独立                    |
| 03 随机变量与分布                       | `random-variables-distributions`  | 可测随机变量、CDF、PMF/PDF、变量变换、联合/边缘/条件分布和随机变量独立   |
| 04 期望、方差与协方差                   | `expectation-variance-covariance` | 期望存在性、LOTUS、矩、方差、协方差、相关、条件期望和全方差              |
| 05 大数定律与中心极限定理               | `law-large-numbers`               | 三种收敛、Chebyshev、弱/强大数定律、经典 CLT 与正态近似边界              |
| 06 概率模型、随机变量与极限定理综合复习 | `probability-review`              | 以完整案例选择模型、精确计算、条件化、联合分布、矩与近似，并诊断模型误差 |

参数估计、似然、置信区间和假设检验属于 M06。第六章可以计算样本均值、标准误和正态近似，但不把这些量称为矩估计，也不提前建立估计量优良性的理论。

## 概率空间与事件

| 符号         | 含义与限制                                                      |
| ------------ | --------------------------------------------------------------- |
| `\Omega`     | 样本空间；元素 `\omega\in\Omega` 是一次试验的基本结果           |
| `\mathcal F` | `\Omega` 上的事件 `\sigma`-代数；概率只对 `A\in\mathcal F` 定义 |
| `\mathbb P`  | 概率测度；全文不混用无说明的 `P` 与 `\Pr`                       |
| `A^c`        | 事件 `A` 关于 `\Omega` 的补集                                   |
| `\binom nk`  | 从 `n` 个不同对象中无序选择 `k` 个；越界时按零处理              |

条件概率 `\mathbb P(A\mid B)` 只在 `\mathbb P(B)>0` 时按比值定义。连续变量的“给定 `Y=y`”不能直接套用零概率事件上的比值；正文仅在联合密度存在且边缘密度为正处使用条件密度，或明确说明需要正则条件分布。

“古典概型”只在有限样本点等可能且计数单位一致时使用。排列或组合给出的是结果个数，不会自动证明每个结果等可能。互斥是 `A\cap B=\varnothing`，独立是 `\mathbb P(A\cap B)=\mathbb P(A)\mathbb P(B)`；正概率互斥事件不会独立。

## 独立性的层级

- 两个事件独立：对该二元交集满足乘法公式。
- 一族事件两两独立：每一对独立；这不推出任意有限子族的交集概率可乘。
- 一族事件相互独立：每个有限子族都满足交集概率的乘法公式。
- 条件独立：在给定信息或事件后满足乘法分解；它不推出无条件独立，反向也不成立。
- 随机变量独立：它们生成的事件族独立；有联合 PMF/PDF 时可由联合分布因子化核验，但因子化应在完整支持上成立。

## 随机变量与分布

随机变量用大写 `X,Y,Z`，具体取值用小写 `x,y,z`，随机向量用粗体 `\mathbf X`。实值随机变量 `X:(\Omega,\mathcal F)\to(\mathbb R,\mathcal B(\mathbb R))` 必须可测。其分布是推前测度

$$
\mathbb P_X(B)=\mathbb P(X\in B),\qquad B\in\mathcal B(\mathbb R).
$$

统一记号如下：

| 符号                       | 含义                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `F_X(x)=\mathbb P(X\le x)` | 累积分布函数；右连续、单调不减，极限为 0 与 1                     |
| `p_X(x)=\mathbb P(X=x)`    | 离散随机变量的概率质量函数                                        |
| `f_X(x)`                   | 绝对连续分布的概率密度，满足 `F_X(x)=\int_{-\infty}^x f_X(t)\,dt` |
| `f_{X,Y}`                  | 联合密度；边缘密度由对另一个变量积分得到                          |
| `f_{X\mid Y}(x\mid y)`     | 在 `f_Y(y)>0` 处定义为 `f_{X,Y}(x,y)/f_Y(y)`                      |

只有绝对连续分布才必然具有密度。此时 `F_X'=f_X` 几乎处处；若 `f_X` 在某点连续，则该点导数等于密度。密度值不是点概率，并带有“随机变量单位的倒数”这一量纲；CDF、PMF 和事件概率无量纲。混合分布可能同时有 CDF 跳跃和连续部分，不能强迫使用单一 PMF 或单一普通密度。

常用分布参数化固定为：

- `\operatorname{Bernoulli}(p)`；
- `\operatorname{Bin}(n,p)`；
- `\operatorname{Pois}(\lambda)`；
- `\operatorname{Unif}(a,b)`；
- `\operatorname{Exp}(\lambda)`，其中 `\lambda` 是率参数，均值为 `1/\lambda`；
- `\mathcal N(\mu,\sigma^2)`，第二个参数是方差，不是标准差。

一维变量变换优先用 CDF 或原像法。密度换元只有在变换分段一一、导数适用且列出目标值的全部逆像分支时，才能把各分支的 `f_X(x_i)/|g'(x_i)|` 相加。

## 期望、方差与单位

期望统一记为 `\mathbb E[X]`。一般只有 `\mathbb E[|X|]<\infty` 时才把 `\mathbb E[X]` 当作有限实数使用；连续情形的正负部分不能用两个发散积分相减。函数期望按 LOTUS 计算：

$$
\mathbb E[g(X)]=\int g\,\mathrm d\mathbb P_X,
$$

离散时为求和，绝对连续时为对 `g(x)f_X(x)` 积分。方差、标准差、协方差与相关系数固定为

$$
\operatorname{Var}(X)=\mathbb E[(X-\mu_X)^2],\qquad
\sigma_X=\sqrt{\operatorname{Var}(X)},
$$

$$
\operatorname{Cov}(X,Y)=\mathbb E[(X-\mu_X)(Y-\mu_Y)],
\qquad
\rho_{X,Y}=\frac{\operatorname{Cov}(X,Y)}{\sigma_X\sigma_Y}.
$$

相关系数只在两个标准差都正且有限时定义。若 `X` 的单位为 `u`、`Y` 的单位为 `v`，则期望和标准差分别带 `u`、`v`，方差带 `u^2`，协方差带 `uv`，相关系数无量纲。协方差为零通常不推出独立；独立加有限二阶矩才推出零协方差。

随机向量的协方差矩阵记为 `\Sigma=\operatorname{Cov}(\mathbf X)`。它必须对称半正定，二次型 `\mathbf a^{\mathsf T}\Sigma\mathbf a` 等于 `\operatorname{Var}(\mathbf a^{\mathsf T}\mathbf X)`，因而不能为负。

条件期望 `\mathbb E[X\mid Y]` 是 `Y` 的函数且仍为随机变量。塔式法则和全方差公式写为

$$
\mathbb E\!\left[\mathbb E[X\mid Y]\right]=\mathbb E[X],
$$

$$
\operatorname{Var}(X)=
\mathbb E[\operatorname{Var}(X\mid Y)]
+\operatorname{Var}(\mathbb E[X\mid Y]).
$$

## 样本平均与收敛

独立同分布样本写作 `X_1,\ldots,X_n`，部分和与样本平均为

$$
S_n=\sum_{i=1}^n X_i,qquad \overline X_n=\frac{S_n}{n}.
$$

| 记号                              | 含义         |
| --------------------------------- | ------------ |
| `X_n\xrightarrow{\mathbb P}X`     | 依概率收敛   |
| `X_n\xrightarrow{\mathrm{a.s.}}X` | 几乎处处收敛 |
| `X_n\xrightarrow{d}X`             | 依分布收敛   |

正文不把三种收敛互换。几乎处处收敛推出依概率收敛，依概率收敛推出依分布收敛；一般逆命题不成立。

- 弱大数定律的常用有限方差版本：若 `X_i` 独立同分布，均值 `\mu`、方差 `\sigma^2<\infty`，则 `\overline X_n\xrightarrow{\mathbb P}\mu`。
- 强大数定律的经典独立同分布版本：若 `\mathbb E|X_1|<\infty`，则 `\overline X_n\xrightarrow{\mathrm{a.s.}}\mu`。
- 经典中心极限定理：若 `X_i` 独立同分布，`\mathbb E[X_i]=\mu` 且 `0<\sigma^2<\infty`，则

$$
\frac{S_n-n\mu}{\sigma\sqrt n}
=\frac{\sqrt n(\overline X_n-\mu)}{\sigma}
\xrightarrow{d}\mathcal N(0,1).
$$

CLT 是分布收敛，不表示一条样本轨迹趋向钟形，也不承诺任意有限 `n` 的尾概率都准确。离散分布做正态近似时应考虑连续性校正，并报告 `np`、`n(1-p)` 或尾部/偏斜等适用性诊断。

## 例题、练习与数值核验

- 每章至少给出两个完整数值例题，明确样本空间、事件/随机变量、参数、单位和独立性假设。
- 组合概率必须分别核对“总数、事件数、等可能性”；Bayes 计算必须用全概率重新核对分母。
- PMF 核对非负与和为一，PDF 核对非负与积分为一，CDF 核对单调性、右连续性和两端极限。
- 期望、方差和协方差至少用定义式与一个独立恒等式交叉复算；概率数值必须落在 `[0,1]`。
- 正态近似同时报告精确值（可计算时）、近似值、绝对误差和适用条件；不能只凭图形接近就宣称定理成立。
- 每道练习含 `topic`、`difficulty`、`hint` 和紧邻的 `Solution`；答案保留可复算步骤，不只给末尾数字。
- `publicationStatus: published` 只在六章正文、锚点、资源、科学测试、链接、浏览器和构建门禁全部通过后保留；`humanReviewer` 始终保持 `null`，除非真实人工审阅已经发生并留下证据。
