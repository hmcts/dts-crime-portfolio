# 2026-05-02 — Deploy via Render Blueprint + GitHub Action

**Decision** — Provision the preview Render service via a `render.yaml` Blueprint (Infrastructure-as-Code) instead of clicking through the dashboard. Trigger deploys via a GitHub Action (`.github/workflows/deploy.yml`) that fires on a Render deploy-hook URL after the `ci` workflow succeeds on `main`. Disable Render's `autoDeploy` so the GitHub Action is the single deploy entry point.

**Decider** — Product Manager. Active contributors: DevOps Engineer (driver), Lead Developer (verified build/start commands), Security Engineer (secret handling), Technical Architect (deploy contract).

**Context** — The preview environment had been described in a paragraph but not codified. The team needed (a) a reproducible service definition, (b) a deploy that only fires after a green build, and (c) a path to mirror the same shape for production later. The user explicitly asked for a Blueprint and a GitHub Action.

**Options considered**

1. **Render auto-deploy on push to main.** Simplest. No GitHub Action, no Blueprint. Bad: deploys can fire on a red main if branch protection is misconfigured; service config lives only in the Render dashboard.
2. **Render Blueprint + Render auto-deploy.** Service config in repo. Still deploys on every push, including any future force-push to main. Doesn't gate on CI green.
3. **Render Blueprint + GitHub Action triggered by `workflow_run` on `ci` success.** Service config in repo, deploys gated on green CI. Single deploy entry point. **Chosen.**
4. **Build artefact in CI, push to a registry, trigger Render to pull.** Overkill for a Next.js Render service.

**Decision rationale** — Option 3.

- **DevOps Engineer:** Blueprints make the service reproducible. A future production service is a copy + tweak rather than a fresh dashboard click-through. The `workflow_run` trigger is the right way to gate deploy on CI.
- **Lead Developer:** Build command pinned in Blueprint mirrors the local commands (`pnpm install --frozen-lockfile && pnpm build`). One source of truth.
- **Security Engineer:** Secrets (`SANITY_API_TOKEN`, `ADMIN_ALLOWLIST`) declared `sync: false` so they're set in the Render dashboard, not in the repo. The cookie HMAC secret uses `generateValue: true` so Render mints a strong value automatically. The deploy-hook URL is itself a secret — stored in GitHub repo secrets as `RENDER_DEPLOY_HOOK_URL`.
- **Technical Architect:** A single deploy entry point (the GitHub Action) makes the deploy contract clear. Anyone wanting to deploy reaches for "merge to main" or, in emergencies, manually triggers the workflow with a `workflow_dispatch` (a follow-up if needed).
- **Product Manager challenge:** Does this need building? Yes — a feedback preview that nobody can see has zero outcome value. The deploy path is the bridge from "code merged" to "user can give feedback".

**Consequences**

- New `render.yaml` at repo root. Imported once into Render to provision the service.
- New `.github/workflows/deploy.yml`. Fires on `workflow_run` of the `ci` workflow, branch `main`, conclusion `success`. Calls the Render deploy hook via curl.
- Two secrets need configuring outside the repo: `RENDER_DEPLOY_HOOK_URL` (GitHub repo secret), and the inline `sync: false` env vars in Render's dashboard.
- Render's `autoDeploy: false` means a manual `git push` directly to main won't trigger a deploy outside the GitHub Action — by design.
- Future production service can copy this Blueprint with a different `name`, `APP_ENVIRONMENT=production`, `NEXT_PUBLIC_SANITY_DATASET=production`, and a non-`generateValue` cookie secret managed elsewhere.

**Revisit when**

- Production hosting is decided. The Blueprint may move from Render to Azure App Service / AKS; the deploy workflow stays the same shape but the trigger target changes.
- The team starts wanting to deploy specific commits or branches, not just `main`. Add `workflow_dispatch` to the deploy workflow with an input.
- A blue-green or canary deploy strategy becomes desirable. Render's deploy hook is single-shot; staged rollouts would need a different approach.
