import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import type { AssetSettingsRecord } from "../../domain/asset/repository";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { colors, spacing, typography } from "../../shared/theme/tokens";
import { ASSET_REFRESH_TASK } from "../../infrastructure/background/asset-refresh-task";

const COINGECKO_KEY = "ketso.asset.coingecko-demo-key.v1";

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AssetSettingsScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [mode, setMode] = useState<"DEVICE" | "CUSTOM">("DEVICE");
  const [timezoneId, setTimezoneId] = useState("UTC");
  const [effectiveTimeZone, setEffectiveTimeZone] = useState("UTC");
  const [cryptoMinutes, setCryptoMinutes] = useState("15");
  const [metalMinutes, setMetalMinutes] = useState("60");
  const [fiatMinutes, setFiatMinutes] = useState("1440");
  const [primary, setPrimary] =
    useState<AssetSettingsRecord["primaryCryptoProvider"]>("COINPAPRIKA");
  const [fallback, setFallback] =
    useState<AssetSettingsRecord["fallbackCryptoProvider"]>("COINGECKO");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [backgroundStatus, setBackgroundStatus] =
    useState<string>("Chưa kiểm tra");
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);

  const load = useCallback(async () => {
    if (!runtime) return;
    const [settings, key] = await Promise.all([
      runtime.assetSettings.get(),
      SecureStore.getItemAsync(COINGECKO_KEY),
    ]);
    if (Platform.OS !== "web") {
      const [status, registered] = await Promise.all([
        BackgroundTask.getStatusAsync(),
        TaskManager.isTaskRegisteredAsync(ASSET_REFRESH_TASK),
      ]);
      setBackgroundStatus(
        status === BackgroundTask.BackgroundTaskStatus.Available
          ? registered
            ? "Đã đăng ký · OS quyết định thời điểm chạy"
            : "Sẵn sàng · chưa đăng ký"
          : "Bị giới hạn bởi hệ điều hành",
      );
    } else {
      setBackgroundStatus("Không hỗ trợ trên web");
    }
    setMode(settings.timezoneMode);
    setTimezoneId(settings.effectiveTimeZone);
    setEffectiveTimeZone(settings.effectiveTimeZone);
    setCryptoMinutes(String(settings.cryptoRefreshMinutes));
    setMetalMinutes(String(settings.metalRefreshMinutes));
    setFiatMinutes(String(settings.fiatRefreshMinutes));
    setPrimary(settings.primaryCryptoProvider);
    setFallback(settings.fallbackCryptoProvider);
    setApiKey(key ?? "");
  }, [runtime]);

  useEffect(() => {
    // Preferences load after the encrypted finance runtime is ready.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((cause: unknown) =>
      setFailure(
        cause instanceof Error ? cause.message : "Không thể tải cài đặt.",
      ),
    );
  }, [load]);

  async function refreshNow() {
    if (!runtime) return;
    setRefreshBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const outcomes = await runtime.assetPriceRefresh.refreshDueAssets(true);
      const updated = outcomes.filter((item) => item.status === "UPDATED").length;
      const skipped = outcomes.filter((item) => item.status === "SKIPPED").length;
      const failed = outcomes.filter((item) => item.status === "FAILED");
      if (outcomes.length === 0) {
        setMessage("Không có tài sản crypto đủ điều kiện refresh.");
      } else {
        setMessage(
          `Refresh hoàn tất: ${updated} cập nhật, ${skipped} bỏ qua, ${failed.length} lỗi.`,
        );
      }
      if (failed.length > 0) {
        setFailure(failed.map((item) => item.reason ?? item.assetId).join("; "));
      }
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể refresh giá tài sản.",
      );
    } finally {
      setRefreshBusy(false);
    }
  }

  async function save() {
    if (!runtime) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      if (primary === "COINGECKO" && !apiKey.trim()) {
        throw new Error(
          "CoinGecko Demo cần API key trước khi được chọn làm provider.",
        );
      }
      if (apiKey.trim()) {
        await SecureStore.setItemAsync(COINGECKO_KEY, apiKey.trim());
      }
      const settings = await runtime.assetSettings.update({
        timezoneMode: mode,
        timezoneId,
        cryptoRefreshMinutes: Number(cryptoMinutes),
        metalRefreshMinutes: Number(metalMinutes),
        fiatRefreshMinutes: Number(fiatMinutes),
        primaryCryptoProvider: primary,
        fallbackCryptoProvider: fallback,
      });
      setEffectiveTimeZone(
        mode === "DEVICE"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
          : settings.timezoneId,
      );
      setMessage("Đã lưu cài đặt định giá tài sản.");
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu cài đặt.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenBackLink />
      <Text style={styles.eyebrow}>ASSET MANAGEMENT</Text>
      <Text style={styles.title}>Cài đặt định giá</Text>
      <Text style={styles.subtitle}>
        Cấu hình timezone, chu kỳ refresh và thứ tự provider. Các giá trị này
        chỉ điều khiển dữ liệu định giá, không tạo bút toán Ledger.
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {failure ? <Text style={styles.error}>{failure}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Timezone lịch sử định giá</Text>
        <View style={styles.options}>
          <Option
            label="Theo thiết bị"
            selected={mode === "DEVICE"}
            onPress={() => setMode("DEVICE")}
          />
          <Option
            label="Tùy chỉnh"
            selected={mode === "CUSTOM"}
            onPress={() => setMode("CUSTOM")}
          />
        </View>
        <Text style={styles.label}>Timezone ID (IANA)</Text>
        <TextInput
          accessibilityLabel="Timezone ID"
          value={timezoneId}
          onChangeText={setTimezoneId}
          editable={mode === "CUSTOM"}
          placeholder="Asia/Ho_Chi_Minh"
          autoCapitalize="none"
          style={[styles.input, mode === "DEVICE" && styles.disabled]}
        />
        <Text style={styles.hint}>
          Timezone đang áp dụng: {effectiveTimeZone}. Timestamp vẫn được lưu
          theo UTC; chỉ valuation date dùng timezone này.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Chu kỳ refresh (phút)</Text>
        <Text style={styles.label}>Crypto · tối thiểu 15</Text>
        <TextInput
          accessibilityLabel="Crypto refresh minutes"
          keyboardType="number-pad"
          value={cryptoMinutes}
          onChangeText={setCryptoMinutes}
          style={styles.input}
        />
        <Text style={styles.label}>Kim loại · tối thiểu 15</Text>
        <TextInput
          accessibilityLabel="Metal refresh minutes"
          keyboardType="number-pad"
          value={metalMinutes}
          onChangeText={setMetalMinutes}
          style={styles.input}
        />
        <Text style={styles.label}>Fiat FX · tối thiểu 15</Text>
        <TextInput
          accessibilityLabel="Fiat refresh minutes"
          keyboardType="number-pad"
          value={fiatMinutes}
          onChangeText={setFiatMinutes}
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Background refresh</Text>
        <Text style={styles.hint}>
          {backgroundStatus}. OS chỉ chạy khi điều kiện pin/mạng phù hợp; thời
          điểm thực thi không được bảo đảm chính xác.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={refreshBusy || loading || !runtime}
          onPress={() => void refreshNow()}
          style={[
            styles.primaryButton,
            (refreshBusy || loading || !runtime) && styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {refreshBusy ? "Đang refresh…" : "Refresh giá ngay"}
          </Text>
        </Pressable>
        {__DEV__ && Platform.OS !== "web" ? (
          <Pressable
            accessibilityRole="button"
            disabled={backgroundBusy}
            onPress={async () => {
              setBackgroundBusy(true);
              setFailure(null);
              try {
                const triggered =
                  await BackgroundTask.triggerTaskWorkerForTestingAsync();
                setMessage(
                  triggered
                    ? "Đã kích hoạt background worker test."
                    : "OS không kích hoạt background worker test.",
                );
                await load();
              } catch (cause) {
                setFailure(
                  cause instanceof Error
                    ? cause.message
                    : "Không thể test background worker.",
                );
              } finally {
                setBackgroundBusy(false);
              }
            }}
            style={[styles.primaryButton, backgroundBusy && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {backgroundBusy ? "Đang kiểm thử…" : "Test background worker"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Crypto price providers</Text>
        <Text style={styles.label}>Primary provider</Text>
        <View style={styles.options}>
          <Option
            label="CoinPaprika"
            selected={primary === "COINPAPRIKA"}
            onPress={() => setPrimary("COINPAPRIKA")}
          />
          <Option
            label="CoinGecko Demo"
            selected={primary === "COINGECKO"}
            onPress={() => setPrimary("COINGECKO")}
          />
        </View>
        <Text style={styles.label}>Fallback provider</Text>
        <View style={styles.options}>
          <Option
            label="CoinPaprika"
            selected={fallback === "COINPAPRIKA"}
            onPress={() => setFallback("COINPAPRIKA")}
          />
          <Option
            label="CoinGecko Demo"
            selected={fallback === "COINGECKO"}
            onPress={() => setFallback("COINGECKO")}
          />
        </View>
        <Text style={styles.label}>CoinGecko Demo API key</Text>
        <TextInput
          accessibilityLabel="CoinGecko Demo API key"
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Lưu trong SecureStore của thiết bị"
          style={styles.input}
        />
        <Text style={styles.hint}>
          API key chỉ được lưu trong SecureStore, không nằm trong SQLite hoặc
          Git. CoinGecko chỉ bị bỏ qua nếu không có key và đang là fallback.
          Provider symbol cần đúng định danh của provider tương ứng.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={busy || loading || !runtime}
        onPress={() => void save()}
        style={[
          styles.primaryButton,
          (busy || loading || !runtime) && styles.disabled,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {busy ? "Đang lưu…" : "Lưu cài đặt"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: typography.title, fontWeight: "800" },
  subtitle: {
    color: colors.mutedText,
    fontSize: typography.body,
    lineHeight: 23,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  label: {
    color: colors.mutedText,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  hint: {
    color: colors.mutedText,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: typography.body,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: "#E7F3ED" },
  optionText: {
    color: colors.mutedText,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  optionTextSelected: { color: colors.primary },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: typography.body,
    fontWeight: "700",
  },
  disabled: { opacity: 0.5 },
  error: { color: "#B42318", fontSize: typography.body },
  success: { color: colors.primary, fontSize: typography.body },
});
