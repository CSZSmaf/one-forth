import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePlayback } from "@/features/visualizations/playback";

interface MatchMediaController {
  readonly setMatches: (matches: boolean) => void;
}

function mockReducedMotion(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const mediaQuery = {
    get matches() {
      return matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "change") listeners.add(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "change") listeners.delete(listener);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaQueryList;

  vi.spyOn(window, "matchMedia").mockReturnValue(mediaQuery);

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      for (const listener of listeners) listener();
    },
  };
}

function PlaybackHarness({ minimumStep = 0 }: { readonly minimumStep?: number }) {
  const [step, setStep] = useState(minimumStep);
  const playback = usePlayback({
    step,
    maximumStep: 4,
    speed: 1,
    minimumStep,
    onStepChange: setStep,
  });

  return (
    <div>
      <button type="button" onClick={playback.toggle}>
        toggle
      </button>
      <button type="button" onClick={playback.stepBackward}>
        backward
      </button>
      <button type="button" onClick={() => playback.seek?.(2.4)}>
        seek middle
      </button>
      <button type="button" onClick={() => playback.seek?.(-10)}>
        seek below
      </button>
      <button type="button" onClick={() => playback.seek?.(20)}>
        seek above
      </button>
      <output aria-label="playback state">{playback.isPlaying ? "playing" : "paused"}</output>
      <output aria-label="playback step">{step}</output>
    </div>
  );
}

describe("usePlayback accessibility pauses", () => {
  it("scrubs to a bounded step, pauses playback and respects nonzero minimums", () => {
    mockReducedMotion(false);
    render(<PlaybackHarness minimumStep={1} />);
    fireEvent.click(screen.getByRole("button", { name: "backward" }));
    expect(screen.getByLabelText("playback step")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    fireEvent.click(screen.getByRole("button", { name: "seek middle" }));
    expect(screen.getByLabelText("playback state")).toHaveTextContent("paused");
    expect(screen.getByLabelText("playback step")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "seek below" }));
    expect(screen.getByLabelText("playback step")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "seek above" }));
    expect(screen.getByLabelText("playback step")).toHaveTextContent("4");
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByLabelText("playback step")).toHaveTextContent("1");
  });
  it("pauses when reduced motion is enabled and jumps instead of animating", () => {
    const media = mockReducedMotion(false);
    render(<PlaybackHarness />);

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByLabelText("playback state")).toHaveTextContent("playing");

    act(() => media.setMatches(true));
    expect(screen.getByLabelText("playback state")).toHaveTextContent("paused");

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByLabelText("playback step")).toHaveTextContent("4");
    expect(screen.getByLabelText("playback state")).toHaveTextContent("paused");
  });

  it("pauses an active animation when the document becomes hidden", () => {
    mockReducedMotion(false);
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("visible");
    render(<PlaybackHarness />);

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByLabelText("playback state")).toHaveTextContent("playing");

    visibility.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(screen.getByLabelText("playback state")).toHaveTextContent("paused");
    expect(screen.getByLabelText("playback step")).toHaveTextContent("0");
  });
});
