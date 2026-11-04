"use client";

import { useState } from "react";

export function CopyTextButton({
  value,
  label,
  copiedLabel,
  failureLabel,
}: {
  readonly value: string;
  readonly label: string;
  readonly copiedLabel: string;
  readonly failureLabel: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return (
    <span className="copy-text">
      <button type="button" onClick={() => void copy()}>
        {label}
      </button>
      <span role="status">
        {state === "copied" ? copiedLabel : state === "failed" ? failureLabel : ""}
      </span>
      {state === "failed" ? <code tabIndex={0}>{value}</code> : null}
    </span>
  );
}
