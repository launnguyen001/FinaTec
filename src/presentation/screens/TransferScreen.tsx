import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Account, CurrencyRecord } from "../../domain/ledger/repository";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { colors, spacing, typography } from "../../shared/theme/tokens";

function parseMinor(value: string, precision: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d*)?$/.test(normalized))
    throw new Error("Nhập số tiền hợp lệ.");
  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > precision)
    throw new Error(
      `Tiền tệ này chỉ hỗ trợ tối đa ${precision} chữ số thập phân.`,
    );
  return (
    BigInt(whole) * 10n ** BigInt(precision) +
    BigInt(
      precision ? (fraction + "0".repeat(precision)).slice(0, precision) : "0",
    )
  );
}

function gcd(a: bigint, b: bigint): bigint {
  return b === 0n ? a : gcd(b, a % b);
}
function parseRate(value: string): { numerator: string; denominator: string } {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(normalized) || Number(normalized) <= 0)
    throw new Error("Nhập tỷ giá dương, tối đa 8 chữ số thập phân.");
  const [whole = "0", fraction = ""] = normalized.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  const rawNumerator = BigInt(whole + fraction);
  const divisor = gcd(rawNumerator, denominator);
  return {
    numerator: (rawNumerator / divisor).toString(),
    denominator: (denominator / divisor).toString(),
  };
}

export function TransferScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromRate, setFromRate] = useState("");
  const [toRate, setToRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextAccounts, nextCurrencies, base] = await Promise.all([
      runtime.accounts.list(false),
      runtime.ledger.listCurrencies(false),
      runtime.ledger.getBaseCurrencyCode(),
    ]);
    const assets = nextAccounts.filter((item) => item.type === "ASSET");
    setAccounts(assets);
    setCurrencies(nextCurrencies);
    setBaseCurrency(base);
    setFromId((current) => current || assets[0]?.id || "");
    setToId(
      (current) =>
        current ||
        assets.find(
          (item) =>
            item.id !== assets[0]?.id &&
            item.currencyCode === assets[0]?.currencyCode,
        )?.id ||
        assets.find((item) => item.id !== assets[0]?.id)?.id ||
        "",
    );
  }, [runtime]);
  useEffect(() => {
    // The loader updates state only after awaiting the finance runtime; the
    // effect lint cannot follow that async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch((cause: unknown) =>
      setFailure(
        cause instanceof Error ? cause.message : "Không thể tải tài khoản.",
      ),
    );
  }, [refresh]);

  const source = accounts.find((item) => item.id === fromId);
  const destination = accounts.find((item) => item.id === toId);
  const sourceCurrency = currencies.find(
    (item) => item.code === source?.currencyCode,
  );
  const destinationCurrency = currencies.find(
    (item) => item.code === destination?.currencyCode,
  );
  const crossCurrency = Boolean(
    source && destination && source.currencyCode !== destination.currencyCode,
  );
  const sourceNeedsRate = Boolean(
    source && baseCurrency && source.currencyCode !== baseCurrency,
  );
  const destinationNeedsRate = Boolean(
    destination && baseCurrency && destination.currencyCode !== baseCurrency,
  );
  const canTransfer = Boolean(
    source &&
    destination &&
    source.id !== destination.id &&
    sourceCurrency &&
    destinationCurrency &&
    baseCurrency,
  );
  const otherDestinations = useMemo(
    () => accounts.filter((item) => item.id !== fromId),
    [accounts, fromId],
  );

  async function saveTransfer() {
    if (!runtime || busy) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      if (
        !source ||
        !destination ||
        !sourceCurrency ||
        !destinationCurrency ||
        !baseCurrency
      )
        throw new Error(
          "Cần thiết lập tiền tệ cơ sở và chọn hai tài khoản hợp lệ.",
        );
      if (source.id === destination.id)
        throw new Error("Tài khoản nguồn và đích phải khác nhau.");
      const amountMinor = parseMinor(amount, sourceCurrency.minorUnit);
      if (amountMinor <= 0n) throw new Error("Số tiền phải lớn hơn 0.");
      let toAmountMinor: bigint | undefined;
      if (crossCurrency) {
        if (!toAmount.trim())
          throw new Error("Nhập số tiền nhận ở tài khoản đích.");
        toAmountMinor = parseMinor(toAmount, destinationCurrency.minorUnit);
        if (toAmountMinor <= 0n)
          throw new Error("Số tiền nhận phải lớn hơn 0.");
      }
      const sourceFx = sourceNeedsRate ? parseRate(fromRate) : undefined;
      const destinationFx = destinationNeedsRate
        ? crossCurrency
          ? parseRate(toRate)
          : sourceFx
        : undefined;
      if (sourceNeedsRate && !sourceFx)
        throw new Error("Cần nhập tỷ giá cho tài khoản nguồn.");
      if (destinationNeedsRate && !destinationFx)
        throw new Error("Cần nhập tỷ giá cho tài khoản đích.");
      const result = await runtime.transactions.transferFunds({
        idempotencyKey: runtime.createId(),
        fromAccountId: source.id,
        toAccountId: destination.id,
        amountMinor,
        toAmountMinor,
        fxRateNumerator: sourceFx?.numerator,
        fxRateDenominator: sourceFx?.denominator,
        toFxRateNumerator: destinationFx?.numerator,
        toFxRateDenominator: destinationFx?.denominator,
        occurredAt: new Date().toISOString(),
      });
      setMessage(`Đã chuyển tiền · ${result.entry.id}`);
      setAmount("");
      setToAmount("");
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể chuyển tiền.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenBackLink />
      <Text style={styles.eyebrow}>CHUYỂN TIỀN NỘI BỘ</Text>
      <Text style={styles.title}>Chuyển tiền</Text>
      <Text style={styles.subtitle}>
        Chuyển giữa hai tài khoản ASSET. Giao dịch chuyển tiền không được tính
        là thu hoặc chi.
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!baseCurrency ? (
        <Text style={styles.error}>
          Cần chọn tiền tệ cơ sở trước khi chuyển tiền.
        </Text>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.label}>Từ tài khoản</Text>
        <View style={styles.options}>
          {accounts.map((item) => (
            <Option
              key={item.id}
              label={`${item.name} · ${item.currencyCode}`}
              selected={fromId === item.id}
              onPress={() => {
                setFromId(item.id);
                if (toId === item.id)
                  setToId(
                    accounts.find(
                      (candidate) =>
                        candidate.id !== item.id &&
                        candidate.currencyCode === item.currencyCode,
                    )?.id ??
                      accounts.find((candidate) => candidate.id !== item.id)
                        ?.id ??
                      "",
                  );
              }}
            />
          ))}
        </View>
        <Text style={styles.label}>Đến tài khoản</Text>
        <View style={styles.options}>
          {otherDestinations.map((item) => (
            <Option
              key={item.id}
              label={`${item.name} · ${item.currencyCode}`}
              selected={toId === item.id}
              onPress={() => setToId(item.id)}
            />
          ))}
        </View>
        <Text style={styles.label}>
          Số tiền chuyển ({sourceCurrency?.code ?? "—"})
        </Text>
        <TextInput
          accessibilityLabel="Số tiền chuyển"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={sourceCurrency?.minorUnit ? "0.00" : "0"}
          style={styles.input}
        />
        {crossCurrency ? (
          <>
            <Text style={styles.label}>
              Số tiền nhận ({destinationCurrency?.code ?? "—"})
            </Text>
            <TextInput
              accessibilityLabel="Số tiền nhận"
              value={toAmount}
              onChangeText={setToAmount}
              keyboardType="decimal-pad"
              placeholder={destinationCurrency?.minorUnit ? "0.00" : "0"}
              style={styles.input}
            />
          </>
        ) : null}
        {sourceNeedsRate ? (
          <>
            <Text style={styles.label}>
              Tỷ giá nguồn ( {baseCurrency} / {source?.currencyCode} )
            </Text>
            <TextInput
              accessibilityLabel="Tỷ giá nguồn"
              value={fromRate}
              onChangeText={setFromRate}
              keyboardType="decimal-pad"
              placeholder="Ví dụ: 25000"
              style={styles.input}
            />
          </>
        ) : null}
        {crossCurrency && destinationNeedsRate ? (
          <>
            <Text style={styles.label}>
              Tỷ giá đích ( {baseCurrency} / {destination?.currencyCode} )
            </Text>
            <TextInput
              accessibilityLabel="Tỷ giá đích"
              value={toRate}
              onChangeText={setToRate}
              keyboardType="decimal-pad"
              placeholder="Tỷ giá tại thời điểm giao dịch"
              style={styles.input}
            />
          </>
        ) : null}
        <Text style={styles.note}>
          Tỷ giá được nhập theo quy ước: số đơn vị tiền tệ cơ sở cho 1 đơn vị
          tiền tệ tài khoản. Ledger sẽ tự kiểm tra hai vế cân bằng.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy || !canTransfer || !amount.trim()}
          onPress={() => void saveTransfer()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            (busy || !canTransfer || !amount.trim()) && styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Đang chuyển…" : "Xác nhận chuyển tiền"}
          </Text>
        </Pressable>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {failure ? <Text style={styles.error}>{failure}</Text> : null}
      </View>
    </ScrollView>
  );
}

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

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  eyebrow: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: {
    color: colors.mutedText,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  card: {
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: typography.body,
  },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  option: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: "#EAF4EF" },
  optionText: {
    color: colors.mutedText,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  optionTextSelected: { color: colors.primary },
  primaryButton: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: typography.body,
    fontWeight: "700",
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  note: {
    color: colors.mutedText,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  success: { color: colors.primary, fontSize: typography.caption },
  error: { color: "#9B3838", fontSize: typography.caption },
});
