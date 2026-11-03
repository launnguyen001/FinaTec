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
import type {
  EarlyPaymentPolicy,
  Liability,
  LiabilityInstallment,
  LiabilityPayment,
} from "../../domain/liability/liability";
import type { RepaymentMethod } from "../../domain/liability/repayment-schedule";
import { formatBigIntVi } from "../../shared/formatting/format-bigint";
import { colors, spacing } from "../../shared/theme/tokens";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";

function parseMinorUnits(value: string, precision: number): bigint {
  const normalized = value.trim().replace(/,/g, ".");
  if (!/^\d+(\.\d*)?$/.test(normalized))
    throw new Error("Số tiền không hợp lệ");
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > precision)
    throw new Error(`Tiền tệ chỉ hỗ trợ tối đa ${precision} chữ số thập phân`);
  return (
    BigInt(whole!) * 10n ** BigInt(precision) +
    BigInt((fraction + "0".repeat(precision)).slice(0, precision) || "0")
  );
}

function parseAprPpm(value: string): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(normalized))
    throw new Error("APR không hợp lệ; tối đa 4 chữ số thập phân");
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole!) * 10_000n + BigInt((fraction + "0000").slice(0, 4));
}

function formatMoney(
  amount: bigint,
  currency: CurrencyRecord | undefined,
): string {
  const precision = currency?.minorUnit ?? 0;
  const scale = 10n ** BigInt(precision);
  const whole = amount / scale;
  const fraction = precision
    ? `.${(amount % scale).toString().padStart(precision, "0")}`
    : "";
  return `${formatBigIntVi(whole)}${fraction} ${currency?.code ?? ""}`;
}

function Choice({
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
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function AccountChoices({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.wrap}>
        {items.map((item) => (
          <Choice
            key={item.id}
            label={item.name}
            selected={selectedId === item.id}
            onPress={() => onSelect(item.id)}
          />
        ))}
      </View>
      {items.length === 0 ? (
        <Text style={styles.muted}>Không có tài khoản phù hợp.</Text>
      ) : null}
    </View>
  );
}

export function LiabilityScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [installments, setInstallments] = useState<LiabilityInstallment[]>([]);
  const [payments, setPayments] = useState<LiabilityPayment[]>([]);
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [apr, setApr] = useState("12");
  const [term, setTerm] = useState("12");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [firstDueDate, setFirstDueDate] = useState("");
  const [method, setMethod] = useState<RepaymentMethod>("EQUAL_PRINCIPAL");
  const [earlyPaymentPolicy, setEarlyPaymentPolicy] = useState<EarlyPaymentPolicy>("KEEP_MATURITY_REDUCE_INSTALLMENT");
  const [liabilityAccountId, setLiabilityAccountId] = useState("");
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [interestAccountId, setInterestAccountId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState("");
  const [feeAmount, setFeeAmount] = useState("0");
  const [feeAccountId, setFeeAccountId] = useState("");
  const [reconciliation, setReconciliation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const currencyCode = accounts.find(
    (item) => item.id === liabilityAccountId,
  )?.currencyCode;
  const assetAccounts = useMemo(
    () => accounts.filter((item) => !item.isArchived && item.type === "ASSET"),
    [accounts],
  );
  const liabilityAccounts = useMemo(
    () =>
      accounts.filter((item) => !item.isArchived && item.type === "LIABILITY"),
    [accounts],
  );
  const expenseAccounts = useMemo(
    () =>
      accounts.filter((item) => !item.isArchived && item.type === "EXPENSE"),
    [accounts],
  );
  const activeLiability = liabilities.find((item) => item.id === selectedId);

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextAccounts, nextCurrencies, nextLiabilities] = await Promise.all([
      runtime.accounts.list(true),
      runtime.ledger.listCurrencies(false),
      runtime.liabilities.list(true),
    ]);
    setAccounts(nextAccounts);
    setCurrencies(nextCurrencies);
    setLiabilities(nextLiabilities);
    if (!liabilityAccountId)
      setLiabilityAccountId(
        nextAccounts.find(
          (item) => item.type === "LIABILITY" && !item.isArchived,
        )?.id ?? "",
      );
    if (!receivingAccountId)
      setReceivingAccountId(
        nextAccounts.find((item) => item.type === "ASSET" && !item.isArchived)
          ?.id ?? "",
      );
    if (!interestAccountId)
      setInterestAccountId(
        nextAccounts.find((item) => item.type === "EXPENSE" && !item.isArchived)
          ?.id ?? "",
      );
    if (!sourceAccountId)
      setSourceAccountId(
        nextAccounts.find((item) => item.type === "ASSET" && !item.isArchived)
          ?.id ?? "",
      );
    if (!selectedId && nextLiabilities.length)
      setSelectedId(nextLiabilities[0]!.id);
  }, [
    runtime,
    liabilityAccountId,
    receivingAccountId,
    interestAccountId,
    sourceAccountId,
    selectedId,
  ]);

  const loadDetail = useCallback(async () => {
    if (!runtime || !selectedId) {
      setInstallments([]);
      setPayments([]);
      return;
    }
    const detail = await runtime.liabilities.getDetail(selectedId);
    setInstallments(detail.installments);
    setPayments(detail.payments);
    setReconciliation(detail.reconciliation.differenceMinor.toString());
  }, [runtime, selectedId]);

  useEffect(() => {
    if (runtime) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void refresh().catch((cause) =>
        setFailure(
          cause instanceof Error ? cause.message : "Không thể tải dữ liệu",
        ),
      );
    }
  }, [runtime, refresh]);
  useEffect(() => {
    if (runtime && selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadDetail().catch((cause) =>
        setFailure(
          cause instanceof Error ? cause.message : "Không thể tải lịch trả nợ",
        ),
      );
    }
  }, [runtime, selectedId, loadDetail]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      await action();
      await refresh();
      await loadDetail();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(async () => {
      if (!runtime) return;
      const selectedCurrency = currencies.find(
        (item) => item.code === currencyCode,
      );
      if (!selectedCurrency)
        throw new Error("Tài khoản nợ chưa có loại tiền hợp lệ");
      const amount = parseMinorUnits(principal, selectedCurrency.minorUnit);
      const months = Number(term);
      const rate = parseAprPpm(apr);
      const [year, month, day] = startDate.split("-").map(Number);
      const nextDate = new Date(Date.UTC(year!, month! - 1, day! + 1))
        .toISOString()
        .slice(0, 10);
      const dueDate = firstDueDate || nextDate;
      const principalParts = Array.from(
        { length: months },
        (_, index) =>
          amount / BigInt(months) +
          (BigInt(index) < amount % BigInt(months) ? 1n : 0n),
      );
      const liability = await runtime.liabilities.create({
        name,
        liabilityAccountId,
        receivingAccountId,
        interestExpenseAccountId: interestAccountId,
        principalMinor: amount,
        annualRatePpm: rate,
        repaymentMethod: method,
        termMonths: months,
        startDate,
        firstDueDate: dueDate,
        earlyPaymentPolicy,
        decliningPrincipalMinor:
          method === "DECLINING" ? principalParts : undefined,
      });
      setSelectedId(liability.id);
      setMessage("Đã tạo khoản nợ và ghi nhận khoản vay vào Ledger.");
    });

  const pay = () =>
    run(async () => {
      if (!runtime || !activeLiability) return;
      const selectedCurrency = currencies.find(
        (item) => item.code === activeLiability.currencyCode,
      );
      if (!selectedCurrency)
        throw new Error("Không tìm thấy loại tiền của khoản nợ");
      const amount = parseMinorUnits(paymentAmount, selectedCurrency.minorUnit);
      const fee = parseMinorUnits(feeAmount || "0", selectedCurrency.minorUnit);
      const idempotencyKey =
        paymentIdempotencyKey || `liability-payment:${runtime.createId()}`;
      setPaymentIdempotencyKey(idempotencyKey);
      await runtime.liabilities.recordPayment({
        liabilityId: activeLiability.id,
        sourceAccountId,
        amountMinor: amount,
        feeMinor: fee,
        feeExpenseAccountId: feeAccountId || undefined,
        idempotencyKey,
      });
      setPaymentAmount("");
      setFeeAmount("0");
      setPaymentIdempotencyKey("");
      setMessage("Đã ghi nhận thanh toán và hạch toán Journal Entry.");
    });

  const archive = () =>
    run(async () => {
      if (!runtime || !activeLiability) return;
      await runtime.liabilities.archive(activeLiability.id);
      setMessage("Đã archive khoản nợ; lịch sử được giữ nguyên.");
    });

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenBackLink />
        <Text style={styles.title}>Quản lý khoản nợ</Text>
        <Text style={styles.subtitle}>
          Lịch trả nợ, thanh toán và đối soát Ledger
        </Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {failure ? <Text style={styles.error}>{failure}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.heading}>Khoản nợ hiện có</Text>
          {liabilities.length === 0 ? (
            <Text style={styles.muted}>Chưa có khoản nợ nào.</Text>
          ) : (
            liabilities.map((item) => (
              <Choice
                key={item.id}
                label={`${item.name} · ${item.status} · ${formatMoney(
                  item.outstandingPrincipalMinor,
                  currencies.find((c) => c.code === item.currencyCode),
                )}`}
                selected={selectedId === item.id}
                onPress={() => setSelectedId(item.id)}
              />
            ))
          )}
          {activeLiability ? (
            <View style={styles.detail}>
              <Text style={styles.heading}>{activeLiability.name}</Text>
              <Text style={styles.muted}>
                Dư nợ gốc:{" "}
                {formatMoney(
                  activeLiability.outstandingPrincipalMinor,
                  currencies.find(
                    (c) => c.code === activeLiability.currencyCode,
                  ),
                )}
              </Text>
              <Text style={styles.muted}>
                APR:{" "}
                {(Number(activeLiability.annualRatePpm) / 10000).toFixed(4)}% ·{" "}
                {activeLiability.repaymentMethod}
              </Text>
              <Text style={styles.muted}>
                Đối soát Ledger:{" "}
                {reconciliation === "0"
                  ? "BALANCED"
                  : reconciliation === null
                    ? "Đang kiểm tra"
                    : `Chênh lệch ${reconciliation} minor units`}
              </Text>
              <Text style={styles.label}>Lịch sử thanh toán</Text>
              {payments.length === 0 ? (
                <Text style={styles.muted}>Chưa có giao dịch thanh toán.</Text>
              ) : (
                payments.map((payment) => (
                  <Text key={payment.id} style={styles.rowText}>
                    {payment.paidAt.slice(0, 10)} · gốc{" "}
                    {formatMoney(
                      payment.principalPaidMinor,
                      currencies.find((c) => c.code === activeLiability.currencyCode),
                    )}{" "}
                    · lãi{" "}
                    {formatMoney(
                      payment.interestPaidMinor,
                      currencies.find((c) => c.code === activeLiability.currencyCode),
                    )}{" "}
                    · phí{" "}
                    {formatMoney(
                      payment.feePaidMinor,
                      currencies.find((c) => c.code === activeLiability.currencyCode),
                    )}
                  </Text>
                ))
              )}
              <Text style={styles.label}>Lịch trả nợ</Text>
              {installments.map((item) => (
                <Text key={item.id} style={styles.rowText}>
                  #{item.sequence} · {item.dueDate} · {item.status} · gốc{" "}
                  {formatMoney(
                    item.principalDueMinor,
                    currencies.find(
                      (c) => c.code === activeLiability.currencyCode,
                    ),
                  )}{" "}
                  · lãi{" "}
                  {formatMoney(
                    item.interestDueMinor,
                    currencies.find(
                      (c) => c.code === activeLiability.currencyCode,
                    ),
                  )}
                </Text>
              ))}
              {activeLiability.status === "PAID_OFF" ? (
                <Pressable
                  disabled={busy}
                  onPress={() => void archive()}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>Archive khoản nợ</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Tạo khoản vay</Text>
          <TextInput
            accessibilityLabel="Tên khoản vay"
            placeholder="Tên khoản vay"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <AccountChoices
            title="Tài khoản LIABILITY"
            items={liabilityAccounts}
            selectedId={liabilityAccountId}
            onSelect={setLiabilityAccountId}
          />
          <AccountChoices
            title="Tài khoản nhận tiền ASSET"
            items={assetAccounts}
            selectedId={receivingAccountId}
            onSelect={setReceivingAccountId}
          />
          <AccountChoices
            title="Tài khoản chi phí lãi EXPENSE"
            items={expenseAccounts.filter(
              (a) => !currencyCode || a.currencyCode === currencyCode,
            )}
            selectedId={interestAccountId}
            onSelect={setInterestAccountId}
          />
          <TextInput
            accessibilityLabel="Số tiền vay"
            placeholder="Số tiền vay"
            keyboardType="decimal-pad"
            value={principal}
            onChangeText={setPrincipal}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="APR phần trăm"
            placeholder="APR %"
            keyboardType="decimal-pad"
            value={apr}
            onChangeText={setApr}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Số kỳ"
            placeholder="Số kỳ (tháng)"
            keyboardType="number-pad"
            value={term}
            onChangeText={setTerm}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Ngày bắt đầu"
            placeholder="YYYY-MM-DD · ngày bắt đầu"
            value={startDate}
            onChangeText={setStartDate}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Ngày đến hạn đầu tiên"
            placeholder="YYYY-MM-DD · ngày đến hạn đầu tiên (để trống = ngày kế tiếp)"
            value={firstDueDate}
            onChangeText={setFirstDueDate}
            style={styles.input}
          />
          <Text style={styles.label}>Chính sách trả gốc trước hạn</Text>
          <View style={styles.wrap}>
            <Choice
              label="Giữ ngày đáo hạn · giảm kỳ trả"
              selected={earlyPaymentPolicy === "KEEP_MATURITY_REDUCE_INSTALLMENT"}
              onPress={() => setEarlyPaymentPolicy("KEEP_MATURITY_REDUCE_INSTALLMENT")}
            />
            <Choice
              label="Giữ mức trả · rút ngắn kỳ hạn"
              selected={earlyPaymentPolicy === "KEEP_INSTALLMENT_SHORTEN_TERM"}
              onPress={() => setEarlyPaymentPolicy("KEEP_INSTALLMENT_SHORTEN_TERM")}
            />
          </View>
          <View style={styles.wrap}>
            {(
              [
                "DECLINING",
                "EQUAL_PRINCIPAL",
                "ANNUITY",
                "INTEREST_ONLY",
              ] as RepaymentMethod[]
            ).map((item) => (
              <Choice
                key={item}
                label={item}
                selected={method === item}
                onPress={() => setMethod(item)}
              />
            ))}
          </View>
          <Pressable
            disabled={busy}
            onPress={() => void create()}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Tạo khoản vay</Text>
          </Pressable>
        </View>
        {activeLiability?.status === "ACTIVE" ? (
          <View style={styles.card}>
            <Text style={styles.heading}>Ghi nhận thanh toán</Text>
            <AccountChoices
              title="Tài khoản thanh toán ASSET"
              items={assetAccounts.filter(
                (a) => a.currencyCode === activeLiability.currencyCode,
              )}
              selectedId={sourceAccountId}
              onSelect={setSourceAccountId}
            />
            <TextInput
              accessibilityLabel="Số tiền thanh toán"
              placeholder="Số tiền trả (gốc + lãi)"
              keyboardType="decimal-pad"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Phí phạt"
              placeholder="Phí phạt (nếu có)"
              keyboardType="decimal-pad"
              value={feeAmount}
              onChangeText={setFeeAmount}
              style={styles.input}
            />
            <AccountChoices
              title="Tài khoản chi phí phí phạt"
              items={expenseAccounts.filter(
                (a) => a.currencyCode === activeLiability.currencyCode,
              )}
              selectedId={feeAccountId}
              onSelect={setFeeAccountId}
            />
            <Pressable
              disabled={busy}
              onPress={() => void pay()}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Ghi nhận thanh toán</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.mutedText },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heading: { fontSize: 18, fontWeight: "700", color: colors.text },
  group: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.mutedText },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  choiceText: { color: colors.text, fontSize: 12 },
  choiceTextSelected: { color: colors.primary, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    color: colors.text,
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700" },
  muted: { color: colors.mutedText, fontSize: 13 },
  detail: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  rowText: { color: colors.text, fontSize: 12 },
  error: { color: colors.text, fontSize: 13 },
  success: { color: colors.primary, fontSize: 13 },
});
