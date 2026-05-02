# Tasks

## 1. Spec change

- [x] 1.1 Add `Requirement: Regression test on every defect fix` to `engineering-team` spec under the change proposal at `specs/engineering-team/spec.md`.
- [x] 1.2 `openspec validate qa-regression-test-on-defect --strict` passes.

## 2. PR review handover

- [ ] 2.1 Reviewers SHALL apply the new requirement starting with the merge of this change.
- [ ] 2.2 If a defect-fix PR is opened during this change's review window without a regression test, the reviewer SHALL link to this change in the review comment so the rule is visible before it is canonical.

## 3. Archive

- [ ] 3.1 After merge, run `openspec archive qa-regression-test-on-defect` to move the new requirement into `openspec/specs/engineering-team/spec.md`.

## Implementation notes

There is no code work. The change is a process commitment, expressed as a SHALL in the engineering-team spec. The next defect-fix PR is the natural verification that the rule has landed.
