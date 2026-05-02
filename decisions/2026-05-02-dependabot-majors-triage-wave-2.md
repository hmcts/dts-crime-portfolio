# 2026-05-02 — Dependabot majors triage (Wave 2)

**Decision** — Of the six major-version Dependabot PRs that landed under the new isolation policy (PR #58), two are merged-as-superseded (`@types/node` 25, `vitest` 4) via a single coordinated branch; four are deferred (`sanity` 5, `@sanity/vision` 5, `eslint-config-next` 16, `next` 16). Deferrals are recorded so they reopen as scheduled work rather than dropping off the radar.

**Decider** — DevOps Engineer (decision owner, capability-arbiter for pipelines/build/deps). Active contributors: Lead Developer (consulted on migration scope), Security Engineer (reviewed each deferral for unmitigated security risk), Backend Developer (lib/logging context for next 16 build break).

**Context** — The previous Dependabot dev-deps group config bundled five majors into one PR (#36) which CI couldn't disentangle. We tightened the config in PR #58 so each major now arrives solo, and triaged this first wave to set the pattern. Two design constraints shaped the calls:

- We finished the **Sanity v3 → v4** migration only days ago in PR #51. Taking on a v5 jump in the same week would compound migration risk and undo recently-stabilised behaviour.
- The **Backend Developer** persona owns `lib/logging/` in a parallel branch this batch, so any decision that requires editing that module must wait until that work lands.

## Per-PR calls

| PR | Bump | Decision | CI before | Rationale |
|---|---|---|---|---|
| #59 | `sanity` 4.22.0 → 5.23.0 | **Defer** | build + test fail | Sanity v5 is a new major shipped one week after we completed our v4 migration. Build fails because v5's bundled studio code imports `useEffectEvent` from React (not stable in our React 19.2 — Sanity v5 expects a newer React minor). Release notes show a vanilla-extract CSS migration, an internal store-module restructure, and a switch to `tsgo`. Combined with our just-landed v4 work, this is exactly the "STOP and recommend deferral" condition called out in the triage brief: a v5-on-top-of-fresh-v4 migration touching studio config and possibly schemas is not safe to take on in a triage task. Closed with a comment pointing here. ([release notes](https://github.com/sanity-io/sanity/releases/tag/v5.23.0)) |
| #62 | `@sanity/vision` 4.22.0 → 5.23.0 | **Defer** | build fails | Must move with `sanity` (PR #37 retro). Same v5-too-soon reasoning as #59. |
| #63 | `next` 15.5.15 → 16.2.4 | **Defer** | build fails | Two blockers, neither fixable in this triage. (1) Next 16 makes Turbopack the default builder and Turbopack is strict on the Edge Runtime — `lib/logging/logger.ts` references to `process.stdout` that next 15 emitted as warnings now fail the build. The Backend Developer agent owns `lib/logging/` in a parallel Wave 2 branch; we must not race that work. (2) Next 16 deprecates the `middleware.ts` file convention in favour of `proxy.ts`. Our preview-auth middleware would need migration. Both items are non-trivial code changes and out of scope for a triage. Closed with a comment. ([release notes](https://github.com/vercel/next.js/releases/tag/v16.2.4)) |
| #60 | `eslint-config-next` 15.5.15 → 16.2.4 | **Defer** | lint fails | Must move with `next` (config and runtime are versioned together). Lint fails because the v16 config expects next 16's eslint plugin shape; mismatch with our pinned next 15. Reopens automatically when we revisit next 16. |
| #61 | `@types/node` 22.19.17 → 25.6.0 | **Supersede + merge** (via this PR) | all green | Types-only bump. Our `engines.node` is `>=22`; types newer than runtime is fine — nothing in our codebase uses APIs that were removed. Local typecheck/lint/test/build all green when stacked with #64 in this branch. Dependabot PR auto-closes when this branch merges. |
| #64 | `vitest` 3.2.4 → 4.1.5 | **Supersede + merge** (via this PR) | all green | Our test suite uses only the stable `vitest` API surface (`describe`/`it`/`expect`/`vi.mock`/`vi.fn`). v4's documented breaking changes target browser-mode, custom reporter authors, and snapshot-format internals — none of which we touch. All 360 tests pass on v4 locally. Bundled with #61 in this branch (no shared lockfile risk; ran together fine). |

## Decision rationale

**Why defer the four large ones rather than attempt a coordinated mega-bump.**

- **Migration cost** for Sanity v5 + next 16 + eslint-config-next 16 stacked is multi-day work. The triage brief explicitly says "if a major bump's migration looks larger than you can scope here, defer it cleanly — that's the right call."
- **Coordination risk** with active parallel agents. The Backend agent is currently rewriting `lib/logging/`; pulling next 16 into our branch would either block on or conflict with their work. The right time for next 16 is after that branch merges, not racing it.
- **Recency**. Sanity v4 was three days ago. The Sanity v5 release notes carry "feat: enable vanilla-extract CSS" and an internal store refactor — exactly the kind of internal churn we shouldn't compound while v4 settles.

**Why merge the two small ones in a single coordinated PR rather than via Dependabot.**

- Two clean lockfile diffs are simpler than two CI cycles, and the resulting branch is small and reviewable.
- We get to run typecheck/lint/test/build once on the *combined* state (more truthful than back-to-back Dependabot merges where the second never sees the first locally).
- Dependabot PRs auto-close when our branch lands.

## Security Engineer review of deferrals

Checked each deferred bump for any security-relevant content the deferral hides:

- **Sanity 5 / @sanity/vision 5** — release notes are studio UX, telemetry, vanilla-extract, store refactor. No CVEs or patched-vuln callouts. Safe to defer.
- **next 16 / eslint-config-next 16** — v16.2.3 release note references CVE-2026-23869, but that fix is also backported to v15.5.x line which we already track. Confirmed by checking that the v15 changelog includes the same fix. Safe to defer at v15.5.x for now; revisit window narrows when CVE-2026-23869 is no longer covered by our 15.5.x line.
- **vitest 4** — no CVE callouts in the migration guide. Safe.
- **@types/node 25** — types-only package; cannot have CVEs.

No deferral hides an unmitigated security risk.

## Consequences

- The two merged-via-supersede bumps reduce the lock-file churn on `main` and unstick CI for `@types/node` and `vitest` so future Dependabot updates within those ranges go straight through.
- The four deferred bumps will be reopened when their preconditions are met (see "Revisit when").
- We have evidence the new isolation policy works: Dependabot delivered six clean diffs, CI told the truth on each, and we made six independent calls. The previous bundled-majors PR (#36) couldn't have produced this clarity.
- The Dependabot PRs for #59, #60, #62, #63 will be closed with a comment linking to this decision-log entry. The PR template's "ignore this major version" mechanism is *not* used — we want to be re-prompted next minor so the conditions below get retested.

## Revisit when

- **Sanity v5 (#59, #62)** — when our Sanity v4 schemas/queries have been stable on `main` for a full sprint *and* the v5 line has a release whose notes do not list a vanilla-extract or store-internal change as a breaking item. Suggested re-eval: 2 weeks (target 2026-05-16) or earlier if a security advisory lands.
- **Next 16 + eslint-config-next 16 (#60, #63)** — when (a) the Backend agent's `lib/logging/` work has merged and the edge-runtime callers are runtime-clean, *and* (b) we have a planned, scoped migration window that covers `middleware.ts` → `proxy.ts`. Suggested re-eval: same retro-cadence as the next-major pin review, default 2 weeks after `lib/logging/` lands.
- **Either deferral set** — immediately if a CVE lands on the deferred line that our pinned line does not carry.
