# 参与 One Forth

欢迎帮助我们把教材写得更准确、更清楚。纠正一个符号、补充一道例题、修复一次键盘操作，都可以成为有用的贡献。

## 报告问题

请通过 [Issues](https://github.com/CSZSmaf/one-forth/issues) 提交问题，附上章节或实验链接、具体位置、问题描述和可核查的依据。界面问题请补充浏览器、视口尺寸及复现步骤。

截图请避开姓名、邮箱、通知、浏览器账户及其他个人信息；不要提交访问凭据、私人对话或服务器日志。

## 修改内容

教材正文位于 `content/zh-CN/`。先阅读 [内容指南](docs/content-guide.md) 和 [出版规则](docs/publication-policy.md)。

1. Fork 仓库，为一个明确的问题创建分支。
2. 修改原始 MDX、内容数据或程序，不手动维护生成文件。
3. 核对定义的假设、符号、单位、推导、答案和引用。论文与教材引用使用第一方来源。
4. 执行 `pnpm generate:content`，再运行与改动匹配的检查。
5. 提交 PR，说明问题、改动与实际执行的验证。界面变化附对应截图。

自动检查不能替代人工内容审阅。没有真实审阅记录时，不将内容标记为 `reviewed` 或 `verified`；交互演示也不能替代证明。

## 修改程序与实验

请阅读 [架构说明](docs/architecture.md)、[可视化指南](docs/visualization-guide.md) 和 [测试说明](docs/testing.md)。

- 新增学科、内容类型或实验通过注册表接入，保持 Concept ID 与语言路径分离。
- 数学和物理模型保持纯计算；状态、渲染、控件与无障碍描述分离。
- 随机过程支持固定种子；校验 URL 状态；清理 Worker、监听器和动画资源。
- 为控件提供键盘操作、明确单位和文本替代，检查手机视口与深浅主题。
- 注释说明算法、接口契约和非显然的边界条件；不写任务过程、提示词、私人对话或无关的开发记录。

常用检查：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:architecture
pnpm validate:registry
pnpm validate:content
pnpm check:links
pnpm build
```

涉及浏览器行为时运行 `pnpm test:e2e`；涉及数学实验时补跑 `pnpm test:scientific`。视觉基线与完整命令见 [测试说明](docs/testing.md)。请如实列出失败或未运行的项目。

## 许可

贡献的程序代码采用 [MIT](LICENSE)，原创教材采用 [CC BY-SA 4.0](CONTENT-LICENSE.md)。请确认你有权以对应许可提交材料；第三方内容必须保留来源和许可，不能把受限制材料改标为项目许可。详见 [第三方资源说明](THIRD_PARTY_NOTICES.md)。
