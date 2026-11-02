# TASK-10 — Release Polish & Verification

- Phase: 5 — V1.0
- Priority: P0 for release
- Status: BLOCKED
- Dependencies: TASK-00 through TASK-09

## Objective
Prepare a stable V1.0 release candidate by completing cross-module regression, performance, accessibility, localization and store/build readiness checks.

## Scope
- Complete Vietnamese/English localization and dark mode.
- Accessibility review for core screens and input flows.
- Performance test with 10,000 financial records; measure startup target on a named reference device.
- Android release build and installation verification.
- iOS verification on supported build environment before claiming iOS support.
- Regression across offline workflows, migrations, reporting and backup/restore.
- Release notes, known limitations and financial disclaimer.

Out of scope: post-V1 features such as multi-device sync, stock-market expansion and home-screen widgets.

## Context
Read roadmap Definition of Done, Phase 5/6 and all completed task reports. Review current dependency compatibility and store requirements.

## Proposed changes
Localization resources; accessibility and performance fixes; release configuration; automated regression suites; release checklist and documentation.

## Business rules
- No new feature may bypass accounting invariants or privacy requirements.
- No P2 post-V1 feature enters the release scope without explicit approval.
- Performance claims must include device, dataset and measurement method.
- Do not claim iOS support without an actual iOS verification run.
- App messaging must state that it is a tracking tool, not investment or tax advice.

## Data changes
No planned schema change. Any release-blocking migration issue must be handled through a separately reviewed migration.

## Implementation plan
1. Freeze V1 feature scope and dependency versions.
2. Complete localization, dark mode and accessibility checks.
3. Run performance measurements with 10,000 records.
4. Run complete unit, integration and regression suites.
5. Verify offline behavior and backup/restore on clean installation.
6. Build and install Android release candidate.
7. Verify iOS build and core flows in an appropriate environment.
8. Prepare release notes, known issues and store checklist.

## Test plan
Full suite; clean install and upgrade migrations; offline core journeys; financial invariant regression; backup/restore; accessibility; startup and query performance; Android release install; iOS verification.

## Acceptance criteria
- [ ] All P0/P1 V1 requirements are implemented or explicitly excluded with approval.
- [ ] All financial invariant and regression tests pass.
- [ ] Offline core journeys work.
- [ ] Encrypted backup/restore passes clean-install verification.
- [ ] 10,000-record performance results are documented.
- [ ] Android release candidate installs and runs.
- [ ] iOS support is verified before being advertised.
- [ ] Localization, dark mode and baseline accessibility are reviewed.
- [ ] Release notes, known limitations and disclaimer are ready.

## Progress log
- Done: Task defined from Phase 5.
- Doing: Blocked pending all preceding tasks.
- Next: Execute final verification after feature freeze.
- Issues: Reference device and iOS build environment must be selected.
- Verification: Not run.