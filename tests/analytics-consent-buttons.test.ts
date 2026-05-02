import { describe, expect, it, vi } from "vitest";

import {
  acceptConsent,
  declineConsent,
  type ConsentHandlerDeps,
} from "@/components/AnalyticsConsentButtons";

function buildDeps(
  overrides: Partial<ConsentHandlerDeps> = {},
): ConsentHandlerDeps & {
  writeConsent: ReturnType<typeof vi.fn>;
  configureAnalytics: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
} {
  return {
    writeConsent: vi.fn(),
    configureAnalytics: vi.fn(),
    track: vi.fn(),
    refresh: vi.fn(),
    config: {
      userId: "hashed-user-id",
      projectKey: "phc_test_key",
      ingestMode: "direct",
      ingestUrl: "https://eu.i.posthog.com",
    },
    ...overrides,
  } as ConsentHandlerDeps & {
    writeConsent: ReturnType<typeof vi.fn>;
    configureAnalytics: ReturnType<typeof vi.fn>;
    track: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  };
}

describe("acceptConsent", () => {
  it("persists granted consent, configures analytics, fires consent_granted, and refreshes the server tree", () => {
    const deps = buildDeps();

    acceptConsent(deps);

    expect(deps.writeConsent).toHaveBeenCalledTimes(1);
    expect(deps.writeConsent).toHaveBeenCalledWith("granted");

    expect(deps.configureAnalytics).toHaveBeenCalledTimes(1);
    expect(deps.configureAnalytics).toHaveBeenCalledWith({
      ingestMode: "direct",
      ingestUrl: "https://eu.i.posthog.com",
      projectKey: "phc_test_key",
      userId: "hashed-user-id",
    });

    expect(deps.track).toHaveBeenCalledTimes(1);
    expect(deps.track).toHaveBeenCalledWith("consent_granted");

    // The dismiss bug fix: refresh() must be called so the server-rendered
    // AnalyticsBanner re-evaluates the now-set cookie and unmounts.
    expect(deps.refresh).toHaveBeenCalledTimes(1);
  });

  it("calls refresh() AFTER writeConsent so the cookie is set before the server re-renders", () => {
    const callOrder: string[] = [];
    const deps = buildDeps({
      writeConsent: vi.fn(() => {
        callOrder.push("writeConsent");
      }),
      refresh: vi.fn(() => {
        callOrder.push("refresh");
      }),
    });

    acceptConsent(deps);

    expect(callOrder).toEqual(["writeConsent", "refresh"]);
  });

  it("forwards the proxy ingest mode and runtime config from the server-rendered banner", () => {
    const deps = buildDeps({
      config: {
        userId: null,
        projectKey: null,
        ingestMode: "proxy",
        ingestUrl: "https://example.com/proxied",
      },
    });

    acceptConsent(deps);

    expect(deps.configureAnalytics).toHaveBeenCalledWith({
      ingestMode: "proxy",
      ingestUrl: "https://example.com/proxied",
      projectKey: null,
      userId: null,
    });
  });
});

describe("declineConsent", () => {
  it("persists declined consent and refreshes the server tree without loading the SDK", () => {
    const deps = buildDeps();

    declineConsent(deps);

    expect(deps.writeConsent).toHaveBeenCalledTimes(1);
    expect(deps.writeConsent).toHaveBeenCalledWith("declined");

    // Spec: declining MUST NOT load the SDK or fire any event.
    expect(deps.configureAnalytics).not.toHaveBeenCalled();
    expect(deps.track).not.toHaveBeenCalled();

    // The dismiss bug fix: refresh() must be called so the banner unmounts.
    expect(deps.refresh).toHaveBeenCalledTimes(1);
  });

  it("calls refresh() AFTER writeConsent so the cookie is set before the server re-renders", () => {
    const callOrder: string[] = [];
    const deps = buildDeps({
      writeConsent: vi.fn(() => {
        callOrder.push("writeConsent");
      }),
      refresh: vi.fn(() => {
        callOrder.push("refresh");
      }),
    });

    declineConsent(deps);

    expect(callOrder).toEqual(["writeConsent", "refresh"]);
  });
});
