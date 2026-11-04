"use client";

import { Check, Copy, Play, Square } from "lucide-react";
import { useRef, useState } from "react";

interface CodeCellProps {
  readonly language?: "javascript" | "python" | string;
  readonly code?: string;
  readonly children?: string;
  readonly runnable?: boolean;
}

export function CodeCell({
  language = "javascript",
  code,
  children,
  runnable = false,
}: CodeCellProps) {
  const source = code ?? children ?? "";
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const workerRef = useRef<Worker | null>(null);

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function run(): void {
    if (!runnable || language !== "javascript") return;
    workerRef.current?.terminate();
    setStatus("running");
    setOutput("");
    const workerSource = `self.onmessage = (event) => {
      const logs = [];
      const console = { log: (...values) => logs.push(values.map(String).join(" ")) };
      try {
        const value = Function("console", "'use strict';\\n" + event.data)(console);
        self.postMessage({ ok: true, output: logs.concat(value === undefined ? [] : [String(value)]).slice(0, 50).join("\\n") });
      } catch (error) { self.postMessage({ ok: false, output: error instanceof Error ? error.message : String(error) }); }
    };`;
    const url = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
    const worker = new Worker(url);
    workerRef.current = worker;
    const timeout = window.setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      setOutput("运行超时（2 秒）");
      setStatus("error");
    }, 2000);
    worker.onmessage = (event: MessageEvent<unknown>) => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(url);
      const data = event.data;
      if (typeof data === "object" && data !== null && "ok" in data && "output" in data) {
        const result = data as { readonly ok: boolean; readonly output: unknown };
        setOutput(String(result.output).slice(0, 4000));
        setStatus(result.ok ? "complete" : "error");
      }
    };
    worker.postMessage(source);
  }

  return (
    <figure className="code-cell">
      <figcaption>
        <span>{language}</span>
        <div>
          <button type="button" onClick={() => void copy()}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "已复制" : "复制"}
          </button>
          {runnable && language === "javascript" ? (
            <button
              type="button"
              onClick={status === "running" ? () => workerRef.current?.terminate() : run}
            >
              {status === "running" ? <Square size={13} /> : <Play size={14} />}
              {status === "running" ? "停止" : "运行"}
            </button>
          ) : null}
        </div>
      </figcaption>
      <pre>
        <code>{source}</code>
      </pre>
      {output || status === "running" ? (
        <div className="code-cell__output" aria-live="polite">
          <span>输出 · {status}</span>
          <pre>{status === "running" ? "正在隔离 Worker 中运行…" : output || "（无输出）"}</pre>
        </div>
      ) : null}
    </figure>
  );
}
