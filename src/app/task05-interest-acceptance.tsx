import { useState } from "react";
import { ActivityIndicator, Button, ScrollView, Text, View } from "react-native";

import {
  runInterestAcceptanceDiagnostic,
  type InterestAcceptanceResult,
} from "../infrastructure/database/interest-acceptance-diagnostic";

export default function Task05InterestAcceptanceRoute() {
  const [result, setResult] = useState<InterestAcceptanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runInterestAcceptanceDiagnostic());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unknown diagnostic failure",
      );
    } finally {
      setRunning(false);
    }
  };

  if (!__DEV__) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text>Diagnostic available only in development builds.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        TASK-05 Interest Acceptance
      </Text>
      <Text>
        Runs on an isolated SQLCipher database. It upgrades a legacy Core
        Finance database, validates ACT/365 interest, verifies that accrued
        amounts do not affect Ledger balances, forces a journal insert failure
        to test atomic rollback, checks capitalization and payout, and retries
        posting to verify idempotency. Production data and keys are never used.
      </Text>
      <Button
        title={running ? "Running…" : "Run Task05 acceptance"}
        onPress={run}
        disabled={running}
      />
      {running ? <ActivityIndicator /> : null}
      {error ? (
        <Text selectable style={{ color: "#b00020" }}>
          FAILED: {error}
        </Text>
      ) : null}
      {result ? (
        <View style={{ gap: 8 }}>
          <Text selectable>Database: {result.databaseName}</Text>
          <Text>SQLCipher: {result.cipherVersion}</Text>
          {result.checks.map((item) => (
            <Text key={item.name} selectable>
              {item.passed ? "PASS" : "FAIL"} — {item.name}: {item.detail}
            </Text>
          ))}
          <Text>{result.cleanup}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
