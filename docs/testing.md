# 测试与验证

请使用仓库声明的 pnpm 版本，并先完成 `pnpm install --frozen-lockfile`。

## 常规检查

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:architecture
pnpm validate:registry
pnpm validate:content
pnpm validate:publication
pnpm validate:anchors
pnpm validate:math
pnpm check:links
pnpm analyze
pnpm build
```

单元与组件测试通过 Vitest 执行，脚本测试使用 Node 测试运行器。数学模型应检查可复算结果、边界、单位、确定性与取消行为。Schema 变化必须保留迁移测试。

`check:links` 校验内容链接、资源标识和引用结构，不等于逐一发起外网请求。人工核对资源时，还需确认来源页面及其支持的具体主张。

## 浏览器与无障碍

```bash
pnpm --filter @one-forth/web exec playwright install chromium
pnpm test:e2e
pnpm test:a11y
pnpm test:scientific
```

Playwright 默认启动本地开发服务器。指定 `PLAYWRIGHT_BASE_URL` 可以检查已启动的本地实例；请确认目标是当前待验证代码。自动无障碍扫描不能替代键盘、读屏与真实缩放检查。

## 视觉检查

```bash
pnpm test:visual
```

视觉用例覆盖 390、768、1440 CSS 像素视口。截图比较依赖操作系统、字体、浏览器版本和设备缩放；请在相同环境下生成与比较基线。

首次运行视觉回归前，需要为当前运行环境建立截图基线。截图配置应使用项目名称及示例联系地址，避免包含个人资料：

```bash
pnpm test:visual --update-snapshots
```

逐张审阅生成的截图，确认正确后再提交。更新截图不会修复用例中的布局断言；测试失败时，应先核对实现与断言。Linux CI 运行浏览器行为测试，不把本地截图直接用于跨平台视觉比较。

## 结果与隐私

提交说明中列出真实执行的命令、结果、未运行项目及原因。记录新的失败，不用旧日志替代当前验证。

`reports/`、浏览器报告、trace、视频与构建缓存是本地输出，不应直接作为源码提交。公开截图、测试附件和日志前，检查账户、联系信息、文件路径及其他个人资料。
