import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  runLiabilityAcceptanceDiagnostic,
  type LiabilityAcceptanceResult,
} from "../infrastructure/database/liability-acceptance-diagnostic";

export default function Task06LiabilityAcceptanceRoute() {
  const [result, setResult] = useState<LiabilityAcceptanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runLiabilityAcceptanceDiagnostic());
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
        TASK-06 Liability Acceptance
      </Text>
      <Text>
        Runs against a newly created, isolated SQLCipher database. It upgrades
        the legacy Core Finance schema, verifies loan origination, partial
        interest-first payment allocation, payment idempotency, early principal
        schedule recalculation, full payoff, archive guards, fee expense
        separation and Ledger/subledger reconciliation. It never reads or
        modifies the production finance database.
      </Text>
      <Button
        title={running ? "Running…" : "Run Task06 acceptance"}
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
