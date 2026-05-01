# dts-crime-portfolio — conventions for Claude

The portal is specified in `openspec/specs/`. Read the relevant capability
spec before changing behaviour. The spec is the contract; code conforms.

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
  the shared auth resolver. The resolver reads the `x-user-email` header
  and returns `{ email, isAdmin, editableProjects }`, or short-circuits
  with the appropriate HTTP error. No route reads the header directly.
  See `openspec/specs/access-control/spec.md`.
- **Browser never writes to Sanity.** All mutations go through Next.js
  API routes using a server-only token client. The browser uses a
  read-only client.
- **ChangeLog with every mutation.** Every successful mutation writes one
  ChangeLog row per modified field, in the *same* Sanity transaction.
  Use the shared transaction helper. See
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
