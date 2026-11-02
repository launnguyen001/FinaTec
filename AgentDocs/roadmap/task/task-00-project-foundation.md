# TASK-00 — Project Foundation

- **Phase:** 0 — Project Foundation
- **Priority:** P0
- **Status:** IN PROGRESS
- **Estimate:** 1–2 weeks (planning estimate)
- **Roadmap source:** `AgentDocs/roadmap/plan.md`
- **Specification source:** `AgentDocs/core/Đặc tả ứng dụng Quản lý Tài chính Cá nhân – Két Số.md`

## 1. Objective
Establish a reproducible Android/iOS development foundation for Két Số. Validate the current Expo project and prove the feasibility of the selected local encrypted database stack before feature implementation.

## 2. Scope
**In scope**
- Audit the existing repository, Expo SDK, React Native, package manager, app entry points and current build state.
- Establish TypeScript strict mode and a safe migration path from existing JavaScript; do not rewrite working code without need.
- Configure Expo Router and the agreed source layout.
- Configure lint, formatting, type-check, unit-test baseline and documented commands.
- Run a technical spike for SQLite + SQLCipher + Drizzle on an Expo Development Build, including open/close, encryption/key handling feasibility and one migration.
- Establish design tokens, typography, spacing and minimal reusable primitives.
- Establish privacy-safe logging and Android development build workflow.

**Out of scope**
- Financial feature implementation, final ledger schema and production backup implementation.
- Market-price provider integration.
- Replacing Expo or introducing a backend.

## 3. Dependencies
- None. This is the first execution task.
- Product and architecture constraints are defined by the specification and roadmap; unresolved choices must be recorded, not silently assumed.

## 4. Current context to inspect
- `package.json`, lockfile, `app.json`, `App.js`, `index.js`, `AGENTS.md`, `.gitignore`, existing assets and app startup.
- Current Expo SDK / React Native versions and compatibility documentation for every Expo/native API touched.
- Existing directory structure before adding `src/`.

## 5. Proposed changes
- Add or configure TypeScript, strict compiler settings and Expo Router only after compatibility review.
- Create the approved `src/app`, `presentation`, `application`, `domain`, `infrastructure`, `shared`, and test structure.
- Add lint/format/type-check/test scripts and a minimal smoke test.
- Add a database adapter spike isolated from production domain code.
- Document exact supported commands and development-build requirements.

## 6. Business and technical rules
- Core financial data remains local; no user financial data may be sent to a server.
- Do not assume Expo Go supports SQLCipher or other native modules.
- Use Expo-compatible dependency installation and versioned Expo documentation.
- No financial amounts may be calculated with ordinary floating-point arithmetic.
- Logs must not contain balances, transaction descriptions, PINs, keys or other sensitive financial data.

## 7. Data changes
No production schema. The spike may create a disposable test database and one test migration only.

## 8. Implementation plan
1. Inventory current app and capture baseline build/start/type/lint state.
2. Confirm Expo SDK and React Native versions; inspect matching versioned Expo docs.
3. Decide and document TypeScript adoption and routing migration strategy.
4. Configure project structure and quality gates with minimal disruption.
5. Prototype SQLite, SQLCipher and Drizzle in a Development Build.
6. Verify database encryption behavior, key storage boundary, open/close and migration.
7. Establish visual foundations and a minimal launch screen.
8. Record compatibility findings, decisions, blockers and follow-up tasks.

## 9. Test plan
- Clean install and start app on Android development build.
- Type-check, lint, formatter check and baseline unit tests.
- Launch smoke test and route/navigation smoke test.
- Database create/open/close/reopen and migration test.
- Verify wrong/missing key cannot read encrypted database (if the selected SQLCipher integration supports this claim).
- Verify no financial test data appears in logs.
- Record iOS feasibility separately; do not claim iOS verified from Android-only tests.

## 10. Acceptance criteria
- [ ] Existing app and dependencies have been audited.
- [ ] Android development build runs reproducibly.
- [ ] TypeScript strict-mode strategy is implemented or an explicit, justified migration plan is documented.
- [ ] Expo Router and source boundaries are established without business logic in UI.
- [ ] Lint, type-check and test baseline commands pass.
- [ ] SQLite + SQLCipher + Drizzle compatibility is demonstrated in a development build, or a documented blocker and viable alternative are presented.
- [ ] Database open/close and migration smoke tests pass.
- [ ] Privacy-safe logging rules and developer commands are documented.
- [ ] Decisions and unresolved risks are recorded for review.

## 11. Progress log
- **Done:** Task created from Phase 0 of the approved roadmap.
- **Doing:** Repository/toolchain audit and database feasibility spike.
- **Next:** Complete compatibility review and foundation implementation.
- **Issues:** Current repository starts as Expo JavaScript; confirm actual baseline before migrating.
- **Verification:** Not run.