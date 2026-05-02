# Seeding the preview dataset with demo data

The Sanity `preview` dataset starts empty. The Product Manager needs to *see*
the product alive — every surface populated — before doing the KEEP/KILL pass
on capabilities. Empty surfaces hide problems and let cuts happen by accident.

## What it does

`scripts/seed-demo.ts` writes a curated set of HMCTS DTS Crime-style demo
documents into the configured Sanity dataset using `createOrReplace`. The
content covers:

- 4 groups, 6 directorates, 8 business areas, 12 capabilities, 8 people,
  4 action plan strands
- 12 projects spanning every stage (idea → scan → pilot → scale → stalled →
  sunset) with realistic Tier 1–3 governance, updates, and survey details
- 10 FAQs, 5 learning items, 8 prompts, 5 events, 5 ChangeLog rows

Every document uses a deterministic `_id` (prefixed `demo-…`), so re-running
the script overwrites the same records — no duplicates, safe to iterate.

## How to run it

Two paths. Pick whichever is closer to hand.

### Path A — GitHub Actions (recommended)

The repo carries a `seed-demo` workflow that runs the script in CI
using the `SANITY_API_TOKEN` repository secret. No local secret needed.

1. GitHub repo → **Actions** → **seed-demo** → **Run workflow**.
2. Pick `dataset: preview` (the workflow refuses `production`; `local`
   is offered for completeness and isn't usually wired up).
3. Tick **Dry run** for a count-only preview; leave unticked to write.
4. The job log prints "created N documents of type X" per type plus a
   final summary.

A second dispatch against the same dataset queues rather than races
(workflow concurrency is keyed on the dataset).

### Path B — local one-liner

Useful when iterating on the script itself.

```sh
SANITY_API_TOKEN=<editor-scope-token> pnpm seed:demo
```

Dry-run:

```sh
pnpm seed:demo -- --dry-run
```

Prints the document counts that *would* be created without contacting Sanity.

## Where the token comes from (path B only)

You need an **Editor**-scope token on the `preview` dataset:

- Sanity manage UI: <https://www.sanity.io/manage/project/vi5mhbtl> →
  *API* → *Tokens* → *Add API token* → role *Editor* → dataset `preview`.
- Or copy the value already set as `SANITY_API_TOKEN` on the
  `dts-crime-portfolio-preview` Render service (Environment tab). That
  token has Editor scope on `preview`.

The token is only consumed locally by this script; it is not committed.

## Wipe and re-seed

The script is idempotent via `createOrReplace`, so re-running it just
refreshes the same `demo-…` documents. To start clean, delete every
`demo-…` document via the Studio's *Vision* tool:

```groq
*[_id match "demo-*"] { _id }
```

…then run the script again. The script refuses to run if
`NEXT_PUBLIC_SANITY_DATASET === "production"`.
