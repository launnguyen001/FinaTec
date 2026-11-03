import { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";

import {
  runAccountingAcceptanceDiagnostic,
  type AccountingAcceptanceResult,
} from "../infrastructure/database/accounting-acceptance-diagnostic";

export default function Task02AccountingAcceptanceRoute() {
  const [result, setResult] = useState<AccountingAcceptanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runAccountingAcceptanceDiagnostic());
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
        TASK-02 Accounting Acceptance
      </Text>
      <Text>
        Creates an isolated encrypted database, runs opening balance, transfer,
        draft, reversal and idempotency commands, then removes only its own file
        and test key.
      </Text>
      <Button
        title={running ? "Running…" : "Run accounting checks"}
        onPress={run}
        disabled={running}
      />
      {error ? (
        <Text selectable style={{ color: "#b00020" }}>
          FAILED: {error}
        </Text>
      ) : null}
      {result ? (
        <View style={{ gap: 8 }}>
          <Text selectable>Database: {result.databaseName}</Text>
          <Text>File size: {result.fileSizeBytes ?? "unknown"} bytes</Text>
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
