import { describe, expect, test } from "bun:test";
import { mapBounded, progressPercent } from "./execution";

describe("review execution", () => {
  test("runs checks concurrently without exceeding the worker bound and preserves result order", async () => {
    let active = 0;
    let peak = 0;
    const values = await mapBounded([1, 2, 3, 4, 5, 6], 3, async (n) => {
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return n * 2;
    });
    expect(peak).toBe(3);
    expect(values).toEqual([2, 4, 6, 8, 10, 12]);
  });
  test("does not start further checks after an upstream denial", async () => {
    const started: number[] = [];
    await expect(mapBounded([1, 2, 3], 1, async n => {
      started.push(n);
      throw new Error("Access denied");
    })).rejects.toThrow("Access denied");
    expect(started).toEqual([1]);
  });
  test("progress reflects completed checks rather than a timer", () => {
    expect(progressPercent(0)).toBe(0);
    expect(progressPercent(3)).toBe(45);
    expect(progressPercent(6)).toBe(90);
  });
});