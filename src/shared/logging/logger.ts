export type SafeLogEvent =
  "app.started" | "database.spike.succeeded" | "database.spike.failed";

/** Logs allowlisted event names only; never pass values, errors, keys, or user data. */
export function logSafeEvent(event: SafeLogEvent): void {
  if (__DEV__) {
    console.info(`[Ketso] ${event}`);
  }
}
