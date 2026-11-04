"""Compare a reviewed full-page baseline with a production viewport capture."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create same-viewport production pixel and side-by-side evidence."
    )
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--actual", required=True)
    parser.add_argument("--comparison", required=True)
    parser.add_argument("--json", required=True, dest="json_path")
    parser.add_argument("--markdown", required=True)
    parser.add_argument("--label", required=True)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def display_path(path: Path) -> str:
    try:
        return path.resolve().relative_to(Path.cwd().resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def main() -> None:
    args = parse_args()
    baseline_path = Path(args.baseline)
    actual_path = Path(args.actual)
    comparison_path = Path(args.comparison)
    json_path = Path(args.json_path)
    markdown_path = Path(args.markdown)

    with Image.open(baseline_path) as source:
        baseline = source.convert("RGB")
    with Image.open(actual_path) as source:
        actual = source.convert("RGB")

    if baseline.width != actual.width:
        raise SystemExit(
            f"Viewport widths differ: baseline={baseline.width}, actual={actual.width}."
        )
    if baseline.height < actual.height:
        raise SystemExit(
            f"Baseline height {baseline.height} is shorter than actual height {actual.height}."
        )

    region = baseline.crop((0, 0, actual.width, actual.height))
    delta = ImageChops.difference(region, actual)
    histogram = delta.histogram()
    pixels = actual.width * actual.height
    red, green, blue = delta.split()
    changed_mask = ImageChops.lighter(ImageChops.lighter(red, green), blue).point(
        lambda value: 255 if value else 0
    )
    changed_pixels = changed_mask.histogram()[255]
    absolute_total = sum(
        value * count
        for channel in range(3)
        for value, count in enumerate(histogram[channel * 256 : (channel + 1) * 256])
    )
    maximum_channel_delta = max(
        (value for value in range(256) if any(histogram[channel * 256 + value] for channel in range(3))),
        default=0,
    )
    bounding_box = delta.getbbox()

    header_height = 48
    combined = Image.new("RGB", (actual.width * 2, actual.height + header_height), "white")
    combined.paste(region, (0, header_height))
    combined.paste(actual, (actual.width, header_height))
    labels = ImageDraw.Draw(combined)
    labels.text((12, 14), f"{args.label} approved local baseline (same viewport)", fill="#333333")
    labels.text((actual.width + 12, 14), f"{args.label} production capture", fill="#333333")
    comparison_path.parent.mkdir(parents=True, exist_ok=True)
    combined.save(comparison_path, optimize=True)

    compared_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    report = {
        "schemaVersion": 1,
        "source": "production",
        "comparedAt": compared_at,
        "baseline": {
            "path": display_path(baseline_path),
            "width": baseline.width,
            "height": baseline.height,
            "sha256": sha256(baseline_path),
        },
        "actual": {
            "path": display_path(actual_path),
            "width": actual.width,
            "height": actual.height,
            "sha256": sha256(actual_path),
        },
        "comparison": {
            "path": display_path(comparison_path),
            "sha256": sha256(comparison_path),
        },
        "comparisonRegion": {
            "x": 0,
            "y": 0,
            "width": actual.width,
            "height": actual.height,
            "pixels": pixels,
        },
        "changedPixels": changed_pixels,
        "meanAbsoluteChannelDelta": absolute_total / (pixels * 3),
        "maximumChannelDelta": maximum_channel_delta,
        "boundingBox": (
            None
            if bounding_box is None
            else {
                "left": bounding_box[0],
                "top": bounding_box[1],
                "right": bounding_box[2],
                "bottom": bounding_box[3],
            }
        ),
        "passed": changed_pixels == 0,
    }
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.write_text(
        "\n".join(
            [
                f"# Round 5 {args.label} production pixel comparison",
                "",
                f"- Compared at: {compared_at}",
                f"- Result: {'PASS' if report['passed'] else 'FAIL'}",
                f"- Production capture: `{report['actual']['path']}` ({actual.width}x{actual.height}).",
                f"- Reviewed baseline: `{report['baseline']['path']}` ({baseline.width}x{baseline.height} full page).",
                f"- Combined same-viewport evidence: `{report['comparison']['path']}`.",
                f"- Comparison region: the {actual.width}x{actual.height} top viewport shared by both images.",
                f"- Changed pixels: {changed_pixels:,}/{pixels:,}.",
                f"- Mean absolute channel delta: {report['meanAbsoluteChannelDelta']}.",
                f"- Maximum channel delta: {maximum_channel_delta}.",
                f"- Difference bounding box: {report['boundingBox'] or 'none'}.",
                "",
                "The combined image places the reviewed local reference and production capture at the same viewport for visual inspection.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        f"Production viewport comparison: {changed_pixels:,}/{pixels:,} changed pixels; "
        f"evidence={comparison_path}"
    )
    if changed_pixels > 0:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
