# TASK-01 — Project Foundation

**Priority:** P0  
**Status:** BLOCKED  
**Dependencies:** TASK-00

## Objective

Create the smallest runnable application foundation using only the approved stack and architecture.

## Scope

- Initialize the application using the approved toolchain.
- Establish the agreed module/package structure.
- Configure environment-specific settings without committing secrets.
- Add dependency management and reproducible build instructions.
- Configure unit and integration test execution.
- Add formatting, linting and static checks where supported.
- Add a minimal application entry point and health/smoke test.
- Add versioned local database initialization/migration skeleton if approved by TASK-00.

## Non-goals

- No finance UI beyond a minimal startup/smoke surface.
- No transaction, account or reporting business logic.
- No speculative plugin/module framework.

## Acceptance criteria

- [ ] A clean checkout can be built using documented commands.
- [ ] The application starts on the selected target.
- [ ] Automated test command runs successfully.
- [ ] Lint/format/static-check commands are documented and runnable.
- [ ] No secrets or personal financial data are committed.
- [ ] Architecture boundaries are reflected in the project structure.
- [ ] README setup instructions are verified from a clean environment.

## Verification

Attach build, test and static-check results to the completion report.
