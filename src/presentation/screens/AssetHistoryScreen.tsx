import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  AssetRecord,
  AssetTypeRecord,
} from "../../domain/asset/repository";
import type { DailyValuation } from "../../domain/asset/asset";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { colors, spacing, typography } from "../../shared/theme/tokens";

type Performance = {
  quantity: string;
  currencyCode: string;
  remainingCostBasisMinor: bigint;
  valuation: DailyValuation | null;
  calculation: {
    currentValueMinor: bigint;
    remainingCostBasisMinor: bigint;
    unrealizedPnlMinor: bigint;
    returnBasisPoints: bigint | null;
  } | null;
};

function money(amount: bigint, precision: number, currency: string): string {
  const scale = 10n ** BigInt(precision);
  const absolute = amount < 0n ? -amount : amount;
  const whole = absolute / scale;
  const fraction =
    precision > 0
      ? "," + (absolute % scale).toString().padStart(precision, "0")
      : "";
  return (
    (amount < 0n ? "−" : "") +
    new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(whole) +
    fraction +
    " " +
    currency
  );
}

export function AssetHistoryScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [types, setTypes] = useState<AssetTypeRecord[]>([]);
  const [assetId, setAssetId] = useState("");
  const [history, setHistory] = useState<DailyValuation[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [precision, setPrecision] = useState(2);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!runtime) return;
    setBusy(true);
    setFailure(null);
    try {
      const [nextAssets, nextTypes] = await Promise.all([
        runtime.assetCatalog.listAssets(),
        runtime.assetCatalog.listAssetTypes(),
      ]);
      const marketAssets = nextAssets.filter((asset) =>
        nextTypes.some(
          (type) =>
            type.id === asset.assetTypeId &&
            type.valuationModel === "MARKET_VALUED",
        ),
      );
      setAssets(marketAssets);
      setTypes(nextTypes);
      const selectedId = marketAssets.some((asset) => asset.id === assetId)
        ? assetId
        : (marketAssets[0]?.id ?? "");
      setAssetId(selectedId);
      if (!selectedId) {
        setHistory([]);
        setPerformance(null);
        return;
      }
      const [nextHistory, nextPerformance, currencies] = await Promise.all([
        runtime.assetValuations.getHistory(selectedId),
        runtime.assetValuations.getUnrealizedPnl(selectedId),
        runtime.ledger.listCurrencies(false),
      ]);
      const asset = marketAssets.find((item) => item.id === selectedId);
      const currency = currencies.find(
        (item) => item.code === asset?.quoteCurrency,
      );
      setHistory(nextHistory);
      setPerformance(nextPerformance);
      setPrecision(currency?.minorUnit ?? 2);
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : "Không thể tải lịch sử định giá.",
      );
    } finally {
      setBusy(false);
    }
  }, [runtime, assetId]);

  useEffect(() => {
    // Refresh history after the runtime or selected asset changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selectedAsset = assets.find((item) => item.id === assetId);
  const selectedType = types.find(
    (item) => item.id === selectedAsset?.assetTypeId,
  );
  const latest = performance?.valuation ?? null;
  const maxValue = Math.max(
    1,
    ...history.map((item) => Number(item.totalValue) || 0),
  );
  const pnl = performance?.calculation?.unrealizedPnlMinor ?? null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenBackLink />
      <Text style={styles.eyebrow}>ASSET MANAGEMENT</Text>
      <Text style={styles.title}>Lịch sử định giá</Text>
      <Text style={styles.subtitle}>
        Lịch sử snapshot theo ngày ứng dụng; giá thị trường chỉ thay đổi
        valuation và unrealized P&L, không tạo bút toán Ledger.
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {failure ? <Text style={styles.error}>{failure}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Chọn tài sản</Text>
        <View style={styles.options}>
          {assets.map((asset) => (
            <Pressable
              key={asset.id}
              accessibilityRole="button"
              accessibilityState={{ selected: asset.id === assetId }}
              onPress={() => setAssetId(asset.id)}
              style={[
                styles.option,
                asset.id === assetId && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  asset.id === assetId && styles.optionTextSelected,
                ]}
              >
                {asset.symbol}
              </Text>
            </Pressable>
          ))}
        </View>
        {selectedAsset ? (
          <Text style={styles.muted}>
            {selectedAsset.name} · {selectedType?.name ?? "Market-valued"} ·{" "}
            {selectedAsset.quoteCurrency}
          </Text>
        ) : (
          <Text style={styles.muted}>Chưa có tài sản market-valued.</Text>
        )}
      </View>
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      {performance ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Unrealized P&L</Text>
          <Text style={[styles.pnl, pnl !== null && pnl < 0n && styles.loss]}>
            {pnl === null
              ? "Chưa có snapshot định giá"
              : money(pnl, precision, performance.currencyCode)}
          </Text>
          <Text style={styles.muted}>
            Số lượng còn lại: {performance.quantity}
          </Text>
          <Text style={styles.muted}>
            Remaining cost basis:{" "}
            {money(
              performance.remainingCostBasisMinor,
              precision,
              performance.currencyCode,
            )}
          </Text>
          {performance.calculation?.returnBasisPoints !== null &&
          performance.calculation?.returnBasisPoints !== undefined ? (
            <Text style={styles.muted}>
              Tỷ suất:{" "}
              {(
                Number(performance.calculation.returnBasisPoints) / 100
              ).toFixed(2)}
              %
            </Text>
          ) : null}
          {latest ? (
            <Text style={styles.muted}>
              Valuation gần nhất:{" "}
              {money(
                performance.calculation?.currentValueMinor ?? 0n,
                precision,
                latest.currencyCode,
              )}{" "}
              · {latest.valuationDate} · {latest.source} · {latest.quoteStatus}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Biểu đồ giá trị theo ngày</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>
            Chưa có daily valuation. Hãy ghi nhận giá thủ công hoặc refresh
            provider.
          </Text>
        ) : (
          <View style={styles.chart}>
            {history.slice(-30).map((item) => {
              const height = Math.max(
                6,
                (Number(item.totalValue) / maxValue) * 112,
              );
              return (
                <View key={item.id} style={styles.barColumn}>
                  <View style={[styles.bar, { height }]} />
                  <Text style={styles.barLabel}>
                    {item.valuationDate.slice(5)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        <Text style={styles.muted}>
          Hiển thị tối đa 30 snapshot gần nhất. Trục chiều cao được chuẩn hóa
          theo giá trị lớn nhất trong tập đang hiển thị.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Snapshot history</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>Không có dữ liệu lịch sử.</Text>
        ) : (
          history
            .slice()
            .reverse()
            .map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyBody}>
                  <Text style={styles.historyDate}>{item.valuationDate}</Text>
                  <Text style={styles.muted}>
                    {item.source} · {item.quoteStatus} ·{" "}
                    {item.closedAt ? "Đã chốt" : "Đang mở"}
                  </Text>
                </View>
                <Text style={styles.historyValue}>
                  {item.totalValue} {item.currencyCode}
                </Text>
              </View>
            ))
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={busy || !runtime || !assetId}
        onPress={() => void load()}
        style={[styles.primaryButton, (busy || !assetId) && styles.disabled]}
      >
        <Text style={styles.primaryButtonText}>Làm mới lịch sử</Text>
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
  muted: {
    color: colors.mutedText,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: "#E7F3ED" },
  optionText: {
    color: colors.mutedText,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  optionTextSelected: { color: colors.primary },
  pnl: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  loss: { color: "#B42318" },
  chart: {
    height: 142,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    paddingTop: spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  bar: {
    width: "70%",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: colors.primary,
    minHeight: 6,
  },
  barLabel: { color: colors.mutedText, fontSize: 9 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  historyBody: { flex: 1 },
  historyDate: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
  },
  historyValue: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "700",
  },
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
});
