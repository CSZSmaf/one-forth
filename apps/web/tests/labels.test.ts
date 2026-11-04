import { describe, expect, it } from "vitest";
import {
  resolveConceptLabel,
  resolveContentKindLabel,
  resolveDomainLabel,
  resolvePathLabel,
  resolveRelationLabel,
  resolveResourceMetadataFieldStatusLabel,
  resolveResourceMetadataSummaryLabel,
  resolveSubjectLabel,
  resolveSymbolNamespaceLabel,
  resolveUnitLabel,
} from "@/lib/labels";

describe("localized visible labels", () => {
  it("resolves registry and catalog identifiers without exposing slugs", () => {
    expect(resolveConceptLabel("linear-transformation", "zh-CN")).toBe("线性变换");
    expect(resolveDomainLabel("machine-learning", "zh-CN")).toBe("机器学习");
    expect(resolveSubjectLabel("learning-theory", "zh-CN")).toBe("学习基础");
    expect(resolvePathLabel("mathematics-for-machine-learning", "zh-CN")).toBe("机器学习数学基础");
    expect(resolveRelationLabel("applied-to", "zh-CN")).toBe("应用于");
    expect(resolveRelationLabel("used-in", "zh-CN")).toBe("应用于");
    expect(resolveUnitLabel("metre-per-second", "zh-CN")).toBe("米每秒（m·s⁻¹）");
  });

  it("distinguishes unavailable resource metadata from true non-applicability", () => {
    expect(resolveResourceMetadataFieldStatusLabel("complete", "zh-CN")).toBe("已提供");
    expect(resolveResourceMetadataFieldStatusLabel("unavailable", "zh-CN")).toBe("暂无可核实信息");
    expect(resolveResourceMetadataFieldStatusLabel("not-applicable", "zh-CN")).toBe("不适用");
    expect(resolveResourceMetadataSummaryLabel("unavailable", "zh-CN")).toBe("存在暂无可核实字段");
    expect(resolveResourceMetadataSummaryLabel("not-applicable", "zh-CN")).toBe("部分字段不适用");
  });

  it("returns localized unknown labels instead of echoing an unrecognized id", () => {
    const unknownId = "internal-value-that-must-not-leak";
    const labels = [
      resolveConceptLabel(unknownId, "zh-CN"),
      resolveDomainLabel(unknownId, "zh-CN"),
      resolveSubjectLabel(unknownId, "zh-CN"),
      resolvePathLabel(unknownId, "zh-CN"),
      resolveRelationLabel(unknownId, "zh-CN"),
      resolveContentKindLabel(unknownId, "zh-CN"),
      resolveSymbolNamespaceLabel(unknownId, "zh-CN"),
      resolveUnitLabel(unknownId, "zh-CN"),
    ];
    expect(labels).not.toContain(unknownId);
    expect(labels.every((label) => label.length > 0)).toBe(true);
  });
});
