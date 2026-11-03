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

function flattenCategories(
  nodes: (Category & { children: Category[] })[],
): Category[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenCategories(
      node.children as (Category & { children: Category[] })[],
    ),
  ]);
}

function parseMinorAmount(value: string, precision: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d*)?$/.test(normalized))
    throw new Error("Nhập số tiền hợp lệ.");
  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > precision)
    throw new Error(
      `Tiền tệ này chỉ hỗ trợ tối đa ${precision} chữ số thập phân.`,
    );
  const scale = 10n ** BigInt(precision);
  const paddedFraction =
    precision > 0
      ? (fraction + "0".repeat(precision)).slice(0, precision)
      : "0";
  return BigInt(whole) * scale + BigInt(paddedFraction || "0");
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
export function QuickExpenseScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string | null>(null);
  const [rate, setRate] = useState("");
  const [assetId, setAssetId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextAccounts, nextTree, nextCurrencies, base] = await Promise.all([
      runtime.accounts.list(false),
      runtime.categories.listTree(),
      runtime.ledger.listCurrencies(false),
      runtime.ledger.getBaseCurrencyCode(),
    ]);
    setAccounts(nextAccounts);
    setCategories(
      flattenCategories(nextTree).filter(
        (item) => item.kind === "EXPENSE" && !item.isArchived,
      ),
    );
    setCurrencies(nextCurrencies);
    setBaseCurrency(base);
    const nextAsset = nextAccounts.find((item) => item.type === "ASSET");
    const nextExpense = nextAccounts.find(
      (item) =>
        item.type === "EXPENSE" &&
        item.currencyCode === nextAsset?.currencyCode,
    );
    const nextCategory = flattenCategories(nextTree).find(
      (item) => item.kind === "EXPENSE" && !item.isArchived,
    );
    setAssetId((current) => current || nextAsset?.id || "");
    setExpenseAccountId((current) => current || nextExpense?.id || "");
    setCategoryId((current) => current || nextCategory?.id || "");
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
  const matchingExpenseAccounts = useMemo(
    () =>
      accounts.filter(
        (item) =>
          item.type === "EXPENSE" &&
          item.currencyCode === selectedAsset?.currencyCode,
      ),
    [accounts, selectedAsset?.currencyCode],
  );
  const selectedCurrency = currencies.find(
    (item) => item.code === selectedAsset?.currencyCode,
  );

  async function saveExpense() {
    if (!runtime || busy) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      if (
        !selectedAsset ||
        !expenseAccountId ||
        !categoryId ||
        !selectedCurrency
      )
        throw new Error(
          "Cần có tài khoản tiền, tài khoản chi phí và danh mục chi hợp lệ.",
        );
      const amountMinor = parseMinorAmount(amount, selectedCurrency.minorUnit);
      if (amountMinor <= 0n) throw new Error("Số tiền phải lớn hơn 0.");
      if (!baseCurrency) throw new Error("Chưa thiết lập tiền tệ cơ sở.");
      const fx =
        selectedCurrency.code === baseCurrency ? undefined : parseRate(rate);
      const result = await runtime.transactions.recordExpense({
        idempotencyKey: runtime.createId(),
        assetAccountId: selectedAsset.id,
        expenseAccountId,
        categoryId,
        amountMinor,
        fxRateNumerator: fx?.numerator,
        fxRateDenominator: fx?.denominator,
        occurredAt: new Date().toISOString(),
      });
      setMessage(`Đã ghi nhận khoản chi · ${result.entry.id}`);
      setAmount("");
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : "Không thể ghi nhận khoản chi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenBackLink />
      <Text style={styles.eyebrow}>GHI NHẬN NHANH</Text>
      <Text style={styles.title}>Khoản chi</Text>
      <Text style={styles.subtitle}>
        Luồng mặc định chỉ cần nhập số tiền và lưu. Tài khoản, danh mục gần nhất
        được chọn sẵn khi có dữ liệu phù hợp.
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.label}>
          Số tiền ({selectedCurrency?.code ?? "—"})
        </Text>
        <TextInput
          accessibilityLabel="Số tiền chi"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={selectedCurrency?.minorUnit ? "0.00" : "0"}
          style={styles.amountInput}
        />
        {selectedCurrency &&
        baseCurrency &&
        selectedCurrency.code !== baseCurrency ? (
          <>
            <Text style={styles.label}>
              Tỷ giá ( {baseCurrency} / {selectedCurrency.code} )
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
        <Text style={styles.label}>Tài khoản tiền</Text>
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
                  const next = accounts.find(
                    (candidate) =>
                      candidate.type === "EXPENSE" &&
                      candidate.currencyCode === item.currencyCode,
                  );
                  setExpenseAccountId(next?.id ?? "");
                }}
              />
            ))}
        </View>
        <Text style={styles.label}>Danh mục</Text>
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
        <Text style={styles.label}>Tài khoản chi phí</Text>
        <View style={styles.options}>
          {matchingExpenseAccounts.map((item) => (
            <Option
              key={item.id}
              label={item.name}
              selected={expenseAccountId === item.id}
              onPress={() => setExpenseAccountId(item.id)}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={
            busy ||
            !amount.trim() ||
            !assetId ||
            !expenseAccountId ||
            !categoryId
          }
          onPress={() => void saveExpense()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            (busy ||
              !amount.trim() ||
              !assetId ||
              !expenseAccountId ||
              !categoryId) &&
              styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Đang ghi sổ…" : "Lưu khoản chi"}
          </Text>
        </Pressable>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {failure ? <Text style={styles.error}>{failure}</Text> : null}
      </View>
      {accounts.filter((item) => item.type === "ASSET").length === 0 ? (
        <Text style={styles.empty}>
          Chưa có tài khoản tiền. Hãy tạo Account ASSET trước khi ghi khoản chi.
        </Text>
      ) : null}
      {matchingExpenseAccounts.length === 0 ? (
        <Text style={styles.empty}>
          Chưa có tài khoản EXPENSE cùng loại tiền tệ với tài khoản tiền đang
          chọn.
        </Text>
      ) : null}
      {categories.length === 0 ? (
        <Text style={styles.empty}>
          Chưa có danh mục EXPENSE. Hãy tạo danh mục chi trước khi lưu.
        </Text>
      ) : null}
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
  empty: {
    color: colors.mutedText,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  success: { color: colors.primary, fontSize: typography.caption },
  error: { color: "#9B3838", fontSize: typography.caption },
});
