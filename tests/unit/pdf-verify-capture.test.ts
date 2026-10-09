import { describe, expect, it, vi } from "vitest";
import {
  captureCompletePage,
  hasVisibleInk,
  requiredContentIsRendered,
} from "../../lib/pdf/verify-capture";

const white = () => new Uint8ClampedArray(40).fill(255);
const ink = () => new Uint8ClampedArray(Array.from({ length: 10 }, () => [0, 0, 0, 255]).flat());
const required = { getBoundingClientRect: () => ({ left: 15, top: 25, right: 25, bottom: 35 }) };
const page = {
  querySelectorAll: () => [required],
  getBoundingClientRect: () => ({ left: 10, top: 20, width: 100, height: 200 }),
} as unknown as HTMLElement;
function canvas(pixels: Uint8ClampedArray) {
  const read = vi.fn(() => ({ data: pixels }));
  const element = {
    width: 300,
    height: 600,
    getContext: () => ({ getImageData: read }),
  } as unknown as HTMLCanvasElement;
  return { element, read };
}

describe("required PDF capture content", () => {
  it("rejects white, transparent pixels and isolated antialiasing specks", () => {
    expect(hasVisibleInk(white())).toBe(false);
    expect(hasVisibleInk(new Uint8ClampedArray(40))).toBe(false);
    expect(hasVisibleInk(ink().slice(0, 28))).toBe(false);
    expect(hasVisibleInk(ink())).toBe(true);
  });
  it("checks marked content at its scaled canvas position", () => {
    const result = canvas(ink());
    expect(requiredContentIsRendered(result.element, page)).toBe(true);
    expect(result.read).toHaveBeenCalledWith(15, 15, 30, 30);
  });
  it("fails on blank required regions", () => {
    expect(requiredContentIsRendered(canvas(white()).element, page)).toBe(false);
  });
  it("leaves documents without opt-in markers on the original single-capture path", async () => {
    const unmarked = { querySelectorAll: () => [] } as unknown as HTMLElement;
    const result = canvas(white());
    const capture = vi.fn(async () => result.element);
    const paint = vi.fn(async () => {});
    expect(await captureCompletePage(capture, unmarked, paint)).toBe(result.element);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(paint).not.toHaveBeenCalled();
    expect(result.read).not.toHaveBeenCalled();
  });
  it("waits for another paint and retries transiently missing content", async () => {
    const complete = canvas(ink()).element;
    const capture = vi
      .fn()
      .mockResolvedValueOnce(canvas(white()).element)
      .mockResolvedValueOnce(complete);
    const paint = vi.fn(async () => {});
    expect(await captureCompletePage(capture, page, paint)).toBe(complete);
    expect(capture).toHaveBeenCalledTimes(2);
    expect(paint).toHaveBeenCalledTimes(1);
  });
  it("fails closed after three incomplete captures instead of downloading them", async () => {
    const capture = vi.fn(async () => canvas(white()).element);
    const paint = vi.fn(async () => {});
    await expect(captureCompletePage(capture, page, paint)).rejects.toThrow("omitted required");
    expect(capture).toHaveBeenCalledTimes(3);
    expect(paint).toHaveBeenCalledTimes(2);
  });
});
