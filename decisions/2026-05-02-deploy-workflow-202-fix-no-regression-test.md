# 2026-05-02 — Deploy workflow 202-handling fix ships without a regression test (narrow exemption)

**Decision** — The deploy-workflow fix that accepts Render's `HTTP 202` response (as well as `HTTP 200`) ships without an automated regression test, under the narrow exemption clause of the *Regression test on every defect fix* requirement in `engineering-team` spec.

**Decider** — DevOps Engineer with QA / Test Engineer concurring (the rule is the QA bar; the QA persona must agree the exemption applies). Lead Developer and Product Manager not consulted because the change does not affect any user-visible flow or implementation contract.

**Context** — When three PRs (#76, #77, #78) merged within ~5 minutes, Render's deploy hook returned `HTTP 202 + {}` for the second and third calls — meaning "a deploy is already in flight; the next one will pick up the latest commit." The deploy workflow's `grep -q '"deploy"'` check treated that empty body as failure, so two GitHub Action runs were marked red even though both deploys behaved correctly (the live preview reflects HEAD; verified via curl). The fix accepts `200` *or* `202` in a `case` statement against the captured `http_status:%{http_code}` line. This is the first time the *Regression test on every defect fix* rule's exemption clause has been invoked.

**Why no test**

- The defect is in a **GitHub Actions workflow file**, not application code. There is no Vitest or Playwright harness for asserting on workflow behaviour; `act` (the GitHub Actions local runner) is not in our toolchain and adding it for one assertion is disproportionate.
- The condition that triggers the bug — Render returning `202` instead of `200` — depends on **the timing of an external service** (Render's deploy queue). Local CI cannot reproduce it without standing up a Render-equivalent stub, which is more architecture than the fix warrants.
- The natural verification is **the next batch of back-to-back merges**. If the fix regresses, the deploy workflow will silently re-introduce the false-failure pattern, and the watch-main-CI working agreement (Wave 1 retro action 3) catches it. That feedback loop is short — within minutes of the next merge wave.

**Trigger condition for revisiting**

This exemption is reopened (and a regression test added) when **any** of the following becomes true:

1. We adopt `act` or another local-CI-runner tool for any other reason — the marginal cost of adding a deploy-workflow test then drops to near-zero.
2. The 202-handling regresses despite this fix — the next defect-fix PR includes a test, and we revisit whether the test approach generalises.
3. The deploy workflow grows past ~30 lines or gains additional decision points (more status codes, retry logic, etc.) — at that point an integration test becomes worth the setup cost.
4. The team adopts a generic "GitHub Actions workflow tests" pattern for any reason (new auditing requirement, compliance, etc.) — workflow tests come for free in that infrastructure.

**Cross-references**

- `openspec/specs/engineering-team/spec.md` → *Regression test on every defect fix* requirement, Scenario 5: *Genuinely-irreproducible defect (narrow exemption)*.
- `.github/workflows/deploy.yml` — the file under fix.
- The earlier secret-set diagnostic at `decisions/2026-05-02-defer-secrets-manager-choice-until-production.md` (related, not the same defect).
- Watch-main-CI working agreement in `CLAUDE.md` — the operational fallback if this fix regresses.
