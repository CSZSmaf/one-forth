import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const serverBundleBudgetBytes = 58_000_000;

interface BundleFile {
  readonly path: string;
  readonly bytes: number;
}

async function collectFiles(directory: string): Promise<BundleFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: BundleFile[] = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push({ path, bytes: (await stat(path)).size });
    }
  }

  return files;
}

const serverDirectory = resolve(process.cwd(), "dist", "server");
const files = await collectFiles(serverDirectory);
const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
const largest = files.reduce((current, file) => (file.bytes > current.bytes ? file : current));
const summary = {
  status: bytes <= serverBundleBudgetBytes ? "pass" : "fail",
  files: files.length,
  bytes,
  budgetBytes: serverBundleBudgetBytes,
  headroomBytes: serverBundleBudgetBytes - bytes,
  largestFile: {
    path: largest.path.slice(serverDirectory.length + 1).replaceAll("\\", "/"),
    bytes: largest.bytes,
  },
};

console.log(`Worker server bundle: ${JSON.stringify(summary)}`);

if (summary.status === "fail") {
  throw new Error(
    `Worker server bundle is ${bytes.toLocaleString()} bytes, above the ${serverBundleBudgetBytes.toLocaleString()}-byte release budget.`,
  );
}
