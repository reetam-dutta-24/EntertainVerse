// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fitColumns, useColumnCount } from "@/hooks/use-column-count";
import { CAROUSEL_COLS_BREAKPOINTS } from "@/lib/grid-section-config";

function resizeTo(width: number) {
  act(() => {
    window.innerWidth = width;
    window.dispatchEvent(new Event("resize"));
  });
}

describe("useColumnCount", () => {
  it.each([
    [320, 2],
    [767, 2],
    [768, 3],
    [1024, 4],
    [1199, 4],
    [1200, 6],
    [1920, 6],
  ])("at %ipx shows %i columns", (width, cols) => {
    window.innerWidth = width;
    const { result } = renderHook(() => useColumnCount(CAROUSEL_COLS_BREAKPOINTS));
    expect(result.current.cols).toBe(cols);
  });

  it("fits as many fixed-width cards as the container holds", () => {
    const fit = { slotWidth: 148, gap: 12, min: 2, max: 10 };
    expect(fitColumns(1204, fit)).toBe(7); // 1440px window, sidebar open
    expect(fitColumns(804, fit)).toBe(5); // same window with the assistant docked
    expect(fitColumns(272, fit)).toBe(2); // 320px phone keeps the 2-column minimum
    expect(fitColumns(4000, fit)).toBe(10);
  });

  it("follows viewport resizes and multiplies by rows", () => {
    window.innerWidth = 1300;
    const { result } = renderHook(() => useColumnCount(CAROUSEL_COLS_BREAKPOINTS, 2));
    expect(result.current).toEqual({ cols: 6, itemsPerPage: 12 });
    resizeTo(400);
    expect(result.current).toEqual({ cols: 2, itemsPerPage: 4 });
  });
});
