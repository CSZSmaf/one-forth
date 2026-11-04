# 构建与托管

公开 GitHub 仓库提供 One Forth 的源码、教材和构建工具。正式网站的托管配置单独维护；运行或部署自己的实例不需要访问正式网站的托管账户。

## 本地构建

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @one-forth/web exec wrangler dev --config dist/server/wrangler.json --local
```

Web 构建由 Vinext、Vite 与 Cloudflare 运行时适配完成，产物位于 `apps/web/dist/`。上述预览命令使用该构建的 Worker 配置，访问地址由 Wrangler 输出。本地开发和构建无需登录托管平台。

公共配置中的作者资料和联系地址是示例值，可在 `packages/config/src/index.ts` 中统一设置。品牌、URL 与 canonical 同样由该配置入口管理。正式 One Forth 网站使用集中定义的 canonical origin。

## 独立部署

部署自己的实例时，需要建立自己的托管项目、访问权限和域名配置。将构建产物发布到支持 Cloudflare Worker ESM 的目标，并按目标平台的流程配置静态资源绑定与域名。

`apps/edge-proxy` 提供固定源站的只读代理实现。其配置使用示例上游且不绑定域名，运行前须填写自己的上游；它不参与本地教材浏览。

GitHub Actions 只运行质量检查，不包含生产部署凭据。完整应用需要 Worker 运行时。
