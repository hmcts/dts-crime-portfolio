## ADDED Requirements

### Requirement: Regression test on every defect fix
Every PR that fixes a defect SHALL include at least one automated test that fails on the unfixed code and passes on the fix. The test SHALL exercise the specific behaviour that broke, not just the surrounding feature, so the same defect cannot return undetected. The QA / Test Engineer chooses the test layer (unit, integration, or end-to-end) using the heuristics below; reviewers SHALL bounce a defect-fix PR that lacks a regression test or a recorded exemption.

A "defect" for the purpose of this requirement means any of:

- a bug reported by a user (whether internal team member or external),
- a bug found by QA exploration,
- a bug found in code review,
- a bug surfaced by production logs, alerts, or analytics,
- a bug surfaced by a CI signal (test failure, CodeQL, dependency scan).

Test-layer heuristics:

- Pure-function or data-transformation defects → **unit test** at the function level.
- Route handlers, API contracts, middleware, and adapters → **unit test** with appropriate mocks (the layer Wave 1 routes already use), or an integration test if the defect spans more than one collaborator.
- Defects only visible end-to-end through the rendered UI (form submission, navigation, cookie behaviour, browser-level redirects) → **end-to-end test** in Playwright.

The PR description's `Test plan` section SHALL name the new regression test by file path (and ideally test name), so a reviewer can locate it without grepping the diff.

#### Scenario: Defect-fix PR without a regression test
- **WHEN** a PR that fixes a defect is opened without a corresponding test
- **THEN** the QA / Test Engineer or any reviewer SHALL request a regression test before approval
- **AND** the PR SHALL NOT merge until either the test lands or an exemption is recorded per the exemption scenario below

#### Scenario: Sign-out redirect regression
- **WHEN** a defect is fixed in a route handler (e.g. the preview-auth sign-out route returning the wrong redirect host on Render)
- **THEN** the PR SHALL include a unit test that drives the handler with a request URL that reproduces the broken environment
- **AND** the test SHALL assert the response shape that the fix produces (status code, `Location` header, cookie deletion)
- **AND** the test SHALL fail when run against the unfixed code, proving it would have caught the regression

#### Scenario: User-visible flow regression
- **WHEN** a defect is fixed in a user-visible flow that depends on browser behaviour (form submission, redirect chain, cookie scoping)
- **THEN** the PR SHALL include a Playwright end-to-end test that walks the flow and asserts the corrected behaviour
- **AND** the e2e test SHALL be added to the existing `playwright/tests/` directory and run in the existing `playwright.yml` workflow so it gates future merges

#### Scenario: Repeated defect in the same surface
- **WHEN** the team sees a third defect in the same surface within a six-week window despite each prior fix shipping with a regression test
- **THEN** the recurrence SHALL be raised in the next team retrospective per the team-retrospective spec
- **AND** the QA / Test Engineer SHALL propose a structural change (richer test layer, contract test, CI signal change) rather than a fourth point fix
- **AND** the proposal SHALL be recorded in the decision log

#### Scenario: Genuinely-irreproducible defect (narrow exemption)
- **WHEN** a defect is reproducible only in conditions the local CI cannot recreate (e.g. a specific third-party API state, a runtime detail the platform does not expose to tests)
- **THEN** the PR MAY merge without a regression test
- **AND** the exemption SHALL be recorded in `decisions/` per the existing "Every decision is recorded in the decision log" requirement
- **AND** the decision file SHALL name the trigger condition under which a regression test would become possible (e.g. "when a Render-preview equivalent runtime is available in CI")
- **AND** the next retrospective SHALL revisit the open exemption
