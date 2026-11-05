import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  Text,
  View,
} from "react-native";

import {
  runCurrencyMigrationUpgradeDiagnostic,
  type CurrencyMigrationDeviceCheck,
} from "../infrastructure/database/currency-migration-upgrade-diagnostic";

export default function F02UpgradeAcceptanceRoute() {
  const [checks, setChecks] = useState<CurrencyMigrationDeviceCheck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    setChecks([]);
    try {
      setChecks(await runCurrencyMigrationUpgradeDiagnostic());
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
        F-02 forward migration acceptance
      </Text>
      <Text>
        Creates an isolated SQLCipher database using the historical pre-0011
        migration state, then runs migration 0011 through the production Drizzle
        migrator. The existing development database and its records are
        untouched.
      </Text>
      <Button
        title={running ? "Running…" : "Run F-02 upgrade verification"}
        onPress={run}
        disabled={running}
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
