import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import mdx from "@mdx-js/rollup";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";

const usePolling = process.env.VITE_USE_POLLING === "true";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
};

export default defineConfig(() => {
  // Store runtime-tool state inside the project.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  return {
    ...(usePolling ? { server: { watch: { useFsEvents: false, usePolling: true } } } : {}),
    // Minify server modules to limit Worker bundle size.
    environments: {
      rsc: {
        build: {
          minify: "oxc" as const,
        },
      },
    },
    plugins: [
      mdx({
        remarkPlugins: [remarkFrontmatter, remarkGfm, remarkMath],
        // Keep TeX source compact in the Worker bundle. Public formulas are
        // rendered through the shared StaticMath component at request time.
        rehypePlugins: [rehypeSlug],
      }),
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
