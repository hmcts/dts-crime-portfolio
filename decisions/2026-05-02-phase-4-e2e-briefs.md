# Phase 4 e2e — pre-staged dispatch briefs

Status: **drafted, not dispatched**. These are the parallel-agent briefs to
fan out the moment KEEP/KILL is settled. One brief per surface; each brief
is self-contained so an agent can be dropped in cold.

Pattern follows Phase 2 dispatch (one worktree per lane, no shared file
edits, mocks via `installSanityMocks`). Each brief ends with the exact
`Agent({...})` call I will make.

---

## Lane 0 — KEEP/KILL gate

Do not dispatch any lane below until the user has marked each surface
**KEEP / KILL / DEFER**. Reason: dispatching e2e against a surface that
will be removed is wasted CI minutes, and the agent cannot know our
strategic call from the code alone.

Candidate cuts on the bubble (raise these explicitly):

- `compare` — what is its job? Often duplicates portfolio filters.
- `help` — already has `help-search.spec.ts`; do we want richer help
  flows or is the current depth enough?
- `prompts` contribution flow — user flagged this as a gap; KEEP or
  defer behind feedback signal?

Mark surfaces inline in this file when decided.

---

## Lane 1 — Action Plan (`/action-plan`)

**Status:** KEEP/KILL pending.

**Goal:** MED e2e coverage for the strands listing, owner display, and
2026-priority framing per the Leveson-aligned seed data.

**Existing coverage:** none under `playwright/tests/action-plan*`. The
seed (`scripts/seed-demo.ts`) now ships 4 strands tied to Crown Court
backlog outcomes — the agent can rely on those `demo-…` IDs.

**What to test (MED only):**

1. Renders all 4 strand cards with title, owner, and the priority chip
2. Strand → detail link navigates and shows owner + linked capabilities
3. Empty-state when the dataset has zero strands (mock-only)
4. Role gating — non-editor cannot see edit affordance (mirror
   `access-control.spec.ts` pattern)

**Constraints:**

- Use `installSanityMocks` — never hit the real dataset.
- No production code changes beyond what's strictly needed for
  testability (data-testids fine, refactors not).
- New file only: `playwright/tests/action-plan.spec.ts`.

**Dispatch:**

```
Agent({
  description: "Phase 4 e2e: Action Plan",
  subagent_type: "general-purpose",
  prompt: <this lane verbatim, plus a pointer to playwright/tests/portfolio-list.spec.ts as the reference shape>,
})
```

---

## Lane 2 — Events (`/events`)

**Status:** KEEP/KILL pending.

**Goal:** MED e2e for the events list — past/upcoming split, filters
if present, and the detail page if it exists.

**Existing coverage:** none. Seed ships 5 events.

**What to test (MED only):**

1. List renders 5 seeded events
2. Past vs upcoming split (verify by `startsAt` against frozen clock)
3. Filter / search if the surface offers it (skip otherwise — flag in
   the PR description)
4. Empty state via mock override

**Constraints:** as Lane 1. New file only:
`playwright/tests/events.spec.ts`.

---

## Lane 3 — Learning (`/learning`)

**Status:** KEEP/KILL pending.

**Goal:** MED e2e for the learning items list and any per-item detail.

**Existing coverage:** none. Seed ships 5 learning items.

**What to test (MED only):**

1. List renders 5 seeded items with type/format chips
2. Filter by type if present
3. Detail page renders body and any external resource link safely
   (target="_blank" + rel="noopener noreferrer" — actually assert this,
   it's a security-relevant detail)
4. Empty state via mock

**Constraints:** as Lane 1. New file only:
`playwright/tests/learning.spec.ts`.

---

## Lane 4 — Profile (`/profile`)

**Status:** KEEP/KILL pending.

**Goal:** MED e2e for the user-profile surface — what the signed-in
user sees about themselves.

**Existing coverage:** none. The closest reference is
`access-control.spec.ts` for role-based assertions.

**What to test (MED only):**

1. Signed-in user sees their name + email + role
2. Sign-out from profile works (cross-check `sign-out.spec.ts` —
   if covered, drop this case)
3. "My activity" / "My prompts" / "My upvotes" if present, render
   only the current user's items (verify with a second mocked user)
4. Editor role shows edit-affordance; viewer does not

**Constraints:** as Lane 1. New file only:
`playwright/tests/profile.spec.ts`.

---

## Lane 5 — Prompts (list + contribution gap)

**Status:** modal already covered by `prompts-modal.spec.ts`
(Phase 3); list + contribution flow is the gap user flagged.

**Goal:** MED e2e for the `/prompts` list filtering, sorting, upvote
toggle from the card (not modal), and contribution flow if shipped.

**Existing coverage:** `prompts-modal.spec.ts` covers the modal,
upvote inside the modal, and threaded reply. Do not duplicate.

**What to test (MED only):**

1. List renders cards with avatar, tool pill, tags, body preview
2. Tag filter narrows the list
3. Tool filter narrows the list
4. Sort by upvotes vs recency
5. Card-level upvote toggle (idempotent — second click removes vote)
6. Card body click opens modal (cross-check existing modal spec —
   skip if already there)
7. **Contribution flow** — if there's a "submit prompt" path, cover
   the happy path; if not, the agent should call this out in the PR
   description as a separate gap, not implement it.

**Constraints:** as Lane 1. New file only:
`playwright/tests/prompts-list.spec.ts`. Do not edit
`prompts-modal.spec.ts`.

---

## Lane 6 — Compare (`/compare`) — CONDITIONAL

**Dispatch only if compare survives KEEP/KILL.**

**Goal:** MED e2e for whatever the compare view actually does today.
Agent should start by reading `app/(app)/compare/` and writing a
one-paragraph "what this surface does" summary to the PR description
before writing tests. If the surface duplicates portfolio filters,
flag that for the PM rather than locking it in with tests.

---

## Dispatch order

1. **Today:** none — wait on KEEP/KILL.
2. **After KEEP/KILL:** all surviving lanes in **one** parallel
   dispatch (single message, multiple `Agent` tool calls). They edit
   disjoint files (one new spec each), so no merge conflicts possible.
3. **Each lane → its own PR** so they can land green independently
   and the build/test/e2e graph stays under the existing CI shape
   (e2e job already gates on `[test, build]`).

## Out of scope for Phase 4

- Reference Data — no route under `app/(app)/`; if it lands later it
  earns its own brief.
- Studio editing flows — Studio is on the chopping block per PM brief
  ("never going to be used in HMCTS"). Don't sink e2e into a surface
  we're considering removing.
- Galaxy — killed (PR #95).
