# 2026-05-02 — First round of user research for the live preview

**Decision** — Run a first round of **5 moderated remote sessions, 30 minutes each**, against the live preview at `https://dts-crime-portfolio-preview.onrender.com/`, split 2 / 2 / 1 across the portal's three audiences (Leadership, Delivery, All staff). Sessions follow a fixed four-step task script (below). Recordings are kept on the recording owner's HMCTS-issued device for **at most 30 days** and only with explicit consent. This is the first concrete step to close the "zero recorded user research" gap flagged in `design-reviews/2026-05-02-design-and-research-assessment.md`. It is the first round only — not a standing research plan.

**Decider** — User Researcher (lens owner). Service Designer reviews task-script realism. Product Manager ratifies scope vs. delivery cost. Delivery Manager owns recruitment. This follows the engineering-team decision-arbiter convention: the lens owner decides; named co-signers concur in their lane.

**Context** — The design + research + GDS assessment in `design-reviews/2026-05-02-design-and-research-assessment.md` (PR #83) recorded that the portal is built for three audiences but no one from any of those audiences has been spoken to. The portal is now stable enough on the preview environment to be exercised end-to-end (auth, portfolio, dossier, action plan, learning, prompts, events, FAQ all live). A separate in-flight change `openspec/changes/add-user-feedback-capability/` proposes an in-product feedback surface; the research script deliberately exercises the gap that capability is meant to fill so the two pieces of work inform each other.

## What this round proposes

**Five participants, drawn from each of the audiences the portal is built for:**

- **2 × Leadership** — Director or Deputy-Director-level staff. They are the audience the portfolio dashboard, stat tiles, and Galaxy view are built for.
- **2 × Delivery** — a Project Owner and a Delivery Manager (or equivalent). They are the audience for project submission, dossier edits, and action-plan tracking — the mutation surfaces.
- **1 × All staff** — someone whose only realistic use is reading: learning, prompts, events, FAQ.

Five is Nielsen's baseline ("5 users surface ~80% of usability problems"). Six adds little; ten doubles cost without doubling signal. The split prioritises the two mutation-heavy audiences over the read-mostly one.

**Format** — 30-minute moderated remote sessions. Participants sign in via the existing `@hmcts.net` / `@justice.gov.uk` preview-auth restriction (no new accounts, no fixtures). Researcher observes; one note-taker; recording optional and consent-gated.

**Task script** — four steps, in order:

1. *"Find the project that's furthest along in pilot."* — exercises portfolio filtering, scanning, and stat-tile comprehension.
2. *"Open one project and tell me whether it's on track."* — exercises dossier comprehension end-to-end; reveals whether the dossier answers the question it's structured around.
3. *"If you wanted to feed back about a problem, what would you do?"* — surfaces the user-feedback gap directly; findings feed the in-flight User Feedback capability change at `openspec/changes/add-user-feedback-capability/`.
4. Open prompt: *"What's missing here?"* — captures the gaps the script doesn't reach.

**Recruitment route** — Delivery Manager liaises with the DTS Crime Senior Leadership Team for the two Leadership slots and uses the existing Crime delivery contact list for the Delivery and All-staff slots. No external recruitment, no incentives — these are colleagues being asked for 30 minutes of their time on a portal built for them.

**Consent and privacy** — recordings only with explicit consent at session start; stored on the recording owner's HMCTS-issued device; deleted within **30 days**; no transcripts published outside the team; participant names not stored alongside notes (cohort label only, e.g. "Leadership-1").

## Options considered

1. **Five-session round split 2 / 2 / 1 (chosen).** Smallest credible round across all three audiences. Each cohort gets at least one session; mutation-heavy cohorts get two so triangulation is possible.
2. **Three sessions, one per audience.** Cheapest route to a "we did research" claim. Rejected: a single participant per audience can't distinguish personal preference from cohort signal.
3. **Ten sessions, three per audience plus a buffer.** Higher confidence per cohort, but doubles scheduling load and observer fatigue without proportional learning gain at this stage. The right shape for round two if round one's findings warrant it.
4. **Skip moderated sessions; ship an in-product feedback widget first and learn from passive signal.** Rejected: passive feedback is a long-tail signal that depends on users being motivated enough to type. Round-one usability problems will not be self-reported. The User Feedback capability is complementary, not a substitute.

## Decision rationale — option 1

- **User Researcher lens:** five participants is the documented threshold for surfacing the bulk of usability problems on a single product surface. The 2 / 2 / 1 split lets a single round speak to all three audiences without inflating cost.
- **Service Designer lens:** the task script tracks the actual user journey through the portal — find, comprehend, feedback, gap-spot. Step 3 is intentionally diagnostic of the feedback gap rather than directive; the answer ("I'd email someone" vs. "I'd use this button") is itself the finding.
- **Product Manager challenge:** "is this round shaped around a real decision?" — yes: it tests whether the audience model the portal is built around (Leadership / Delivery / All staff) is correct, whether the dossier answers "is this on track?" (the question it's structured around), and whether the feedback gap is felt in practice. All three feed concrete next-PR decisions.
- **Delivery cost:** five 30-minute sessions plus prep, observation, and a one-page memo per cohort is a single-week effort for the trio. Bounded, time-boxed, no external dependencies beyond participant availability.

## What this round will NOT do

Recorded explicitly so future-us knows these were considered, not forgotten:

- **No A/B testing.** The portal has too few users for an A/B split to reach significance, and v1 hasn't shipped.
- **No eye-tracking.** Cost vs. signal at this stage is poor; the task script will surface scanning problems without it.
- **No cohort statistics.** Five is a qualitative-signal sample, not a quantitative one. Findings will be themed, not counted.
- **No accessibility user testing.** Accessibility user research needs different recruitment (assistive-tech users), a different facilitator (accessibility-trained researcher), and a different script. A separate dedicated round is the right shape; this round won't half-do it.

## Outputs

- One **one-page findings memo per audience cohort** (three memos: Leadership, Delivery, All staff), filed under `design-reviews/` with a `2026-MM-DD-ur-round-1-{cohort}-findings.md` name.
- A `retrospectives/`-shaped action list of proposed changes, prioritised by audience and by which capability spec they touch.
- Updates to the relevant capability specs (`openspec/specs/*/spec.md`) where research surfaces a requirement gap. Each such update is a separate change proposal, not a side-effect of this decision.

## Consequences

- The trio commits to running the round once participants are confirmed; if recruitment stalls, the round is paused, not resized down.
- The User Feedback capability change at `openspec/changes/add-user-feedback-capability/` will reference the round-1 findings memo for step 3 once it lands.
- Round 2 is not scheduled here. The decision to run it is itself a future decision, informed by what round 1 surfaces.
- No code changes triggered by this decision. Spec changes are only triggered by findings, not by the act of running the round.

## Reversal triggers

Reopen this plan when **any** of the following becomes true:

1. Findings show the audience model is wrong — the 2 / 2 / 1 split needs rebalancing before round 2.
2. The preview environment becomes unreliable enough that participants can't complete the task script — pause the round; resume when stable.
3. The portfolio surfaces undergo a major change (e.g. a dossier rewrite, a new top-level navigation) — the script is re-validated against the new surface before any further sessions run.
4. A user-reported defect lands that makes one of the four script steps obsolete (e.g. the "is this on track?" answer becomes a labelled status field, not a comprehension exercise).

## Cross-references

- `design-reviews/2026-05-02-design-and-research-assessment.md` — the source assessment that flagged the research gap.
- `openspec/changes/add-user-feedback-capability/` — in-flight capability change; round-1 step 3 informs its scope.
- `openspec/specs/engineering-team/spec.md` — decision-arbiter convention used here (lens owner decides; co-signers concur in lane).
- `decisions/2026-05-02-defer-google-analytics.md`, `decisions/2026-05-02-e2e-coverage-prioritisation.md` — canonical decision-log shape this entry follows.
