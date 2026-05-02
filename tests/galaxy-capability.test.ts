import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { supportsCanvas2d } from "@/lib/galaxy/capability";

describe("supportsCanvas2d", () => {
  it("returns false when there is no document (server-side)", () => {
    expect(supportsCanvas2d({ doc: null })).toBe(false);
  });

  it("returns true when the canvas element returns a 2D context", () => {
    const fakeContext = {};
    const fakeCanvas = {
      getContext: (kind: string) => (kind === "2d" ? fakeContext : null),
    } as unknown as HTMLCanvasElement;
    const doc = {
      createElement: vi.fn(() => fakeCanvas),
    };
    expect(supportsCanvas2d({ doc: doc as unknown as Document })).toBe(true);
    expect(doc.createElement).toHaveBeenCalledWith("canvas");
  });

  it("returns false when getContext returns null", () => {
    const fakeCanvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    const doc = { createElement: () => fakeCanvas };
    expect(supportsCanvas2d({ doc: doc as unknown as Document })).toBe(false);
  });

  it("returns false when getContext throws", () => {
    const fakeCanvas = {
      getContext: () => {
        throw new Error("blocked");
      },
    } as unknown as HTMLCanvasElement;
    const doc = { createElement: () => fakeCanvas };
    expect(supportsCanvas2d({ doc: doc as unknown as Document })).toBe(false);
  });

  it("returns false when createElement throws", () => {
    const doc = {
      createElement: () => {
        throw new Error("blocked");
      },
    };
    expect(supportsCanvas2d({ doc: doc as unknown as Document })).toBe(false);
  });
});
