# 2026-05-02 — Synthetic-persona evaluation as a multiplier on real user research, not a substitute

**Decision** — Build a small, scoped synthetic-persona evaluation loop that runs alongside the first round of real user research recorded in `decisions/2026-05-02-first-user-research-session.md`. Personas are LLM-driven characters that walk a task script in a controlled headless browser, and report observations to a transcript the team reviews. The output of synthetic personas SHALL NEVER be cited as "user research said" — these are two separate signals serving different jobs, and the boundary is enforced by where the artefacts live (`design-reviews/synthetic/` for synthetic, `design-reviews/research/` for real UR — separate folders, separate review cadences).

**Decider** — User Researcher (boundary owner — has veto on the citation rule), with Service Designer concurring on the task-script choice, Technical Architect signing off on the runtime shape, and Product Manager ratifying the scope (three personas, one task script, weekly cadence) against delivery cost. Lead Developer and QA / Test Engineer reviewed the runtime sketch for overlap with the existing Playwright harness — there is overlap, which is the point.

**Context** — The user (acting as Product Manager) asked whether agents could simulate UR sessions, whether personas could be generated, and whether an agent could simulate a human's emotional character. The honest answer from the User Researcher lens is: agents are excellent at *task-execution* surfacing of broken flows and unclear copy, and poor at the things real UR is actually *for* — surfacing absence, surfacing priority, surfacing the political and temporal context that shapes what a real user would actually do. The temptation to use synthetic personas as a cheap substitute for real participants is the failure mode the design assessment in PR #83 already named: "we will optimise for the users our model knows how to imitate, which is precisely the cohort UR is supposed to surface around". This entry codifies the boundary up front so the synthetic build is genuinely a multiplier on the real work, not a replacement.

## Coverage matrix

The two methods answer different questions:

| Question | Real UR (`first-user-research-session.md`) | Synthetic personas (this entry) |
|---|---|---|
| Should we build it? | Yes | No |
| Would users actually use it? | Yes | No |
| Is the priority right? | Yes | No |
| Is this flow broken? | Yes (slowly) | Yes (fast) |
| Is the copy unclear? | Yes (slowly) | Yes (fast) |
| Are there obvious dead-ends in IA? | Yes (slowly) | Yes (fast) |
| What did users *not* say? | Yes | No |
| What's the political/temporal context? | Yes | No |
| Does this regress over time? | No (point-in-time) | Yes (every CI run) |
| What would an under-represented user say? | Yes (with recruitment) | No (model-bias amplification) |

Synthetic personas earn their keep on the bottom three rows of the "fast" column and the regression row. They are net-negative for the rows where they answer "No" if their output is read as if it were real research.

## Options considered

1. **Don't build synthetic personas.** Cheapest. Loses the regression-coverage benefit and the pre-flight rehearsal benefit before each real UR session. The team has no automated check that the click-paths a real participant would walk are still intact between runs.

2. **Build synthetic personas as a substitute for real UR.** Fastest signal, lowest direct cost, highest indirect cost — synthetic outputs read as user-research findings is the failure mode the design assessment named. Rejected.

3. **Build synthetic personas as a multiplier on real UR (chosen).** Three personas, one task script, weekly CI run, transcripts reviewed by the User Researcher in the same review cadence as the real-UR memo (one page per cohort). Synthetic transcripts feed into a separate folder so the citation boundary stays visible.

4. **Build a much bigger synthetic-persona programme (10+ personas, multiple task scripts, daily run).** Tempting and would catch more regressions, but the marginal value per added persona drops fast and the maintenance cost (keeping personas current with the product, keeping task scripts current with the IA) compounds. Defer until the small build has run for at least one Wave.

## Decision rationale — option 3

- **User Researcher lens:** the citation boundary is the load-bearing rule. As long as the synthetic outputs cannot be confused with real research outputs, the synthetic loop is an asset; the moment they get cited interchangeably, it becomes a liability. Separate folders, separate review cadence, separate language ("synthetic personas observed" vs "research participants reported").
- **Service Designer lens:** task scripts are reusable across both methods. Writing one good script and running it through both is cheaper than maintaining two scripts. The first synthetic script SHALL be the same script used for the real UR sessions (slimmed where it asks for emotional or motivational reflection, which synthetic personas cannot answer honestly).
- **Technical Architect lens:** the runtime is a small extension of the existing Playwright harness. A persona is a system prompt + a task script; the agent is given the prompt, navigates a headless Chromium against the live preview (or a deploy preview build), and writes a transcript. No new infrastructure required; reuses the agent runtime already used by the engineering team.
- **Product Manager challenge:** "is this just CI for vibes?" — partly yes, and the persona transcripts SHALL be cheap to skim. The day they take more than ten minutes per week to triage is the day this loop is too big and gets pruned back to the agreed three personas.

## Scope of the first build

**Three personas** — chosen to span the audiences the portal is built for, deliberately matching the cohorts in `decisions/2026-05-02-first-user-research-session.md` so the two methods cover the same territory:

1. **Director-shape (Leadership cohort)** — wants the live filterable picture of every project plus comparisons over time. Reads dashboards; rarely edits anything; cares about exporting cleanly. Persona script emphasises scanning, filtering, and comparing — the actions a director would take in a 5-minute look-in.
2. **Project owner (Delivery teams cohort)** — submits projects, maintains a dossier, logs progress. Persona script emphasises the dossier edit flow and the action plan link — the actions an owner would take in a weekly update cadence.
3. **Newcomer (All staff cohort)** — has never seen the portal before. Persona script emphasises learning content, prompts, events, FAQ — the actions a curious-but-uninvested staff member would take on a first visit.

**One task script** — the same script used by the real-UR sessions, edited where it asks for emotional or motivational reflection. Specifically the synthetic version replaces *"Tell me how you feel about this"* with *"Walk me through what you would do next"*; the synthetic personas can answer the second honestly and would invent answers to the first.

**One run cadence** — weekly, on the green main build after CI lands. The transcripts go to `design-reviews/synthetic/<date>/<persona>.md`. The User Researcher reviews them in the same review block as the real-UR memo when both are present, separately when only one is.

**One assertion per persona, encoded as a Playwright test** — the persona MUST be able to complete the primary task in the script (find the dossier for a named project, edit it, see the change reflected). Failure of the assertion fails CI; the persona has hit a regression. The narrative transcript is signal alongside; the binary assertion is the load-bearing check.

## Constraints baked into this decision

- **Synthetic outputs SHALL NEVER be cited as "user research said".** Citation language: "synthetic personas observed" or "synthetic regression check". Anything stronger triggers a User-Researcher veto on the artefact.
- **Synthetic personas SHALL NOT be used to validate priority.** Priority decisions are user-outcome judgments and require real participants per the engineering-team spec's escalation stack.
- **Synthetic personas SHALL NOT be used as the sole accessibility check.** Accessibility user testing requires recruited participants; this is reaffirmed in `decisions/2026-05-02-first-user-research-session.md`.
- **Persona prompts SHALL be reviewed by the User Researcher before each new persona is added.** This stops the team from quietly accumulating personas that reflect our assumptions rather than our audiences.

## Consequences

- A small new folder lives at `design-reviews/synthetic/`. The first run produces three transcripts and one weekly-CI green tick.
- The Playwright suite gains three persona scenarios. They do NOT count toward the e2e coverage matrix in `decisions/2026-05-02-e2e-coverage-prioritisation.md` — that matrix is for *capability* coverage; this is for *journey* coverage and is bookkept separately.
- The first real-UR sessions (per `first-user-research-session.md`) produce a one-page memo per cohort. Synthetic personas produce weekly transcripts. The two are reviewed in the same block when both are present, with the User Researcher annotating each transcript with one line: *agrees with research / contradicts research / orthogonal*.
- Test coverage of broken click-paths becomes continuous. A regression in the dossier edit flow that today would land silently between research rounds will now trip a synthetic persona's CI assertion the next morning.

## Reversal triggers

Reopen this decision when **any** of the following becomes true:

1. A team member or stakeholder cites a synthetic-persona transcript as user research without the User Researcher's annotation. The boundary has failed; pause synthetic runs until the citation rule is re-established or the loop is dropped.
2. The weekly transcripts take more than ten minutes total to skim. The loop is too big; prune to two personas, or one persona-per-week rotated through the three.
3. A new audience cohort is added to the portal's target users and is not represented by any of the three personas. Either swap a persona out or add a fourth — but only with User Researcher review of the prompt.
4. The synthetic Playwright assertions never fail across an entire Wave. The personas have stopped catching regressions either because the product is unusually stable (good — keep them) or because the personas have drifted away from the actual UI (bad — refresh the prompts and task script).
5. Real-UR signal contradicts synthetic-persona signal more than once. The personas are mis-tuned; rebuild from current research findings rather than imagined audiences.

## Cross-references

- `decisions/2026-05-02-first-user-research-session.md` — the real-UR plan this multiplier sits alongside.
- `design-reviews/2026-05-02-design-and-research-assessment.md` — flagged "zero recorded UR" as the most urgent non-UI risk; this entry plus the real-UR plan are the two-track response.
- `decisions/2026-05-02-e2e-coverage-prioritisation.md` — capability coverage matrix; synthetic-persona runs are bookkept separately because they cover *journeys* not capabilities.
- `openspec/specs/engineering-team/spec.md` — the User Researcher's role in priority decisions; this entry confirms synthetic personas do not enter that decision-arbiter stack.
- `openspec/changes/add-user-feedback-capability/` — synthetic personas can also exercise the User Feedback widget once it ships, generating sample tickets for the agent runtime to triage.
