# Testing redirect-returning routes

**The rule.** Any route handler or middleware that issues an HTTP redirect SHALL have a unit test that drives the handler with a `request.url` reflecting a deployment-platform-internal host (e.g. `https://localhost:10000` for Render) and asserts the response `Location` header resolves correctly against the public URL the user actually called.

If you skip this, you ship a redirect that works on `localhost` and `localhost:3000` (because they're the same host as the public URL in dev) but breaks the moment it lands on Render, Vercel, Cloud Run, Fly.io, or any other platform with a request-routing proxy in front of the app.

This rule is the operationalisation of the *Regression test on every defect fix* requirement in `engineering-team` spec — see PR #72 (sign-out redirect on Render) for the canonical defect that prompted it.

## Why this happens

A Node web server bound to port `10000` and reached via a TLS-terminating reverse proxy receives requests like this:

```
GET / HTTP/1.1
Host: localhost:10000
X-Forwarded-Host: dts-crime-portfolio-preview.onrender.com
X-Forwarded-Proto: https
```

When Next.js constructs `request.url`, it uses the `Host` header — so `request.url` becomes `https://localhost:10000/...`, **not** `https://dts-crime-portfolio-preview.onrender.com/...`.

Code that relies on `request.url` for redirect targets:

```ts
// BROKEN on any platform with a TLS-terminating proxy
return NextResponse.redirect(new URL("/preview-auth", request.url));
//                                                    ^^^^^^^^^^^^
//                                                    leaks internal host
```

…sends the browser to the internal URL. The browser tries to navigate to `https://localhost:10000/preview-auth`, which fails immediately (the user's machine has no such host).

## What a correct redirect looks like

For same-origin redirects, prefer a **relative** `Location`:

```ts
// CORRECT: 303 + relative Location resolves against the URL
// the browser actually called.
return new NextResponse(null, {
  status: 303,
  headers: { Location: "/preview-auth" },
});
```

The browser handles the relative path against the public URL it sent the request to. The route handler doesn't need to know anything about the upstream proxy.

If you genuinely need an absolute URL (rare; only for cross-origin redirects), read it from the `x-forwarded-host` and `x-forwarded-proto` headers instead of `request.url`.

## What the test must look like

```ts
// tests/preview-auth-sign-out-route.test.ts (canonical example)

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
```

The two assertions that matter:

1. `expect(response.headers.get("Location")).toBe("/preview-auth")` — the redirect target is what you intended.
2. `expect(response.headers.get("Location")).not.toContain("localhost:10000")` — the platform-internal host did not leak through. This is the regression guard.

If you forget the second assertion, the test passes against `new URL("/preview-auth", request.url)` (because `localhost:10000` *is* what you'd expect from that input) and the bug resurfaces in production.

## Which platforms expose this?

Any platform that terminates TLS at an upstream proxy and forwards plain HTTP to the app, which is most of them:

| Platform | Internal `Host` shape |
|---|---|
| Render | `localhost:10000` (or whatever `PORT` is set to) |
| Vercel (Edge) | varies — `request.url` reflects the runtime's view |
| Cloud Run | `localhost:8080` or similar |
| Fly.io | `[fly-internal-host]:8080` |
| Cloudflare Workers | varies |
| Local dev (`pnpm dev`) | `localhost:3000` — same as public URL, masks the bug |

The only environment where `request.url` "just works" for redirects is one where the public URL **is** the bind URL — i.e., bare-metal, no proxy. That covers approximately zero serious deployment targets.

## Coverage gap discipline

When adding a new route or middleware that returns a redirect:

1. The route handler's unit test SHALL include the platform-internal-host case.
2. If the redirect is exercised through a user flow (form submit, navigation, sign-out, sign-in), there SHOULD also be a Playwright e2e in `playwright/tests/` that walks the flow and asserts the browser lands on the same origin it started from. See `playwright/tests/sign-out.spec.ts`.

Both layers together: the unit test catches the regression in CI fast; the e2e catches the integration regression slow but with high signal. Either one alone leaves a gap.

## Reference

- `engineering-team` spec → *Regression test on every defect fix* requirement.
- PR #72 — the sign-out fix that prompted this rule.
- `tests/preview-auth-sign-out-route.test.ts` — unit-level guard.
- `playwright/tests/sign-out.spec.ts` — e2e-level guard.
- `decisions/2026-05-02-defer-secrets-manager-choice-until-production.md` — context on why we're deploying to Render in the first place.
