import { mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";

// Keep the build manifest for local tooling without publishing dependency paths.
const buildDirectory = resolve(process.cwd(), "dist");
await mkdir(resolve(buildDirectory, "private"), { recursive: true });
await rename(
  resolve(buildDirectory, "client", ".vite", "manifest.json"),
  resolve(buildDirectory, "private", "client-manifest.json"),
);
