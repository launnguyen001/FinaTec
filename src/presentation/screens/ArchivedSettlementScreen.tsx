import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Account, CurrencyRecord } from "../../domain/ledger/repository";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { colors, spacing, typography } from "../../shared/theme/tokens";

function parseMinor(value: string, precision: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d*)?$/.test(normalized)) throw new Error("Nhập số tiền hợp lệ.");
  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > precision) throw new Error(`Tiền tệ này chỉ hỗ trợ tối đa ${precision} chữ số thập phân.`);
  return BigInt(whole) * (10n ** BigInt(precision)) + BigInt(precision ? (fraction + "0".repeat(precision)).slice(0, precision) : "0");
}
function parseRate(value: string): { numerator: string; denominator: string } {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(normalized) || Number(normalized) <= 0) throw new Error("Nhập tỷ giá dương, tối đa 8 chữ số thập phân.");
  const [whole = "0", fraction = ""] = normalized.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole + fraction);
  let a = numerator; let b = denominator;
  while (b !== 0n) { const remainder = a % b; a = b; b = remainder; }
  return { numerator: (numerator / a).toString(), denominator: (denominator / a).toString() };
}

export function ArchivedSettlementScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextAccounts, nextCurrencies, base] = await Promise.all([runtime.accounts.list(true), runtime.ledger.listCurrencies(false), runtime.ledger.getBaseCurrencyCode()]);
    setAccounts(nextAccounts); setCurrencies(nextCurrencies); setBaseCurrency(base);
    const source = nextAccounts.find((item) => item.type === "ASSET" && item.isArchived);
    const destination = nextAccounts.find((item) => item.type === "ASSET" && !item.isArchived && item.currencyCode === source?.currencyCode);
    setSourceId((current) => current || source?.id || ""); setDestinationId((current) => current || destination?.id || "");
  }, [runtime]);
  useEffect(() => { void refresh().catch((cause: unknown) => setFailure(cause instanceof Error ? cause.message : "Không thể tải tài khoản.")); }, [refresh]);

  const source = accounts.find((item) => item.id === sourceId);
  const destinations = accounts.filter((item) => item.type === "ASSET" && !item.isArchived && item.currencyCode === source?.currencyCode);
  const currency = currencies.find((item) => item.code === source?.currencyCode);

  async function settle() {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null); setMessage(null);
    try {
      if (!source || !destinationId || !currency || !baseCurrency) throw new Error("Cần chọn tài khoản archive, tài khoản nhận và tiền tệ cơ sở.");
      if (reason.trim().length < 8) throw new Error("Lý do kiểm toán phải có ít nhất 8 ký tự.");
      const amountMinor = parseMinor(amount, currency.minorUnit);
      if (amountMinor <= 0n) throw new Error("Số tiền tất toán phải lớn hơn 0.");
      const fx = source.currencyCode === baseCurrency ? undefined : parseRate(rate);
      const result = await runtime.transactions.settleArchivedAccount({ idempotencyKey: runtime.createId(), archivedAccountId: source.id, destinationAccountId: destinationId, amountMinor, reason, fxRateNumerator: fx?.numerator, fxRateDenominator: fx?.denominator });
      setMessage(`Đã tất toán một phần tài khoản archive · ${result.entry.id}`); setAmount("");
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể tất toán tài khoản."); }
    finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenBackLink />
    <Text style={styles.eyebrow}>KIỂM SOÁT LEDGER</Text><Text style={styles.title}>Tất toán tài khoản archive</Text>
    <Text style={styles.subtitle}>Chỉ cho phép chuyển số dư dương còn lại từ một ASSET đã archive sang một ASSET đang hoạt động. Mỗi thao tác cần lý do kiểm toán.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.card}>
      <Text style={styles.label}>Tài khoản đã archive</Text><View style={styles.options}>{accounts.filter((item) => item.type === "ASSET" && item.isArchived).map((item) => <Option key={item.id} label={`${item.name} · ${item.currencyCode}`} selected={sourceId === item.id} onPress={() => { setSourceId(item.id); setDestinationId(accounts.find((candidate) => candidate.type === "ASSET" && !candidate.isArchived && candidate.currencyCode === item.currencyCode)?.id ?? ""); }} />)}</View>
      <Text style={styles.label}>Tài khoản nhận</Text><View style={styles.options}>{destinations.map((item) => <Option key={item.id} label={item.name} selected={destinationId === item.id} onPress={() => setDestinationId(item.id)} />)}</View>
      <Text style={styles.label}>Số tiền ({currency?.code ?? "—"})</Text><TextInput accessibilityLabel="Số tiền tất toán" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={currency?.minorUnit ? "0.00" : "0"} style={styles.input} />
      {source && baseCurrency && source.currencyCode !== baseCurrency ? <><Text style={styles.label}>Tỷ giá ( {baseCurrency} / {source.currencyCode} )</Text><TextInput accessibilityLabel="Tỷ giá tất toán" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="Tỷ giá tại thời điểm tất toán" style={styles.input} /></> : null}
      <Text style={styles.label}>Lý do kiểm toán</Text><TextInput accessibilityLabel="Lý do kiểm toán" value={reason} onChangeText={setReason} placeholder="Ví dụ: Đóng tài khoản ngân hàng cũ" style={styles.input} maxLength={240} />
      <Pressable accessibilityRole="button" disabled={busy || !sourceId || !destinationId || !amount.trim() || reason.trim().length < 8} onPress={() => void settle()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (busy || !sourceId || !destinationId || !amount.trim() || reason.trim().length < 8) && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Đang tất toán…" : "Xác nhận tất toán"}</Text></Pressable>
      {message ? <Text style={styles.success}>{message}</Text> : null}{failure ? <Text style={styles.error}>{failure}</Text> : null}
    </View>
    {accounts.every((item) => item.type !== "ASSET" || !item.isArchived) ? <Text style={styles.empty}>Không có tài khoản ASSET nào đã archive.</Text> : null}
    {destinations.length === 0 ? <Text style={styles.error}>Cần có một tài khoản ASSET đang hoạt động cùng loại tiền để nhận số dư.</Text> : null}
  </ScrollView>;
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  eyebrow: { color: colors.mutedText, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.mutedText, fontSize: typography.caption, lineHeight: 19 },
  card: { padding: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
  label: { color: colors.text, fontSize: typography.caption, fontWeight: "700", marginTop: spacing.sm },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background, color: colors.text, fontSize: typography.body },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  option: { minHeight: 38, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  optionSelected: { borderColor: colors.primary, backgroundColor: "#EAF4EF" },
  optionText: { color: colors.mutedText, fontSize: typography.caption, fontWeight: "600" },
  optionTextSelected: { color: colors.primary },
  primaryButton: { minHeight: 52, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  primaryButtonText: { color: "#FFFFFF", fontSize: typography.body, fontWeight: "700" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  success: { color: colors.primary, fontSize: typography.caption },
  error: { color: "#9B3838", fontSize: typography.caption },
  empty: { color: colors.mutedText, fontSize: typography.caption },
});
