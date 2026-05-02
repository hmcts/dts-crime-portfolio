# Architecture artefacts

Living architecture artefacts for the Crime Portfolio. Owned by the Technical Architect persona (see `openspec/specs/engineering-team/spec.md`).

All diagrams are written in [Mermaid](https://mermaid.js.org/) — text-based, GitHub-rendered, version-controlled, diff-friendly. No binary formats, no separate tooling.

## Files

| File | Purpose |
|---|---|
| [`system-context.md`](system-context.md) | C4 level 1 — the portal in its environment. People, neighbouring systems, top-level data flow. |
| [`containers.md`](containers.md) | C4 level 2 — the Next.js app's internal pieces and how they talk to external systems. |
| [`auth-flow.md`](auth-flow.md) | Sequence diagram for the auth flow in production (upstream proxy) and preview (preview-auth middleware). |
| [`deployment.md`](deployment.md) | Where each piece runs at v1 launch — Render service, Sanity datasets, env vars, DNS. |

## When to update

Update the relevant diagram in the same PR as the change:

- **New external system integrated** — e.g. swapping Notify for SES, adding GA → update `system-context.md` and possibly `containers.md`.
- **New container added** — e.g. a worker process, a separate auth service → update `containers.md`.
- **Auth model changes** — e.g. moving from upstream proxy to OIDC → update `auth-flow.md`.
- **Deployment topology changes** — e.g. moving off Render, adding a CDN → update `deployment.md`.

The Technical Architect approves architecture-touching PRs and is responsible for keeping these artefacts truthful. Stale diagrams are worse than no diagrams — if a change can't be reflected in time, the diagram is removed and the gap recorded in the decision log.

## What's NOT here

- **Decisions** — see `decisions/` at repo root.
- **Capability behaviour** — see `openspec/specs/`.
- **Code-level documentation** — read the code. JSDoc / TSDoc inline comments where the WHY is non-obvious.
- **Runbooks for operational tasks** — to be added under `architecture/runbooks/` when the first one is written. None yet.
