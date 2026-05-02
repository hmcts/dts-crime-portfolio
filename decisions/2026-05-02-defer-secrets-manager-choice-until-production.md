# 2026-05-02 — Defer secrets-manager choice until production deployment

**Decision** — For the preview deploy on Render, secrets remain in the Render dashboard env-var store (with `sync: false` for set-by-hand secrets and `generateValue: true` for the preview-auth cookie HMAC). No external secrets manager (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, 1Password Secrets Automation, etc.) is integrated at this stage. The choice of a production-grade secrets manager is **explicitly deferred** until the portal moves to its actual HMCTS estate.

**Decider** — Technical Architect, with the Product Manager and DevOps Engineer concurring. Security Engineer signed off on the deferral on the basis that the preview's threat model is bounded and the Render env-var store is acceptable for that scope.

**Context** — During the Wave 2 batch (PRs #65–#68), the question was raised: "how are the secrets kept secret?" The team enumerated the current layered protections (no secrets in git; `server-only` import barrier; bundle isolation; encryption at rest and in transit; PII-scrubbing logger; hashed analytics user IDs) and an honest gap: there is no central secrets manager. The Render dashboard is the single source of truth, and anyone with dashboard access can read values back. For a preview hosted by a third-party PaaS that is acceptable; for production on the HMCTS estate it almost certainly will not be — but the production-side constraints (which estate, which approved tooling, which compliance requirements) are not known yet.

**Options considered**

1. **Pick a secrets manager now and integrate it before any production use.** Decide between Vault, a cloud-native SM, or a managed offering and wire it up so the same code path serves preview and production. Maximises early consistency; risks picking the wrong tool because the production environment is still a moving target.
2. **Stage in a lightweight tool now (e.g., 1Password Secrets Automation, Doppler, Infisical).** Cheap, satisfies the "no plaintext in dashboards" reflex, but adds a second tool to operate and a second migration when production lands.
3. **Defer the choice; document the open question; pick when production target is known.** Render env-var store remains the source of truth for preview. Production deployment work re-opens the question with the actual estate constraints in hand.

**Decision rationale** — Option 3.

- **Product Manager challenge:** The user outcome (working preview that the team can poke at, secrets not committed to git) is met by the current approach. Picking a secrets manager *now* solves a problem we don't yet have, against requirements (estate, approved tooling, compliance posture) we don't yet know. That is the textbook "outrank build it" case — record the question, build later when the constraints are real.
- **Technical Architect feasibility:** A secrets-manager integration done with the wrong tool is hard to migrate (every env-var consumer changes; rotation playbooks change; CI changes). One done with the right tool is a one-week job at most when the production target is known. The cost of waiting is low; the cost of a wrong-now choice is moderate.
- **Security Engineer view:** The preview's threat surface — a Render Web Service running the portal against a `preview` Sanity dataset with a hand-curated admin allowlist — is bounded. Render's env-var store is encrypted at rest and masked in build logs; values are not casually visible. The greatest residual risk is "Render dashboard access is the new front door" — mitigated operationally (tight team membership, SSO if available) rather than architecturally.
- **DevOps Engineer view:** Adding a secrets manager pre-production introduces an operational dependency we'd then have to migrate or retain alongside whatever production picks. Better to add it once, against a known production target.

**Consequences**

- The preview deploy continues to read secrets from Render env-vars. No code change.
- The production deployment workstream **must** re-open this decision before any go-live work begins. This decision file is the prompt: future-us reads it and knows the question is on the table.
- The `ANALYTICS_USER_ID_PEPPER` is intentionally long-lived; rotating it discontinues analytics user-id stability. If a future secrets-manager migration moves the pepper across stores, the move must preserve the *value*, not regenerate it. A rotation runbook is out of scope for this entry.
- Render dashboard access is the de-facto credential to all preview secrets. The team commits to keeping the Render team-member list tight and to using SSO where Render supports it.
- A small follow-up — adding a CI secret-leak scanner (e.g. `gitleaks` or `trufflehog`) — is unrelated to the secrets-manager choice and may be picked up independently. Recorded here so it doesn't get swallowed by the deferral.

**Reversal triggers** — Reopen this decision when **any** of the following becomes true:

1. Production deployment target is known (a specific HMCTS estate, cloud, or hosting arrangement).
2. A real-world incident exposes a Render-dashboard-related secret (revisit immediately, irrespective of production timing).
3. The portal accumulates so many secrets that the dashboard list becomes unmanageable (a soft signal — usually >15–20 entries).
4. A regulatory or HMCTS standard requires a specific secrets manager.

**Cross-references**

- `render.yaml` — current env-var declarations
- `.github/workflows/deploy.yml` — `RENDER_DEPLOY_HOOK_URL` lives in GitHub Secrets
- `openspec/specs/observability/spec.md` — logging-PII boundary
- `lib/sanity/client.server.ts` and the `server-only` package — the import barrier that keeps `SANITY_API_TOKEN` server-side
- `lib/analytics/identify.ts` — pepper-based hashing of analytics user ids
