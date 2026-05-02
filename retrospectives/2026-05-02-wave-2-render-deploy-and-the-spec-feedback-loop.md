# 2026-05-02 — Wave 2: Render deploy edge cases and the spec-feedback loop

**Date:** 2026-05-02

**Trigger:** Two simultaneous triggers per the team-retrospective spec.

1. **Parallel-agent batch concluded.** The Wave 2 batch (PRs #65–#74) reached merged or open-ready-to-merge state in a single working day. PRs #65 (watch-main-CI working agreement), #66 (Dependabot major-bumps triage), #67 (logger retrofit on Wave 1 routes), #68 (Playwright e2e + workflow restored), #69 (secrets-manager deferral decision-log), #70 (AnalyticsBanner dismiss-after-consent), #71 (preview-auth domain restriction), #72 (sign-out redirect fix), #73 (regression-test-on-defect spec change) all merged; #74 (archive of #73 into the canonical spec) is open.
2. **A QA-found defect prompted a working-agreement change.** The sign-out redirect bug landed on the deployed Render preview pointing at `https://localhost:10000/preview-auth`. The fix shipped with a regression test by happenstance, which prompted the team to make "regression test on every defect fix" a SHALL in the `engineering-team` spec rather than folklore.

**Participants (active):** Delivery Manager (facilitator), Product Manager, Technical Architect, Lead Developer, QA / Test Engineer, DevOps Engineer, Backend Developer, Frontend Developer, Security Engineer.

## Previous retro action items (Wave 1)

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Fix the Playwright workflow so it stops reporting failure on `main` | DevOps Engineer | **Done** in PR #65 (guard job pattern: `should-run` job emits a flag; `e2e` job runs only when the flag is true; "skipped" no longer reports as workflow failure). Confirmed by green Playwright runs on every push to main since #70. |
| 2 | Re-attempt Playwright e2e tests | QA / Test Engineer | **Done** in PR #68 (preview-auth flow, portfolio empty state, portfolio with mocked Sanity, dossier render, help-faq search), extended in PR #71 (rejection-domain test) and PR #72 (sign-out unit-level regression). |
| 3 | Watch CI on `main` after every merge | Delivery Manager | **Done** in PR #65 (CLAUDE.md "Watch CI on `main` after every merge" working agreement). The agreement caught the persistently-failing deploy workflow this batch — see "What didn't go well" below. |
| 4 | Tighten the Dependabot dev-deps group | DevOps Engineer | **Done** in PR #58 (groups split into `update-types: minor + patch`; major bumps come through as individual PRs). Six majors did indeed arrive as #59–#64 this batch and were triaged individually per the design. |
| 5 | PR template — visible Team section + decision-log link | Delivery Manager | **Done** in PR #58. PRs #65–#74 all carry the Active / Standby / Not relevant section and link to decision-log entries where relevant. |

5 / 5 done. No items dropped.

## What went well

- **The "watch main CI" agreement caught what Wave 1 missed.** Wave 1's blind spot was the silently-failing Playwright workflow. Wave 2's first observation, after the second merge of the day, was "deploy is failing on every push." Same kind of signal, this time noticed within minutes.
- **The Product Manager-outranks-build-it rule kept producing wins.** PR #69 (defer secrets-manager choice until production estate known) was a textbook case — the user outcome (preview that works, secrets not in git) was already met by the Render env-var store, and committing to a specific secrets manager now would lock us in against unknown HMCTS estate constraints. Decision-log entry, no code, moved on.
- **Stacked PRs were managed cleanly.** PR #71 stacked on PR #68. After #68 was force-pushed for the CodeQL config-file fix, `git rebase --onto origin/add-playwright-e2e <old-tip>` rebased #71 cleanly without needing to re-apply commits manually. A pattern worth keeping.
- **CodeQL caught a real signal at PR time, again.** PR #68's `js/disabling-certificate-validation` flag on `playwright/fixtures/preload-mock.cjs:65` was a true positive on a test fixture. The architectural fix (path-ignore via `codeql-config.yml`) excludes test fixtures from analysis without weakening production scrutiny. Better than the alternative of silencing the rule globally.
- **OpenSpec validation has a fast feedback loop.** `openspec validate qa-regression-test-on-defect --strict` catches header/format mismatches in under a second. Encouraged us to put the regression-test rule into the spec rather than into folklore.
- **The Wave 2 PRs picked up the engineering-team spec discipline immediately.** Every PR listed Active / Standby / Not relevant personas; every decision file followed the template; every defer was logged. The spec landed in the same wave it was authored, and the wave that followed used it as written.

## What didn't go well

- **The Render deploy workflow has been failing on every merge across Wave 1 and Wave 2 because `RENDER_DEPLOY_HOOK_URL` is not set in GitHub Secrets.** The "watch main CI" agreement caught it; the fix is a one-line secret the team cannot set on its own (only the user has Render dashboard access). The action loop is open until the secret is set. **Same shape as Wave 1's Playwright signal but with a single human-only step in the way.** Worth noting that even with the working agreement, there's still a class of "we noticed but we can't fix" failures that need a separate channel.
- **The sign-out redirect bug shipped in Wave 1 and was only caught when the user actually clicked Sign out on the deployed preview.** We had Playwright e2e for sign-in (PR #68) but not for sign-out — the existing fixture covers `sign-in → cookie set → navigate to a protected route`, not `signed-in user → sign out → land on /preview-auth`. The regression-test-on-defect rule (PR #73) addresses going-forward defects, but a "what-other-flows-have-no-e2e-coverage" sweep is a separate question.
- **The dispatch model still treats "PR-time CI green" as "done", which doesn't catch deploy-time edge cases.** `request.url` returning `https://localhost:10000` on Render is a runtime-specific behaviour that no local test would have caught without explicit knowledge of the platform. Ideally a pre-merge e2e would run against a deployed preview, not a localhost dev server. That's a bigger investment than this batch warranted, but it should be on the radar.
- **The Wave 2 dispatch was sequential, not parallel, after the early Wave 1 successes.** Most of Wave 2 was one-PR-at-a-time. The parallel-agent pattern shines when there are many independent surfaces; with five PRs that all touched preview-auth, observability, or dependencies, sequential was cheaper than coordinating worktrees. Worth observing rather than fixing.

## Surprises

- **Render's request URL exposes the internal upstream host.** `request.url` on Render reflects `https://localhost:<bound-port>/...` rather than the public hostname. Any code that constructs absolute URLs from `request.url` (`new URL(path, request.url)`) leaks the internal host into headers, redirects, links, etc. Worth treating as a generic "deployment-platform edge" rather than a Render-specific quirk — Vercel, Cloud Run, Fly.io and others have their own variants of the same pattern. The fix in PR #72 (relative `Location` in a 303) sidesteps the problem by not constructing an absolute URL at all.
- **Next.js injects a hidden `<div role="alert">` route announcer**, which collides with Playwright's strict `getByRole('alert')` if a test asserts on a real alert by role. Worth noting as a test-authoring sharp edge: scope alerts by `id` or by role + accessible name, not by role alone.
- **Six Dependabot majors arrived in a single Dependabot run** after the dev-deps group narrowing. The supersede-branch pattern (one branch combining the safe pair, four explicit closes with deferral comments) handled it cleanly, but the volume was higher than expected. Future Dependabot runs may need a similar "compose then triage" approach.
- **Spec authoring is faster than expected.** Writing the regression-test requirement (PR #73), validating it, archiving it (PR #74), and applying it to the next defect-fix workflow happened inside one batch. The OpenSpec workflow is light enough that it's worth using for working-agreement changes, not just architectural ones.

## Action items

1. **Set the `RENDER_DEPLOY_HOOK_URL` GitHub Secret so deploys-on-merge actually fire.** The CI guard catches the failure but the fix is gated on dashboard access. **Owner:** User (Render dashboard access required). **Artefact:** GitHub repository secret. **Horizon:** before next batch. **Trigger:** the next merge to main; deploy workflow should turn green and the Render service should pick up the change automatically.

2. **Add a Playwright e2e for the sign-out flow.** Closes the gap behind today's QA find. The test should: sign in with a valid HMCTS email, navigate to a protected page, submit the sign-out form, assert the browser lands on `/preview-auth` (relative-path-resolution check), and assert the previewAuth cookie is gone. **Owner:** QA / Test Engineer. **Artefact:** PR adding `playwright/tests/sign-out.spec.ts`. **Horizon:** next batch.

3. **Document the "redirect tests must reproduce the deployed-platform host" rule.** Add a short subsection to `CLAUDE.md` (or a new `docs/testing-redirects.md`) saying that any route returning a redirect SHALL have a unit test that drives a request URL with a non-public host (e.g. `https://localhost:10000`) and asserts the response Location resolves correctly. The sign-out fix in PR #72 is the canonical example. **Owner:** Lead Developer + DevOps Engineer. **Artefact:** PR (CLAUDE.md update). **Horizon:** next batch.

4. **PostHog wiring (when project key + region land).** Add `POSTHOG_PROJECT_KEY` and `POSTHOG_REGION` env-var entries to `render.yaml` with `sync: false`, plus `ANALYTICS_USER_ID_PEPPER` (user generates locally and pastes into Render). **Owner:** Performance Analyst + Backend Developer + DevOps Engineer. **Artefact:** PR. **Horizon:** when the user provides credentials.

5. **Coverage sweep: which user-visible flows have no e2e?** A quick survey of `playwright/tests/` against the capability specs. Not a build-everything action — produce a list, prioritise, and only schedule those whose absence has an actual user-outcome cost. **Owner:** QA / Test Engineer + Product Manager. **Artefact:** decision-log entry naming the prioritised gaps. **Horizon:** next batch.

## Working agreements changed

- **Regression test on every defect fix** — added as a SHALL to the `engineering-team` spec via PR #73 and folded into the canonical spec via PR #74. Reviewers SHALL bounce a defect-fix PR without a regression test (or a recorded exemption for genuinely-irreproducible defects). The QA / Test Engineer owns this bar.

- **Watch main CI after every merge (confirmed).** Wave 1's working agreement was honoured this batch and produced visible signal — the persistently-failing deploy workflow was caught at the second merge of the day. The agreement is keeping its shape; no change.

- **Dependabot dev-deps group narrowing (confirmed).** Wave 1's narrowing (groups limited to `update-types: minor + patch`) produced exactly the expected behaviour this batch — six majors arrived as individual PRs and were triaged individually. The narrowing is keeping its shape; no change.

- **Stacked-branch rebase pattern (informal):** when a branch is stacked on another that has been force-pushed, prefer `git rebase --onto <new-tip> <old-tip> HEAD` over re-creating commits. Records here as observation; not yet a working agreement.
