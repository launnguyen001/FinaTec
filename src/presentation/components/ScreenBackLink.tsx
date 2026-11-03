import { Link } from "expo-router";
import { StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../shared/theme/tokens";

export function ScreenBackLink() {
  return (
    <Link href="/" accessibilityLabel="Quay về tổng quan" style={styles.link}>
      ‹ Tổng quan
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: "flex-start",
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "700",
    paddingVertical: spacing.xs,
  },
});
