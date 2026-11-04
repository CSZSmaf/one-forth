# M07 离散数学全册约定

## 教材位置与发布边界

- 教材：M07《离散数学、组合与图论》
- 实质先修：M00 中的集合、逻辑、证明策略与数学归纳法
- 生产批次：六章作为同一整册完成、校验和发布，不拆分公开
- 公开状态：六章同时达到发布门槛后设为 `published`
- 审阅状态：自动复算不替代人工审阅；没有人工审阅记录时，`humanReviewer` 保持 `null`
- 下一隐藏边界：M08《常微分方程与动力系统》

## 对象与符号

| 对象                 | 约定                         | 边界                                 |
| -------------------- | ---------------------------- | ------------------------------------ | ------ | ---------------------- | --- | ---------------- |
| 有限集合大小         | `                            | A                                    | `      | 与绝对值由对象类型区分 |
| 组合数               | `\binom{n}{k}`               | 整数 `k<0` 或 `k>n` 时记为零         |
| 递推序列             | `a_n`                        | 初值和递推适用起点必须同时给出       |
| 普通生成函数         | `A(x)=\sum_{n\ge 0}a_nx^n`   | 作为形式幂级数时不要求解析收敛       |
| 系数提取             | `[x^n]A(x)`                  | 首次使用时说明表示 `x^n` 的系数      |
| 有限简单无向图       | `G=(V,E)`                    | 除非另行说明，不含环和重边           |
| 顶点数与边数         | `n=                          | V                                    | `、`m= | E                      | `   | 不与序列下标混用 |
| 顶点度               | `d_G(v)`                     | 最大度写作 `\Delta(G)`               |
| 图距离               | `\operatorname{dist}_G(u,v)` | 无权图按边数；带权图按权重和         |
| 匹配、点覆盖、边覆盖 | `\nu(G),\tau(G),\rho(G)`     | 边覆盖恒等式须排除孤立点             |
| 色数与团数           | `\chi(G),\omega(G)`          | 一般只有 `\omega(G)\le\chi(G)`       |
| 偏序                 | `x\preceq y`                 | 与普通数值不等式分开解释             |
| meet 与 join         | `x\wedge y`、`x\vee y`       | 本章表示格运算，不默认表示逻辑联结词 |
| 偏序 Möbius 函数     | `\mu(x,y)`                   | 只在局部有限偏序上使用               |
| 偏序区间             | `[x,y]`                      | 表示 `{z:x\preceq z\preceq y}`       |
| 布尔代数边界元       | `0,1`                        | 表示最小元和最大元，不默认是普通数值 |

## 全册数学边界

1. 计数先固定结果粒度，再决定顺序、重复和等价关系；不得在同一比值中混用有序与无序对象。
2. 广义鸽巢结论使用上取整：把 `N` 个对象放入 `k` 个盒子，至少一盒含 `\lceil N/k\rceil` 个对象。
3. 常系数线性递推的重特征根必须带多项式因子；非齐次特解与齐次解分开核验。
4. `walk`、`trail`、`path`、`cycle` 分别译作游走、迹、路、圈，并按顶点与边能否重复定义。
5. Dijkstra 只用于边权非负的情形；负权边需要其他算法与额外条件，本册不把两者混写。
6. `maximal` 与 `maximum` 分别译作极大与最大；局部不可扩张不等于全局基数最大。
7. Hall 条件与 Kőnig 的匹配—点覆盖等式只在二部图条件下陈述。
8. 不是每个偏序都是格，也不是每个格都是布尔代数；每次升级结构都逐项检查新增公理。
9. Möbius 反演必须写出局部有限条件和求和区间，避免把有限和公式无条件推广。
10. DAG 的可达关系在加入自反闭包后形成偏序；无向图可达性形成等价关系，二者不混同。

## 来源核验

以下资源在 `packages/content/src/index.ts` 记录元数据、官方链接、主题范围与
`verifiedAt: 2026-07-13`：

- MIT OpenCourseWare 6.042J Mathematics for Computer Science：
  <https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/>
- Oscar Levin, _Discrete Mathematics: An Open Introduction, Fourth Edition_：
  <https://discrete.openmathbooks.org/dmoi4.html>
- Al Doerr 与 Ken Levasseur, _Applied Discrete Structures_：
  <https://runestone.academy/ns/books/published/ads/adsindex.html>
- Richard Hammack, _Book of Proof, Third Edition_：
  <https://richardhammack.github.io/BookOfProof/index.html>

正文须独立给出定义、推导与算例；资源卡只承担来源追溯和继续学习，不替代证明。

## 自动复算策略

- 组合数与容斥：生产函数使用 `@one-forth/math-core` 的精确 `bigint` 组合数；小规模结论另用子集或排列枚举作 oracle。
- 递推：逐项生成数列，再与闭式和生成函数系数分别比较。
- 图：以有限邻接表枚举度数、连通分量、简单路、匹配、点覆盖与着色。
- 偏序：显式生成关系闭包、上下界、meet/join 表和有限 Möbius 值。
- 综合章：对同一小型调度实例分别枚举拓扑序、最大匹配、最少颜色和布尔筛选结果。

每个正文中的关键数值至少由一种与正文推导不同的计算路径复核。测试结果记录为自动数学与数值检查，不写成“人工审阅”。
