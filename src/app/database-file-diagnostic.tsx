import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../shared/theme/tokens";
import { logSafeEvent } from "../shared/logging/logger";
import { useSqlCipherFileDiagnostic } from "../presentation/providers/DatabaseSpikeProvider";

export default function DatabaseFileDiagnosticRoute() {
  const runDiagnostic = useSqlCipherFileDiagnostic();
  const [report, setReport] = useState("Đang chạy chẩn đoán file SQLCipher…");

  useEffect(() => {
    if (!__DEV__) return;
    let mounted = true;

    runDiagnostic()
      .then((result) => {
        if (mounted) setReport(result);
        logSafeEvent(
          result.includes("Result: integration checks passed")
            ? "database.spike.succeeded"
            : "database.spike.failed",
        );
      })
      .catch(() => {
        if (mounted)
          setReport("Diagnostic runner failed before recording results.");
        logSafeEvent("database.spike.failed");
      });

    return () => {
      mounted = false;
    };
  }, [runDiagnostic]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SQLCipher file diagnostic</Text>
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
