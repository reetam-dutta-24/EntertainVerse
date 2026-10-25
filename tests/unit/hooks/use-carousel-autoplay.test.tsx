// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCarouselAutoplay } from "@/hooks/use-carousel-autoplay";

let reducedMotion = false;
let intersect: (visible: boolean) => void = () => {};

beforeEach(() => {
  reducedMotion = false;
  // Start on a beat boundary (multiple of 5s) so the first slide lands at +5s.
  vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z"), toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reducedMotion && query.includes("reduce"), media: query }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        intersect = (visible) => callback([{ isIntersecting: visible }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function Row({ onStep, enabled = true, label }: { onStep: (direction: 1 | -1) => void; enabled?: boolean; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useCarouselAutoplay({ rootRef: ref, enabled, onStep });
  return (
    <div ref={ref} data-testid={label}>
      <button type="button">{label}</button>
    </div>
  );
}

const beat = () => act(() => vi.advanceTimersByTime(5_000));

describe("useCarouselAutoplay", () => {
  it("steps on every 5s beat", () => {
    const onStep = vi.fn();
    render(<Row onStep={onStep} label="row" />);
    beat();
    beat();
    expect(onStep).toHaveBeenCalledTimes(2);
  });

  it("alternates direction by row order on the page", () => {
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();
    render(
      <>
        <Row onStep={first} label="1" />
        <Row onStep={second} label="2" />
        <Row onStep={third} label="3" />
      </>,
    );
    beat();
    expect(first).toHaveBeenCalledWith(1);
    expect(second).toHaveBeenCalledWith(-1);
    expect(third).toHaveBeenCalledWith(1);
  });

  it("pauses while hovered and resumes on leave", () => {
    const onStep = vi.fn();
    const { getByTestId } = render(<Row onStep={onStep} label="row" />);
    fireEvent.mouseEnter(getByTestId("row"));
    beat();
    expect(onStep).not.toHaveBeenCalled();
    fireEvent.mouseLeave(getByTestId("row"));
    beat();
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it("pauses while focus is inside the row", () => {
    const onStep = vi.fn();
    const { getByRole } = render(<Row onStep={onStep} label="row" />);
    act(() => getByRole("button").focus());
    beat();
    expect(onStep).not.toHaveBeenCalled();
    act(() => getByRole("button").blur());
    beat();
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it("pauses for 10s after a touch", () => {
    const onStep = vi.fn();
    const { getByTestId } = render(<Row onStep={onStep} label="row" />);
    fireEvent.pointerDown(getByTestId("row"), { pointerType: "touch" });
    beat();
    beat();
    expect(onStep).not.toHaveBeenCalled();
    beat();
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it("pauses while scrolled out of view", () => {
    const onStep = vi.fn();
    render(<Row onStep={onStep} label="row" />);
    act(() => intersect(false));
    beat();
    expect(onStep).not.toHaveBeenCalled();
    act(() => intersect(true));
    beat();
    expect(onStep).toHaveBeenCalledTimes(1);
  });

  it("never runs for reduced-motion users or when disabled", () => {
    reducedMotion = true;
    const reduced = vi.fn();
    render(<Row onStep={reduced} label="reduced" />);
    reducedMotion = false;
    const disabled = vi.fn();
    render(<Row onStep={disabled} enabled={false} label="disabled" />);
    beat();
    beat();
    expect(reduced).not.toHaveBeenCalled();
    expect(disabled).not.toHaveBeenCalled();
  });

  it("stops after unmount", () => {
    const onStep = vi.fn();
    const { unmount } = render(<Row onStep={onStep} label="row" />);
    unmount();
    beat();
    expect(onStep).not.toHaveBeenCalled();
  });
});
