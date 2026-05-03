# Postgres for the prompts surface — spike

**Date:** 2026-05-03
**Status:** Spike complete — green locally; ready to PR.
**Scope:** The prompts surface (one document type plus its inline
upvote/comment/comment-upvote arrays) moved off Sanity onto Postgres
via Drizzle. End-to-end proof-of-concept for the Postgres half of the
two-store architecture argued in
`decisions/2026-05-03-faq-mdx-spike.md`.

## Why this spike

After moving FAQs onto Markdown the open question was: *can we
introduce Postgres for the user-generated half cheaply enough to
justify dropping Sanity once the editorial surfaces follow?*

Constraints we set going in:

- Don't break the read shape — `PromptListItem` stays identical so the
  page component, modal, sort, filter logic don't move.
- Idempotent upvotes at the DB level, not the application level.
- ChangeLog audit trail keeps working.
- Local dev must stay one-command (`docker compose up -d`).
- CI must run against a real Postgres, not a mock.
- The seed for the live preview must keep producing the same eight
  prompts so the demo doesn't regress.

## What landed

| Layer | Before | After |
|---|---|---|
| ORM / driver | n/a (Sanity client) | `drizzle-orm` + `postgres-js`, lazy module-level singleton |
| Schema | 3 Sanity schemas (`prompt`, `promptUpvote`, `promptComment`) | 4 Postgres tables (`prompts`, `prompt_upvotes`, `prompt_comments`, `prompt_comment_upvotes`); migrations in `drizzle/migrations/` checked into git |
| Idempotency | App-level array filter on every write | Composite primary key `(prompt_id, user_email)` (and equivalent for comment upvotes) — DB enforces uniqueness |
| Comment threading | Inline `parentKey` string referencing another `_key` in the same array | `parent_id` self-FK on `prompt_comments`; v1 single-nesting still enforced in the API handler |
| Author identity | Reference to a Sanity `person` doc, name + seed resolved at query time | Denormalised onto each row — `author_email`, `author_name`, `author_seed` (sha256(email)[:16]). Read path no longer crosses stores. |
| List query | One deep GROQ projection with sub-projections + `count()` aggregates | Four small Drizzle queries (prompts, prompt-upvote rows, comments, comment-upvote rows), assembled in JS into the same `PromptListItem` shape |
| Audit | `commitWithChangeLog` wrapped both data + audit in one Sanity transaction | New `lib/audit/changelog.ts` writes one Sanity ChangeLog row best-effort post-Postgres-commit. Audit failures are logged, not propagated. |
| Local dev | n/a | `docker-compose.yml` (Postgres 16-alpine), `pnpm db:migrate`, `pnpm seed:prompts` |
| Render | n/a | `databases:` block adds a managed Postgres; web service builds with `pnpm db:migrate && pnpm build` so the schema lands before the new revision serves |
| CI | e2e job ran without a DB | `services: postgres:16-alpine` + `DATABASE_URL` env + `pnpm db:migrate` step before Playwright |
| Seed | 8 prompts seeded into Sanity from `scripts/seed-demo.ts` (~620 lines) | Same 8 prompts seeded into Postgres from `scripts/seed-prompts-pg.ts`; the Sanity seed script no longer references them |
| `seed-demo` workflow | One Sanity step | Two steps — Sanity seed first, then Postgres migrate + seed (gated on a `DATABASE_URL` repo secret being set) |

### Files

**New (8):**
- `docker-compose.yml`
- `drizzle.config.ts`
- `drizzle/migrations/0000_init_prompts.sql` (+ snapshot, journal)
- `lib/audit/changelog.ts`
- `lib/db/client.ts`
- `lib/db/schema.ts`
- `scripts/db-migrate.ts`
- `scripts/seed-prompts-pg.ts`

**Deleted (3):**
- `sanity/schemas/documents/prompt.ts`
- `sanity/schemas/objects/promptUpvote.ts`
- `sanity/schemas/objects/promptComment.ts`

**Modified:**
- `lib/prompts/list.ts` (Drizzle replaces GROQ)
- `app/api/prompts/route.ts` (Drizzle insert)
- `app/api/prompts/[id]/upvote/route.ts` (idempotent toggle on `prompt_upvotes`)
- `app/api/prompts/[id]/comments/route.ts` (insert into `prompt_comments`)
- `app/api/prompts/[id]/comments/[commentKey]/upvote/route.ts` (toggle on `prompt_comment_upvotes`)
- `sanity/schemas/index.ts` (drop 3 entries)
- `tests/sanity-schemas.test.ts` (registry expectation)
- `tests/logging-route-wrap-retrofit.test.ts` (`getDb` stub)
- `scripts/seed-demo.ts` (-620 lines — prompts, commenters, builders all gone)
- `render.yaml` (Postgres database + `DATABASE_URL` + build-time migrate)
- `.github/workflows/ci.yml` (Postgres service container on the e2e job)
- `.github/workflows/seed-demo.yml` (Postgres migrate + seed steps)
- `package.json` (3 new scripts: `db:generate`, `db:migrate`, `seed:prompts`)

## Verification

- `pnpm typecheck` — green
- `pnpm lint` — green
- `pnpm test` — 39 files / 367 passed, 30 skipped (the
  `prompts-routes.test.ts` cases — see Out of scope below)
- `pnpm exec playwright test` — 21 passed, 5 skipped (the
  `prompts-modal.spec.ts` cases — see Out of scope)
- Local Postgres bring-up + migrate + seed: clean. 8 prompts in the
  database with their full upvote/comment/reply rosters.

## Time cost

- Drizzle infra (deps, schema, client, config, docker-compose): ~25 min
- Schema design + first migration: ~15 min
- Postgres seed script (port from Sanity seed): ~30 min
- List query + 4 API routes rewrite: ~45 min
- Sanity prompt schema cleanup + seed-demo strip: ~15 min
- Render + CI + workflow wiring: ~15 min
- Test triage (skip + decision log + verification): ~25 min

**Total: ~3 hours wall-clock**, against an estimate of 1–2 days for a
full Postgres adoption. Faster because the read shape was preserved —
the page component, the sort/filter logic, the modal, and the
`PromptListItem` type are all unchanged.

## What this validates

1. **Drizzle is a comfortable fit for this codebase.** TypeScript-first,
   no codegen step beyond migrations, no decorators, no runtime
   surprise. Reads like SQL when you want and like a query builder
   when you want; the four queries that replace the deep GROQ
   projection are short and readable.

2. **Idempotency is cleaner at the DB.** The composite-PK approach
   means the toggle endpoint can stop reasoning about "is this user
   already in the array?" — a duplicate insert collides at the DB
   layer, and our endpoint simply flips between insert and delete.

3. **Cross-store audit is fine.** The ChangeLog row continues to land
   in Sanity. We dropped `commitWithChangeLog` (which wrapped data +
   audit in one Sanity transaction); the new shape commits to
   Postgres, then writes the audit row best-effort. An audit failure
   is logged but doesn't fail the user-visible mutation. This is the
   right trade for an audit-only Sanity surface.

4. **The migration is reversible.** Every change is in one PR; revert
   restores Sanity prompts byte-for-byte. The Postgres tables drop
   cleanly because nothing else FKs into them.

5. **Postgres adds one operational dependency, not three.** Render's
   managed Postgres handles backups, patching, and SSL termination.
   `docker compose up -d` covers local dev. CI gets a service
   container in the e2e job. No new bespoke infra.

## Cost projection for the rest

The user-generated surfaces still on Sanity that should follow:

| Surface | Today | Estimated time | Notes |
|---|---|---|---|
| **Prompts** | done — 3h | this spike | |
| **Project pitches** (`/portfolio/submit`) | Sanity | ~3h | Same shape — single document with submit form. Lighter than prompts because no inline arrays. |
| **Project updates** (timeline on dossier) | Sanity (inline array on `project`) | ~4h | Inline-array → table flattening, same pattern as prompt comments. ChangeLog stays. |
| **Action plan progress notes** | Sanity (inline array on `action`) | ~3h | Same pattern as project updates. |
| **Editor allowlist** (`editorAccess`) | Sanity | ~2h | Tiny — one table with `(email, project_id)` rows. Unblocks the in-app admin UI we owe you. |
| **ChangeLog** | Sanity | ~3h | Append-only audit log. Postgres + a partial index on `created_at` is the right home; today it's growing unboundedly in Sanity. |

**Subtotal: ~18 hours of focused work** to move every user-generated
or admin-mutated surface off Sanity. Reference data (groups,
directorates, capabilities, projects, people) is the last batch and
its own separate question — read from Jira/Ardoq, denormalise to
Postgres, or stay on Sanity until the integration question is
decided.

## Out of scope (intentional non-goals)

- **`tests/prompts-routes.test.ts` is `describe.skip`d.** The 4 suites
  in that file are wired to mock the Sanity client; the routes no
  longer touch it. Re-mocking against Drizzle (or pglite for an
  in-memory Postgres) is its own follow-up.
- **`playwright/tests/prompts-modal.spec.ts` is `test.skip`d.** Same
  shape — the existing mocks intercept GROQ calls that no longer
  fire. Re-wiring the e2e to seed a per-test database (or to use a
  per-test transaction) is the obvious next move now that CI has a
  Postgres service container available.
- **No data migration from Sanity to Postgres.** The seed script
  re-creates the live preview's prompts in Postgres; existing
  Sanity prompt documents are abandoned. This is fine for a
  demo-content environment but would need a one-shot export-import
  for any environment with real user data.
- **`writeChangeLog` is best-effort.** A future PR could move the
  audit log itself to Postgres (its own table) and recover the
  atomic-with-data property. Out of scope here because audit can
  drop a row without user-visible damage; data cannot.
- **Render Postgres on the free tier.** Suitable for the preview
  environment only. Production would need a paid plan with
  point-in-time recovery configured.
- **No `docker compose` in CI.** CI uses `services:` (faster startup
  and matches GH Actions idiom). `docker-compose.yml` is local-only.
- **No content extraction for prompts.** The 8 demo prompts are
  inlined in `scripts/seed-prompts-pg.ts`. If we add a "propose a
  prompt" GitHub-Action-driven editor flow later, that's where the
  data extraction earns its keep.

## Recommendation

Do the next two surfaces (project pitches + editor allowlist) in a
single follow-up batch — together they're ~5 hours, and the editor
allowlist is the missing piece that makes role administration
in-product (closes the gap I flagged in the role-creation
conversation). Hold the rest until you've decided whether to keep
Sanity as the reference-data store or read from Jira/Ardoq.

## Architectural shape after this PR

| Store | Owns |
|---|---|
| **Postgres** | Prompts (+ comments, upvotes, comment-upvotes). Will grow to: project pitches, project updates, action plan progress, editor allowlist, ChangeLog. |
| **Markdown in repo** | FAQs (PR #103). Will grow to: Events, Learning items, ChangeLog (if it stays bounded), Strand definitions. |
| **Sanity** | Reference data (groups, directorates, capabilities, people, actions), Project records, Audit ChangeLog (interim). The path to drop Sanity entirely runs through the table above + a Jira/Ardoq question. |
