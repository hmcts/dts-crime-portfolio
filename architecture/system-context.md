# System context

C4 level 1. The Crime Portfolio in its environment — the people who use it, the systems that surround it, the high-level data flow.

```mermaid
graph TB
    classDef person fill:#08427b,stroke:#073b6f,color:#fff
    classDef system fill:#1168bd,stroke:#0b4884,color:#fff
    classDef external fill:#999,stroke:#6b6b6b,color:#fff

    Viewer["Viewer<br/><i>any HMCTS staff member<br/>admitted by the auth proxy</i>"]:::person
    Editor["Editor<br/><i>email allowlist mapped to<br/>specific project IDs</i>"]:::person
    Admin["Admin<br/><i>email allowlist;<br/>can edit anything</i>"]:::person

    Portal["DTS Crime Portfolio Portal<br/><i>Next.js app on Render</i><br/><br/>Single discoverable front door<br/>for DTS Crime delivery information"]:::system

    AuthProxy["HMCTS auth proxy<br/><i>production only;</i><br/><i>injects x-user-email header</i>"]:::external
    Sanity["Sanity Cloud<br/><i>content + data store;</i><br/><i>read + write via token</i>"]:::external
    Notify["GOV.UK Notify<br/><i>transactional email</i>"]:::external
    PostHog["PostHog<br/><i>analytics ingest;</i><br/><i>consent-gated</i>"]:::external
    SystemsOfRecord["Existing systems of record<br/><i>Ardoq, Jira, Confluence,<br/>SharePoint;</i> linked, not replaced"]:::external

    Viewer -->|"reads portfolio,<br/>action plan, learning,<br/>events, prompts, help"| Portal
    Editor -->|"edits dossiers<br/>they're allowlisted for"| Portal
    Admin -->|"edits any dossier;<br/>creates snapshots;<br/>edits action plan progress"| Portal

    Portal <-->|"x-user-email header<br/>(production)"| AuthProxy
    Portal <-->|"GROQ queries +<br/>mutations"| Sanity
    Portal -->|"reminder emails<br/>via API"| Notify
    Portal -->|"events<br/>(consent-gated)"| PostHog
    Portal -.->|"out-links;<br/>portal does NOT replace"| SystemsOfRecord
```

## Notes

- **Production identity** flows from the HMCTS auth proxy as an `x-user-email` header per request. The portal stores no sessions and no tokens.
- **Preview-auth** is a non-production middleware that synthesises the same `x-user-email` header from a signed cookie set after a simple email-entry page. See `auth-flow.md`.
- **Data sovereignty** — Sanity Cloud is hosted in the EU region for the preview dataset. Production-region choice deferred until production launch (see `decisions/` for the decision when made).
- **The portal is a front door, not a system of record.** Project rosters, delivery details, and operational documentation live elsewhere; the portal aggregates and links.
