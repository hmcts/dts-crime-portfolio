# FAQ → file-based content spike

**Date:** 2026-05-03
**Status:** Spike complete — green locally; ready to PR.
**Scope:** A single editorial surface (FAQs, 10 documents) moved off
Sanity onto on-disk Markdown with YAML front matter. Proof-of-concept
for the broader question "do we still need a CMS?".

## Why this spike

Per the conversation on 2026-05-02 about Sanity / Studio fit for HMCTS:

- Studio is not viable as the editorial UX in HMCTS.
- Two of the three roles (Admin, Viewer) have no in-product
  administration today; the third (Editor) is created by hand-editing
  Sanity documents.
- Most surfaces only **read** from Sanity — we are running a CMS to
  serve content that changes rarely and would be perfectly served by
  a directory of Markdown files reviewed via PR.

The spike's purpose is to produce a real number for "what does it cost
to replace the CMS layer?", not to argue from theory.

## What was changed

| Layer | Before | After |
|---|---|---|
| Storage | `_type == "faq"` documents in Sanity, queried by GROQ | `content/faqs/*.md` — one file per FAQ, YAML front matter (`id`, `section`, `number`, `question`) + Markdown body |
| Loader | `lib/help/list.ts` GROQ projection | `lib/help/load-faqs.ts` reads the directory, parses front matter, splits paragraphs into Portable Text blocks |
| Public API | `fetchFaqEntries(): Promise<FaqEntry[]>` | unchanged — same name, same shape, same caller |
| Schema | `sanity/schemas/documents/faq.ts` | **deleted** |
| Section enum | `FAQ_SECTIONS` exported from the Sanity schema file | moved to `lib/help/sections.ts` (no Sanity dependency) |
| Seed | 10 FAQ docs in `scripts/seed-demo.ts` (~120 lines) | gone — corpus lives in repo as actual content |
| Mocks | `_type == "faq"` baseline mock in two Playwright fixtures | gone — no Sanity call to mock |
| e2e | Asserted against a hand-rolled fixture array | Asserts against the real content corpus |
| Renderer | `PortableTextRenderer` | unchanged — loader emits the same Portable Text shape |

## Footprint (diff stat)

```
12 files changed, 55 insertions(+), 320 deletions(-)
```

Plus 4 new files:

- `content/faqs/01..10-*.md` (10 files, ~6KB total)
- `lib/help/load-faqs.ts` (~110 lines, ~30 of which are a tiny inline
  front-matter parser to avoid adding `gray-matter` for ~10 docs)
- `lib/help/sections.ts` (~20 lines)
- `tests/load-faqs.test.ts` (5 cases against the real corpus)

**Net:** ~265 lines deleted, plus we lose one Sanity schema and one
GROQ query. No new runtime deps.

## Verification

- `pnpm typecheck` — green
- `pnpm lint` — green
- `pnpm test` — 41 files / 402 tests passed (added 1 file, +6 cases
  for `loadFaqEntries`; the FAQ-section assertion moved from
  `sanity-schemas.test.ts` to `help-list.test.ts`)
- `pnpm exec playwright test` — 26 / 26 passed, including the rewritten
  `help-search.spec.ts` which now asserts against the real
  `content/faqs/` corpus and the unchanged `analytics-consent.spec.ts`
  with the `_type == "faq"` mock removed

## Time cost

- Design + reading existing code: ~25 min
- Writing 10 Markdown files: ~5 min (mechanical conversion from the
  seed script's `portableText(...)` calls)
- Loader + section module + types migration: ~20 min
- Test updates (unit + e2e + schema-registry): ~15 min
- Verify: ~10 min

**Total: ~75 minutes wall-clock.** Faster than the half-day estimate.

## What this validates

1. **The migration pattern works without a Markdown library.** The FAQ
   corpus is paragraph-only, so a 30-line front-matter parser plus a
   blank-line splitter is enough. If a future surface needs lists,
   marks, or links, that's the moment to bring in `gray-matter` plus
   a Markdown→Portable Text converter — not now.

2. **The page component is unchanged.** `app/(app)/help/page.tsx`,
   `components/help/HelpFaq.tsx`, and `PortableTextRenderer` did not
   change behaviour. The migration is invisible to UI/UX work in flight.

3. **The Playwright test is *better* on the new model.** It asserts
   against the actual production corpus instead of a fixture that
   could drift. This is the editor-feedback loop you'd want anyway:
   "edit a Markdown file, the e2e tells you if you broke something."

4. **Adding a new FAQ is a 1-file PR.** Drop a Markdown file in
   `content/faqs/`, push, get review. No Studio, no token, no seed
   re-run, no GROQ knowledge needed.

## Cost projection for the remaining surfaces

Same pattern, applied to surfaces that follow the same shape (read-
mostly editorial content with no per-user state):

| Surface | Sanity docs | Estimated time | Notes |
|---|---|---|---|
| **FAQs** | 10 | done — 75 min | this spike |
| **Events** | 5 | ~60 min | Same shape; add `startsAt`/`endsAt` to front matter |
| **Learning items** | 5 | ~60 min | Same shape; `type` (guide/playbook/etc.) goes in front matter |
| **Action plan strands** | 4 | ~75 min | Strand → progress note linking is the only wrinkle; the strand definition itself is editorial, the progress notes are admin-edits and can stay in Sanity (or migrate to Postgres, see below) |
| **ChangeLog** | 5 | ~45 min | Append-only, perfect fit for files |

Subtotal for the editorial surfaces: **~5 hours.**

Surfaces that should NOT be moved to files (they're genuinely
user-generated and write-frequent):

- **Prompts, comments, upvotes** — Postgres on Render. ~1 day.
- **Project pitches** — Postgres or stay in Sanity until pitch volume
  warrants the migration. ~half a day.
- **Action plan progress notes** — admin-edited but write-frequent,
  same shape as project updates — Postgres. ~half a day.

## Recommendation

Do the editorial surfaces (Events, Learning, ChangeLog, Strand
definitions) next as a single batch — they share the loader pattern
and are independent. ~5 hours of focused work.

Hold the user-generated surfaces (Prompts/comments/upvotes, project
pitches) until we've decided whether to add Postgres to the stack.
That's a separate architectural call from "should we keep Sanity?".

Hold Sanity as the temporary store for project records and
reference data (groups, directorates, capabilities, people) — those
are the only surfaces where Sanity is doing real work. Revisit when
the Jira/Ardoq integration question is on the table.

## Out of scope (intentional non-goals)

- The Sanity client is still wired up — other surfaces depend on it.
  We are de-scoping FAQs, not killing Sanity.
- `editorAccess` (Editor allowlist) is still a Sanity document. That's
  the right call until we redesign the role-creation flow as a
  separate change.
- No GitHub-Action "edit form opens a PR" automation in this spike.
  Adding a non-dev editor path is a follow-up if we decide editors
  exist who can't or won't open a PR directly.

## What this does NOT prove

- Whether non-dev editors will accept "open a PR with your change"
  as the editorial workflow. The PM brief said "we have gone too far"
  on the existing UX; if Markdown-via-PR also doesn't fit, the answer
  is the form-opens-a-PR pattern, not Sanity. Either way, Sanity is
  not the answer.
- That every Sanity surface is this easy. The harder ones (project
  records, reference data) are not editorial — they have relationships
  and per-user write paths. They need their own design.

## Files

New:
- `content/faqs/01-what-is-portal.md` ... `10-backlog-tag.md`
- `lib/help/load-faqs.ts`
- `lib/help/sections.ts`
- `tests/load-faqs.test.ts`

Deleted:
- `sanity/schemas/documents/faq.ts`

Modified (small):
- `lib/help/list.ts`, `lib/help/types.ts`,
  `components/help/HelpFaq.tsx`, `tests/help-list.test.ts`,
  `tests/sanity-schemas.test.ts`, `sanity/schemas/index.ts`,
  `scripts/seed-demo.ts`, `playwright/fixtures/sanity-mock.ts`,
  `playwright/fixtures/project-fixtures.ts`,
  `playwright/tests/analytics-consent.spec.ts`,
  `playwright/tests/help-search.spec.ts`
