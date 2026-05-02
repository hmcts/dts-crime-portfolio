## Why

The portal collects no in-product feedback today. Users who hit a bug,
spot a content error, or have an improvement idea have no way to surface
it from inside the product. That information either goes nowhere, or
travels through chat / email / a corridor conversation, where it
loses context (which page, which version, which role) and rarely turns
into a tracked change. The longer that gap stays open, the more we ship
in a direction we'd revisit if we'd asked.

Separately, the team has standardised on agent personas doing the
delivery work (see `openspec/specs/engineering-team/spec.md`). The
feedback channel is an opportunity to wire those agents into a closed
loop: user submits → ticket on a GitHub Project board → agents triage
and build → human merges. Humans stay on the load-bearing decision
(what reaches `main`); agents do the toil between submission and PR.

The cost of *not* doing this is paid in two places: first, in the gap
between user-visible problems and ticket creation, where most reports
silently die; second, in the team's own bandwidth, because every report
that does land needs human time before any code moves.

## What Changes

Add a new behavioural capability that defines:

1. An in-app **feedback widget** (persistent button or menu item in the
   primary chrome) reachable from every authenticated page. Submitters
   pick a type (`bug`, `idea`, `improvement`, `question`), write a free-
   text body, optionally attach a screenshot, and optionally include
   auto-captured context (current page URL, user agent, app version).

2. A **feedback intake API** that converts each submission into a
   GitHub Project ticket on a dedicated project board, in the `New`
   column, with a structured body the agents can read deterministically.

3. A **GitHub Project board lifecycle** with the columns `New`,
   `Triage`, `Needs Human Review`, `In Progress`, `Ready for Approval`,
   and `Done`, each owned by either the agent team or the human team
   per the spec's role separation.

4. An **agent contract** that defines the minimum behaviour an agent
   must follow when claiming a ticket: triage in writing, plan before
   building, run the full test suite locally, open the PR linked to
   the ticket, and never modify CI configuration / secrets / branch
   protection without first parking the ticket in `Needs Human Review`.

5. A **human merge gate** that is non-negotiable. Branch protection
   on `main` SHALL block any merge by an agent identity. Every change
   that reaches production goes through a human reviewer first.

6. **Notifications and submitter follow-up** that close the loop:
   submitters receive confirmation on submit and (optionally, with
   consent) a follow-up when their ticket lands. The human team is
   notified when a ticket enters `Needs Human Review` or `Ready for
   Approval`, but is otherwise left alone.

The capability is additive — it does not modify any existing capability
behaviourally. It does, however, depend on `engineering-team` for the
agent role definitions and on `analytics` (already specced) so we can
measure submission volume without leaking the body of any submission.

## Capabilities

### New Capabilities

- `user-feedback`: in-app feedback widget, intake API, GitHub Project
  ticket lifecycle, agent contract for autonomous triage + build, and
  the human merge gate that keeps final authority on production
  changes with people.

### Modified Capabilities

None. `engineering-team`, `access-control`, and `analytics` are
referenced but not behaviourally changed.

## Open Questions

These need resolution before implementation begins; flagging them up
front so the user (acting as Product Manager) can rule on each before
the agents are pointed at this work. Each is reflected in this proposal
as an explicit gap rather than an inferred requirement.

1. **Submitter identity handling.** Feedback bodies may include personal
   data that the submitter typed without thinking. Default position:
   the intake API SHALL strip auto-captured `x-user-email` from the
   stored ticket body; the *body itself* is stored verbatim and is the
   submitter's responsibility. Should we go further (PII scanner on
   intake, redact-on-write, stop the user from submitting if the body
   contains an email)? Current spec proposal: do nothing automated, add
   inline copy on the widget telling the user not to include personal
   data.

2. **SLA between submission and first agent action.** Brief asks the
   question; this proposal pins `15 minutes from submission to ticket
   move out of New` as the default agent-team SLA, with a `Needs
   Human Review` fallback if no agent claims it within an hour. The
   user may want a tighter or looser number; the spec marks it as a
   tunable threshold rather than a hard SHALL.

3. **Public changelog from closed tickets.** Brief asks; this proposal
   defers it. Building the loop first and *then* asking whether a
   public-facing changelog is wanted is cheaper than over-specifying
   now. Spec includes the hook (Done tickets carry a `shippedSummary`
   field) but does not commit to publishing one.

4. **Scope boundary against the existing "Help / FAQ" capability.**
   FAQ is curated content; user feedback is incoming reports. Default
   position: the widget is not a search box and does not consult the
   FAQ before submission. We accept some duplicate "where is X?"
   tickets in exchange for a frictionless submit path.

5. **Auto-routing of sensitive areas.** This proposal codifies that
   any ticket whose body or context touches authentication, billing,
   data retention, or access control SHALL be auto-routed to `Needs
   Human Review` regardless of agent assessment. The keyword set is
   listed in the spec; the user may want to add domains (e.g. anything
   touching the action plan, anything touching the upstream proxy
   contract).

## Impact

- **New code:** in-app widget component (`components/FeedbackWidget.tsx`
  or similar), intake API route at `app/api/feedback/submit/route.ts`,
  a server-side GitHub-API client wrapping ticket creation, and a
  small admin-only page at `/profile/feedback-history` so a submitter
  can see what they've sent.

- **External dependencies:** a GitHub Project on `hmcts/dts-crime-
  portfolio` repo (or a new dedicated repo if scope grows), a
  GitHub App or fine-grained PAT with `issues:write`,
  `contents:read`, `pull-requests:write` (for agents) and
  `projects:write` (for ticket movement). Branch protection on `main`
  must require human review (already in place; this spec depends on
  it).

- **Operational:** agents need a runtime — either GitHub Actions
  workflows triggered by Project events, or a long-lived agent runner
  (Claude Code, similar). The spec is implementation-agnostic on the
  runtime; it specifies the contract the runtime must satisfy.

- **Privacy:** submission bodies may include PII. Storage is GitHub
  (the ticket body), retention follows GitHub's defaults (i.e.
  forever, unless the ticket is deleted). Any move toward redaction-
  on-write or short-retention storage is a follow-up change.

- **Cost:** GitHub Projects and Actions are within HMCTS's existing
  GitHub Enterprise allowance. Agent compute (whichever runner) is the
  marginal cost; the user retains the lever to throttle or pause
  agents.

- **Lifecycle:** this capability is intended to be permanent. If the
  agent team is later disbanded, the human-only fallback is unchanged
  — tickets land in `New`, a human triages directly. The agents are
  load on top of the contract, not the contract itself.

## Cross-references

- `openspec/specs/engineering-team/spec.md` — the team that the agent
  team plugs into; agents are an automation layer over the personas,
  not a replacement.
- `openspec/specs/analytics/spec.md` — submission volume is measurable
  via a new closed-catalogue event (added in implementation, not
  scoped in this spec change).
- `openspec/specs/access-control/spec.md` — the widget is gated by
  the same authentication as every other surface; the human merge
  gate is the immovable rule for what an agent can do.
- `decisions/2026-05-02-e2e-coverage-prioritisation.md` — the same
  prioritisation lens applies to user-feedback test coverage when
  this capability ships.
- `retrospectives/` — the existing retro spec already declares that
  defects produce a regression test. Submission → ticket → fix → PR
  must satisfy that rule; the spec ties the agent contract to it
  explicitly.
