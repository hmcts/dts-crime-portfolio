# Containers

C4 level 2. What runs inside the portal and how those pieces talk to each other and to external systems.

```mermaid
graph TB
    classDef container fill:#1168bd,stroke:#0b4884,color:#fff
    classDef external fill:#999,stroke:#6b6b6b,color:#fff
    classDef person fill:#08427b,stroke:#073b6f,color:#fff

    Browser["User's browser"]:::person
    AuthProxy["HMCTS auth proxy<br/><i>production only</i>"]:::external
    Sanity["Sanity Cloud"]:::external
    Notify["GOV.UK Notify"]:::external
    PostHog["PostHog ingest"]:::external

    subgraph Render["Render — single Web Service"]
        Middleware["Edge middleware<br/><br/>preview-auth cookie<br/>verification + header<br/>injection (non-prod)"]:::container

        Pages["Next.js App Router<br/>server components<br/><br/>portfolio, dossier, action<br/>plan, profile, learning,<br/>events, prompts, help,<br/>galaxy, compare, submit"]:::container

        APIRoutes["Next.js API routes<br/><br/>portfolios/*, action-plan,<br/>prompts, analytics ingest,<br/>compliance briefing,<br/>reporting cuts, compare"]:::container

        Studio["Sanity Studio<br/>(embedded at /studio)<br/><br/>content authoring"]:::container

        ServerLib["Server-only libraries<br/><br/>auth resolver,<br/>Sanity client + transaction,<br/>logging, exports,<br/>portable text renderer"]:::container

        Scripts["Standalone scripts<br/><br/>reminders.ts (Notify),<br/>snapshot writer,<br/>ChangeLog compactor,<br/>prompt tabulator"]:::container
    end

    Browser -->|"https"| Middleware
    Middleware -->|"forwards with<br/>x-user-email"| Pages
    Middleware -->|"forwards with<br/>x-user-email"| APIRoutes
    Browser -->|"loads<br/>(non-prod auth via cookie)"| Studio
    Browser <-.->|"https<br/>(production)"| AuthProxy

    Pages -->|"calls"| ServerLib
    APIRoutes -->|"calls"| ServerLib
    Studio -->|"GROQ + mutations<br/>(user's Sanity login)"| Sanity
    ServerLib -->|"GROQ + mutations<br/>(server token)"| Sanity
    APIRoutes -->|"consent-gated<br/>analytics events"| PostHog

    Scripts -->|"queries stale<br/>projects + audit log"| Sanity
    Scripts -->|"sends reminder emails"| Notify
```

## What lives where

- **Edge middleware** — `middleware.ts`. Active when `APP_ENVIRONMENT in {preview, local}`; inert in production. Generates `requestId`, sets `x-user-email` from the signed `previewAuth` cookie, redirects to `/preview-auth` when missing.
- **Pages** — `app/(app)/**` (everything wrapped in the sidebar shell), plus the sign-in page at `/preview-auth` and the embedded Studio at `/studio`. Server components by default; small client components for interactive bits (filters, dropdowns, edit forms).
- **API routes** — `app/api/**`. Every route's first executable line is `await resolveUser()`. All mutations go through `commitWithChangeLog()` which writes one ChangeLog row per modified field in the same Sanity transaction.
- **Server-only libraries** — `lib/**` modules that import `'server-only'`. Imports of these from a client component fail at compile time.
- **Studio** — embedded via `next-sanity/studio` at `/studio/[[...tool]]/page.tsx`. User signs in with their Sanity account; not gated by `x-user-email`.
- **Standalone scripts** — `scripts/**`. Run on a scheduler (cron / CI). Use the same Sanity client and the same logger as the in-process app.

## What's NOT in this diagram

- **Render's own infrastructure** (load balancers, build pipelines, secrets store) — not portal-specific; see `deployment.md` for the deployment-side view.
- **Browser-side analytics SDK loading** — handled by the `lib/analytics/client.ts` module after consent; the events flow into the Next.js `/api/analytics/ingest` proxy when `ANALYTICS_INGEST_MODE=proxy`, otherwise direct to PostHog.
