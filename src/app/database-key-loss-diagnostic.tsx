import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { logSafeEvent } from "../shared/logging/logger";
import { colors, spacing, typography } from "../shared/theme/tokens";
import { useSqlCipherKeyLossDiagnostic } from "../presentation/providers/DatabaseSpikeProvider";

export default function DatabaseKeyLossDiagnosticRoute() {
  const runDiagnostic = useSqlCipherKeyLossDiagnostic();
  const [report, setReport] = useState(
    "Đang kiểm thử fail-closed cho key test…",
  );

  useEffect(() => {
    let mounted = true;
    runDiagnostic()
      .then((result) => {
        if (mounted) setReport(result);
        logSafeEvent(
          result.includes("App-side result: PASS")
            ? "database.spike.succeeded"
            : "database.spike.failed",
        );
      })
      .catch(() => {
        if (mounted)
          setReport("Key-loss diagnostic failed before recording results.");
        logSafeEvent("database.spike.failed");
      });

    return () => {
      mounted = false;
    };
  }, [runDiagnostic]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Isolated SecureStore key-loss test</Text>
      <ScrollView style={styles.report}>
        <Text selectable style={styles.result}>
          {report}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  report: {
    marginTop: spacing.md,
  },
  result: {
    color: colors.mutedText,
    fontSize: typography.caption,
  },
});
