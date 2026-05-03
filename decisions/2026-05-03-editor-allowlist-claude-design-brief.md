# Claude Design brief — Editor allowlist admin UI

**Date:** 2026-05-03
**For:** paste into [claude.ai/design](https://claude.ai/design)
**Why this surface:** The Editor role exists in the spec
(`openspec/specs/access-control/spec.md`) but has no in-product
administration. Today an Admin has to log into Sanity Studio and
hand-craft `editorAccess` documents. This is the gap flagged in the
"how do we create users?" conversation. Small, contained, no other
work-in-flight touches it — perfect first Claude Design pilot.

---

## Brief (paste below this line into Claude Design)

I want to design a single admin page for an internal HMCTS staff tool.
This page lets an Administrator grant or revoke per-project edit access
for other staff. Today there is no UI; the admin has to edit JSON in a
CMS we're moving away from.

## Audience and tone

- **Who uses this**: ~5 named Administrators across HMCTS DTS Crime.
  No public access. Not citizen-facing.
- **Frequency**: each admin uses it a few times a month, not daily.
  They want to get in, do the change, get out.
- **Style**: civic and sober — the look-and-feel cue is GOV.UK Design
  System, but treat it as **flavoring, not law**. Clean neutral
  greys, blue links, semantic HTML, real form labels, focus rings.
  Don't over-specify the visual language; the goal is "feels like
  it belongs in a government internal tool" rather than passing a
  formal Service Standard assessment.

## The job

The Admin needs to:

1. **See** the current allowlist — every (editor email, project) pair
   currently in force.
2. **Add** a new mapping — "grant Alice edit access to Project X".
3. **Remove** a mapping — "revoke Bob's access to Project Y".
4. **Find** a specific entry quickly when there are many — by email
   or by project name.

That's it. Out of scope: bulk import, self-service, project-side view,
mobile-first layout (desktop is the primary device).

## What to design

A single page route at `/admin/editors`. **One screen, no wizard.**
The page contains three components, in this top-to-bottom order:

### 1. "Grant edit access" form (top of page)

Why at the top: the Admin's primary action is "add a new mapping".
Reviewing the existing list is secondary. Don't bury the verb.

Fields:
- **Email** (text input, required, validated as email)
- **Project** (combobox / searchable select against a list of ~30 projects)

Button: **Grant edit access** (primary, dark, full-width on its row).

Inline validation:
- Email format invalid → "Enter a valid email address" under the input.
- Project not selected → "Choose a project".
- Duplicate mapping (same email + project already exists) → "This editor
  already has access to this project".

On success: form clears; the new row appears at the top of the table
below with a 2-second highlight (subtle background fade), then settles
into normal sort order.

### 2. Allowlist table (middle of page)

Headers and row content:

| Email | Project | Granted | (Remove) |
|---|---|---|---|

- **Email**: `alice.owner@hmcts.net` style — readable, monospace not
  required.
- **Project**: project display name (not the ID).
- **Granted**: relative date — "3 days ago", "2 months ago". Tooltip
  on hover shows the full ISO timestamp.
- **Remove**: small destructive button per row. Click → confirmation
  inline ("Remove access? Yes / No"), no separate modal — keep the
  row count from changing too suddenly.

Above the table: **a single filter input** — placeholder
"Filter by email or project". Narrows the table as the admin types.
No advanced filter UI — one box that matches either column is enough.

Sort: clicking a column header toggles asc/desc. Default sort is
"Granted desc" (newest first).

Volume: ~50–200 rows at maturity. Don't paginate; let it scroll.
Sticky header so the column labels stay visible.

### 3. Recent changes footer (bottom of page)

A small "Last 5 changes" section. Each row reads like:

> **Alice Owner** granted **Bob Editor** access to **Bundle triage** —
> 4 hours ago

Plain text, one line each. Not editable. This is reassurance — admins
want to see "yes my last action took effect" without scrolling back
through the table to find a row.

## Empty states

- **Zero mappings**: Show "No editors granted yet. Use the form above
  to grant project edit access." in the table area.
- **Filter matches nothing**: Show "No mappings match `<query>`. Clear
  filter." in the table area, with a "Clear filter" link.
- **Recent changes empty**: hide the section entirely (don't show
  "no changes yet" — clutter).

## Accessibility (please honour)

- Real `<label>` elements for every form input — placeholder is not a
  label.
- Focus rings visible (don't `outline: none` without a replacement).
- Errors announced by `aria-live="polite"` on the error region.
- Table is a real `<table>` with `<th scope="col">` headers — not a
  div grid.
- Keyboard: Tab through form, Enter submits; Escape cancels the
  inline "remove" confirmation.
- Colour contrast WCAG AA at minimum.

## What we already have (don't redesign)

- The page renders inside an existing AppShell with a left sidebar
  and a top header bar. **Your design is the page contents only** —
  don't draw the chrome.
- Tailwind utility classes are the styling system. If you produce
  HTML, prefer Tailwind utilities over a CSS-in-JS or custom stylesheet.
- The neutral / blue / red / green palette should approximate
  GOV.UK colours — if you don't know the exact hex, "neutral-700" /
  "blue-700" / "red-700" / "green-700" Tailwind shades are fine.

## What I want from the handoff

A standalone HTML/Tailwind handoff that I can hand off to Claude Code.
Specifically:

1. **`<EditorAllowlistPage />`** — top-level page composition.
2. **`<GrantEditAccessForm />`** — the add form with validation hooks
   (don't wire fetch — leave the submit handler as a TODO comment).
3. **`<AllowlistTable />`** — the filterable, sortable table with the
   inline remove confirmation.
4. **`<RecentChangesList />`** — the audit footer.
5. The empty/error states drawn out as separate variants so I can see
   exactly what each one looks like.

**Do not** generate API code, route handlers, or backend logic — I'll
wire those. Do not invent project data; use 6–8 fictional rows that
make the table interesting (mix of recently granted and old entries,
mix of email domains, mix of project names).

## Out of scope for this brief (please do NOT design)

- Mobile layout (desktop is fine; we'll iterate later if needed)
- Bulk import / CSV upload
- Project-side view ("who edits Project X?") — future work
- Self-service editor view — only Admins use this surface
- Auth gating UI — handled at the route level by middleware, not in
  the page
- Light/dark mode — single theme for now

## Output preference

Standalone HTML with Tailwind classes is the default. If you produce
JSX, that's also fine — we use React 19 + Next.js 15 App Router.

When you're ready, package the handoff and I'll feed it to Claude Code
to translate into our actual codebase shape (`app/(app)/admin/editors/page.tsx`
plus three components under `components/admin/`).
