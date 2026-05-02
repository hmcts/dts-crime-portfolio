import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieDeleteMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: cookieDeleteMock }),
}));

import { POST, GET } from "@/app/preview-auth/sign-out/route";
import { COOKIE_NAME } from "@/lib/preview-auth/cookie";

const ORIGINAL_APP_ENV = process.env.APP_ENVIRONMENT;

describe("preview-auth sign-out route", () => {
  beforeEach(() => {
    cookieDeleteMock.mockReset();
    process.env.APP_ENVIRONMENT = "preview";
  });

  afterEach(() => {
    process.env.APP_ENVIRONMENT = ORIGINAL_APP_ENV;
  });

  it("clears the previewAuth cookie and redirects with a relative Location", async () => {
    // Simulate Render: a request whose URL reflects the internal upstream
    // host (https://localhost:10000), not the public hostname users see.
    const request = new Request("https://localhost:10000/preview-auth/sign-out", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/preview-auth");
    // No host in the redirect target — the browser resolves it against
    // the public URL it actually called, sidestepping any internal host.
    expect(response.headers.get("Location")).not.toContain("localhost:10000");
    expect(cookieDeleteMock).toHaveBeenCalledWith(COOKIE_NAME);
  });

  it("returns 404 in production environments", async () => {
    process.env.APP_ENVIRONMENT = "production";
    const request = new Request("https://example.com/preview-auth/sign-out", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(cookieDeleteMock).not.toHaveBeenCalled();
  });

  it("rejects GET with 405 and an Allow header", async () => {
    const request = new Request("https://example.com/preview-auth/sign-out", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});
