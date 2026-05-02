# 2026-05-02 — Design and research assessment of the preview

**Update 2026-05-02:** Galaxy view killed (see `decisions/2026-05-02-kill-galaxy-view.md`). Galaxy-related findings below are preserved as a snapshot of the assessment at the time it was written and intentionally not edited.

A multi-persona user-centred-design (UCD) assessment of the
`dts-crime-portfolio-preview.onrender.com` build. Conducted by the team's
five GDS-aligned design specialists (Service Designer, Interaction Designer,
Content Designer, User Researcher, Accessibility Specialist) per
`openspec/specs/engineering-team/spec.md`.

This file is itself an artefact of *applying* UCD discipline: the assessment
walks the live preview surface-by-surface, names the persona behind each
observation, and maps every finding to the relevant external standard. It
follows the same observation-led, decision-log style used in `decisions/`.

## 1. Executive summary

We walked the eight live preview surfaces (sign-in, portfolio list, dossier,
help, events, prompts, action plan, galaxy) and the supporting capability
specs in `openspec/specs/`, against the GDS Service Standard, the GOV.UK
Design System, the Service Manual, WCAG 2.2 AA, and the HMCTS sub-brand
header guidance. The highest-value improvement is to adopt the GOV.UK
frontend `govuk-header` (with the HMCTS Crown + wordmark), the
`govuk-skip-link`, and the `govuk-footer` — this single piece of work pulls
ten lower-priority findings (branding, focus order, primary navigation,
contact route, link colours, error message tone) onto a known, accessible
baseline. The most urgent risk is the absence of any user-research evidence
captured for the preview — the team is making product judgements without a
recorded research signal, and the User Researcher persona has yet to file a
question or recruit a participant. Everything else in this document is
incremental against those two findings.

## 2. Method

**Personas in this assessment.** Service Designer, Interaction Designer,
Content Designer, User Researcher, Accessibility Specialist. The remaining
ten personas in `openspec/specs/engineering-team/spec.md` are on standby:
the Lead Developer, Frontend Developer, and Product Manager will receive
this artefact for triage; the Backend Developer, DevOps Engineer,
Performance Analyst, Security Engineer, and QA / Test Engineer are not
relevant to a non-code review.

**Surfaces walked.**

- `/preview-auth` — sign-in landing (publicly fetchable; HTML inspected
  via `curl -sS`).
- `/portfolio` — portfolio list (read from `app/(app)/portfolio/page.tsx`
  and capability spec `openspec/specs/portfolio-management/spec.md`).
- `/portfolio/[id]` — dossier (read from
  `app/(app)/portfolio/[id]/page.tsx` and
  `openspec/specs/project-dossier/spec.md`).
- `/help` — help / FAQ (`app/(app)/help/page.tsx` +
  `openspec/specs/help-faq/spec.md`).
- `/events` — events listing (`app/(app)/events/page.tsx` +
  `openspec/specs/events-listing/spec.md`).
- `/prompts` — prompts library (`app/(app)/prompts/page.tsx` +
  `openspec/specs/prompts-library/spec.md`).
- `/action-plan` — action plan tracker (`app/(app)/action-plan/page.tsx` +
  `openspec/specs/action-plan-tracking/spec.md`).
- `/galaxy` — galaxy view (`app/(app)/galaxy/page.tsx` +
  `openspec/specs/galaxy-view/spec.md`).
- Persistent shell — `components/shell/Sidebar.tsx`,
  `components/PreviewBanner.tsx`, `components/AnalyticsBanner.tsx`.

**Standards consulted.**

- **GDS Service Standard** — the 14-point standard
  (https://www.gov.uk/service-manual/service-standard).
- **GOV.UK Design System** — components, patterns, branding
  (https://design-system.service.gov.uk/).
- **GOV.UK Service Manual** — service-level guidance
  (https://www.gov.uk/service-manual).
- **WCAG 2.2 AA** — accessibility success criteria.
- **HMCTS branding** — Crown + "HM Courts & Tribunals Service" wordmark
  via the GOV.UK frontend header pattern
  (https://design-system.service.gov.uk/styles/branding/,
  https://design-system.service.gov.uk/components/header/).

**What we could not do.** The sign-in form uses Next.js server actions
with a per-render action ID, so a forged POST from `curl` cannot mint a
session cookie; the gated surfaces were assessed from their server
components and capability specs. This is acceptable for a design review —
the spec is the source of truth for layout, copy, and intent — but the
final pass should be repeated on a real signed-in session by a human
reviewer with a screen reader and a keyboard-only profile. That is logged
in the open-questions section.

## 3. Per-persona findings

Each observation cites the standard it hits. Standard references use the
form `GDS-SS #N` for the 14-point service standard, `GOV.UK Design System`
for the design system, `Service Manual` for the manual, `WCAG 2.2`
followed by the success criterion identifier, and `HMCTS branding` for the
Crown + wordmark guidance.

### 3a. Service Designer

The Service Designer asks whether the digital surface fits the broader
DTS Crime service, including the offline and non-digital steps that
surround it.

1. **The portal does not name its place in the DTS Crime service.** A user
   landing at `/portfolio` sees "Portfolio" and a card grid; nothing on
   the page says what DTS Crime is, who runs it, when to use the portal
   versus Jira / Confluence / Ardoq / SharePoint, or what the user is
   meant to do here today. The `app/layout.tsx` `<title>` is "DTS Crime
   Portfolio" and the `<meta name="description">` is "Single discoverable
   front door for DTS Crime delivery information", but neither renders to
   the user. **Standards:** *GDS-SS #1 (Understand users and their
   needs)*; *GDS-SS #4 (Make the service simple to use)*; *Service
   Manual — service patterns: starts and entry points*.
2. **Off-portal hand-offs are invisible.** The portal is described in the
   spec as a "front door over Ardoq, Jira, Confluence, and SharePoint"
   but the user surfaces (sidebar, dossier, help) carry no signposts
   *to* those systems. The dossier shows a `githubUrl` link when present
   (`app/(app)/portfolio/[id]/page.tsx:53`), but the canonical
   integrations (Jira ticket, Confluence space, Ardoq diagram, SharePoint
   folder) have no first-class slot. The journey breaks the moment a
   user needs the source-of-truth document. **Standards:** *GDS-SS #2
   (Solve a whole problem for users)*; *Service Manual — designing
   joined-up services*.
3. **The "submit a project" path is buried.** `portfolio-management`
   spec calls for a "New Project" CTA on the portfolio header
   (`portfolio-management/spec.md:8-11`); the live page header
   (`app/(app)/portfolio/page.tsx:46-62`) currently exposes only "Clear
   filters" and "Export" — no CTA leading to `/portfolio/submit`. A
   delivery owner who arrives wanting to register a new project has
   nowhere obvious to start. **Standards:** *GDS-SS #4*; *GOV.UK Design
   System — buttons (primary action visibility)*.
4. **There is no service-status or "what's new" surface.** Users have no
   way to see whether the portal is up, what changed this week, or where
   to direct feedback (the only contact point is `support@hmcts.net`
   buried at the foot of `/help`). For an internal product whose value
   depends on it being trusted as the front door, the absence of a
   visible service-status / changelog / feedback affordance is a journey
   gap. **Standards:** *GDS-SS #14 (Operate a reliable service —
   transparency of incidents)*; *Service Manual — communicating service
   updates*.
5. **The retro / feedback loop into the service is implicit, not
   visible.** `openspec/specs/team-retrospective/spec.md` exists and the
   team runs retros, but there is no surface that shows users *we are
   listening*. A "tell us what's broken" link in the header or footer
   would make the team's outcome focus visible to the users it is
   intended to serve. **Standards:** *GDS-SS #1 (continuous user-need
   listening)*; *GDS-SS #10 (Define what success looks like — feedback
   loop)*.

### 3b. Interaction Designer

The Interaction Designer reviews UI flows, page-level affordances,
signposting, and error-state copy.

1. **No skip-link, no landmark `<header>`, only an `<aside>` and a
   `<main>` per page.** `app/(app)/layout.tsx` wraps the page in a
   sidebar + content but has no top landmark; keyboard users tabbing
   into the page traverse the preview banner, the analytics banner, then
   eight sidebar items, then the page contents — there is no "Skip to
   main content" affordance. The `govuk-skip-link` pattern would land
   the keyboard caret in the page in one tab. **Standards:** *WCAG 2.2
   2.4.1 (Bypass Blocks)*; *GOV.UK Design System — skip link*; *GDS-SS
   #5 (Make sure everyone can use the service)*.
2. **The sidebar is the entire navigation; on mobile it disappears.**
   `Sidebar.tsx:26` uses `hidden ... md:block`. Below the `md`
   breakpoint there is no menu, no hamburger, no fallback navigation —
   the user can't reach `/help`, `/events`, `/prompts`, `/action-plan`,
   `/galaxy`, or `/profile` once the viewport narrows. **Standards:**
   *WCAG 2.2 1.4.10 (Reflow)*; *GOV.UK Design System — header (mobile
   pattern)*; *GDS-SS #5*.
3. **Filter row stacks five separate sections without a "Filters"
   summary or a results-count live region tied to control changes.**
   On `/portfolio` the user sees a search input, multi-select dropdowns,
   a stage row, and a tier row, then a grid. The summary copy
   ("Showing X of Y") is in the page header and is not announced as a
   live region when filters change. Screen-reader and assistive-tech
   users cannot tell the filter took effect without re-tabbing.
   **Standards:** *WCAG 2.2 4.1.3 (Status Messages)*; *GOV.UK Design
   System — checkboxes / filters pattern*.
4. **Stage pill and status pill colour mappings appear identical in
   shape but live in different parts of the page (portfolio card,
   dossier header, action-plan list).** `portfolio-management/spec.md`
   calls for a single TypeScript enum source of truth for stage pills
   across portfolio, dossier, galaxy, and exports (Requirement: Stage
   pills are first-class). The interaction-design risk is that the
   user reads the pill colour as carrying meaning (which it does) and
   then encounters a different colour scale on `/action-plan`
   (`Completed` / `Significant progress` / `Some progress` / `Gap`) —
   nothing tells them the two scales mean different things.
   **Standards:** *GOV.UK Design System — tags (consistent meaning)*;
   *WCAG 2.2 1.4.1 (Use of Colour)*; *GDS-SS #4*.
5. **The "Sanity Studio →" link in the sidebar footer is exposed to
   every user.** `Sidebar.tsx:69-72` shows the link unconditionally,
   though only Editors / Admins can actually do anything inside the
   studio. A Viewer who clicks it is dropped into a backend tool with
   no editor context. The affordance should be hidden for non-editors,
   or labelled "Edit content (admins only)". **Standards:** *GDS-SS #4*;
   *GOV.UK Design System — links and the "principle of least surprise"*.
6. **The `Galaxy` nav item carries a `v0` badge but the view itself
   does not explain what `v0` means.** A user clicking through is
   landed in a constellation map with no onboarding, no legend
   walkthrough, and no honest "this view is in early development" copy
   on the page itself. The badge promises a caveat the page does not
   deliver. **Standards:** *GDS-SS #4*; *Service Manual — beta and
   experimental services labelling*.

### 3c. Content Designer

The Content Designer reviews labels, microcopy, error messages, and help
text against GDS plain-English content standards.

1. **The product is named differently in three places.** The browser
   tab says "DTS Crime Portfolio"; the sidebar says "DTS Crime" with a
   small "Portfolio" eyebrow; the spec references "Crime Portfolio
   portal". Pick one and use it everywhere; the GOV.UK pattern is
   `<service name>` rendered identically in the header, the document
   title, and the page-one copy. **Standards:** *GOV.UK Design System
   — service name (singular)*; *Service Manual — content style guide*.
2. **"Portfolio" is the name of two different things.** It is the name
   of the *page* (`/portfolio`) and the name of the *concept* (the
   collection of projects). The summary line "Showing X of Y projects"
   does the right job, but the page H1 of "Portfolio" is opaque to a
   first-time reader. Consider "Crime delivery projects" as the H1
   with "the portfolio" used in body copy. **Standards:** *GOV.UK
   Design System — page titles (describe the user task)*; *Service
   Manual — writing for users (avoid jargon)*.
3. **Internal jargon shows on the public surface without explanation.**
   The dossier surface promises tooltips on terms like "DPIA", "ATRS",
   "Ethics framework", "Governance tier" (`project-dossier/spec.md` —
   *Requirement: Tooltip explainers on jargon*). Until those
   explainers ship, the abbreviations land on the page raw. The same
   problem exists on `/help` where section titles use phrases like
   "Acceptable use" and "Workforce and responsibility" without
   reframing the user question they answer. **Standards:** *Service
   Manual — content style guide (acronyms and jargon)*; *GDS-SS #4*.
4. **Error copy is functional but not human.** The sign-in page error
   reads "Sign-in is limited to @hmcts.net or @justice.gov.uk emails.
   The address you entered (foo@bar.com) uses a different domain."
   (`app/preview-auth/page.tsx:69-76`). It is technically correct but
   leads with the limitation; the GOV.UK pattern is to lead with what
   the user should do next: "Enter an `@hmcts.net` or `@justice.gov.uk`
   email." **Standards:** *GOV.UK Design System — error message
   pattern*; *Service Manual — writing error messages*.
5. **The analytics consent banner copy is dense and hides the action.**
   `AnalyticsBanner.tsx` opens with the bold word "Analytics:" then a
   two-clause sentence covering recording, anonymity, and the path to
   change the setting. The banner answers "what" before "why", and the
   buttons read "Accept analytics" / "Decline" — neither tells the user
   what happens next. **Standards:** *GOV.UK Design System — cookie
   banner pattern*; *Service Manual — consent and data*.
6. **No service phase banner.** GDS expects beta / alpha / experimental
   services to wear that label visibly. The "Preview environment — not
   production" banner does the wrong job: it tells the developer the
   environment, not the user the service phase. A standard
   `govuk-phase-banner` reading "Beta — this is a new service. Help us
   improve it." with a feedback link is the right pattern.
   **Standards:** *GOV.UK Design System — phase banner*; *Service
   Manual — service phases*.

### 3d. User Researcher

The User Researcher asks what unmet needs are visible, what evidence
would validate the current direction, and what user types are missing.

1. **No recorded user-research signal.** The repository has 21
   capability specs and an active decision log, but
   `decisions/` contains zero entries that cite user-research evidence,
   and there is no `research/` directory. The portal is being designed
   from spec and team intuition. The Product Manager mandate in
   `engineering-team/spec.md` (Requirement: *Product Manager challenges
   build-first answers* and Scenario: *Outcome lacks user evidence*)
   says we should not be here. **Standards:** *GDS-SS #1 (Understand
   users and their needs)*; *GDS-SS #10 (Define what success looks
   like)*.
2. **User types are implicit, not articulated.** The access-control
   spec names three roles (Viewer, Editor, Admin) but those are
   permission shapes, not user types. We have not articulated who the
   actual users are: a delivery manager checking governance gaps; a
   senior leader scanning the galaxy for compliance heat; a new
   joiner trying to learn what DTS Crime is doing; an operations lead
   triaging an incident. Each implies a different first task. **Standards:**
   *GDS-SS #1*; *Service Manual — user needs and personas*.
3. **The "front door" hypothesis is unvalidated.** The portal claims
   to be the discoverable front door over Ardoq / Jira / Confluence /
   SharePoint. We have no evidence on (a) where users currently start
   when they need DTS Crime delivery information, (b) whether the
   portal would intercept that journey, or (c) whether users would
   trust a single front door. A 30-minute discovery session with three
   to five DTS Crime delivery owners would deliver this. **Standards:**
   *GDS-SS #1*; *GDS-SS #2*; *Service Manual — discovery research*.
4. **The "AI prompt library" feature has no recorded user signal.**
   `/prompts` includes a monthly competition, upvotes, comments, and
   a creation flow — substantial product surface
   (`prompts-library/spec.md` runs to 118 lines). No decision-log
   entry justifies the surface against a user need. The Product
   Manager's standing to challenge build-first proposals applies
   here; whether prompts are wanted, used, and useful is a
   research question that should precede further investment.
   **Standards:** *GDS-SS #2 (Solve a whole problem)*; *GDS-SS #10*.
5. **The galaxy view is a research artefact in production clothing.**
   Constellation maps with lens switching, overlays, and zoom controls
   are an unusual interaction model; we have no evidence that users
   prefer it to a simpler list / filter view. The `v0` badge in the
   sidebar implies the team knows this. The right next step is
   moderated usability testing with five users — does the galaxy
   answer a question users actually ask, or is it a clever toy?
   **Standards:** *GDS-SS #5 (Make sure everyone can use the
   service — including via the simplest fallback)*; *GDS-SS #10*.
6. **No accessibility-research participation.** Five-user usability
   tests should explicitly recruit at least one user of assistive
   technology. The portal has not yet been seen by a screen-reader
   user, a keyboard-only user, or a user with low vision in any
   recorded session. **Standards:** *GDS-SS #5*; *Service Manual —
   inclusive research*.

### 3e. Accessibility Specialist

The Accessibility Specialist reviews against WCAG 2.2 AA and
assistive-technology friendliness.

1. **No `<header>` landmark, no skip-link, no `<footer>` landmark.**
   The page tree is `<body>` → preview banner `<div>` → analytics
   banner `<div>` → `<aside>` → `<main>`. Screen readers using
   landmark navigation will not jump to the page header (there isn't
   one) and have no skip-link to bypass the always-present sidebar.
   **Standards:** *WCAG 2.2 1.3.1 (Info and Relationships)*; *WCAG
   2.2 2.4.1 (Bypass Blocks)*; *WCAG 2.2 2.4.6 (Headings and
   Labels)*.
2. **The site is not built on GOV.UK frontend, so the audited
   accessibility baseline is being rebuilt by hand.** Tailwind utility
   classes drive every component. The GOV.UK frontend has WCAG 2.2 AA
   audited components for buttons, inputs, error messages, summary
   lists, tables, accordions, tabs, and navigation. Each component the
   team builds bespoke (e.g. `MultiSelectDropdown.tsx`,
   `EventFilters.tsx`, `SortTabs.tsx`) is a fresh accessibility risk
   that has to be re-audited. **Standards:** *WCAG 2.2 AA broadly*;
   *GOV.UK Design System — use the design system rather than
   reinvent it*.
3. **The analytics consent banner is interactive but does not announce
   itself to assistive technology.** The buttons "Accept analytics" /
   "Decline" sit in a `<div>`, not a `<dialog>` or a region with an
   announced role. A screen-reader user landing on the page hears the
   preview-environment banner, then jumps straight into the analytics
   `<p>` and `<button>`s without knowing they are about to consent to
   tracking. **Standards:** *WCAG 2.2 4.1.2 (Name, Role, Value)*; *WCAG
   2.2 1.3.1*; *Service Manual — consent banners*.
4. **Colour contrast is not audited and uses Tailwind defaults that
   look thin.** Examples: `text-amber-900` on `bg-amber-100`
   (preview banner), `text-neutral-600` on `bg-neutral-50` (page sub-
   copy), `text-blue-700` underline on white (links). These are
   probably AA-compliant but they have not been verified, and the
   GOV.UK pattern uses higher-contrast tokens by default.
   **Standards:** *WCAG 2.2 1.4.3 (Contrast (Minimum))*; *WCAG 2.2
   1.4.11 (Non-text Contrast)*.
5. **The galaxy view is a canvas surface.** The spec includes a
   static-SVG fallback (`galaxy-view/spec.md` — Requirement:
   *Static-SVG fallback*) but the SVG must itself be accessible —
   each star reachable by keyboard, each star labelled with its
   project name and stage, each constellation announced as a group.
   The current implementation should be tested with NVDA, VoiceOver,
   and JAWS. **Standards:** *WCAG 2.2 2.1.1 (Keyboard)*; *WCAG 2.2
   1.1.1 (Non-text Content)*; *WCAG 2.2 4.1.2*.
6. **Focus order has not been verified.** With three persistent
   banners (preview, analytics, sidebar) plus a page, the tab order
   matters. We have not run a tab-through audit on any page. The
   sign-in form has correct `aria-describedby` and `aria-live`
   plumbing (`app/preview-auth/sign-in-form.tsx:48-77`), which is a
   good sign — but the rest of the surfaces have not been verified.
   **Standards:** *WCAG 2.2 2.4.3 (Focus Order)*; *WCAG 2.2 2.4.7
   (Focus Visible)*.

## 4. HMCTS branding recommendation

**Recommendation.** Adopt the GOV.UK frontend `govuk-header` component
configured with the HMCTS sub-brand (Crown logo + "HM Courts &
Tribunals Service" wordmark) on every signed-in page, plus the
`govuk-footer` and the `govuk-skip-link` and a `govuk-phase-banner`
("Beta"). Keep the existing preview-environment banner above the
GOV.UK header for as long as the preview is live; remove it on the
first production deploy.

**Rationale.**

- **The portal sits inside the gov.uk service surface.** Users sign in
  with `@hmcts.net` and `@justice.gov.uk` emails
  (`app/preview-auth/sign-in-form.tsx:25`). It is internal in the sense
  that the public cannot reach it, but it is *not* off-brand: the users
  are HMCTS / MoJ staff and the content concerns HMCTS Crime delivery.
  The Crown + wordmark is the expected signal that "this is an HMCTS
  product, you can trust the data, the policies that apply to other
  HMCTS digital services apply here".
- **HMCTS is a sub-brand of MoJ on the GOV.UK frontend pattern.** Per
  the GOV.UK Design System branding page, departments and arms-length
  bodies use the `govuk-header` with their own service name. HMCTS has
  used this pattern across other services (e.g. Find a Court or
  Tribunal, Manage Cases). Using it here reduces cognitive switching
  cost for users coming from those services.
- **It pulls multiple findings onto a known baseline.** Findings 3a-1
  (place in the service), 3b-1 (skip-link), 3b-2 (mobile navigation),
  3c-1 (single service name), 3c-6 (phase banner), 3e-1 (landmarks),
  3e-2 (audited components), and 3e-4 (contrast tokens) all resolve
  against the GOV.UK frontend baseline. Adopting it is the highest
  leverage move available.

**Suggested header markup (illustrative — not a code change in this
PR).** The team should follow the GOV.UK frontend reference rather than
this snippet, but for orientation:

```html
<header class="govuk-header" role="banner" data-module="govuk-header">
  <div class="govuk-header__container govuk-width-container">
    <div class="govuk-header__logo">
      <a href="/portfolio" class="govuk-header__link govuk-header__link--homepage">
        <svg aria-hidden="true" focusable="false" class="govuk-header__logotype">
          <!-- Crown -->
        </svg>
        <span class="govuk-header__logotype-text">HM Courts &amp; Tribunals Service</span>
      </a>
    </div>
    <div class="govuk-header__content">
      <a href="/portfolio" class="govuk-header__link govuk-header__service-name">
        DTS Crime delivery portal
      </a>
      <nav aria-label="Menu" class="govuk-header__navigation">
        <!-- existing sidebar items, surfaced as primary navigation -->
      </nav>
    </div>
  </div>
</header>
<div class="govuk-phase-banner">
  <p class="govuk-phase-banner__content">
    <strong class="govuk-tag govuk-phase-banner__content__tag">Beta</strong>
    <span class="govuk-phase-banner__text">
      This is a new service – your <a class="govuk-link" href="mailto:support@hmcts.net">feedback</a>
      will help us improve it.
    </span>
  </p>
</div>
<a href="#main-content" class="govuk-skip-link">Skip to main content</a>
```

The existing sidebar nav can either remain as a left rail on desktop
or be promoted into the GOV.UK header as primary navigation; the
Interaction Designer should decide based on a quick prototype against
the same five users the User Researcher recruits for finding 3d-2.

## 5. Prioritised improvements table

| Priority | Owner persona | What | Why | Linked standard | Effort |
|---|---|---|---|---|---|
| HIGH | Frontend Developer + Accessibility Specialist | Adopt `govuk-header`, `govuk-footer`, `govuk-skip-link`, `govuk-phase-banner` (HMCTS sub-brand) | Resolves 8 findings across branding, navigation, landmarks, mobile | GOV.UK Design System — header / footer / skip link / phase banner; *HMCTS branding*; *WCAG 2.2 2.4.1*; *GDS-SS #4, #5* | 1–2 days FE work |
| HIGH | User Researcher | Run a 5-user discovery / usability round on the live preview | We are designing without recorded research signal; the User Researcher persona is currently inactive | *GDS-SS #1, #10*; *Service Manual — user research* | 1 sprint |
| HIGH | Service Designer | Add a service-name page-one explainer ("What is DTS Crime delivery?") and link out to Ardoq / Jira / Confluence / SharePoint per project | Closes the front-door hypothesis with concrete signposts | *GDS-SS #1, #2, #4*; *Service Manual — joined-up services* | 0.5 day content + 0.5 day FE |
| HIGH | Interaction Designer + Frontend Developer | Mobile navigation pattern (header burger or `govuk-header` mobile menu) | Sidebar disappears below `md`; `/help`, `/events`, etc. become unreachable | *WCAG 2.2 1.4.10*; *GDS-SS #5* | 0.5 day |
| MED | Content Designer | Single service name + page H1 review across all eight surfaces | Three different names today; H1s describe the page not the user task | *GOV.UK Design System — service name*; *Service Manual — content style* | 0.5 day |
| MED | Content Designer | Rewrite sign-in error and analytics consent copy in GOV.UK voice | Lead with the action, not the limitation | *GOV.UK Design System — error message*; *Service Manual — error copy* | 0.25 day |
| MED | Service Designer | Surface the "submit a project" CTA on `/portfolio` per `portfolio-management/spec.md` Requirement: *Portfolio card grid* | Spec calls for a New Project CTA; live header omits it | *GDS-SS #4*; capability spec | 0.25 day |
| MED | Accessibility Specialist | Tab-through audit + screen-reader pass on the eight surfaces | Focus order, landmarks, contrast tokens not yet verified | *WCAG 2.2 2.4.3, 2.4.7, 1.4.3* | 1 day |
| MED | Accessibility Specialist | Verify analytics consent banner has correct role and announces to AT | Banner is interactive without semantic role | *WCAG 2.2 4.1.2, 1.3.1* | 0.25 day |
| MED | Interaction Designer | Live region tied to filter changes on `/portfolio`, `/events`, `/prompts`, `/galaxy` | Result-count changes not announced | *WCAG 2.2 4.1.3* | 0.5 day per surface |
| MED | Content Designer + Service Designer | Tooltip explainers on dossier jargon (DPIA, ATRS, Ethics framework, Governance tier) per `project-dossier/spec.md` | Spec already requires it; live page lacks it | capability spec; *GDS-SS #4* | 0.5 day content |
| LOW | Frontend Developer | Hide "Sanity Studio →" sidebar link for non-editor users (or relabel it) | Viewers shouldn't be dropped into a backend tool with no context | *GDS-SS #4* | 0.1 day |
| LOW | Service Designer | Service-status / changelog / feedback link in header or footer | Users have no visible feedback loop | *GDS-SS #14*; *GDS-SS #10* | 0.5 day |
| LOW | Interaction Designer | Galaxy onboarding overlay or "what does v0 mean?" copy on `/galaxy` | Sidebar badge promises a caveat the page does not deliver | *GDS-SS #4*; *Service Manual — beta labelling* | 0.5 day |
| LOW | Performance Analyst (consulted) | Confirm the `Recent Activity {n}` and `Risk Themes {n}` stat strip per `portfolio-management/spec.md` will surface in v1 | Spec calls for the stat strip; live page does not render it | capability spec; *GDS-SS #10* | scope check, no FE work yet |

## 6. GDS Service Standard scorecard

| # | Standard point | Status | One-line rationale |
|---|---|---|---|
| 1 | Understand users and their needs | **Not yet evidenced** | No recorded user research; user types implicit; "front door" hypothesis untested. |
| 2 | Solve a whole problem for users | **Partially met** | The portal aggregates surface-level information but does not signpost to off-portal sources of truth (Ardoq / Jira / Confluence / SharePoint). |
| 3 | Provide a joined-up experience across all channels | **Not yet evidenced** | The off-portal hand-offs are not modelled in the digital surface; offline / non-digital steps not documented. |
| 4 | Make the service simple to use | **Partially met** | Page-level copy is functional; service name varies; jargon shows without explanation; primary CTA missing on `/portfolio`. |
| 5 | Make sure everyone can use the service | **Partially met** | No skip-link, no `<header>` landmark, no mobile navigation, no AT testing recorded; sign-in form has good ARIA wiring as a positive baseline. |
| 6 | Have a multi-disciplinary team | **Met** | `engineering-team/spec.md` defines the 15-persona team; this assessment is itself an artefact of five of them. |
| 7 | Use agile ways of working | **Met** | Wave-based delivery, decision log, retrospectives in `retrospectives/`. |
| 8 | Iterate and improve frequently | **Met** | Frequent merges, continuous deploys via Render blueprint, dependency triage in `decisions/`. |
| 9 | Create a secure service which protects users' privacy | **Partially met** | `access-control` and `analytics` specs exist; consent banner present; analytics consent UX has accessibility gaps; no DPIA visible for the analytics provider. |
| 10 | Define what success looks like and publish performance data | **Not yet evidenced** | No KPIs published; analytics events catalogued but no dashboard visible to users. |
| 11 | Choose the right tools and technology | **Met** | Decisions logged for stack choices (Next.js, Render, Sanity, PostHog, Mermaid architecture). |
| 12 | Make new source code open | **Met** | Repository visible (per the user's task description); MIT-style `LICENSE` file present. |
| 13 | Use and contribute to open standards, common components and patterns | **Partially met** | Uses Tailwind utility classes rather than GOV.UK frontend; this is the central recommendation in §4. |
| 14 | Operate a reliable service | **Partially met** | Render deploy pipeline is live, Playwright e2e tests gate merges, but there is no visible service-status / incident-comms surface to users. |

## 7. Open questions

1. **Who are the actual users?** Delivery owner / senior leader / new
   joiner / operations lead are *plausible* user types. Five
   recruited interviews would replace them with named, quoted users.
   *Resolves with:* User Researcher discovery round.
2. **Is the prompt library wanted?** No recorded research signal.
   *Resolves with:* a 10-minute analytics question ("how many
   distinct users have viewed `/prompts` in the last 14 days, and how
   many have copied a prompt") plus three user interviews.
3. **Is the galaxy view used?** Same shape of question.
   *Resolves with:* moderated usability testing on `/galaxy` versus
   `/portfolio` for the same task ("show me the projects with a
   compliance gap").
4. **What happens on mobile?** This was not assessed end-to-end.
   *Resolves with:* a hands-on session on a 360px viewport with a
   recorded keyboard pass, ideally on iOS Safari and Android
   Chrome.
5. **What does a real screen-reader pass say?** This assessment was
   conducted from spec and source; the live AT experience is not
   recorded.
   *Resolves with:* a NVDA + VoiceOver + JAWS pass on every
   numbered surface, scripted from the same task list as the user
   research.
6. **Should the sidebar become primary navigation in the GOV.UK
   header?** Two valid patterns exist (left rail or top header).
   *Resolves with:* a 60-minute prototype-and-test pair-up between
   the Interaction Designer and the Frontend Developer.
7. **Are there off-portal touchpoints we haven't named?** Ardoq /
   Jira / Confluence / SharePoint are listed in the user task
   description; service mapping might surface others (HMCTS
   intranet, MS Teams channels, mailing lists, inbound from
   government-wide AI strategy).
   *Resolves with:* Service Designer service-mapping workshop.

## 8. Cross-references

**Capability specs touched by this assessment.**

- `openspec/specs/engineering-team/spec.md` — defines the persona team
  used to conduct the assessment.
- `openspec/specs/portfolio-management/spec.md` — Requirements
  *Portfolio card grid* (CTA gap), *Stage pills are first-class*
  (consistency note).
- `openspec/specs/project-dossier/spec.md` — Requirement *Tooltip
  explainers on jargon* (open).
- `openspec/specs/help-faq/spec.md` — Requirements *Help page at /help*
  (jargon section labels), *Footer contact* (the only contact route
  today).
- `openspec/specs/events-listing/spec.md` — Requirement *Filters*
  (live region note).
- `openspec/specs/prompts-library/spec.md` — Requirements *Prompts
  page at /prompts*, *Sort modes* (research-evidence open
  question).
- `openspec/specs/action-plan-tracking/spec.md` — Requirements *Action
  plan page at /action-plan*, *Action list with status pills* (status
  vocabulary differs from stage pills — note in 3b-4).
- `openspec/specs/galaxy-view/spec.md` — Requirements *Constellation
  map at /galaxy*, *Static-SVG fallback* (AT testing required).
- `openspec/specs/profile-view/spec.md` — Requirements *Profile page
  at /profile* (not walked in detail; flagged for follow-up
  research pass).
- `openspec/specs/access-control/spec.md` — Requirement *Three-role
  model* (Viewer / Editor / Admin are permission shapes, not user
  types).
- `openspec/specs/analytics/spec.md` — Requirement *Consent banner*
  (accessibility note).
- `openspec/specs/preview-auth/spec.md` — Requirements covering the
  sign-in surface walked in 3c-4 / 3e-6.

**Decision-log entries.**

- `decisions/2026-05-02-add-architecture-artefacts.md` — architecture
  documentation pattern; this assessment follows the same observation-
  led, no-marketing voice.
- `decisions/2026-05-02-defer-google-analytics.md` — analytics provider
  decision; the consent UX critique in 3c-5 / 3e-3 sits inside that
  scope.
- `decisions/2026-05-02-defer-secrets-manager-choice-until-production.md`
  — deferred decision pattern; several findings in §5 follow the same
  "record now, revisit when production launches" shape.
- `decisions/2026-05-02-deploy-via-render-blueprint-and-github-action.md`
  — the deploy pipeline that powers the preview under review.
- `decisions/2026-05-02-e2e-coverage-prioritisation.md` — current
  Playwright test priorities; the Accessibility Specialist findings
  (3e) are candidate additions to that priority list.

**Standards consulted (recap).**

- GDS Service Standard — https://www.gov.uk/service-manual/service-standard
- GOV.UK Design System — https://design-system.service.gov.uk/
- GOV.UK Service Manual — https://www.gov.uk/service-manual
- GOV.UK Design System branding —
  https://design-system.service.gov.uk/styles/branding/
- GOV.UK Design System header —
  https://design-system.service.gov.uk/components/header/
- WCAG 2.2 — https://www.w3.org/TR/WCAG22/
