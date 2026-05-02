# dts-crime-portfolio — conventions for Claude

The portal is specified in `openspec/specs/`. Read the relevant capability
spec before changing behaviour. The spec is the contract; code conforms.

## How work is done

Every non-trivial change on this codebase is undertaken by a multi-disciplinary
GDS-style team of agent personas (Product Manager, Delivery Manager, User
Researcher, designers, developers, DevOps, QA, Performance Analyst, Security,
Accessibility). The full composition, roles, conflict-resolution stack, and
recording requirements are spec'd in
[`openspec/specs/engineering-team/spec.md`](openspec/specs/engineering-team/spec.md).

Two principles to internalise:

1. **The Product Manager outranks "build it"** — before agreeing to write code,
   the team considers whether the user outcome can be reached by a content
   edit, a process change, an integration with an existing service, or simply
   doing nothing.
2. **Outcome over output** — the work isn't complete when the PR merges; it's
   complete when the user outcome is reached.

When dispatching agents, name the personas active on the change and record
them in the PR description.

## Reading the spec

- `openspec list --specs` — list every capability
- `openspec spec show <capability>` — read one
- For new behaviour, propose a change first: `openspec new change <slug>`
  → write `proposal.md`, `specs/<capability>/spec.md`, `tasks.md` →
  `openspec validate <slug> --strict` → PR → implement →
  `openspec archive <slug>`

## Tooling

- Node: see `.nvmrc` (currently 22)
- Package manager: **pnpm**. Use `pnpm install`, `pnpm dev`, etc. Do not
  introduce `package-lock.json` or `yarn.lock`.
- Lint and typecheck must pass on every PR (CI runs both once a Next.js
  scaffold lands).

## Implementation rules

These are the load-bearing conventions baked into the specs. Follow them
exactly; if you find yourself wanting to break one, propose a spec change
first.

- **Auth resolver.** Every API route's first executable line is a call to
  `resolveUser()` from `lib/auth/resolver.ts`. The resolver reads the
  `x-user-email` header and returns either `{ kind: "unauthorized",
  reason }` or `{ kind: "authorized", email, isAdmin, editableProjects }`.
  No route reads the header directly. Admin allowlist is sourced from
  `ADMIN_ALLOWLIST` env (comma/whitespace-separated). Editor allowlist
  lookup is currently a stub returning `[]` — Admins can edit anything,
  and a real per-project Editor lookup against Sanity will replace the
  stub once we have an editorAccess schema. See
  `openspec/specs/access-control/spec.md`.
- **Browser never writes to Sanity.** All mutations go through Next.js
  API routes using a server-only token client. The browser uses a
  read-only client.
- **ChangeLog with every mutation.** Every successful mutation writes one
  ChangeLog row per modified field, in the *same* Sanity transaction.
  Use `commitWithChangeLog()` from `lib/sanity/transaction.ts` — pass the
  mutations callback, the per-field changes, and the resolver's email.
  Don't call `client.transaction()` directly from API routes. See
  `openspec/specs/change-tracking/spec.md`.
- **Roles use exact names.** `Viewer`, `Editor`, `Admin` — no synonyms in
  code, copy, comments, or specs.
- **Stage and Tier are shared enums.** One TypeScript source of truth used
  by the Sanity schema, forms, cards, galaxy colour map, and exports.
- **Reference-data endpoint is the dropdown lynchpin.** Every form and
  filter consumes `/api/portfolios/reference-data` once on mount. Don't
  add per-dropdown fetches.
- **Inline-created entities are `pendingReview: true`** until an Admin
  approves them. They do not appear in dropdowns for other users.
- **Snapshots inline resolved reference text** — never IDs only — so old
  Reporting Cuts read correctly after renames.
- **Portable Text everywhere updates appear** so dossier, exports, and
  digest emails render the same content consistently.
- **Exports are client-side** with `exceljs` / `docx` / `pptxgenjs`,
  except the compliance briefing and the compare/Word briefing which run
  server-side because they need the audit log.
- **Idempotent writes** for submission, prompt upvote, and prompt comment.
- **Tooltip explainer copy is content-managed in Sanity** — don't hardcode
  jargon explainers in components.

## Sanity

- Project ID: `vi5mhbtl` (non-secret, hardcoded as default in
  `sanity.config.ts` and overridable via `NEXT_PUBLIC_SANITY_PROJECT_ID`)
- Datasets: `preview` (early Render deploy + local dev) and eventually
  `production` (real go-live)
- Studio is embedded at `/studio/[[...tool]]/page.tsx` using `next-sanity`
- Schemas live under `sanity/schemas/` with documents in `documents/` and
  embedded objects in `objects/`
- `SANITY_API_TOKEN` is server-only and required for any write path. It
  is never read or referenced from client code or any file the browser
  bundles.
- Rule: when adding a new document type, register it in
  `sanity/schemas/index.ts` and update the test in
  `tests/sanity-schemas.test.ts` to include the new name.

## preview-auth (non-production only)

The preview-auth middleware is active when `APP_ENVIRONMENT` is `preview`
or `local` and inert in production. It captures an email via
`/preview-auth`, signs an HMAC cookie with `PREVIEW_AUTH_COOKIE_SECRET`,
and rewrites the `x-user-email` header on every request. Do not import
its module from any code path that ships in the production bundle. CI
fails the production build if it leaks. See
`openspec/specs/preview-auth/spec.md` (active change at
`openspec/changes/add-preview-auth/`).

## Commit & PR style

- Branch per change. Never push to `main`.
- Conventional-feeling commit subjects in lowercase ("add x", "fix y",
  "update z"). Wrap commit bodies at ~72 chars.
- PRs include a Summary and a Test plan section. Reference any related
  OpenSpec change slug in the body.

## Out of scope for any artefact in this repo

Do not name-drop the MoJ Justice AI Unit "AI for All" portal in any spec,
design doc, code, README, commit message, or PR description. Lead with
the DTS Crime problem statement instead.
