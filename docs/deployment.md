# 构建与托管

One Forth 的公开网站使用 Sites 托管，通过 Cloudflare 提供自定义域名与访问入口。公开 GitHub 仓库用于源码、教材、协作和版本记录。

## 本地构建

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @one-forth/web exec wrangler dev --config dist/server/wrangler.json --local
```

Web 构建由 Vinext、Vite 与 Cloudflare 运行时适配完成，产物位于 `apps/web/dist/`。上述预览命令使用该构建的 Worker 配置，访问地址由 Wrangler 输出。源码中的 `.openai/hosting.json` 保留构建所需结构，不包含生产 Site ID；本地开发和构建无需登录 Sites 或 Cloudflare。

公共配置中的作者资料和联系地址是示例值，可在 `packages/config/src/index.ts` 中统一设置。品牌、URL 与 canonical 同样由该配置入口管理。正式 One Forth 网站使用集中定义的 canonical origin。

## 独立部署

部署自己的实例时，需要建立自己的托管项目、访问权限和域名配置，不能使用 One Forth 的生产绑定。将构建产物发布到支持 Cloudflare Worker ESM 的目标；若使用 Sites，按所用平台的当前流程生成自己的项目配置。

`apps/edge-proxy` 提供固定源站的只读代理实现。其配置使用示例上游且不绑定域名，运行前须填写自己的上游；它不参与本地教材浏览。

GitHub Actions 只运行质量检查，不包含生产部署凭据。GitHub Pages 保留网站访问入口；完整应用需要 Worker 运行时。
