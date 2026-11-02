# TASK-09 — Security, Backup & Data Safety

- Phase: 5 — V1.0
- Priority: P0 before public release
- Status: BLOCKED
- Dependencies: TASK-00, TASK-01; integrate with all data modules

## Objective
Protect locally stored financial data and provide a user-controlled encrypted backup and restore workflow.

## Scope
- App lock with PIN and biometric unlock.
- Secure key lifecycle using platform-supported secure storage.
- Auto-lock and privacy behavior when app backgrounds.
- Encrypted backup export and restore.
- CSV/PDF export controls where required.
- Data deletion/reset flow with clear confirmation.
- Privacy review of logs, network requests and local files.

Out of scope: user accounts, server-side financial storage and multi-device synchronization.

## Context
Read specification security and backup sections, roadmap privacy principles, Phase 5 and risk table. Review TASK-00 SQLCipher/key-management findings.

## Business rules
- Financial records remain on device; external requests must not include balances, holdings or transaction history.
- PIN/biometric is an access-control layer, not a substitute for encryption.
- Encryption keys must not be hard-coded or logged.
- Backup must be encrypted and recovery behavior explained to the user.
- Restore must validate integrity before replacing current data.
- Failure during restore must not leave the user's existing database partially overwritten.
- App backgrounding follows the approved auto-lock policy.

## Proposed changes
Security service; secure key adapter; lock screens; backup format/versioning; encryption/decryption and integrity validation; restore staging workflow; privacy-safe logging and network audit.

## Data changes
No server schema. Define backup manifest/version and any local metadata required for safe restore.

## Implementation plan
1. Approve threat model, PIN policy, biometric fallback and key recovery.
2. Define backup format, encryption and integrity verification.
3. Implement secure key storage and database unlock lifecycle.
4. Implement encrypted backup creation.
5. Implement staged restore and rollback-safe replacement.
6. Implement auto-lock/background privacy behavior.
7. Audit logs, files and network calls for sensitive data.
8. Document recovery limitations and user responsibilities.

## Test plan
Wrong PIN/biometric cancellation; device lock/unlock; app backgrounding; corrupted backup; wrong password/key; interrupted export/restore; restore to clean install; compatibility across backup versions; verify no sensitive data in logs/network payloads.

## Acceptance criteria
- [ ] Threat model and key lifecycle are documented.
- [ ] Financial database encryption is verified on supported build.
- [ ] PIN/biometric and auto-lock behave as specified.
- [ ] Backup is encrypted and integrity-checked.
- [ ] Restore succeeds on a clean install and fails safely on corrupt input.
- [ ] Existing data is preserved if restore fails.
- [ ] Logs and outbound requests contain no unnecessary financial data.
- [ ] Recovery guidance is available to the user.

## Progress log
- Done: Task defined from Phase 5.
- Doing: Blocked pending security decisions and database foundation.
- Next: Approve key lifecycle and backup threat model.
- Issues: Recovery UX and key-loss behavior require explicit decision.
- Verification: Not run.