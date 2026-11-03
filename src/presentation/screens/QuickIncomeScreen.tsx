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
import type { Category } from "../../domain/category/category";
import type { Account, CurrencyRecord } from "../../domain/ledger/repository";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { colors, spacing, typography } from "../../shared/theme/tokens";

function flatten(nodes: (Category & { children: Category[] })[]): Category[] {
  return nodes.flatMap((node) => [
    node,
    ...flatten(node.children as (Category & { children: Category[] })[]),
  ]);
}
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

function parseRate(value: string): { numerator: string; denominator: string } {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(normalized) || Number(normalized) <= 0)
    throw new Error("Nhập tỷ giá dương, tối đa 8 chữ số thập phân.");
  const [whole = "0", fraction = ""] = normalized.split(".");
  return {
    numerator: BigInt(whole + fraction).toString(),
    denominator: (10n ** BigInt(fraction.length)).toString(),
  };
}
export function QuickIncomeScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string | null>(null);
  const [rate, setRate] = useState("");
  const [assetId, setAssetId] = useState("");
  const [incomeAccountId, setIncomeAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextAccounts, tree, nextCurrencies, base] = await Promise.all([
      runtime.accounts.list(false),
      runtime.categories.listTree(),
      runtime.ledger.listCurrencies(false),
      runtime.ledger.getBaseCurrencyCode(),
    ]);
    setAccounts(nextAccounts);
    setCategories(
      flatten(tree).filter(
        (item) => item.kind === "INCOME" && !item.isArchived,
      ),
    );
    setCurrencies(nextCurrencies);
    setBaseCurrency(base);
    const asset = nextAccounts.find((item) => item.type === "ASSET");
    const income = nextAccounts.find(
      (item) =>
        item.type === "INCOME" && item.currencyCode === asset?.currencyCode,
    );
    const category = flatten(tree).find(
      (item) => item.kind === "INCOME" && !item.isArchived,
    );
    setAssetId((current) => current || asset?.id || "");
    setIncomeAccountId((current) => current || income?.id || "");
    setCategoryId((current) => current || category?.id || "");
  }, [runtime]);
  useEffect(() => {
    // The loader updates state only after awaiting the finance runtime; the
    // effect lint cannot follow that async boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch((cause: unknown) =>
      setFailure(
        cause instanceof Error ? cause.message : "Không thể tải dữ liệu.",
      ),
    );
  }, [refresh]);

  const selectedAsset = accounts.find((item) => item.id === assetId);
  const matchingIncomeAccounts = useMemo(
    () =>
      accounts.filter(
        (item) =>
          item.type === "INCOME" &&
          item.currencyCode === selectedAsset?.currencyCode,
      ),
    [accounts, selectedAsset?.currencyCode],
  );
  const currency = currencies.find(
    (item) => item.code === selectedAsset?.currencyCode,
  );

  async function saveIncome() {
    if (!runtime || busy) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      if (!selectedAsset || !incomeAccountId || !categoryId || !currency)
        throw new Error(
          "Cần có tài khoản tiền, tài khoản thu nhập và danh mục thu hợp lệ.",
        );
      const amountMinor = parseMinor(amount, currency.minorUnit);
      if (amountMinor <= 0n) throw new Error("Số tiền phải lớn hơn 0.");
      if (!baseCurrency) throw new Error("Chưa thiết lập tiền tệ cơ sở.");
      const fx = currency.code === baseCurrency ? undefined : parseRate(rate);
      const result = await runtime.transactions.recordIncome({
        idempotencyKey: runtime.createId(),
        assetAccountId: selectedAsset.id,
        incomeAccountId,
        categoryId,
        amountMinor,
        fxRateNumerator: fx?.numerator,
        fxRateDenominator: fx?.denominator,
        occurredAt: new Date().toISOString(),
      });
      setMessage(`Đã ghi nhận khoản thu · ${result.entry.id}`);
      setAmount("");
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : "Không thể ghi nhận khoản thu.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenBackLink />
      <Text style={styles.eyebrow}>GHI NHẬN</Text>
      <Text style={styles.title}>Khoản thu</Text>
      <Text style={styles.subtitle}>
        Khoản thu được ghi vào Ledger thông qua use case nghiệp vụ, không nhập
        DEBIT/CREDIT.
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.label}>Số tiền ({currency?.code ?? "—"})</Text>
        <TextInput
          accessibilityLabel="Số tiền thu"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={currency?.minorUnit ? "0.00" : "0"}
          style={styles.amountInput}
        />
        {currency && baseCurrency && currency.code !== baseCurrency ? (
          <>
            <Text style={styles.label}>
              Tỷ giá ( {baseCurrency} / {currency.code} )
            </Text>
            <TextInput
              accessibilityLabel="Tỷ giá tại thời điểm giao dịch"
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              placeholder="Ví dụ: 25000"
              style={styles.amountInput}
            />
          </>
        ) : null}
        <Text style={styles.label}>Tài khoản nhận tiền</Text>
        <View style={styles.options}>
          {accounts
            .filter((item) => item.type === "ASSET")
            .map((item) => (
              <Option
                key={item.id}
                label={`${item.name} · ${item.currencyCode}`}
                selected={assetId === item.id}
                onPress={() => {
                  setAssetId(item.id);
                  setIncomeAccountId(
                    accounts.find(
                      (candidate) =>
                        candidate.type === "INCOME" &&
                        candidate.currencyCode === item.currencyCode,
                    )?.id ?? "",
                  );
                }}
              />
            ))}
        </View>
        <Text style={styles.label}>Danh mục thu</Text>
        <View style={styles.options}>
          {categories.map((item) => (
            <Option
              key={item.id}
              label={item.name}
              selected={categoryId === item.id}
              onPress={() => setCategoryId(item.id)}
            />
          ))}
        </View>
        <Text style={styles.label}>Tài khoản thu nhập</Text>
        <View style={styles.options}>
          {matchingIncomeAccounts.map((item) => (
            <Option
              key={item.id}
              label={item.name}
              selected={incomeAccountId === item.id}
              onPress={() => setIncomeAccountId(item.id)}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={
            busy ||
            !amount.trim() ||
            !assetId ||
            !incomeAccountId ||
            !categoryId
          }
          onPress={() => void saveIncome()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            (busy ||
              !amount.trim() ||
              !assetId ||
              !incomeAccountId ||
              !categoryId) &&
              styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Đang ghi sổ…" : "Lưu khoản thu"}
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
  amountInput: {
    minHeight: 68,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
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
  success: { color: colors.primary, fontSize: typography.caption },
  error: { color: "#9B3838", fontSize: typography.caption },
});
