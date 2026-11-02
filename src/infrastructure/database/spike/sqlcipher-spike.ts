// Keep the original TASK-00 route backed by the same isolated integration runner.
// This prevents the legacy runner from opening the old fixed-name spike database.
export { runSqlCipherFileDiagnostic as runSqlCipherSpike } from "./sqlcipher-file-diagnostic";
