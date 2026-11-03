import { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";

import {
  runAssetAcceptanceDiagnostic,
  type AssetAcceptanceResult,
} from "../infrastructure/database/asset-acceptance-diagnostic";

export default function Task04AssetAcceptanceRoute() {
  const [result, setResult] = useState<AssetAcceptanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runAssetAcceptanceDiagnostic());
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
        TASK-04 Asset Acceptance
      </Text>
      <Text>
        Runs on an isolated SQLCipher database. It upgrades a Core Finance
        database containing legacy data, then verifies atomic asset posting,
        partial-sale cost basis, DCA, valuation history, P&L, settings, refresh
        state and zero-quantity archive policy. It never opens or mutates the
        production database belonging to the user.
      </Text>
      <Button
        title={running ? "Running…" : "Run Task04 acceptance"}
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
