## Local development

A 15-minute runbook to take a fresh clone of `hmcts/dts-crime-portfolio` to `pnpm dev` running on http://localhost:3000.

## Prerequisites

- **Node** at the version pinned in [`.nvmrc`](../.nvmrc). With `nvm`:
  ```bash
  nvm install
  nvm use
  ```
- **pnpm** via Corepack (the `packageManager` field in `package.json` pins the version):
  ```bash
  corepack enable
  ```
- **Git**.
- **openssl** (almost certainly already installed) for generating the preview-auth cookie secret.

## Get the code and install

```bash
git clone git@github.com:hmcts/dts-crime-portfolio.git
cd dts-crime-portfolio
pnpm install --frozen-lockfile
```

## Configure secrets

```bash
cp .env.example .env.local
```

Then edit `.env.local`. The blocks in that file map onto:

**Mandatory locally**

- `APP_ENVIRONMENT=local` — already set in the example.
- `NEXT_PUBLIC_SANITY_PROJECT_ID=vi5mhbtl` and `NEXT_PUBLIC_SANITY_DATASET=preview` — already set in the example. Both are non-secret.
- `PREVIEW_AUTH_COOKIE_SECRET` — required when `APP_ENVIRONMENT` is `local` or `preview`. Generate with:
  ```bash
  openssl rand -hex 32
  ```

**Optional locally**

- `SANITY_API_TOKEN` — read-only GROQ works without it. Set it (Editor role, scoped to the `preview` dataset) only if you need to test writes from your machine. Generate at https://manage.sanity.io/projects/vi5mhbtl/api/tokens.
- `ADMIN_ALLOWLIST` — only needed if you want the Admin role locally. Add your email.
- The PostHog / analytics block (`POSTHOG_PROJECT_KEY`, `POSTHOG_INGEST_URL`, `ANALYTICS_INGEST_MODE`, `ANALYTICS_USER_ID_PEPPER`, `ANALYTICS_DROP_IP`) — all optional. Without them the consent banner still renders and tests still pass; events just never reach a real PostHog instance.

## Run the app

```bash
pnpm dev
```

Open http://localhost:3000. Sign in via `/preview-auth` with any `@hmcts.net` or `@justice.gov.uk` email — preview-auth issues a signed cookie; no password.

## Sanity Studio

Embedded at http://localhost:3000/studio. Sign in with your Sanity account; you need access to project `vi5mhbtl` (ask in `#dts-crime-portfolio`). Local edits go to the `preview` dataset, which is the same dataset the Render preview reads from — treat it as shared test data, not a personal sandbox.

## Tests

```bash
# Vitest unit suite
pnpm test

# Playwright e2e suite. Runs `next build && next start` against port 3100
# and impersonates Sanity via a local fixture server. Sanity is never
# contacted from these tests.
pnpm exec playwright install chromium   # one-off
pnpm test:e2e
```

The e2e suite binds to port 3100 and `pnpm dev` binds to 3000, so the two can run side-by-side without clashing.

## Common gotchas

- **Preview-auth cookie rejected.** The cookie is `secure: true`. Use `localhost` (not `127.0.0.1`) — Chromium treats `localhost` as a secure context over plain HTTP.
- **Sanity 401 / rate-limit on first page load.** Re-check `NEXT_PUBLIC_SANITY_DATASET=preview`; an empty or wrong dataset name lands you on the project's default and Sanity throttles fast.
- **Port 3000 in use.** Next will pick the next free port and print the URL — the e2e suite hardcodes 3100, so a stray dev server on 3001 won't collide.
- **`pnpm install` fails on `corepack`.** Run `corepack enable` once, then retry. Corepack ships with Node 22 but is gated behind that flag.
