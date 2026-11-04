"use client";

import { useCallback } from "react";
import type { RefObject } from "react";
import type { VisualizationExportHandlers } from "./types";

const svgNamespace = "http://www.w3.org/2000/svg";

function cloneWithComputedStyles(svg: SVGSVGElement): SVGSVGElement {
  const clonedNode = svg.cloneNode(true);
  if (!(clonedNode instanceof SVGSVGElement)) throw new Error("无法复制 SVG 画布。");
  clonedNode.setAttribute("xmlns", svgNamespace);
  const sources = [svg, ...svg.querySelectorAll<SVGElement>("*")];
  const targets = [clonedNode, ...clonedNode.querySelectorAll<SVGElement>("*")];
  sources.forEach((source, index) => {
    const target = targets[index];
    if (!target) return;
    if (source.parentElement?.closest("foreignObject")) return;
    const style = window.getComputedStyle(source);
    target.style.fill = style.fill;
    target.style.fillOpacity = style.fillOpacity;
    target.style.stroke = style.stroke;
    target.style.strokeOpacity = style.strokeOpacity;
    target.style.strokeWidth = style.strokeWidth;
    target.style.strokeDasharray = style.strokeDasharray;
    target.style.strokeDashoffset = style.strokeDashoffset;
    target.style.strokeLinecap = style.strokeLinecap;
    target.style.strokeLinejoin = style.strokeLinejoin;
    target.style.opacity = style.opacity;
    target.style.fontFamily = style.fontFamily;
    target.style.fontSize = style.fontSize;
    target.style.fontWeight = style.fontWeight;
  });
  // Image decoders do not consistently support HTML and fonts inside foreignObject.
  // Preserve each equation's explicit text equivalent in standalone SVG/PNG exports.
  clonedNode
    .querySelectorAll<SVGForeignObjectElement>("foreignObject[data-math-export-label]")
    .forEach((formula) => {
      const label = document.createElementNS(svgNamespace, "text");
      const centered = formula.dataset.mathExportAlign === "center";
      const right = formula.dataset.mathExportAlign === "right";
      const x =
        Number(formula.getAttribute("x")) +
        Number(formula.getAttribute("width")) * (centered ? 0.5 : right ? 1 : 0);
      const fontSize = Number(formula.dataset.mathExportSize ?? 14);
      label.setAttribute("x", String(x));
      label.setAttribute("y", String(Number(formula.getAttribute("y")) + fontSize + 3));
      label.setAttribute("text-anchor", centered ? "middle" : right ? "end" : "start");
      label.style.cssText = formula.style.cssText;
      label.style.fontSize = `${fontSize}px`;
      label.style.fontFamily = "serif";
      label.style.fill = window.getComputedStyle(svg).color;
      label.textContent = formula.dataset.mathExportLabel ?? "";
      formula.replaceWith(label);
    });
  return clonedNode;
}

export function serializeSvg(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(cloneWithComputedStyles(svg));
}

export function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  const serialized = serializeSvg(svg);
  const viewBox = svg.viewBox.baseVal;
  const width = Math.max(1, Math.round(viewBox.width || svg.clientWidth || 960));
  const height = Math.max(1, Math.round(viewBox.height || svg.clientHeight || 540));
  const source = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const sourceUrl = URL.createObjectURL(source);
  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error("浏览器无法创建 PNG 画布。"));
        return;
      }
      context.scale(2, 2);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(sourceUrl);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG 导出失败。"));
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("SVG 无法转换为 PNG。"));
    };
    image.src = sourceUrl;
  });
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 导出失败。"));
    }, "image/png");
  });
}

export function useSvgExportHandlers(
  svgRef: RefObject<SVGSVGElement | null>,
): VisualizationExportHandlers {
  const toSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) throw new Error("SVG 画布尚未就绪。");
    return serializeSvg(svg);
  }, [svgRef]);
  const toPng = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) throw new Error("SVG 画布尚未就绪。");
    return svgToPng(svg);
  }, [svgRef]);
  return { toSvg, toPng };
}
