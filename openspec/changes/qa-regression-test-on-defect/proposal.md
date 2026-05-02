## Why

QA spotted a sign-out bug on the Render preview today: clicking *Sign out* redirected the browser to `https://localhost:10000/preview-auth` (the runtime's internal upstream URL) instead of the public host. The fix in PR #72 was small — return a relative `Location: /preview-auth` from the sign-out route — and a regression test was added alongside the fix.

But the rule "every defect produces a regression test" is currently implicit. The `engineering-team` spec gives the QA / Test Engineer "the verification bar" but does not commit the team to any specific bar at defect-fix time. Without that commitment, the next defect-fix PR could ship without a guarding test, and we would have no spec leverage to push back. The rule deserves to be a SHALL in the spec, not folklore.

This is a thin process clarification, not new behaviour. It writes down a working agreement the team already wants — and that QA today could not point to in writing.

## What Changes

Add one new requirement under the `engineering-team` capability: **Regression test on every defect fix**. The requirement covers:

- the rule itself (a defect fix MUST land with a regression test that fails on the broken code and passes on the fix),
- which test layer is appropriate (unit / integration / e2e — chosen by the QA / Test Engineer, with route handlers, API contracts, and middleware leaning unit-or-integration; user-visible flows leaning e2e),
- a narrow, named exemption for cases where a regression test is genuinely impossible (e.g. third-party-only failure modes that cannot be reproduced in local CI), with the exemption recorded in the decision log,
- a tie-back to the team-retrospective trigger so repeated regressions in the same surface re-open the question of test coverage.

No code paths change. No agent personas are added or removed. The PR-template `Test plan` block continues to be the surface where the regression test is named.

## Capabilities

### Modified Capabilities

- `engineering-team`: adds the **Regression test on every defect fix** requirement. The role table line for QA / Test Engineer is unchanged ("Owns the verification bar.") because the new requirement is what *owning the bar* means at defect-fix time.

### New Capabilities

None.

## Impact

- **Process / behaviour:** every PR that fixes a defect SHALL include a test that the defect would have failed on. PR review SHALL bounce a defect-fix PR that lacks a regression test (or a recorded exemption).
- **Tooling:** none. The existing vitest + Playwright setup already supports the test layers the requirement names.
- **Specs touched:** `engineering-team/spec.md` only.
- **Decision log:** any invocation of the narrow exemption (defect cannot be reproduced in CI) lands in `decisions/` per the existing decision-log requirement.
- **PR template:** the existing `Test plan` section is sufficient. No template change required, but reviewers SHOULD look for the regression test in that section before approving.
