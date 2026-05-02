# team-retrospective Specification

## Purpose
Retrospectives are the team's self-improvement loop. The team pauses, reflects honestly on what went well and what didn't, identifies actions, and follows through. Without retros, gaps accumulate silently — like a CI workflow failing on every run while no one watches. With retros, the team catches those gaps and converts them into improvements.

For an agent team operating in short bursts rather than week-long sprints, retros happen at natural cadence points (end of a meaningful piece of work, end of a parallel-agent batch, when a CI signal has been ignored, when a recurring problem appears) rather than on a fixed calendar.

Retros are blame-free. The framing is "what about the system produced this outcome" rather than "who failed". The same applies to agent personas as to humans.

## Requirements

### Requirement: Retros happen at natural cadence
The team SHALL hold a retrospective when any of the following triggers fire:

- a parallel-agent batch concludes (multiple PRs from the same effort have merged or closed);
- a CI job has reported failure on at least three consecutive runs without remediation;
- a recurring problem appears across two or more changes;
- on demand whenever any persona surfaces an issue worth reflecting on;
- at least every two weeks of active work, even if no specific trigger fired.

#### Scenario: Parallel-agent batch concludes
- **WHEN** a wave of parallel agents finishes (every PR from the batch is either merged or closed)
- **THEN** the team SHALL hold a retrospective covering what that wave revealed
- **AND** the outcome SHALL be recorded under `retrospectives/`

#### Scenario: Ignored CI signal
- **WHEN** a CI job has reported failure on at least three consecutive runs without remediation
- **THEN** the next retrospective SHALL include the failing job as a topic
- **AND** the action items SHALL include either fixing the job or removing it

#### Scenario: Time-based fallback
- **WHEN** two weeks of active work have passed without any other trigger firing
- **THEN** the team SHALL hold a retrospective regardless
- **AND** the trigger SHALL be recorded as "time-based" in the retro file

### Requirement: Standard format
Every retrospective SHALL be recorded as a markdown file in `retrospectives/` at repo root, named `YYYY-MM-DD-<short-slug>.md`. Each file SHALL include the following sections in this order:

- **Date** — ISO date
- **Trigger** — what prompted this retro (batch concluded / ignored signal / recurring problem / on demand / time-based)
- **Participants** — which personas were active
- **Previous retro action items** — status of each item from the prior retro (done / in-flight / dropped with rationale); for the first retro this section reads "first retrospective — none"
- **What went well** — observations only; no individual blame
- **What didn't go well** — observations only; no individual blame
- **Surprises** — things the team didn't expect, positive or negative
- **Action items** — concrete, owned, with a target artefact and horizon
- **Working agreements changed** — any change to how the team operates as a result of this retro

#### Scenario: Action items are concrete
- **WHEN** a retro produces an action item
- **THEN** the item SHALL state which persona owns it, what artefact it produces (PR slug, decision-log entry, spec change, working-agreement note), and a rough horizon (this batch / next batch / this week)
- **AND** the item SHALL appear in the retro's `Action items` section

#### Scenario: Vague observations are sharpened
- **WHEN** a draft retro contains a vague entry like "communication was a bit unclear"
- **THEN** the Delivery Manager SHALL push for a concrete observation (which message, which decision, what got missed) before the retro is filed
- **AND** the entry SHALL either be sharpened or removed

### Requirement: Action items are followed through
Action items recorded in retrospectives SHALL be followed up in subsequent work. The Delivery Manager owns follow-through; the next retrospective SHALL acknowledge the previous retro's action items and their status.

#### Scenario: Previous action items checked at the next retro
- **WHEN** a retrospective begins
- **THEN** the team SHALL check the action items of the previous retro
- **AND** record their status (done / in-flight / dropped with rationale) at the top of the new retro
- **AND** items dropped without rationale SHALL be flagged and re-discussed

### Requirement: Blame-free framing
Retrospectives SHALL be observation-led, not blame-led. The framing question is "what about our working system produced this outcome" rather than "who failed". This applies to agent personas in the same way as it would to humans.

#### Scenario: A specific persona missed a signal
- **WHEN** a retro identifies that a persona missed a signal (e.g. DevOps Engineer didn't catch a repeatedly-failing CI job)
- **THEN** the retro SHALL frame it as a system question — what the persona could have used to catch it earlier — rather than as a personal failing
- **AND** the resulting action item SHALL improve the system (e.g. add a CI-on-main check to the dispatch prompt) rather than tell the persona to "try harder"

### Requirement: Delivery Manager facilitates
The Delivery Manager SHALL facilitate retrospectives — call them when triggers fire, ensure participants are present, write the file, follow up on action items between retros.

#### Scenario: Delivery Manager is on standby
- **WHEN** a retro trigger fires and the Delivery Manager is on standby
- **THEN** the Delivery Manager SHALL be activated for the retro
- **AND** SHALL remain active until the retro is filed and action items are queued

### Requirement: Retros are not decisions
Retros surface observations and produce action items; they SHALL NOT directly make team decisions about scope or architecture. Decisions that emerge from a retro SHALL be filed in `decisions/` per the engineering-team spec, with the retro linking to the decision file.

#### Scenario: A retro identifies a needed architecture change
- **WHEN** a retro surfaces a recurring issue that warrants an architectural change
- **THEN** the retro SHALL record it as an action item ("Decide whether to refactor X")
- **AND** the actual decision SHALL be made in a separate decision-log entry following the conflict-resolution-stack rules from the engineering-team spec
- **AND** the retro file SHALL link to the resulting decision file once written
