## Why

The `access-control` capability requires every API route to read identity
from an `x-user-email` header injected by an upstream auth proxy. That
contract is right for production but cannot be satisfied on Render.com,
which has no equivalent of the HMCTS auth proxy in front of the app.

We want to host an early preview on Render so users can give feedback
before the production hosting decision is finalised. We need an identity
mechanism for that preview that:

- preserves the `access-control` contract exactly (so downstream code,
  including the auth resolver, ChangeLog writes, role gates, and
  per-project Editor allowlists, is unchanged);
- is scoped strictly to non-production environments and cannot ship to
  production by accident;
- requires no signup, no password store, no third-party identity provider.

## What Changes

Add a new behavioural capability that defines a preview-only Next.js
middleware which:

1. prompts a first-time visitor for an email address on a single-page
   email-entry screen;
2. stores the entered email in a signed, HttpOnly cookie;
3. injects that email into the `x-user-email` request header for every
   subsequent request before any route handler or the shared auth resolver
   runs.

The capability is activated by an environment flag and is inert in
production. Production identity continues to come from the upstream proxy
described in `access-control`.

## Capabilities

### New Capabilities

- `preview-auth`: non-production identity middleware that captures an
  email via a single-page form, stores it in a signed cookie, and rewrites
  the `x-user-email` header on every request so the existing access
  control contract works on platforms (Render, local dev) that have no
  upstream identity proxy.

### Modified Capabilities

None. `access-control` is intentionally not modified — the contract it
defines is exactly what `preview-auth` satisfies.

## Impact

- **New code:** a Next.js middleware, an email-entry page at
  `/preview-auth`, a sign-out route, and a small "Preview environment"
  visual banner shown on every page in preview.
- **External dependencies:** Render service connected to the GitHub repo,
  a separate Sanity dataset for preview content, a deployment secret
  `PREVIEW_AUTH_COOKIE_SECRET` used to HMAC-sign the cookie.
- **Operational:** a clear environment flag (`APP_ENVIRONMENT` ∈
  `{preview, production}`) gates the middleware. CI must fail the
  production build if `APP_ENVIRONMENT=production` AND the middleware
  is enabled.
- **Data scope:** preview environment SHALL hold only seeded test data, not
  real DTS Crime project records. This is enforced operationally by
  pointing the preview at its own Sanity dataset and never connecting it
  to the production dataset.
- **Lifecycle:** this capability is explicitly temporary. When production
  hosting (with the upstream proxy) is in place, this capability will be
  archived and the preview environment shut down.
