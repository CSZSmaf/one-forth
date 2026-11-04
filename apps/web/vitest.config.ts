import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "react",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000/zh-CN",
      },
    },
    setupFiles: ["./tests/setup.ts"],
    include: [
      "./tests/**/*.test.{ts,tsx,mjs}",
      "./features/visualizations/science/**/*.test.{ts,tsx}",
    ],
    exclude: ["./tests/**/*.spec.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
