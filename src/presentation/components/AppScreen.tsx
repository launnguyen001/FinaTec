import { StatusBar } from "expo-status-bar";
import { Link, type Href } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../shared/theme/tokens";

export function AppScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Két Số</Text>
      <Text style={styles.message}>Nền tảng tài chính cá nhân của bạn.</Text>
      {__DEV__ && Platform.OS !== "web" ? (
        <Link href="/database-file-diagnostic" style={styles.devLink}>
          Chẩn đoán file SQLCipher (development)
        </Link>
      ) : null}
      {__DEV__ && Platform.OS !== "web" ? (
        <Link
          href={"/database-key-loss-diagnostic" as Href}
          style={styles.devLink}
        >
          Chẩn đoán mất key test (development)
        </Link>
      ) : null}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "700",
  },
  message: {
    marginTop: spacing.sm,
    color: colors.mutedText,
    fontSize: typography.body,
  },
  devLink: {
    marginTop: spacing.lg,
    color: colors.primary,
    fontSize: typography.caption,
  },
});
