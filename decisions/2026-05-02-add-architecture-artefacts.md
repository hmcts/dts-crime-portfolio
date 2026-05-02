# 2026-05-02 — Add architecture artefacts to the documentation

**Decision** — Add an `architecture/` directory at repo root with four Mermaid-based artefacts: `system-context.md`, `containers.md`, `auth-flow.md`, `deployment.md`. The Technical Architect persona owns these. Updates land in the same PR as the architectural change being made.

**Decider** — Product Manager (overall arbiter), with active input from Technical Architect (driver), Lead Developer, Delivery Manager, DevOps Engineer.

**Context** — The Technical Architect surfaced the absence of any architecture-level documentation. The team has good capability-level specs (in `openspec/specs/`) and a decision log (`decisions/`), but no place that shows how the pieces fit together at runtime. The question was: are architecture diagrams worth the maintenance cost, and if so, in what format and where?

**Options considered**

1. **Don't add architecture artefacts.** Specs and code tell the whole story. Cheapest now; costs accumulate every time someone has to reconstruct the runtime topology.
2. **Add architecture artefacts as Mermaid markdown in `architecture/`.** Text-based, GitHub-rendered, version-controlled, diff-friendly. Updates trivial, owned by the Tech Architect.
3. **Add architecture artefacts as binary diagrams (Lucid / draw.io / etc.) committed to the repo or stored elsewhere.** Higher visual quality, but binary diffs, separate tool, easy to go stale.
4. **Use a structured DSL (Structurizr, C4-PlantUML).** Most rigorous, but additional learning + tooling for the team and non-trivial CI to render.

**Decision rationale** — Option 2.

- **Product Manager challenge:** The user-outcome link is indirect — diagrams don't reach DTS Crime users. They serve the team's ability to make good decisions. Acceptable when (a) maintenance cost is low and (b) the team commits to keeping them current.
- **Technical Architect:** Wants the artefacts; will own them. C4 framing (System Context + Container) covers the question "how does this fit together" for 90% of the cases that come up.
- **Lead Developer:** Mermaid eliminates the staleness risk by keeping diagrams in the same PR as the code change. Tooling cost = zero (GitHub renders natively).
- **Delivery Manager:** Owner identified, update triggers documented in `architecture/README.md`. Staleness becomes visible during code review.
- **DevOps Engineer:** Asks for a deployment view too — Render service, env vars, dataset isolation. Added as `deployment.md`.

**Consequences**

- New top-level directory `architecture/` with four files plus an index README. Total ~250 lines of markdown + Mermaid.
- The Technical Architect persona owns these artefacts. Update triggers documented in `architecture/README.md`.
- PRs that change the architecture (new external system, new container, auth-model change, deployment topology change) update the relevant diagram in the same PR. Not doing so is a code-review block.
- No new dependencies, no CI changes, no new tooling.
- The directory complements but does not replace the OpenSpec specs (capability behaviour) or the decision log (rationale for choices).

**Revisit when**

- The team finds itself routinely re-explaining the runtime topology in PR conversations — the diagrams aren't carrying their weight, or aren't current. Either iterate or remove.
- Production hosting is decided. `deployment.md` will need a parallel section (or a sibling file) for the production topology.
- Architecture rises to the level of meriting a structured DSL (e.g. for compliance audit trails, for diagram-as-code generation). At that point this Mermaid set becomes a stepping stone to a Structurizr workspace.
- The team grows beyond 5–6 active contributors and Mermaid's maintenance discipline starts slipping.
