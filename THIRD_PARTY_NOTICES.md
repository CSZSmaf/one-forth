# 第三方资源与归属

本项目使用的依赖、字体、图标及转载材料保留各自的版权和许可。根目录的 MIT 许可与原创教材的 CC BY-SA 4.0 不覆盖第三方材料。

## 论文图

图片位于 `apps/web/public/paper-figures/`。对应署名、原文链接、图号、裁剪说明和许可元数据见 [`packages/content/src/paper-figures.ts`](packages/content/src/paper-figures.ts)，页面通过同一数据展示来源。

| 文件                     | 来源与处理                                                                                                | 许可或转载条件                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `paper-transformer.webp` | Vaswani 等，_Attention Is All You Need_，图 1，裁自论文                                                   | [论文 v7 的图表转载声明](https://arxiv.org/html/1706.03762v7)：正确署名后，仅限新闻报道或学术作品中转载；不适用本项目的 CC BY-SA |
| `paper-retro.webp`       | Borgeaud 等，_Improving language models by retrieving from trillions of tokens_，图 2，裁自论文           | [论文](https://arxiv.org/abs/2112.04426v3)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                            |
| `paper-convnext.webp`    | Liu 等，_A ConvNet for the 2020s_，图 4，裁出 ResNet 与 ConvNeXt 子图                                     | [论文](https://arxiv.org/abs/2201.03545)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                              |
| `paper-dit.webp`         | Peebles 与 Xie，_Scalable Diffusion Models with Transformers_，图 3，裁出主体与 adaLN-Zero 子图           | [论文](https://arxiv.org/abs/2212.09748)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)                              |
| `paper-mpnn.webp`        | Gilmer 等，_Neural Message Passing for Quantum Chemistry_，图 1，裁自论文                                 | [PMLR 原文](https://proceedings.mlr.press/v70/gilmer17a.html)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)         |
| `paper-deit.webp`        | Touvron 等，_Training data-efficient image transformers & distillation through attention_，图 2，裁自论文 | [PMLR 原文](https://proceedings.mlr.press/v139/touvron21a.html)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)       |

核对日期：2026-11-04。再利用第三方图片时，应逐项遵守上表所链接的条件。

RETRO、ConvNeXt 与 DiT 的 arXiv 条目链接到 CC BY 4.0；MPNN 与 DeiT 采用 PMLR 版本及其 [出版协议](https://proceedings.mlr.press/pmlr-license-agreement.pdf) 中的 CC BY 4.0 条件，不将 arXiv 的非独占发布许可当作转载授权。

## 软件依赖与类型声明

依赖版本由 `pnpm-lock.yaml` 固定。安装后的各依赖包保留自身的 LICENSE/NOTICE；分发依赖或构建产物时，应继续携带适用的许可与声明。

`apps/edge-proxy/worker-configuration.d.ts` 包含 Cloudflare 与 Microsoft 的生成运行时类型，保留文件中的 Apache-2.0 及其他上游版权声明。

数学公式由 [KaTeX](https://github.com/KaTeX/KaTeX) 渲染，界面图标使用 [Lucide](https://github.com/lucide-icons/lucide)。其字体、代码与图标分别遵循对应包内的许可文件。

## 项目标识与截图

`apps/web/public/projects/` 中的标识属于相应项目，仅用于识别项目，不表示这些项目或论文作者为 One Forth 背书。截图中的原创教材适用内容许可，第三方材料仍适用各自条件。
