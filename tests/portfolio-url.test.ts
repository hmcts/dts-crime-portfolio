import { describe, expect, it } from "vitest";

import {
  readMultiParam,
  setSingleParam,
  toggleMultiParam,
  writeMultiParam,
} from "@/lib/portfolio/url";

function params(input: string): URLSearchParams {
  return new URLSearchParams(input);
}

describe("readMultiParam", () => {
  it("returns empty for missing key", () => {
    expect(readMultiParam(params(""), "stage")).toEqual([]);
  });

  it("splits comma-separated values", () => {
    expect(readMultiParam(params("stage=pilot,scale"), "stage")).toEqual(["pilot", "scale"]);
  });

  it("merges repeated keys", () => {
    expect(readMultiParam(params("stage=pilot&stage=scale"), "stage")).toEqual([
      "pilot",
      "scale",
    ]);
  });

  it("trims whitespace and ignores empty entries", () => {
    expect(readMultiParam(params("group= g1 ,, g2 "), "group")).toEqual(["g1", "g2"]);
  });
});

describe("toggleMultiParam", () => {
  it("adds a value when not present", () => {
    const result = toggleMultiParam(params(""), "stage", "pilot");
    expect(result.toString()).toBe("stage=pilot");
  });

  it("appends to an existing comma-separated list", () => {
    const result = toggleMultiParam(params("stage=pilot"), "stage", "scale");
    expect(readMultiParam(result, "stage").sort()).toEqual(["pilot", "scale"]);
  });

  it("removes a value that is already present", () => {
    const result = toggleMultiParam(params("stage=pilot,scale"), "stage", "pilot");
    expect(result.toString()).toBe("stage=scale");
  });

  it("deletes the key entirely when removing the last value", () => {
    const result = toggleMultiParam(params("stage=pilot"), "stage", "pilot");
    expect(result.has("stage")).toBe(false);
  });

  it("preserves other params", () => {
    const result = toggleMultiParam(params("stage=pilot&q=auth"), "stage", "scale");
    expect(result.get("q")).toBe("auth");
    expect(readMultiParam(result, "stage").sort()).toEqual(["pilot", "scale"]);
  });
});

describe("writeMultiParam", () => {
  it("collapses an array to a comma-separated value", () => {
    const result = writeMultiParam(params(""), "stage", ["pilot", "scale"]);
    expect(result.toString()).toBe("stage=pilot%2Cscale");
  });

  it("removes the key when given an empty array", () => {
    const result = writeMultiParam(params("stage=pilot"), "stage", []);
    expect(result.has("stage")).toBe(false);
  });
});

describe("setSingleParam", () => {
  it("sets a value", () => {
    expect(setSingleParam(params(""), "q", "auth").get("q")).toBe("auth");
  });

  it("removes the key when given an empty string", () => {
    expect(setSingleParam(params("q=auth"), "q", "").has("q")).toBe(false);
  });

  it("replaces an existing value", () => {
    expect(setSingleParam(params("q=auth"), "q", "search").get("q")).toBe("search");
  });
});
