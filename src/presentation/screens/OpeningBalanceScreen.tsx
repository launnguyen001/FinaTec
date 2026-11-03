import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Account, CurrencyRecord } from "../../domain/ledger/repository";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { colors, spacing, typography } from "../../shared/theme/tokens";

function parseSignedMinor(value: string, precision: number): bigint {
  const normalized = value.trim();
  if (!/^-?\d+(\.\d*)?$/.test(normalized)) throw new Error("Nhập số dư hợp lệ.");
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  if (fraction.length > precision) throw new Error(`Tiền tệ này chỉ hỗ trợ tối đa ${precision} chữ số thập phân.`);
  const minor = BigInt(whole) * (10n ** BigInt(precision)) + BigInt(precision ? (fraction + "0".repeat(precision)).slice(0, precision) : "0");
  return negative ? -minor : minor;
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

export function OpeningBalanceScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [offsetAccountId, setOffsetAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextAccounts, nextCurrencies, base] = await Promise.all([runtime.accounts.list(false), runtime.ledger.listCurrencies(false), runtime.ledger.getBaseCurrencyCode()]);
    setAccounts(nextAccounts); setCurrencies(nextCurrencies); setBaseCurrency(base);
    const target = nextAccounts.find((item) => item.type === "ASSET" || item.type === "LIABILITY");
    const offset = nextAccounts.find((item) => item.type === "EQUITY" && item.currencyCode === target?.currencyCode);
    setAccountId((current) => current || target?.id || ""); setOffsetAccountId((current) => current || offset?.id || "");
  }, [runtime]);
  useEffect(() => { void refresh().catch((cause: unknown) => setFailure(cause instanceof Error ? cause.message : "Không thể tải tài khoản.")); }, [refresh]);

  const target = accounts.find((item) => item.id === accountId);
  const currency = currencies.find((item) => item.code === target?.currencyCode);
  const offsets = accounts.filter((item) => item.type === "EQUITY" && item.currencyCode === target?.currencyCode);

  async function saveOpeningBalance() {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null); setMessage(null);
    try {
      if (!target || !offsetAccountId || !currency || !baseCurrency) throw new Error("Cần chọn tài khoản đích, tài khoản vốn chủ và tiền tệ cơ sở.");
      const amountMinor = parseSignedMinor(amount, currency.minorUnit);
      if (amountMinor === 0n) throw new Error("Số dư đầu kỳ không được bằng 0.");
      const fx = target.currencyCode === baseCurrency ? undefined : parseRate(rate);
      const result = await runtime.transactions.createOpeningBalance({ idempotencyKey: runtime.createId(), accountId: target.id, offsetAccountId, amountMinor, fxRateNumerator: fx?.numerator, fxRateDenominator: fx?.denominator, occurredAt: new Date().toISOString() });
      setMessage(`Đã ghi nhận số dư đầu kỳ · ${result.entry.id}`); setAmount("");
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể ghi nhận số dư đầu kỳ."); }
    finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenBackLink />
    <Text style={styles.eyebrow}>THIẾT LẬP LEDGER</Text><Text style={styles.title}>Số dư đầu kỳ</Text>
    <Text style={styles.subtitle}>Số dư được ghi bằng Journal Entry đối ứng EQUITY, không nhập trực tiếp vào Account.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.card}>
      <Text style={styles.label}>Tài khoản cần mở số dư</Text><View style={styles.options}>{accounts.filter((item) => item.type === "ASSET" || item.type === "LIABILITY").map((item) => <Option key={item.id} label={`${item.name} · ${item.currencyCode}`} selected={accountId === item.id} onPress={() => { setAccountId(item.id); setOffsetAccountId(accounts.find((candidate) => candidate.type === "EQUITY" && candidate.currencyCode === item.currencyCode)?.id ?? ""); }} />)}</View>
      <Text style={styles.label}>Tài khoản đối ứng EQUITY</Text><View style={styles.options}>{offsets.map((item) => <Option key={item.id} label={item.name} selected={offsetAccountId === item.id} onPress={() => setOffsetAccountId(item.id)} />)}</View>
      <Text style={styles.label}>Số dư ({currency?.code ?? "—"})</Text><TextInput accessibilityLabel="Số dư đầu kỳ" value={amount} onChangeText={setAmount} keyboardType="numbers-and-punctuation" placeholder={currency?.minorUnit ? "0.00" : "0"} style={styles.input} />
      {target && baseCurrency && target.currencyCode !== baseCurrency ? <><Text style={styles.label}>Tỷ giá ( {baseCurrency} / {target.currencyCode} )</Text><TextInput accessibilityLabel="Tỷ giá số dư đầu kỳ" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="Tỷ giá tại thời điểm ghi nhận" style={styles.input} /></> : null}
      <Text style={styles.note}>Số dư âm được hỗ trợ để ghi nhận số dư ngược chiều thông thường. Tài khoản và đối ứng phải dùng cùng loại tiền.</Text>
      <Pressable accessibilityRole="button" disabled={busy || !amount.trim() || !accountId || !offsetAccountId} onPress={() => void saveOpeningBalance()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (busy || !amount.trim() || !accountId || !offsetAccountId) && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Đang ghi sổ…" : "Ghi số dư đầu kỳ"}</Text></Pressable>
      {message ? <Text style={styles.success}>{message}</Text> : null}{failure ? <Text style={styles.error}>{failure}</Text> : null}
    </View>
    {offsets.length === 0 ? <Text style={styles.error}>Chưa có tài khoản EQUITY cùng loại tiền. Hãy tạo tài khoản EQUITY trong mục Tài khoản.</Text> : null}
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
  input: { minHeight: 52, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background, color: colors.text, fontSize: 22, fontWeight: "700" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  option: { minHeight: 38, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  optionSelected: { borderColor: colors.primary, backgroundColor: "#EAF4EF" },
  optionText: { color: colors.mutedText, fontSize: typography.caption, fontWeight: "600" },
  optionTextSelected: { color: colors.primary },
  primaryButton: { minHeight: 52, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  primaryButtonText: { color: "#FFFFFF", fontSize: typography.body, fontWeight: "700" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  note: { color: colors.mutedText, fontSize: typography.caption, lineHeight: 18 },
  success: { color: colors.primary, fontSize: typography.caption },
  error: { color: "#9B3838", fontSize: typography.caption },
});
