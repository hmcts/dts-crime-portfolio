## Deployment

A runbook for the preview Render deployment of `dts-crime-portfolio`. For the target-state diagram of where each piece runs, see [`architecture/deployment.md`](../architecture/deployment.md); this doc is the operational how-to.

## Architecture summary

A single Render Web Service serves the Next.js app, reading content from the Sanity `preview` dataset. CI on `main` triggers the deploy via a Render deploy hook; Render does not auto-deploy on push. Diagram and component detail in [`architecture/deployment.md`](../architecture/deployment.md).

## Initial setup (one-off)

1. **Create the Web Service from the Blueprint.** In Render → *Blueprints* → *New Blueprint Instance*, point at the `hmcts/dts-crime-portfolio` repo. Render reads [`render.yaml`](../render.yaml) and provisions the service plus all `value:` env vars.
2. **Set the secret env vars** (the Blueprint marks these `sync: false`, so Render leaves them blank):
   - `SANITY_API_TOKEN` — Editor role, scoped to the `preview` dataset. Generate at https://manage.sanity.io/projects/vi5mhbtl/api/tokens.
   - `ADMIN_ALLOWLIST` — comma- or whitespace-separated emails.
   - `POSTHOG_PROJECT_KEY` — the `phc_…` Project API key.
   - `POSTHOG_INGEST_URL` — `https://eu.i.posthog.com` for EU Cloud, `https://us.i.posthog.com` for US Cloud.
   - `ANALYTICS_INGEST_MODE` — `proxy` (recommended) or `direct`.
   - `ANALYTICS_USER_ID_PEPPER` — generate with `openssl rand -hex 32`. Treat as long-lived; rotation resets identifier stability.
3. **Generate a deploy hook.** Service → *Settings* → *Deploy Hooks* → *New*. Copy the URL.
4. **Add the deploy hook as a GitHub repo secret:**
   ```bash
   gh secret set RENDER_DEPLOY_HOOK_URL --body '<paste-deploy-hook-url-here>'
   ```
   The value MUST be wrapped in single quotes. `gh secret set ... --body -` does NOT read stdin — it stores the literal `-` and silently breaks the deploy workflow.

## Deploy chain

```
push to main
  → ci.yml (typecheck, lint, test, build, openspec validate)
    → on success: deploy.yml POSTs RENDER_DEPLOY_HOOK_URL
      → Render builds (pnpm install --frozen-lockfile && pnpm build) and starts (pnpm start)
```

Render's response to the hook POST has two success shapes; the deploy workflow accepts both:

- **HTTP 200** with `{"deploy":{"id":"…"}}` — a new deploy started.
- **HTTP 202** with `{}` — a deploy is already in flight. Render will pick up the latest commit when the running deploy finishes. This is normal when several merges land back-to-back; it is **not** a failure.

Anything other than 200 or 202 is an error and the workflow fails loud.

## Verifying a deploy

1. Visit `https://<service>.onrender.com` (the URL is in the Render dashboard and pinned to the GitHub `preview` Environment as `RENDER_PREVIEW_URL`).
2. Tail logs in Render → *Logs*. The build phase ends with `Build successful`; the start phase ends with Next's `ready - started server on …`.
3. Open the site, accept analytics consent, and confirm a `consent_granted` event appears in PostHog (post-#87 wiring). If `ANALYTICS_INGEST_MODE=proxy`, the browser POSTs to `/api/analytics/ingest`, not directly to PostHog.

## Rollback

Render dashboard → *Deploys* → pick a previous green deploy → *Roll back to this deploy*. This redeploys the artefact; it does NOT change git history. The next merge to `main` will deploy the new `HEAD` again — so a Render-side rollback is a temporary hold, not a permanent revert.

For a code-level rollback, revert the offending commit on `main` and merge the revert. CI then drives a normal forward deploy.

## Rotating secrets

Render dashboard → *Environment* → edit the value → *Save Changes*. The new value takes effect on the next deploy; trigger one if you need it sooner (push a no-op or POST the deploy hook manually).

For `RENDER_DEPLOY_HOOK_URL`: generate a new hook in Render (revoking the old one invalidates it), then update the GitHub secret:

```bash
gh secret set RENDER_DEPLOY_HOOK_URL --body '<new-deploy-hook-url>'
```

For `ANALYTICS_USER_ID_PEPPER`: rotation breaks `distinct_id` continuity — historic events stay associated with the previous pepper. Only rotate if the value has leaked.

## Common operational gotchas

- **Sign-out redirect must use a relative `Location`.** Render terminates TLS at an upstream proxy, so `request.url` reflects the internal `https://localhost:10000/...` host. Redirecting to `new URL("/preview-auth", request.url)` leaks that internal host to the browser. Always issue redirects with `Location: "/preview-auth"` (relative). Canonical writeup and regression-test pattern: [`docs/testing-redirects.md`](./testing-redirects.md).
- **Free Starter cold start.** The plan sleeps after ~15 minutes of inactivity. The first request after a sleep takes roughly 30s while Render wakes the service. Acceptable for a feedback preview; not acceptable for production.
- **Analytics consent cookie shape.** The portal reads/writes a single `analyticsConsent` cookie (`granted` | `denied` | unset). If events stop reaching PostHog after a deploy, check that the cookie value is `granted` in the browser and that `POSTHOG_PROJECT_KEY` and `POSTHOG_INGEST_URL` are populated in Render's environment.
- **Playwright HTML report on every CI run.** [`playwright.yml`](../.github/workflows/playwright.yml) uploads the HTML report as an artefact on every run, not just failures — useful for spotting creeping slowness on green runs before it becomes a flake.
