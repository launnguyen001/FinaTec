import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  runRemediationAcceptanceDiagnostic,
  type RemediationAcceptanceCheck,
} from "../infrastructure/database/remediation-acceptance-diagnostic";
import { useFinanceRuntime } from "../presentation/providers/FinanceRuntimeProvider";

export default function RemediationAcceptanceRoute() {
  const { runtime } = useFinanceRuntime();
  const [checks, setChecks] = useState<RemediationAcceptanceCheck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!runtime) return;
    setRunning(true);
    setError(null);
    setChecks([]);
    try {
      setChecks(await runRemediationAcceptanceDiagnostic(runtime));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown failure");
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
        F-01 / F-02 Production acceptance
      </Text>
      <Text>
        Exercises categorized income, expense, reversal, migration triggers, and
        foreign keys on the production runtime and encrypted development DB.
      </Text>
      <Button
        title={running ? "Running…" : "Run remediation acceptance"}
        onPress={run}
        disabled={running || !runtime}
      />
      {running ? <ActivityIndicator /> : null}
      {error ? (
        <Text selectable style={{ color: "#b00020" }}>
          FAILED: {error}
        </Text>
      ) : null}
      {checks.map((check) => (
        <Text key={check.name} selectable>
          {check.passed ? "PASS" : "FAIL"} — {check.name}: {check.detail}
        </Text>
      ))}
    </ScrollView>
  );
}
