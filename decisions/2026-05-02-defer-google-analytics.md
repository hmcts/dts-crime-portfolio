# 2026-05-02 — Defer Google Analytics

**Decision** — Don't add Google Analytics to the portal at v1 launch. PostHog (already specified in `openspec/specs/analytics/spec.md` and shipped via PR #48) is the singular analytics provider. Pluggable multi-provider architecture is not built. The desired outcome (analytics flexibility / external-dashboard support for GA-style tooling) is recorded here so a future request finds the prior reasoning.

**Decider** — Product Manager. Active contributors to the discussion: Technical Architect, Performance Analyst, Security Engineer, Accessibility Specialist, Lead Developer.

**Context** — A question was raised: should the portal support Google Analytics in addition to PostHog, either configured at launch or pluggable for later? The framing was that flexibility might be valuable but that build cost might not be justified.

**Options considered**

1. **Add GA at launch alongside PostHog (multi-provider analytics).** Both providers active. Two consent surfaces (or one combined banner), two SDKs, two event catalogues to keep in sync.
2. **Build GA-ready architecture without configuring it.** Pluggable provider abstraction shipped; GA disabled at launch; can be turned on later via env config.
3. **Defer entirely.** PostHog only. Analytics flexibility recorded as a future outcome but not built.
4. **Replace PostHog with GA.** Single provider, but GA. Means rewriting the analytics spec and the existing implementation.

**Decision rationale** — Option 3.

- **Product Manager challenge:** PostHog already delivers the user-facing analytics outcome (event tracking, dashboards, consent gate). The thin link to user value is "leadership wants GA-shaped reports", which is a presentation-layer problem solvable by exporting PostHog data into a separate dashboard if it ever becomes a real ask. No need to add a second tracker to solve a reporting question.
- **Technical Architect feasibility:** Pluggable multi-provider analytics is a real piece of work — provider registry, event multicast with consistency guarantees, two SDKs gated behind consent, expanded consent surface. Mid-effort if done well, hidden complexity if done quickly. Not justified by the user-need link above.
- **Security Engineer concern:** Each third-party tracker requires its own DPIA. GA in particular sends extensive metadata to Google by default (IP, cookies, fingerprinting hints) and demands careful Consent Mode v2 configuration to meet HMCTS data-protection requirements. Adding GA doubles the privacy-review surface and operational burden.
- **Accessibility Specialist concern:** Two providers means either a longer multi-vendor consent banner (readability cost) or two banners (notification fatigue). PostHog's banner is already at the right complexity level.
- **Performance Analyst view:** Two analytics tools risks two sets of dashboards with no single source of truth. PostHog's reporting features cover the v1 instrumentation and reporting needs.
- **Lead Developer:** A couple of days of careful work; feasible. Defer to the user-value judgement above.

**Consequences**

- `openspec/specs/analytics/spec.md` stays as-is (PostHog only). No spec update needed.
- The existing implementation (consent banner, ingest proxy, event catalogue, hashed user ID) remains the singular analytics surface for v1.
- The desired-future outcome — analytics flexibility, external-dashboard support, possibly GA — is recorded by this decision so a future PR considering GA addresses the reasoning here directly.
- The team commits to PostHog as the singular analytics provider for v1 launch.

**Revisit when**

- HMCTS leadership or comms team requires GA-specific reporting that PostHog cannot deliver (and a CSV-export bridge to a separate dashboard is not acceptable).
- A second analytics provider becomes a hard requirement for IG / data-sharing compliance reasons.
- The cost of pluggable multi-provider analytics has dropped materially (e.g. through a maintained shared library that handles the consent + multicast plumbing).
- A new product surface (e.g. a public-facing comms page) lands where GA is the contractually required analytics tool.
