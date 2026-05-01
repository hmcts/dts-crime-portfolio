# dts-crime-portfolio

Single discoverable front door for DTS Crime delivery information in HMCTS:
projects, ownership, governance, action plan progress, exports, learning,
prompts, and events. Sits over Ardoq, Jira, Confluence, and SharePoint
without replacing them.

## Status

Pre-build. Behaviour is specified in [`openspec/specs/`](openspec/specs).
Active and archived change proposals live under `openspec/changes/`.

## Stack (planned)

Next.js (App Router) · React · Tailwind · TypeScript · Sanity CMS ·
GOV.UK Notify · PostHog. Initial preview deploy on Render.com.

## Working with this repo

- Read the specs: `openspec list --specs` then `openspec spec show <capability>`
- Conventions for code and changes: [`CLAUDE.md`](CLAUDE.md)
- Node version: see [`.nvmrc`](.nvmrc) · package manager: pnpm
