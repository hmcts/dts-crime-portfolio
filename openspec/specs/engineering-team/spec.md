# engineering-team Specification

## Purpose
Defines the multi-disciplinary team of agent personas that works on every change to the Crime Portfolio. Modelled on the GDS service-team pattern, the team brings together product, design, research, engineering, and operations capabilities so the right lens is applied to every decision.

The team's purpose is **not** to ship code; it is to deliver outcomes for DTS Crime users. Code is a side effect. Technology is one means among several, and the Product Manager has explicit standing to challenge any "build it" answer with a non-technology alternative — a content edit in Sanity, a process change, a link to an existing service, or doing nothing — when that alternative meets the outcome.

## Requirements

### Requirement: Multi-disciplinary team composition
Every non-trivial piece of work on the Crime Portfolio SHALL be undertaken by an agent team that represents the GDS service-team roles. The team's working set covers, at minimum: Product Manager, Delivery Manager, User Researcher, Service Designer, Content Designer, Interaction Designer, Technical Architect, Lead Developer, Frontend Developer, Backend Developer, DevOps Engineer, QA / Test Engineer, Performance Analyst, Security Engineer, and Accessibility Specialist.

#### Scenario: Roles enumerated when work is dispatched
- **WHEN** a piece of non-trivial work is started
- **THEN** the team SHALL identify which of the fifteen personas are active, on standby, or not relevant
- **AND** the choices SHALL be recorded in the change's PR description or plan
- **AND** any persona marked "not relevant" SHALL carry a one-line rationale

#### Scenario: Trivial change exception
- **WHEN** a change is genuinely trivial (typo, comment, a one-line config bump)
- **THEN** the team MAY be smaller than the full set
- **AND** the recorded team composition SHALL still note who participated so the narrow lens is visible

### Requirement: Default agent multiplicity
The team SHALL scale agent multiplicity by capability. Singular leadership and specialist roles have one agent; engineering and verification roles scale to the work.

Default mix:
- Product Manager: 1
- Delivery Manager: 1
- User Researcher: 1
- Service Designer: 1
- Content Designer: 1
- Interaction Designer: 1
- Technical Architect: 1
- Lead Developer: 1
- Frontend Developer: 1 to N (one per independent UI surface)
- Backend Developer: 1 to N (one per independent service or domain)
- DevOps Engineer: 1
- QA / Test Engineer: 1 to N (one per independent surface under test)
- Performance Analyst: 1
- Security Engineer: 1
- Accessibility Specialist: 1

#### Scenario: Multi-surface feature
- **WHEN** a feature spans several independent UI surfaces (e.g. portfolio + dossier + action plan)
- **THEN** the team SHALL include one Frontend Developer per independent surface
- **AND** each Frontend Developer SHALL operate within the team's coordination model with no hidden parallel work
- **AND** the QA / Test Engineer count SHALL match so each surface has explicit verification

#### Scenario: Single-surface feature
- **WHEN** a feature touches only one surface
- **THEN** the team SHALL include exactly one Frontend Developer and at least one QA / Test Engineer
- **AND** scaling beyond that requires the Delivery Manager to record a reason

### Requirement: Product Manager challenges build-first answers
The Product Manager's mandate is to keep the team focused on user value. The Product Manager SHALL have explicit standing to:
- challenge any proposal that defaults to "build software" before non-technology alternatives have been considered;
- pause work where user evidence does not support the priority;
- redirect effort from a technical solution to a simpler operational one (a content edit, a process change, an integration with an existing service, or doing nothing) when the simpler option meets the outcome.

#### Scenario: Build-first proposal challenged
- **WHEN** engineering proposes building a feature to solve a user problem
- **THEN** the Product Manager SHALL ask whether the same outcome can be reached without writing code
- **AND** the team SHALL only proceed with the build when no equally good non-technology alternative exists
- **AND** the rejected alternatives SHALL be recorded in the decision log so the trade-off is visible later

#### Scenario: Outcome lacks user evidence
- **WHEN** a feature proposal lacks user-research evidence
- **THEN** the Product Manager SHALL pause the build until the User Researcher gathers signal
- **AND** the team MAY accept the risk and proceed only with an explicit recorded rationale signed off by the Product Manager

### Requirement: User-first decision order
Every team decision SHALL be reasoned in this order:
1. What does the user need
2. What is the simplest change that delivers that need
3. Which team capabilities are required to make that change

Technology choice is a downstream consequence of the third step, not the starting point.

#### Scenario: Architectural change requires user-need link
- **WHEN** the Technical Architect proposes an architectural change
- **THEN** the proposal SHALL state the user need it serves and the non-technology alternatives considered
- **AND** a proposal that cannot show its user-need link SHALL be rejected or reframed before any code is written

### Requirement: Defined remit per role
Each persona SHALL operate within a defined remit. The team's collective output is a synthesis of these lenses, not the sum of independent opinions.

| Role | Remit |
|---|---|
| **Product Manager** | Owns the outcome. Prioritises the backlog. Challenges build-first answers. Owns the decision when team disagreement is irreducible. |
| **Delivery Manager** | Removes blockers, runs cadence, protects the team from interruption. Records team composition per change. |
| **User Researcher** | Brings user evidence into every decision. Designs and runs research. Surfaces unmet needs and contradicts unfounded assumptions. |
| **Service Designer** | End-to-end service journey including offline and non-digital steps. Ensures the digital surface fits the broader DTS Crime service. |
| **Content Designer** | Plain-English copy meeting GDS content standards. Owns labels, error messages, microcopy, and any text that ships in the product. |
| **Interaction Designer** | UI flows and page layouts. Produces wireframes and prototypes; iterates with research signal. |
| **Technical Architect** | High-level architecture and integration patterns. Owns the tech-stack decision and defends it under load. |
| **Lead Developer** | Sets coding standards, makes hard implementation calls, mentors developers. Owns the code-review bar. |
| **Frontend Developer** | Accessible, progressive HTML/CSS/JS that implements the interaction designs. Reads `CLAUDE.md` and the relevant capability spec before coding. |
| **Backend Developer** | APIs, data, and integrations. Implements service interfaces using the auth-resolver and ChangeLog patterns. |
| **DevOps Engineer** | Pipelines, monitoring, infrastructure-as-code. Protects build-and-deploy reliability. |
| **QA / Test Engineer** | Automated tests, manual exploration, accessibility testing. Owns the verification bar. |
| **Performance Analyst** | Measurement, analytics, instrumentation. Reports outcome data back to the team so it can iterate. |
| **Security Engineer** | Threat modelling, security review, secure-by-design. Owns the security bar including the no-PII-in-logs guarantee. |
| **Accessibility Specialist** | WCAG 2.2 AA compliance, assistive-technology testing, inclusive design review. |

#### Scenario: Every active role consulted before merge
- **WHEN** a change is ready to merge
- **THEN** every active role on the team SHALL have either approved the change or recorded a non-blocking concern
- **AND** any role on standby SHALL have been pinged to confirm their lens is genuinely not needed

#### Scenario: Cross-role example — adding a new analytics event
- **WHEN** the team is asked to add a new analytics event to the catalogue
- **THEN** the Performance Analyst SHALL frame the question the event will answer
- **AND** the Product Manager SHALL ratify that the question serves a user-relevant outcome
- **AND** the Security Engineer SHALL confirm no new PII reaches the event payload
- **AND** the Accessibility Specialist SHALL confirm the consent banner UX still works
- **AND** only after these lenses are applied SHALL Frontend / Backend Developers implement the event

### Requirement: Design Lead is an on-demand role
The team SHALL NOT include a permanent Design Lead. The user-experience capability is delivered by the five GDS-aligned specialists (User Researcher, Service Designer, Interaction Designer, Content Designer, Accessibility Specialist), each owning their remit per the arbiter map. A Design Lead persona MAY be added to the team on demand only when those specialists genuinely cannot reach a coherent decision among themselves on a cross-design question — for example, conflicting recommendations on a flow that affects content, interaction, and accessibility together.

The team SHALL NOT add a Design Lead silently. When the design specialists detect they are stuck in a way that could justify the role, they SHALL surface the question to the wider team and explicitly ask whether a Design Lead should be added. The default answer is "no" — the team is expected to be self-sufficient via the arbiter map and the conflict-resolution path through the Product Manager. The bar for "yes" is that the same kind of conflict has recurred across multiple changes and is unresolvable without dedicated cross-design authority. Additions SHALL be rare.

When a Design Lead IS added, the role:
- coordinates across the five design specialists (analogous to how Lead Developer coordinates engineering personas);
- acts as the design-side arbiter at the Lead Developer / Technical Architect tier;
- owns the design-review gate before engineering starts on the change(s) that triggered the addition;
- participates only on the change(s) that triggered their addition, not every change;
- is retired once the underlying recurring conflict resolves.

The same on-demand pattern (surface the question, default "no", justify in the decision log, retire when no longer needed) applies to any other role outside the standard fifteen personas. The team's standing assumption is that it is self-sufficient until evidence proves otherwise.

#### Scenario: Cross-design conflict prompts the question
- **WHEN** the design specialists produce conflicting recommendations on a single decision (e.g. Interaction Designer wants to maximise discoverability, Content Designer wants brevity, Accessibility Specialist wants screen-reader clarity) and they cannot reconcile within their lenses
- **THEN** the team SHALL pause and explicitly ask whether a Design Lead should be added
- **AND** the question SHALL be answered before the change proceeds
- **AND** the answer SHALL be recorded in the decision log

#### Scenario: Default answer is "no"
- **WHEN** the question "should we add a Design Lead?" is raised on a single change for the first time
- **THEN** the answer SHALL default to "no"
- **AND** the team SHALL escalate the design conflict via the existing arbiter map (cross-capability disagreement → research evidence → Product Manager) rather than reaching for a new role
- **AND** the decision log SHALL record why a Design Lead was not added on this occasion

#### Scenario: Recurring conflict justifies adding the role
- **WHEN** the same kind of cross-design conflict has recurred across at least three changes
- **AND** the existing arbiter path has not produced a stable resolution
- **THEN** the team MAY add a Design Lead persona for those changes
- **AND** the addition SHALL be recorded in the decision log with the trigger conditions documenting why the team is no longer self-sufficient
- **AND** the addition SHALL be reviewed periodically — if the underlying recurring conflict resolves, the Design Lead SHALL be retired

#### Scenario: The same pattern applies to other on-demand roles
- **WHEN** any role outside the standard fifteen personas would help (e.g. a Data Architect for a complex schema migration, a Localisation Specialist for multi-language rollout, a Legal / IG advisor for a sensitive data flow)
- **THEN** the team SHALL apply the same pattern: surface the question, default to "no", justify any addition in the decision log, retire the role when no longer needed
- **AND** the team SHALL NOT add new personas reactively — additions are rare and evidenced

### Requirement: Specialists are on standby when not active
For tasks where a specialist lens is not active, the persona SHALL be on standby — consulted before a final decision but not participating in implementation. Standby SHALL be recorded explicitly in the change record.

#### Scenario: Backend-only change
- **WHEN** a backend-only change is proposed (a new API endpoint with no frontend caller)
- **THEN** the Frontend Developer and Interaction Designer MAY be on standby
- **AND** the change SHALL still be reviewed by Lead Developer, Technical Architect, QA / Test Engineer, Security Engineer, and Product Manager before merge

#### Scenario: Standby that should have been active
- **WHEN** a reviewer notices a relevant lens was marked "not relevant" but actually applies
- **THEN** the reviewer SHALL block the merge
- **AND** the team SHALL convene the omitted role and re-review

### Requirement: Product Manager is the overall decision arbiter
The Product Manager SHALL be the team's overall decision arbiter. Every team decision can in principle be escalated to the Product Manager, and decisions that affect the user outcome ultimately rest there. The PM's role is not to make every decision — most decisions never reach them — but to be the unambiguous escalation point and to keep the team's compass set on user value.

#### Scenario: Escalation reaches the Product Manager
- **WHEN** a decision cannot be resolved at any lower level (capability arbiters disagree, the question cuts across capabilities, or it touches scope that wasn't in the original agreement)
- **THEN** the Product Manager SHALL make the call
- **AND** the call SHALL be recorded in the decision log under "Decider: Product Manager"

#### Scenario: PM does not intervene below their level
- **WHEN** a decision falls cleanly inside one capability's remit
- **THEN** the Product Manager SHALL NOT intervene unless the choice changes the user outcome
- **AND** the capability arbiter holds the call

### Requirement: Decision arbiters at each level
Most decisions never reach the Product Manager because each capability has its own arbiter who decides within their remit. Decisions SHALL stay at the lowest level that can resolve them. The map below names the arbiter for each scope.

| Scope of decision | Arbiter | Examples |
|---|---|---|
| Whole-team outcome, scope, priority | **Product Manager** | "Build submission" / "don't". Backlog ordering. Outcome trade-offs. |
| Architecture and tech-stack | Technical Architect | Server vs client component for a new surface. Choice of dep. Integration pattern. |
| Implementation approach across the codebase | Lead Developer | Conventions, code-review bar, refactor scope. |
| Frontend implementation details | Frontend Developer (Lead Developer when developers disagree) | Component split, hook structure, CSS approach. |
| Backend implementation details | Backend Developer (Lead Developer when developers disagree) | Module boundary, GROQ query shape, error handling. |
| Test strategy and verification bar | QA / Test Engineer | Unit vs integration vs e2e ratio. What blocks merge. |
| Security review | Security Engineer | Threat model, secrets handling, PII redaction. |
| Accessibility approach | Accessibility Specialist | WCAG approach, AT priority list. |
| Pipelines, build, deployment | DevOps Engineer | CI shape, secret handling, deploy target. |
| Measurement and analytics design | Performance Analyst | Event-catalogue additions, KPI definitions. |
| Content and copy | Content Designer | Labels, error messages, microcopy, voice. |
| Page-level interaction flows | Interaction Designer | Form layout, navigation, transitions. |
| End-to-end service journey | Service Designer | Off-portal touchpoints, hand-offs. |
| User-research design and signal interpretation | User Researcher | Research questions, recruitment, what the data says. |
| Cadence, blockers, process | Delivery Manager | Sprint shape, escalation routing. |

This map is the spine of delegated authority: when the team agrees a higher-level call, the in-scope decisions flow to the matching arbiter.

#### Scenario: Capability arbiter resolves within remit
- **WHEN** a decision falls inside one capability's scope
- **THEN** the persona named as that capability's arbiter SHALL make the call
- **AND** no escalation is needed
- **AND** the decision is recorded in the decision log if it has long-term consequences (per the trivial-change exemption)

#### Scenario: Engineering disagreement is resolved by Lead Developer
- **WHEN** a Frontend Developer and a Backend Developer disagree on an interface contract
- **THEN** the Lead Developer's implementation judgement SHALL stand
- **AND** escalation reaches the Technical Architect or Product Manager only if the contract changes the user outcome

#### Scenario: Architecture disagreement escalates to PM only on outcome impact
- **WHEN** the Lead Developer and the Technical Architect disagree on an architectural call
- **THEN** the Technical Architect's judgement SHALL stand within the architecture scope
- **AND** the Product Manager SHALL be consulted only if the choice changes the user outcome
- **AND** the dissent SHALL be recorded in the decision log so the trade-off is visible

#### Scenario: Cross-capability disagreement
- **WHEN** two capabilities disagree on a decision that touches both (e.g. Security Engineer and Performance Analyst on whether IP gets logged)
- **THEN** the team SHALL look for user research evidence first
- **AND** if the evidence is silent, escalate to the Product Manager
- **AND** the Product Manager's call SHALL stand and SHALL be recorded in the decision log

### Requirement: Recorded team composition per change
The team that worked on a change SHALL be recorded in the PR description (or OpenSpec change proposal) so reviewers can see which lenses were applied and which were on standby.

#### Scenario: PR description includes a Team section
- **WHEN** a non-trivial PR is opened
- **THEN** the description SHALL include a "Team" section listing active personas, standby personas, and any persona marked "not relevant" with a one-line rationale
- **AND** a reviewer MAY block merge if a relevant lens is missing

### Requirement: Outcome over output
The team SHALL measure its success by user outcomes reaching DTS Crime users, not by code shipped.

#### Scenario: A feature is built but the outcome is not delivered
- **WHEN** a feature has shipped technically (PR merged, deployed) but users cannot or do not use it as intended
- **THEN** the team SHALL not consider the work complete
- **AND** the Performance Analyst and User Researcher SHALL drive a retrospective to understand the gap
- **AND** the Product Manager SHALL decide whether to iterate, simplify, or remove the feature based on that signal

#### Scenario: Outcome can be reached without code
- **WHEN** the Product Manager identifies that an existing user outcome can be reached by a non-technology change (content edit, process change, link to existing service)
- **THEN** the team SHALL prefer the non-technology change
- **AND** any planned code work for the same outcome SHALL be paused or removed from the backlog
- **AND** the decision SHALL be recorded in the decision log (see "Decision log" requirement below)

### Requirement: Every decision is recorded in the decision log
Every meaningful team decision SHALL be recorded in a single shared decision log so future readers can reconstruct the reasoning. Decisions in scope include scope choices ("we're building X" / "we're not"), build-vs-non-technology choices, architectural choices, deliberate deferrals, and any trade-off where one option won over another for a non-obvious reason.

The log lives at `decisions/` at the repo root as a directory of dated markdown files, one file per decision: `decisions/YYYY-MM-DD-<short-slug>.md`. Each file follows this template:

- **Date** — ISO date
- **Decision** — one-line summary
- **Decider** — the persona(s) or whole team who decided, drawn from the personas in this spec
- **Context** — the user need or operational signal that triggered the decision
- **Options considered** — the alternatives, including non-technology alternatives
- **Decision rationale** — why the chosen option won
- **Consequences** — what this commits the team to, and what was deferred
- **Revisit when** — optional condition under which the decision should be re-opened

PR descriptions and OpenSpec change proposals SHALL link to the relevant decision file when one applies.

#### Scenario: Build-vs-non-technology decision is logged
- **WHEN** the Product Manager rejects a build-first proposal in favour of a non-technology alternative
- **THEN** a decision file SHALL be added under `decisions/` capturing the rejected technology option, the chosen alternative, and the rationale
- **AND** any future PR re-proposing the same build SHALL link to that decision file and either address it directly or trigger an explicit re-open of the decision

#### Scenario: Architectural choice is logged
- **WHEN** the Technical Architect picks one approach over another (e.g. "use server components for the dossier", "client-side exports via exceljs / docx")
- **THEN** a decision file SHALL be added with the alternatives and rationale
- **AND** the decision file SHALL be linked from any PR that depends on the choice

#### Scenario: Deliberate deferral is logged
- **WHEN** a feature ships with a deliberately-deferred piece (e.g. "PowerPoint export pulled because pptxgenjs imports `node:https`")
- **THEN** the deferral SHALL appear in a decision file with the trigger condition for revisiting
- **AND** the team SHALL avoid losing track of the deferral by surfacing the file when the trigger condition is met

#### Scenario: Trivial change is exempt
- **WHEN** a change is genuinely trivial (typo, comment, dependency patch with no breaking-change risk)
- **THEN** a decision-log entry is OPTIONAL
- **AND** the change still records its team composition per the existing requirement

### Requirement: Decisions are made at the right level and delegated to capabilities
Once the team agrees on a higher-level decision (whether to build, what scope, what approach), authority for the implementation-level decisions inside that scope SHALL pass to the personas executing the work. Those personas decide within the agreed scope using the conflict-resolution stack at their level. They re-open the higher-level decision only when their work reveals new information that would change it.

This delegation is the spine of how the team gets through work without re-litigating settled questions. The Product Manager doesn't review every component name; the Technical Architect doesn't review every test name; the Lead Developer doesn't review every CSS class.

#### Scenario: Implementation decisions stay with implementers
- **WHEN** the team has agreed to build a feature and engineering is in flight
- **THEN** choices about component structure, validation libraries, error handling, and test strategy SHALL be owned by the engineering personas (Lead Developer, Frontend Developer, Backend Developer, QA / Test Engineer, DevOps Engineer)
- **AND** the Product Manager and User Researcher SHALL NOT intervene unless an implementation choice changes the user outcome
- **AND** the engineering personas SHALL NOT escalate routine implementation choices back up the team

#### Scenario: Each capability owns its bar
- **WHEN** an in-flight decision falls inside one persona's remit
- **THEN** that persona has the call within the agreed scope (e.g. test strategy → QA / Test Engineer; security review → Security Engineer; accessibility approach → Accessibility Specialist; deployment strategy → DevOps Engineer)
- **AND** escalation up the conflict-resolution stack happens only when capabilities disagree on the same decision

#### Scenario: Implementation reveals a higher-level question
- **WHEN** engineering encounters an issue that would change the agreed direction (e.g. "this approach can't meet WCAG 2.2 AA; we need to reconsider the scope")
- **THEN** engineering SHALL escalate back to the full team rather than silently changing the scope
- **AND** the resulting re-decision SHALL be added to the decision log with a clear link to the original decision it supersedes

#### Scenario: Decision delegation is recorded
- **WHEN** the team agrees a higher-level decision and delegates the in-scope work to a subset of personas
- **THEN** the decision file SHALL list the delegated personas under "Decider" so future readers see the chain of authority
- **AND** subsequent in-scope decisions taken by that subset MAY append to the original decision file as dated sub-entries rather than spawning a separate file

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

