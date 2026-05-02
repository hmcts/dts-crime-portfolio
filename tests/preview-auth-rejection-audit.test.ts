import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/sanity/client", () => ({
  getSanityClient: () => ({
    fetch: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    patch: () => ({ set: () => ({ commit: () => Promise.resolve() }) }),
  }),
}));

import { captureLogs } from "@/lib/logging/logger";
import { recordPreviewAuthRejection } from "@/lib/preview-auth/audit";

describe("recordPreviewAuthRejection", () => {
  let capture: ReturnType<typeof captureLogs>;

  beforeEach(() => {
    capture = captureLogs();
  });
  afterEach(() => {
    capture.restore();
  });

  it("emits a warn-level event with the rejected domain and reason", () => {
    recordPreviewAuthRejection("attacker@evil.com", "disallowed-domain");
    expect(capture.events).toHaveLength(1);
    const ev = capture.events[0]!;
    expect(ev.event).toBe("preview_auth.rejected_domain");
    expect(ev.level).toBe("warn");
    expect(ev.reason).toBe("disallowed-domain");
    expect(ev.domain).toBe("evil.com");
  });

  it("never logs the local-part of the rejected email", () => {
    recordPreviewAuthRejection("verysecrethandle@evil.com", "disallowed-domain");
    const line = capture.lines[0] ?? "";
    expect(line).not.toContain("verysecrethandle");
    expect(line).toContain("evil.com");
  });

  it("lower-cases the logged domain part", () => {
    recordPreviewAuthRejection("attacker@EvIL.cOm", "disallowed-domain");
    expect(capture.events[0]!.domain).toBe("evil.com");
  });

  it("logs domain=null for input that has no recoverable domain", () => {
    recordPreviewAuthRejection("not-an-email-at-all", "invalid-format");
    expect(capture.events[0]!.domain).toBeNull();
    expect(capture.events[0]!.reason).toBe("invalid-format");
  });

  it("logs domain=null for empty input", () => {
    recordPreviewAuthRejection("", "invalid-format");
    expect(capture.events[0]!.domain).toBeNull();
  });

  it("trims whitespace before extracting the domain", () => {
    recordPreviewAuthRejection("  attacker@evil.com  ", "disallowed-domain");
    expect(capture.events[0]!.domain).toBe("evil.com");
  });
});
