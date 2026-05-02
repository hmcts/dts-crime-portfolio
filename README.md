# dts-crime-portfolio

A single, discoverable front door for delivery information across **DTS Crime in HMCTS**.

## What it is

DTS Crime delivery information is spread across Ardoq, Jira, Confluence, and SharePoint. Project taxonomy, delivery status, ownership, KPIs, dashboards, how‑tos, SOPs, and platform knowledge all live somewhere — but rarely in the same somewhere. New starters bounce between tools. Stakeholders rely on personal networks. Knowledge gets duplicated, dated, and quietly lost.

This portal is the front door over those tools. It does not replace any of them — Ardoq stays where Ardoq lives, Jira stays where Jira lives — but it brings the information that matters most into one filterable, searchable place that staff can hit without specialist knowledge.

The audiences are three:

- **Leadership** want a live, filterable picture of every project plus comparisons over time and exportable reports.
- **Delivery teams** submit projects, maintain dossiers, log progress, and link work to the published action plan.
- **All staff** read learning content, share prompts, see upcoming events, and find answers in the FAQ.

The portal makes those things possible from one place.

## Status

Pre-build, getting close. Behaviour is specified in [`openspec/specs/`](openspec/specs); architecture artefacts live in [`architecture/`](architecture); decisions are recorded in [`decisions/`](decisions). Active and archived change proposals live under `openspec/changes/`.

## Stack

Next.js (App Router) · React · Tailwind · TypeScript · Sanity CMS · GOV.UK Notify · PostHog. Initial preview deployment on Render.

## Working with this repo

- Read the specs: `openspec list --specs` then `openspec spec show <capability>`
- Architecture diagrams: [`architecture/README.md`](architecture/README.md)
- Decision history: [`decisions/`](decisions) (one markdown file per decision)
- Conventions for code and changes: [`CLAUDE.md`](CLAUDE.md)
- Node version: see [`.nvmrc`](.nvmrc) · package manager: pnpm
- Tests: `pnpm test` runs the Vitest unit suite. `pnpm test:e2e` runs the
  Playwright end-to-end suite (preview-auth, portfolio empty/list, help
  search). Browsers install via `pnpm exec playwright install chromium`.
- Sanity Studio is embedded at `/studio` (Sanity project `vi5mhbtl`, dataset `preview`). Sign in with your Sanity account to edit content.

## Meet the team

Every change to this codebase is the work of a multi‑disciplinary team. We have a **Product Manager** whose first move on any "we should build X" is to ask whether we should build X at all. A **Delivery Manager** who removes blockers and writes down who decided what. A **User Researcher** who keeps showing us evidence we'd rather not look at. A **Service Designer** who reminds us that not everything happens on a screen, and a **Content Designer** who shortens our sentences. An **Interaction Designer** who draws the flow before we wireframe it in TypeScript. A **Technical Architect** who is happiest when nothing is the answer. A **Lead Developer** who would prefer slightly less code, please. **Frontend** and **Backend Developers** who scale to the work. A **DevOps Engineer** who would like the pipeline to remain green, and a **QA / Test Engineer** who would like it to mean something. A **Performance Analyst** who watches whether anyone is actually using the thing. A **Security Engineer** who stays awake when the rest of us don't. And an **Accessibility Specialist** who makes sure we built it for everyone we said we built it for.

The team's full composition, the decision-arbiter map, the conflict-resolution stack, and the rules for adding on-demand roles (we are deliberately not stuffed with them) live in [`openspec/specs/engineering-team/spec.md`](https://github.com/hmcts/dts-crime-portfolio/blob/main/openspec/specs/engineering-team/spec.md). The Product Manager outranks "build it"; the team measures itself by user outcomes, not code shipped.

## License

[MIT](LICENSE) — Crown Copyright (HM Courts & Tribunals Service).
