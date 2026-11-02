import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../shared/theme/tokens";
import { logSafeEvent } from "../shared/logging/logger";
import { useDatabaseSpike } from "../presentation/providers/DatabaseSpikeProvider";

export default function DatabaseSpikeRoute() {
  const run = useDatabaseSpike();
  const [result, setResult] = useState("Đang kiểm tra nền tảng database…");
  const runSpike = useCallback(() => run(), [run]);

  useEffect(() => {
    let mounted = true;

    runSpike()
      .then((message) => {
        if (mounted) setResult(message);
        logSafeEvent("database.spike.succeeded");
      })
      .catch((error: unknown) => {
        if (mounted) {
          const safeStage =
            error instanceof Error &&
            error.message.startsWith("TASK-00 database spike failed at stage:")
              ? error.message
              : "Kiểm tra thất bại. Xác nhận đây là Development Build có SQLCipher.";
          setResult(safeStage);
        }
        logSafeEvent("database.spike.failed");
      });

    return () => {
      mounted = false;
    };
  }, [runSpike]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TASK-00 database spike</Text>
      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  result: {
    marginTop: spacing.md,
    color: colors.mutedText,
    fontSize: typography.body,
  },
});
