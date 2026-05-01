## Why

The foundational portal change pinned PostHog as the analytics tool but left
analytics as a single line in the build tasks list. That is not enough to
drive an implementation review: it does not say which events fire, what
properties they carry, how user identity is handled, how staff opt out, or
what PII must never leave the browser.

Analytics is user-visible behaviour, not just plumbing — it touches consent
copy, what happens when consent is declined, and what data is exposed to a
third-party processor. It deserves a behavioural spec in its own right.

This change also matters for DTS Crime trust: people will look at projects
that handle sensitive data, and we cannot have project names, descriptions,
or staff emails leaking into a SaaS analytics backend.

## What Changes

Add a new behavioural capability that defines:

- A consent gate that runs before any analytics SDK loads or fires events.
- A closed event catalogue covering filter use, dossier opens, exports,
  prompt votes/comments, submission lifecycle, and galaxy interactions.
- PII minimisation rules so analytics events carry stable IDs (hashed
  user IDs, Sanity document IDs) rather than emails or free text.
- Opt-out persistence and a self-service control inside the portal.
- Server-side ingress option so analytics can be proxied through a Next.js
  route if HMCTS chooses self-hosted or EU-region PostHog.

This is a follow-on to the still-active `add-crime-portfolio-portal` change.
The foundational specs are not modified by this change; analytics is added
as a new capability alongside them.

## Capabilities

### New Capabilities

- `analytics`: consent-gated PostHog event tracking with a closed event
  catalogue, PII-minimised properties, persistent opt-out, and an optional
  same-origin ingest proxy.

### Modified Capabilities

None.

## Impact

- **New code:** consent banner component, analytics client wrapper around
  the PostHog SDK, optional `/api/analytics/ingest` proxy route, and
  per-page event-call sites in portfolio, dossier, exports, prompts,
  submission, galaxy, and profile.
- **External dependencies:** PostHog project (decision required: SaaS EU
  region vs self-hosted) plus its API keys, stored as environment
  variables not committed to the repo.
- **Operational:** privacy notice text reviewed by HMCTS information
  governance before consent banner ships; an event-catalogue change
  policy so future contributors do not silently add new events.
- **Risk reduction:** removes the gap where the existing tasks line
  ("11.4 Wire PostHog events…") could be implemented without explicit
  PII or consent guarantees.
