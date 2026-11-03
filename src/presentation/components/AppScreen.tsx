import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Link, type Href } from "expo-router";
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { DashboardSummary } from "../../application/finance/dashboard-service";
import type { TransactionHistoryItem } from "../../application/finance/transaction-history-service";
import type { Account, CurrencyRecord } from "../../domain/ledger/repository";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { colors, spacing, typography } from "../../shared/theme/tokens";

function formatMoney(amountMinor: bigint, currency: CurrencyRecord | undefined): string {
  const code = currency?.code ?? "";
  const precision = currency?.minorUnit ?? 0;
  const scale = 10n ** BigInt(precision);
  const absolute = amountMinor < 0n ? -amountMinor : amountMinor;
  const major = absolute / scale;
  const fraction = precision > 0 ? `,${(absolute % scale).toString().padStart(precision, "0")}` : "";
  const formattedMajor = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(major);
  return `${amountMinor < 0n ? "−" : ""}${formattedMajor}${fraction} ${code}`.trim();
}

function countCategories(nodes: Array<{ children: unknown[] }>): number {
  return nodes.reduce((total, node) => total + 1 + countCategories(node.children as Array<{ children: unknown[] }>), 0);
}

function MetricCard({ title, values, currencies }: { title: string; values: Array<{ currencyCode: string; amountMinor: bigint }>; currencies: CurrencyRecord[] }) {
  return (
    <View style={styles.metricCard} accessible accessibilityRole="summary">
      <Text style={styles.metricTitle}>{title}</Text>
      {values.length === 0 ? <Text style={styles.metricValue}>—</Text> : values.map((value) => {
        const currency = currencies.find((item) => item.code === value.currencyCode);
        return <Text key={value.currencyCode} style={styles.metricValue}>{formatMoney(value.amountMinor, currency)}</Text>;
      })}
    </View>
  );
}

export function AppScreen() {
  const { runtime, error, loading: runtimeLoading } = useFinanceRuntime();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [categoryCount, setCategoryCount] = useState(0);
  const [baseCurrency, setBaseCurrency] = useState<string | null>(null);
  const [savingBaseCurrency, setSavingBaseCurrency] = useState(false);
  const [recent, setRecent] = useState<TransactionHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!runtime) return;
    setRefreshing(true);
    setScreenError(null);
    try {
      const now = new Date();
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const to = now.toISOString();
      const [nextSummary, nextAccounts, nextCurrencies, nextHistory, nextCategories, nextBaseCurrency] = await Promise.all([
        runtime.dashboard.getSummary(from, to),
        runtime.accounts.list(true),
        runtime.ledger.listCurrencies(false),
        runtime.history.list({ from, to }),
        runtime.categories.listTree(),
        runtime.ledger.getBaseCurrencyCode(),
      ]);
      setSummary(nextSummary);
      setAccounts(nextAccounts);
      setCurrencies(nextCurrencies);
      setRecent(nextHistory.slice(0, 6));
      setCategoryCount(countCategories(nextCategories));
      setBaseCurrency(nextBaseCurrency);
    } catch (cause) {
      setScreenError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu tài chính.");
    } finally {
      setRefreshing(false);
    }
  }, [runtime]);

  useEffect(() => {
    if (runtime) void loadDashboard();
  }, [runtime, loadDashboard]);

  const activeAssetCount = accounts.filter((account) => account.type === "ASSET" && !account.isArchived).length;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard()} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>QUẢN LÝ TÀI CHÍNH CÁ NHÂN</Text>
            <Text style={styles.title}>Két Số</Text>
            <Text style={styles.subtitle}>Tổng quan tháng này</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>KS</Text></View>
        </View>

        <View style={styles.navigation}>
          <Link href="/quick-expense" style={styles.navigationPrimary}>Ghi khoản chi</Link>
          <Link href="/quick-income" style={styles.navigationLink}>Ghi khoản thu</Link>
          <Link href="/transfer" style={styles.navigationLink}>Chuyển tiền</Link>
          <Link href="/opening-balance" style={styles.navigationLink}>Số dư đầu kỳ</Link>
          <Link href="/accounts" style={styles.navigationLink}>Tài khoản</Link>
          <Link href="/categories" style={styles.navigationLink}>Danh mục</Link>
          <Link href="/history" style={styles.navigationLink}>Lịch sử</Link>
        </View>
        {runtimeLoading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.stateText}>Đang khởi tạo kho dữ liệu an toàn…</Text></View> : null}
        {!runtimeLoading && error ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Không thể mở dữ liệu tài chính</Text><Text style={styles.errorText}>{error}</Text><Text style={styles.helperText}>Ứng dụng giữ nguyên dữ liệu hiện có và không tự tạo lại khóa hoặc database.</Text></View> : null}
        {screenError ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Không thể tải tổng quan</Text><Text style={styles.errorText}>{screenError}</Text></View> : null}
        {runtime && !baseCurrency && currencies.length > 0 ? <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Thiết lập tiền tệ cơ sở</Text>
          <Text style={styles.setupText}>Chọn đơn vị báo cáo mặc định. Số dư tài khoản vẫn được lưu và hiển thị theo tiền tệ gốc của từng tài khoản.</Text>
          <View style={styles.currencyOptions}>
            {currencies.filter((currency) => currency.isActive).map((currency) => <Pressable key={currency.code} accessibilityRole="button" accessibilityLabel={`Chọn ${currency.name} làm tiền tệ cơ sở`} disabled={savingBaseCurrency} onPress={async () => { setSavingBaseCurrency(true); try { await runtime.ledger.setBaseCurrencyCode(currency.code, new Date().toISOString()); await loadDashboard(); } catch (cause) { setScreenError(cause instanceof Error ? cause.message : "Không thể lưu tiền tệ cơ sở."); } finally { setSavingBaseCurrency(false); } }} style={({ pressed }) => [styles.currencyButton, pressed && styles.currencyButtonPressed]}>
              <Text style={styles.currencyCode}>{currency.code}</Text><Text style={styles.currencyName}>{currency.name}</Text>
            </Pressable>)}
          </View>
        </View> : null}

        {summary ? (
          <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Dòng tiền</Text><Text style={styles.sectionHint}>Theo ngày phát sinh</Text></View>
            <View style={styles.metricsGrid}>
              <MetricCard title="Tiền khả dụng" values={summary.availableByCurrency} currencies={currencies} />
              <MetricCard title="Tổng thu" values={summary.incomeByCurrency} currencies={currencies} />
              <MetricCard title="Tổng chi" values={summary.expenseByCurrency} currencies={currencies} />
              <MetricCard title="Dòng tiền ròng" values={summary.netFlowByCurrency} currencies={currencies} />
            </View>
            <View style={styles.overviewRow}>
              <View style={styles.overviewCard}><Text style={styles.overviewValue}>{activeAssetCount}</Text><Text style={styles.overviewLabel}>Tài khoản tiền đang hoạt động</Text></View>
              <View style={styles.overviewCard}><Text style={styles.overviewValue}>{categoryCount}</Text><Text style={styles.overviewLabel}>Danh mục</Text></View>
            </View>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Giao dịch gần đây</Text><Text style={styles.sectionHint}>Mới nhất trước</Text></View>
            {recent.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Chưa có giao dịch</Text><Text style={styles.emptyText}>Các khoản thu, chi và chuyển tiền sẽ xuất hiện tại đây sau khi được ghi sổ.</Text></View> : recent.map((item) => {
              const firstLine = item.lines[0]?.line;
              const amount = firstLine ? formatMoney(firstLine.amountMinor, currencies.find((currency) => currency.code === firstLine.currencyCode)) : "—";
              const label = item.entry.description || item.categoryName || item.entry.transactionKind || "Giao dịch";
              return <View key={item.entry.id} style={styles.historyRow}><View style={styles.historyMarker} /><View style={styles.historyBody}><Text style={styles.historyTitle}>{label}</Text><Text style={styles.historyMeta}>{item.categoryName ?? "Chưa phân loại"} · {new Date(item.entry.occurredAt).toLocaleDateString("vi-VN")}</Text></View><Text style={styles.historyAmount}>{amount}</Text></View>;
            })}
          </>
        ) : null}

        {__DEV__ && Platform.OS !== "web" ? <Link href="/database-file-diagnostic" style={styles.devLink}>Chẩn đoán file SQLCipher (development)</Link> : null}
        {__DEV__ && Platform.OS !== "web" ? <Link href={"/database-key-loss-diagnostic" as Href} style={styles.devLink}>Chẩn đoán mất key test (development)</Link> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: colors.mutedText, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { marginTop: 4, color: colors.text, fontSize: 30, fontWeight: "800" },
  subtitle: { marginTop: 4, color: colors.mutedText, fontSize: typography.body },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  avatarText: { color: colors.primary, fontWeight: "800" },
  navigation: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  navigationPrimary: { color: "#FFFFFF", backgroundColor: colors.primary, overflow: "hidden", borderRadius: 12, paddingVertical: spacing.md, paddingHorizontal: spacing.md, fontSize: typography.caption, fontWeight: "700" },
  navigationLink: { color: colors.primary, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: spacing.md, paddingHorizontal: spacing.md, fontSize: typography.caption, fontWeight: "700", overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: -spacing.sm },
  sectionTitle: { color: colors.text, fontSize: typography.subtitle, fontWeight: "700" },
  sectionHint: { color: colors.mutedText, fontSize: typography.caption },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricCard: { flexGrow: 1, flexBasis: "47%", minWidth: 145, padding: spacing.md, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 104, justifyContent: "center", gap: 6 },
  metricTitle: { color: colors.mutedText, fontSize: typography.caption, fontWeight: "600" },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
  overviewRow: { flexDirection: "row", gap: spacing.sm },
  overviewCard: { flex: 1, padding: spacing.md, borderRadius: 16, backgroundColor: "#F8FAF9", borderWidth: 1, borderColor: colors.border },
  overviewValue: { color: colors.primary, fontSize: 24, fontWeight: "800" },
  overviewLabel: { marginTop: 4, color: colors.mutedText, fontSize: typography.caption },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  historyMarker: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  historyBody: { flex: 1 },
  historyTitle: { color: colors.text, fontSize: typography.body, fontWeight: "600" },
  historyMeta: { marginTop: 3, color: colors.mutedText, fontSize: typography.caption },
  historyAmount: { color: colors.text, fontSize: typography.caption, fontWeight: "700" },
  emptyCard: { padding: spacing.lg, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontWeight: "700", fontSize: typography.body },
  emptyText: { marginTop: 5, color: colors.mutedText, fontSize: typography.caption, lineHeight: 19 },
  state: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: spacing.md },
  stateText: { color: colors.mutedText, fontSize: typography.caption },
  setupCard: { padding: spacing.md, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  setupTitle: { color: colors.text, fontSize: typography.body, fontWeight: "700" },
  setupText: { color: colors.mutedText, fontSize: typography.caption, lineHeight: 19 },
  currencyOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  currencyButton: { minWidth: 112, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  currencyButtonPressed: { opacity: 0.7 },
  currencyCode: { color: colors.primary, fontWeight: "800", fontSize: typography.body },
  currencyName: { marginTop: 2, color: colors.mutedText, fontSize: typography.caption },
  errorCard: { padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: "#E5B8B8", backgroundColor: "#FFF8F8", gap: 6 },
  errorTitle: { color: "#8B2C2C", fontSize: typography.body, fontWeight: "700" },
  errorText: { color: colors.text, fontSize: typography.caption },
  helperText: { color: colors.mutedText, fontSize: typography.caption },
  devLink: { color: colors.primary, fontSize: typography.caption, textDecorationLine: "underline" },
});
