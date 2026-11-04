import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { VisualizationFrame } from "@/features/visualizations/visualization-frame";

function renderFrame() {
  const playback = {
    step: 2,
    maximumStep: 10,
    speed: 1,
    isPlaying: false,
    toggle: vi.fn(),
    pause: vi.fn(),
    stepBackward: vi.fn(),
    stepForward: vi.fn(),
  };
  const onReset = vi.fn();

  render(
    <VisualizationFrame
      id="gradient-descent"
      locale="zh-CN"
      title="测试实验"
      description="用于验证统一实验外壳。"
      playback={playback}
      onReset={onReset}
      onSpeedChange={vi.fn()}
      shareUrl={() => "http://localhost:3000/zh-CN/playground?viz=gradient-descent&state=fixed"}
      exports={{
        toSvg: () => '<svg xmlns="http://www.w3.org/2000/svg" />',
        toPng: async () => new Blob(["png"], { type: "image/png" }),
      }}
      controls={
        <label>
          参数
          <input aria-label="测试参数" type="number" defaultValue="1" />
        </label>
      }
      textAlternative="当前图形的文本说明。"
    >
      <svg role="img" aria-label="测试图形" />
    </VisualizationFrame>,
  );

  return { playback, onReset };
}

describe("VisualizationFrame", () => {
  it("keeps server-rendered controls inert until hydration attaches handlers", () => {
    const playback = {
      step: 0,
      maximumStep: 1,
      speed: 1,
      isPlaying: false,
      toggle: vi.fn(),
      pause: vi.fn(),
      stepBackward: vi.fn(),
      stepForward: vi.fn(),
    };

    const markup = renderToString(
      <VisualizationFrame
        id="gradient-descent"
        locale="zh-CN"
        title="服务端实验"
        description="验证水合前的交互门控。"
        playback={playback}
        onReset={vi.fn()}
        onSpeedChange={vi.fn()}
        shareUrl={() => "https://one-forth.com/zh-CN/playground"}
        exports={{
          toSvg: () => "<svg />",
          toPng: async () => new Blob(),
        }}
        controls={<input aria-label="服务端参数" />}
        textAlternative="服务端图形说明。"
      >
        <svg role="img" aria-label="服务端图形" />
      </VisualizationFrame>,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain(
      '<fieldset class="interactive-figure__parameter-fieldset" disabled=""',
    );
    expect(markup).toContain('<button type="button" disabled=""');
  });

  it("wires transport buttons and keyboard controls", async () => {
    const { playback, onReset } = renderFrame();
    const region = screen.getByRole("region", { name: "测试实验" });
    const playButton = screen.getByRole("button", { name: "播放" });

    await waitFor(() => expect(playButton).toBeEnabled());

    fireEvent.click(playButton);
    expect(playback.toggle).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(playback.stepForward).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    expect(playback.pause).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("renders the model, instructions, calculation notes, and related reading", () => {
    renderFrame();

    expect(screen.getByText("模型与操作说明")).toBeVisible();
    fireEvent.click(screen.getByText("模型与操作说明"));
    for (const label of [
      "观察目标",
      "数学模型",
      "假设与适用范围",
      "操作步骤",
      "预期现象",
      "计算说明",
      "相关正文",
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(screen.queryByText(/人工审阅|human review/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "在教材目录中继续学习" })).toHaveAttribute(
      "href",
      "/zh-CN/books",
    );
  });

  it("copies a deterministic share URL", async () => {
    renderFrame();
    const shareButton = screen.getByRole("button", { name: "分享状态" });
    await waitFor(() => expect(shareButton).toBeEnabled());
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3000/zh-CN/playground?viz=gradient-descent&state=fixed",
      );
    });
    expect(screen.getByText("分享链接已复制。")).toBeVisible();
  });

  it("copies the declarative figure anchor without mutating a lazy heading", async () => {
    window.history.replaceState(
      {},
      "",
      "/zh-CN/books/mathematics/optimization-information-theory/gradient-descent",
    );
    const writeText = vi.mocked(navigator.clipboard.writeText);
    writeText.mockClear();
    renderFrame();

    const copyButton = screen.getByRole("button", {
      name: "复制“测试实验”实验的锚点链接",
    });
    await waitFor(() => expect(copyButton).toBeEnabled());
    fireEvent.click(copyButton);

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "http://localhost:3000/zh-CN/books/mathematics/optimization-information-theory/gradient-descent#figure-gradient-descent",
      ),
    );
    expect(screen.getByText("实验锚点链接已复制。")).toBeVisible();
  });
});
