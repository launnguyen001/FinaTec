import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { TransactionHistoryItem } from "../../application/finance/transaction-history-service";
import type { Category } from "../../domain/category/category";
import type { Account, CurrencyRecord } from "../../domain/ledger/repository";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { colors, spacing, typography } from "../../shared/theme/tokens";

function flatten(nodes: Array<Category & { children: Category[] }>): Category[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children as Array<Category & { children: Category[] }>)]);
}

function formatLineAmount(item: TransactionHistoryItem, currencies: CurrencyRecord[]): string {
  const line = item.lines[0]?.line;
  if (!line) return "—";
  const currency = currencies.find((value) => value.code === line.currencyCode);
  const precision = currency?.minorUnit ?? 0;
  const scale = 10n ** BigInt(precision);
  const major = line.amountMinor / scale;
  const fraction = precision > 0 ? `,${(line.amountMinor % scale).toString().padStart(precision, "0")}` : "";
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(major)}${fraction} ${line.currencyCode}`;
}

export function HistoryScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<TransactionHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [reversalTargetId, setReversalTargetId] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    if (!runtime) return;
    const [nextAccounts, tree, nextCurrencies] = await Promise.all([runtime.accounts.list(true), runtime.categories.listTree(true), runtime.ledger.listCurrencies(false)]);
    setAccounts(nextAccounts);
    setCategories(flatten(tree));
    setCurrencies(nextCurrencies);
  }, [runtime]);

  const applyFilters = useCallback(async () => {
    if (!runtime) return;
    setBusy(true);
    setFailure(null);
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw new Error("Khoảng ngày không hợp lệ. Dùng định dạng YYYY-MM-DD.");
      const result = await runtime.history.list({ from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z`, accountId, categoryId });
      setItems(result);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Không thể tải lịch sử.");
    } finally {
      setBusy(false);
    }
  }, [runtime, from, to, accountId, categoryId]);

  useEffect(() => { void loadOptions(); }, [loadOptions]);
  useEffect(() => { if (runtime) void applyFilters(); }, [runtime, applyFilters]);

  async function reverseEntry(entryId: string) {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null);
    try {
      await runtime.transactions.reversePostedEntry({ idempotencyKey: runtime.createId(), originalEntryId: entryId });
      setReversalTargetId(null);
      await applyFilters();
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể đảo giao dịch."); }
    finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenBackLink />
    <Text style={styles.eyebrow}>LEDGER</Text>
    <Text style={styles.title}>Lịch sử giao dịch</Text>
    <Text style={styles.subtitle}>Ngày lọc theo occurredAt — thời điểm nghiệp vụ phát sinh.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.card}>
      <Text style={styles.label}>Từ ngày</Text>
      <TextInput accessibilityLabel="Từ ngày" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={styles.input} />
      <Text style={styles.label}>Đến ngày</Text>
      <TextInput accessibilityLabel="Đến ngày" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={styles.input} />
      <Text style={styles.label}>Tài khoản</Text>
      <View style={styles.options}><Option label="Tất cả" selected={accountId === null} onPress={() => setAccountId(null)} />{accounts.map((item) => <Option key={item.id} label={item.name} selected={accountId === item.id} onPress={() => setAccountId(item.id)} />)}</View>
      <Text style={styles.label}>Danh mục</Text>
      <View style={styles.options}><Option label="Tất cả" selected={categoryId === null} onPress={() => setCategoryId(null)} />{categories.map((item) => <Option key={item.id} label={`${item.name}${item.isArchived ? " · archive" : ""}`} selected={categoryId === item.id} onPress={() => setCategoryId(item.id)} />)}</View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void applyFilters()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, busy && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Đang lọc…" : "Áp dụng bộ lọc"}</Text></Pressable>
      {failure ? <Text style={styles.error}>{failure}</Text> : null}
    </View>
    <Text style={styles.sectionTitle}>{items.length} giao dịch</Text>
    {items.length === 0 ? <Text style={styles.empty}>Không có giao dịch trong khoảng lọc này.</Text> : items.map((item) => <View key={item.entry.id} style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{item.entry.description || item.categoryName || item.entry.transactionKind || "Giao dịch"}</Text>
        <Text style={styles.meta}>{item.entry.occurredAt} · {item.categoryName ?? "Chưa phân loại"}</Text>
        <Text style={styles.meta}>{item.lines.map((line) => line.accountName).join(" · ")}</Text>
        {item.entry.reversalOfId ? <Text style={styles.reversal}>Đảo giao dịch {item.entry.reversalOfId}</Text> : null}
        {item.entry.transactionKind !== "REVERSAL" && !items.some((candidate) => candidate.entry.reversalOfId === item.entry.id) ? <Pressable accessibilityRole="button" onPress={() => { setReversalTargetId(reversalTargetId === item.entry.id ? null : item.entry.id); }} style={styles.reverseLink}><Text style={styles.reverseLinkText}>Đảo giao dịch</Text></Pressable> : null}
        {reversalTargetId === item.entry.id ? <View style={styles.reversalForm}><Text style={styles.meta}>Giao dịch gốc sẽ được giữ nguyên; hệ thống tạo bút toán đảo liên kết.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void reverseEntry(item.entry.id)} style={[styles.reverseButton, busy && styles.disabled]}><Text style={styles.reverseButtonText}>{busy ? "Đang đảo…" : "Xác nhận đảo"}</Text></Pressable></View> : null}
      </View>
      <View style={styles.amountBlock}><Text style={styles.amount}>{formatLineAmount(item, currencies)}</Text><Text style={styles.kind}>{item.entry.transactionKind ?? "LEGACY"}</Text></View>
    </View>)}
  </ScrollView>;
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  eyebrow: { color: colors.mutedText, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.mutedText, fontSize: typography.caption, lineHeight: 19 },
  card: { padding: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
  label: { color: colors.text, fontSize: typography.caption, fontWeight: "700", marginTop: spacing.sm },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background, color: colors.text, fontSize: typography.body },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  option: { minHeight: 36, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  optionSelected: { borderColor: colors.primary, backgroundColor: "#EAF4EF" },
  optionText: { color: colors.mutedText, fontSize: typography.caption, fontWeight: "600" },
  optionTextSelected: { color: colors.primary },
  primaryButton: { minHeight: 48, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  primaryButtonText: { color: "#FFFFFF", fontSize: typography.body, fontWeight: "700" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  sectionTitle: { marginTop: spacing.md, color: colors.text, fontSize: typography.subtitle, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowBody: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: typography.body, fontWeight: "700" },
  meta: { marginTop: 3, color: colors.mutedText, fontSize: 11 },
  amountBlock: { alignItems: "flex-end", gap: 5 },
  amount: { color: colors.text, fontSize: typography.caption, fontWeight: "700" },
  kind: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  reversal: { marginTop: 4, color: "#9B3838", fontSize: 10 },
  reverseLink: { marginTop: 7, alignSelf: "flex-start" },
  reverseLinkText: { color: "#9B3838", fontSize: 11, fontWeight: "700" },
  reversalForm: { marginTop: spacing.sm, gap: spacing.xs },
  reverseButton: { alignSelf: "flex-start", minHeight: 38, paddingHorizontal: spacing.md, justifyContent: "center", borderRadius: 10, backgroundColor: "#9B3838" },
  reverseButtonText: { color: "#FFFFFF", fontSize: typography.caption, fontWeight: "700" },
  empty: { color: colors.mutedText, fontSize: typography.caption, paddingVertical: spacing.md },
  error: { color: "#9B3838", fontSize: typography.caption },
});
