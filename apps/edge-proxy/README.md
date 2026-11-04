# One Forth edge proxy

This Worker is the read-only public entry for One Forth. A configured `PRIMARY_ORIGIN` service binding serves global traffic from the application Worker. The regional binding serves the mainland entry. Without a primary binding, the fixed `ORIGIN_URL` remains the HTTP origin.

## Safety boundary

- The origin is fixed by the deployment configuration; callers cannot choose a service or destination. `ORIGIN_URL` supplies the internal request base even when a service binding handles the request.
- Read current Cloudflare bindings before deployment. Preserve both `PRIMARY_ORIGIN` and `MAINLAND_ORIGIN` when publishing; the minimal repository configuration is used for dry runs.
- Only `GET` and `HEAD` reach the origin; the Worker is not a general-purpose proxy.
- Responses are streamed without buffering.
- Provider challenge cookies and Cloudflare hop headers are not exposed to readers.
- `www.one-forth.com` permanently redirects to the canonical apex while preserving path and query.
- Mainland China requests to the canonical apex temporarily redirect to `cn.one-forth.com` with the path and query preserved; the regional hostname serves directly and cannot redirect to itself.
- Geographic redirects are private and non-cacheable. The canonical origin remains `https://one-forth.com`.

## Commands

```bash
pnpm wrangler:types
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`build` is a Wrangler dry run and does not deploy. The checked-in configuration uses an example origin and has no domain routes. Configure your own origin and bindings before deployment, validate in a preview, and retain a rollback target. See [build and hosting](../../docs/deployment.md).
