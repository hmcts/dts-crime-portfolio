# Deployment

Where each piece runs at v1 launch.

```mermaid
graph LR
    classDef cloud fill:#1168bd,stroke:#0b4884,color:#fff
    classDef saas fill:#999,stroke:#6b6b6b,color:#fff
    classDef secret fill:#a83232,stroke:#7a2424,color:#fff

    subgraph Render["Render (preview environment)"]
        WebService["Web Service<br/><b>dts-crime-portfolio</b><br/><br/>auto-deploy on push to main<br/>build: pnpm install + pnpm build<br/>start: pnpm start<br/>node: 22"]:::cloud
    end

    subgraph SanityCloud["Sanity Cloud (EU region)"]
        ProdDataset[("dataset:<br/><b>production</b><br/><br/>empty until go-live")]:::saas
        PreviewDataset[("dataset:<br/><b>preview</b><br/><br/>seeded test data")]:::saas
        Project["Project: vi5mhbtl"]:::saas
    end

    NotifySaaS["GOV.UK Notify<br/><i>service-level API key</i>"]:::saas
    PostHogSaaS["PostHog<br/><i>EU region</i>"]:::saas
    GitHub["GitHub<br/><b>hmcts/dts-crime-portfolio</b>"]:::cloud

    subgraph SecretsRender["Render env vars"]
        EnvAppEnv[/"APP_ENVIRONMENT=preview"/]:::secret
        EnvSanityProj[/"NEXT_PUBLIC_SANITY_PROJECT_ID<br/>= vi5mhbtl"/]:::secret
        EnvSanityDataset[/"NEXT_PUBLIC_SANITY_DATASET<br/>= preview"/]:::secret
        EnvSanityToken[/"SANITY_API_TOKEN<br/><i>Editor, scoped to preview</i>"/]:::secret
        EnvCookieSecret[/"PREVIEW_AUTH_COOKIE_SECRET<br/><i>32+ hex bytes</i>"/]:::secret
        EnvAdmin[/"ADMIN_ALLOWLIST<br/><i>comma-separated emails</i>"/]:::secret
    end

    GitHub -->|"webhook on push"| WebService
    WebService -->|"reads env"| SecretsRender
    WebService -->|"GROQ + mutations"| PreviewDataset
    WebService -.->|"production only<br/>(not yet wired)"| ProdDataset
    WebService -->|"reminder emails<br/>(when scheduled)"| NotifySaaS
    WebService -->|"consent-gated<br/>analytics events"| PostHogSaaS
    Project --- ProdDataset
    Project --- PreviewDataset
```

## Environment isolation

Two Sanity datasets in the single project (`vi5mhbtl`):

- **`preview`** — used by Render preview deploy, local `pnpm dev`, and any future test environments. Seeded test data only; never holds real DTS Crime project records.
- **`production`** — created but unused until production launch. The production deploy will be a separate Render service (or replacement HMCTS-hosted target) with its own env-var bundle.

The `SANITY_API_TOKEN` issued for the preview service is scoped to the `preview` dataset. If the token leaks, the blast radius is test data only.

## Render specifics

- **Build:** `pnpm install --frozen-lockfile && pnpm build`. Requires `corepack enable` if pnpm isn't pre-installed in the build image.
- **Start:** `pnpm start`. Bound to Render's auto-assigned port via `process.env.PORT`.
- **Free Starter plan caveat:** sleeps after 15 minutes of inactivity. First request after a sleep takes ~30s to wake. Acceptable for a feedback preview; not acceptable for production.
- **Custom domain:** none yet; default `<service>.onrender.com` is fine for the preview audience.

## What's NOT in this diagram

- **Production deployment topology** — to be drawn when production hosting is decided. Could be Render Pro, Azure App Service (HMCTS norm), or an HMCTS-managed AKS cluster behind their identity proxy.
- **DNS, certificate management, WAF** — Render-managed at preview. Production will have its own piece of this story.
- **The auth proxy** — production-only and not in scope for this preview-environment diagram. See `auth-flow.md` for the request-level role it plays.
- **Backup and restore** — Sanity Cloud handles this for the dataset; we don't have a separate plan yet.
