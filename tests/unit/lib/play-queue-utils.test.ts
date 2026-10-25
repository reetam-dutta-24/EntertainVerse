import { describe, expect, it } from "vitest";
import { moveToPlayNext, removeQueueItem } from "@/lib/play-queue-utils";

const queue = ["a", "b", "c", "d", "e"];

describe("moveToPlayNext", () => {
  it("moves a later item to right after the current one", () => {
    expect(moveToPlayNext(queue, 4, 1)).toEqual({ items: ["a", "b", "e", "c", "d"], newCurrentIndex: 1 });
  });

  it("moves an earlier item and shifts the current index back", () => {
    const result = moveToPlayNext(queue, 0, 2);
    expect(result).toEqual({ items: ["b", "c", "a", "d", "e"], newCurrentIndex: 1 });
    // The item that was playing is still the one playing.
    expect(result.items[result.newCurrentIndex]).toBe(queue[2]);
  });

  it("keeps the current item playing when it's the last one", () => {
    const result = moveToPlayNext(queue, 1, 4);
    expect(result.items[result.newCurrentIndex]).toBe("e");
    expect(result.items.at(-1)).toBe("b");
  });

  it("is a no-op for the current item or an out-of-range index", () => {
    for (const from of [2, -1, 5]) {
      const result = moveToPlayNext(queue, from, 2);
      expect(result.items).toBe(queue);
      expect(result.newCurrentIndex).toBe(2);
    }
  });

  it("doesn't mutate the input", () => {
    const input = [...queue];
    moveToPlayNext(input, 4, 0);
    expect(input).toEqual(queue);
  });
});

describe("removeQueueItem", () => {
  const items = queue.map((id, index) => ({ id, position: index + 1 }));
  const ids = (list: { id: string }[]) => list.map((item) => item.id);

  it("removes the item and renumbers positions from 1", () => {
    const result = removeQueueItem(items, 3, 0);
    expect(ids(result.items)).toEqual(["a", "b", "c", "e"]);
    expect(result.items.map((item) => item.position)).toEqual([1, 2, 3, 4]);
    expect(result.newCurrentIndex).toBe(0);
  });

  it("shifts the current index back when removing before it", () => {
    const result = removeQueueItem(items, 0, 2);
    expect(result.items[result.newCurrentIndex]!.id).toBe("c");
  });

  it("plays the next item when the current one is removed", () => {
    expect(removeQueueItem(items, 2, 2).items[2]!.id).toBe("d");
  });

  it("falls back to the new last item when removing the current last one", () => {
    const result = removeQueueItem(items, 4, 4);
    expect(result.newCurrentIndex).toBe(3);
    expect(result.items[3]!.id).toBe("d");
  });

  it("stays at 0 when the queue becomes empty", () => {
    expect(removeQueueItem([{ id: "a", position: 1 }], 0, 0)).toEqual({ items: [], newCurrentIndex: 0 });
  });

  it("is a no-op for an out-of-range index", () => {
    expect(removeQueueItem(items, 9, 1)).toEqual({ items, newCurrentIndex: 1 });
  });
});
