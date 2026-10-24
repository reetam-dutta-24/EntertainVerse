"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * React's "adjust state when a prop changes" pattern: compares against the
 * previous render's value and runs `onChange` during render, instead of a
 * setState-in-effect round trip. `onChange` may only set this component's state.
 */
export function useOnValueChange<T>(value: T, onChange: (next: T, previous: T) => void) {
  const [previous, setPrevious] = useState(value);
  if (!Object.is(previous, value)) {
    setPrevious(value);
    onChange(value, previous);
  }
}

const noopSubscribe = () => () => {};

/** True after hydration on the client — e.g. before rendering a portal. */
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Read a browser-only value (localStorage, etc.) without a hydration mismatch. */
export function useClientValue<T>(read: () => T, serverValue: T) {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}
