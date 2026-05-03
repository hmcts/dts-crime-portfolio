# Editor allowlist admin UI — implementation log

**Date:** 2026-05-03
**Status:** Implemented; ready to PR.
**Brief:** `decisions/2026-05-03-editor-allowlist-claude-design-brief.md`
**Design source:** Claude Design output `artefacts/Editor Allowlist _standalone_.html`
(self-unpacking bundle — actual rendered markup lives in a JS bundle the
HTML loader unpacks at runtime; the brief above carried the design
intent verbatim, so this implementation worked from the brief).

## What landed

A complete vertical slice for the editor-allowlist admin surface,
closing the "how do we create users / Editor role?" gap.

| Layer | What changed |
|---|---|
| **Schema** | New `editor_allowlist` Postgres table (`id`, `email`, `project_id`, `granted_by`, `granted_at`) with a unique index on `(email, project_id)` for DB-level idempotency |
| **Resolver** | `lib/auth/resolver.ts` now reads `editor_allowlist` from Postgres instead of the Sanity `editorAccess` GROQ. `editableProjects` shape unchanged. |
| **API** | `GET /api/admin/editors` (list), `POST /api/admin/editors` (create), `DELETE /api/admin/editors/[id]` (remove). All Admin-only — 403 for non-admins, 401 for missing header. ChangeLog audit row written best-effort post-mutation. |
| **Page** | `app/(app)/admin/editors/page.tsx` — server component, fetches initial allowlist + project list, renders forbidden panel for non-admins |
| **UI** | Four React components under `components/admin/`: `EditorAllowlistPage` (top-level state holder), `GrantEditAccessForm` (form with inline validation + dup-check), `AllowlistTable` (sortable + filter + inline remove confirm with Esc cancel), `RecentChangesList` (session-scoped audit footer, hidden when empty) |
| **Sidebar** | New "Admin" section in the sidebar, visible only when `isAdmin === true`. The layout is now async and resolves the user once so per-page work doesn't repeat it. |
| **Seed** | `scripts/seed-editor-allowlist-pg.ts` — idempotent wipe-and-rewrite of 8 fixture rows. Workflow runs it after the prompts seed. |
| **Tests** | `tests/auth-resolver.test.ts` rewired from Sanity-fetch mocks to a Drizzle-chain mock — same coverage. New `playwright/tests/admin-editors.spec.ts` covers the viewer-forbidden-panel and admin-empty-allowlist smoke paths. |

## Why this shape

- **Postgres for the source of truth.** The Sanity `editorAccess` route would have meant the admin UI mutates one store while the auth resolver reads another. Single source of truth at insert time makes the auth check immediately reflect grants.
- **Denormalised `granted_by`.** Audit footer needs the granting admin's email per row. We don't FK-link to a `users` table because we don't have one — `granted_by` is the resolver-supplied caller email at write time, which is sufficient for "who did this" context without an extra table.
- **Inline remove confirmation, not a modal.** Per the brief — "keep the row count from changing too suddenly". Esc cancels.
- **Session-scoped recent-changes list, not historical.** The full audit trail lives in Sanity ChangeLog; the on-page footer is reassurance for the current admin's session only. Hides itself when empty (no clutter).
- **Sidebar shows admin section only to admins.** A flat "Admin" item visible to everyone would confuse viewers — they'd click and hit a forbidden panel.
- **Async layout.** Resolving the user at layout level removes per-page duplication. Cost is one DB round-trip per page render — same shape as the Sanity round-trip we just replaced.

## Out of scope (intentional non-goals)

- **No data migration from Sanity `editorAccess` documents.** The preview environment has none today (we never created any), so the Postgres seed creates the only entries that need to exist. If/when we have real production rows in Sanity, that's a one-shot import — out of scope for this PR.
- **The Sanity `editorAccess` schema is still in the registry.** Not deleted in this PR to keep the diff focused. It's now dead code; a follow-up can remove it (same pattern as the prompts schemas removal in PR #105).
- **No bulk import.** Brief explicitly excluded it.
- **No project-side view ("who edits Project X?").** Brief explicitly excluded it.
- **Mobile layout is best-effort.** Brief said desktop-first.
- **`prompts-routes.test.ts` and `prompts-modal.spec.ts` remain `.skip`d** from the prompts spike — same follow-up as before (re-mock against Drizzle / per-test DB transactions). This PR adds 2 new e2e cases on top of the existing pass set.

## Verification

Local:
- `pnpm typecheck` — green
- `pnpm lint` — green
- `pnpm test` — 41 files / 373 passed, 30 skipped
- `pnpm exec playwright test` — 23 passed, 5 skipped (28 total; the 2 new admin cases included)
- Local Postgres bring-up + migrate + `pnpm seed:editors` — 8 rows in `editor_allowlist`

Manual sanity (run locally, not in CI):
- Sign in as `editor@hmcts.net` (the test admin) → sidebar shows Admin → Editor allowlist
- Click → page renders with form + filterable/sortable table
- Add an entry → row appears at top, highlight fades after 2s, recent-changes footer updates
- Remove an entry → inline confirmation; Yes deletes; row vanishes; recent-changes updates

## Files

**New:**
- `app/(app)/admin/editors/page.tsx`
- `app/api/admin/editors/route.ts`
- `app/api/admin/editors/[id]/route.ts`
- `components/admin/EditorAllowlistPage.tsx`
- `components/admin/GrantEditAccessForm.tsx`
- `components/admin/AllowlistTable.tsx`
- `components/admin/RecentChangesList.tsx`
- `lib/admin/editors.ts`
- `drizzle/migrations/0001_add_editor_allowlist.sql` (+ snapshot)
- `playwright/tests/admin-editors.spec.ts`
- `scripts/seed-editor-allowlist-pg.ts`

**Modified:**
- `lib/auth/resolver.ts` (Sanity GROQ → Drizzle)
- `tests/auth-resolver.test.ts` (mocks rewired)
- `lib/db/schema.ts` (new `editorAllowlist` table)
- `app/(app)/layout.tsx` (async, resolves user)
- `components/shell/Sidebar.tsx` (Admin section, conditional on `isAdmin`)
- `package.json` (new `seed:editors` script)
- `.github/workflows/seed-demo.yml` (Postgres editors seed step)

## Cost

~2.5 hours wall-clock end-to-end including the Claude Design fetch dance,
schema + migration, resolver migration, all four API routes, four
client components, an async layout refactor for the sidebar, two e2e
cases, the seed script, and verification.
