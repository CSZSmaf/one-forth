"""Generate deterministic pixel-difference evidence for Round 3 screenshots."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import TypedDict

from PIL import Image, ImageChops, ImageEnhance, ImageOps


class DiffRecord(TypedDict):
    path: str
    width: int
    height: int
    changedPixels: int
    changedRatio: float
    meanAbsoluteDelta: float
    diffPath: str
    beforeWidth: int
    beforeHeight: int
    afterWidth: int
    afterHeight: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare matching PNG screenshots and write heat-map evidence."
    )
    parser.add_argument(
        "--before",
        default="reports/round-3/baseline/screenshots/local",
        help="Directory containing the baseline PNG tree.",
    )
    parser.add_argument(
        "--after",
        default="reports/round-3/after/screenshots/local",
        help="Directory containing the revised PNG tree.",
    )
    parser.add_argument(
        "--output",
        default="reports/round-3/after/visual-diffs",
        help="Directory for diff PNGs and summary files.",
    )
    return parser.parse_args()


def compare(before_path: Path, after_path: Path, diff_path: Path) -> DiffRecord:
    with Image.open(before_path) as before_source, Image.open(after_path) as after_source:
        before = before_source.convert("RGBA")
        after = after_source.convert("RGBA")

    before_width, before_height = before.size
    after_width, after_height = after.size
    if before.size != after.size:
        canvas_size = (max(before_width, after_width), max(before_height, after_height))
        before_fill = before.getpixel((0, max(0, before_height - 1)))
        after_fill = after.getpixel((0, max(0, after_height - 1)))
        before_canvas = Image.new("RGBA", canvas_size, before_fill)
        after_canvas = Image.new("RGBA", canvas_size, after_fill)
        before_canvas.paste(before, (0, 0))
        after_canvas.paste(after, (0, 0))
        before = before_canvas
        after = after_canvas

    delta = ImageChops.difference(before, after).convert("RGB")
    changed_mask = delta.convert("L").point(lambda value: 255 if value else 0)
    histogram = changed_mask.histogram()
    changed_pixels = histogram[255]
    pixel_count = before.width * before.height

    delta_histogram = delta.histogram()
    absolute_total = sum(
        value * count for channel in range(3) for value, count in enumerate(
            delta_histogram[channel * 256 : (channel + 1) * 256]
        )
    )
    mean_absolute_delta = absolute_total / (pixel_count * 3)

    base = ImageEnhance.Contrast(ImageOps.grayscale(after)).enhance(0.35).convert("RGBA")
    base.putalpha(105)
    heat = Image.new("RGBA", after.size, (220, 38, 127, 0))
    heat.putalpha(changed_mask)
    evidence = Image.alpha_composite(base, heat)

    diff_path.parent.mkdir(parents=True, exist_ok=True)
    evidence.save(diff_path, optimize=True)

    return {
        "path": before_path.as_posix(),
        "width": before.width,
        "height": before.height,
        "changedPixels": changed_pixels,
        "changedRatio": changed_pixels / pixel_count,
        "meanAbsoluteDelta": mean_absolute_delta,
        "diffPath": diff_path.as_posix(),
        "beforeWidth": before_width,
        "beforeHeight": before_height,
        "afterWidth": after_width,
        "afterHeight": after_height,
    }


def write_markdown(output: Path, records: list[DiffRecord], missing: list[str]) -> None:
    changed = sum(1 for record in records if record["changedPixels"] > 0)
    lines = [
        "# 第三轮视觉差异摘要",
        "",
        f"- 已比较：{len(records)} 张",
        f"- 存在像素变化：{changed} 张",
        f"- 修改后缺失：{len(missing)} 张",
        "- 差异图：洋红色表示发生变化的像素；灰色底图仅用于定位。",
        "",
        "| 截图 | 原始尺寸 → 修改后尺寸 | 变化像素 | 变化比例 | 平均绝对通道差 | 差异图 |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]
    for record in records:
        relative_name = Path(record["path"]).name
        diff_link = record["diffPath"]
        lines.append(
            f"| {relative_name} | {record['beforeWidth']}×{record['beforeHeight']} → "
            f"{record['afterWidth']}×{record['afterHeight']} | {record['changedPixels']:,} | "
            f"{record['changedRatio']:.4%} | {record['meanAbsoluteDelta']:.3f} | "
            f"[{diff_link}]({diff_link}) |"
        )

    if missing:
        lines.extend(["", "## 缺失截图", ""])
        lines.extend(f"- `{path}`" for path in missing)

    (output / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    before_root = Path(args.before).resolve()
    after_root = Path(args.after).resolve()
    output_root = Path(args.output).resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    records: list[DiffRecord] = []
    missing: list[str] = []
    for before_path in sorted(before_root.rglob("*.png")):
        relative = before_path.relative_to(before_root)
        after_path = after_root / relative
        if not after_path.is_file():
            missing.append(relative.as_posix())
            continue
        diff_path = output_root / relative
        record = compare(before_path, after_path, diff_path)
        record["path"] = relative.as_posix()
        record["diffPath"] = diff_path.relative_to(output_root).as_posix()
        records.append(record)

    summary = {
        "before": before_root.as_posix(),
        "after": after_root.as_posix(),
        "compared": len(records),
        "changed": sum(1 for record in records if record["changedPixels"] > 0),
        "missing": missing,
        "records": records,
    }
    (output_root / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_markdown(output_root, records, missing)

    if missing:
        raise SystemExit(f"visual diff incomplete: {len(missing)} revised screenshots missing")
    print(f"Visual diff complete: {len(records)} compared, {summary['changed']} changed")


if __name__ == "__main__":
    main()
