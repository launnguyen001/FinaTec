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
import type { Account } from "../../domain/ledger/repository";
import {
  roundHalfUp,
  type InterestAccrual,
  type InterestPlan,
} from "../../domain/interest/interest";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { colors, spacing } from "../../shared/theme/tokens";

function getLocalDate(): string {
  const values = new Map(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function Action({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        selected: Boolean(selected),
        disabled: Boolean(disabled),
      }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        selected && styles.actionSelected,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.actionText, selected && styles.actionTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function AccountPicker({
  title,
  accounts,
  selectedId,
  onSelect,
}: {
  title: string;
  accounts: Account[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{title}</Text>
      {accounts.length === 0 ? (
        <Text style={styles.muted}>Không có tài khoản phù hợp.</Text>
      ) : null}
      <View style={styles.wrap}>
        {accounts.map((account) => (
          <Action
            key={account.id}
            label={`${account.name} · ${account.currencyCode}`}
            selected={selectedId === account.id}
            onPress={() => onSelect(account.id)}
          />
        ))}
      </View>
    </View>
  );
}

export function InterestScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [plans, setPlans] = useState<InterestPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [accruals, setAccruals] = useState<InterestAccrual[]>([]);
  const [name, setName] = useState("");
  const [ratePercent, setRatePercent] = useState("5.5");
  const [startDate, setStartDate] = useState(
    getLocalDate(),
  );
  const [maturityDate, setMaturityDate] = useState("");
  const [principalAccountId, setPrincipalAccountId] = useState("");
  const [incomeAccountId, setIncomeAccountId] = useState("");
  const [payoutAccountId, setPayoutAccountId] = useState("");
  const [frequency, setFrequency] = useState<"MONTHLY" | "AT_MATURITY">(
    "MONTHLY",
  );
  const [compounding, setCompounding] = useState<
    "SIMPLE" | "AFTER_CAPITALIZATION"
  >("SIMPLE");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState(
    getLocalDate(),
  );
  const [kind, setKind] = useState<"CAPITALIZATION" | "PAYOUT">("PAYOUT");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const principalAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          !account.isArchived &&
          account.type === "ASSET" &&
          account.isInvestment,
      ),
    [accounts],
  );
  const incomeAccounts = useMemo(() => {
    const currencyCode = accounts.find(
      (account) => account.id === principalAccountId,
    )?.currencyCode;
    return accounts.filter(
      (account) =>
        !account.isArchived &&
        account.type === "INCOME" &&
        (!currencyCode || account.currencyCode === currencyCode),
    );
  }, [accounts, principalAccountId]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const payoutAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          !account.isArchived &&
          account.type === "ASSET" &&
          account.id !== principalAccountId &&
          (!principalAccountId ||
            account.currencyCode ===
              accounts.find((item) => item.id === principalAccountId)
                ?.currencyCode),
      ),
    [accounts, principalAccountId],
  );

  const load = useCallback(async () => {
    if (!runtime) return;
    const [nextAccounts, nextPlans] = await Promise.all([
      runtime.accounts.list(true),
      runtime.interest.listPlans(),
    ]);
    setAccounts(nextAccounts);
    setPlans(nextPlans);
    if (!selectedPlanId && nextPlans.length > 0) {
      setSelectedPlanId(nextPlans[0]!.id);
    }
    const defaultPrincipal = nextAccounts.find(
      (item) =>
        !item.isArchived && item.type === "ASSET" && item.isInvestment,
    );
    const effectivePrincipalId = principalAccountId || defaultPrincipal?.id;
    const principalCurrency = nextAccounts.find(
      (item) => item.id === effectivePrincipalId,
    )?.currencyCode;
    if (!principalAccountId && defaultPrincipal) {
      setPrincipalAccountId(defaultPrincipal.id);
    }
    if (!incomeAccountId) {
      setIncomeAccountId(
        nextAccounts.find(
          (item) =>
            !item.isArchived &&
            item.type === "INCOME" &&
            (!principalCurrency || item.currencyCode === principalCurrency),
        )?.id ?? "",
      );
    }
  }, [runtime, principalAccountId, incomeAccountId, selectedPlanId]);

  const loadAccruals = useCallback(async () => {
    if (!runtime || !selectedPlanId) {
      setAccruals([]);
      return;
    }
    const nextAccruals = await runtime.interest.listAccruals(selectedPlanId);
    setAccruals(nextAccruals);
    const settled = nextAccruals
      .filter((item) => item.status === "POSTED" || item.status === "PAID")
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
    const selectedPlan = plans.find((item) => item.id === selectedPlanId);
    if (selectedPlan) {
      setKind(
        selectedPlan.compounding === "SIMPLE" ? "PAYOUT" : "CAPITALIZATION",
      );
    }
    setPeriodStart(
      settled.length > 0
        ? settled[settled.length - 1]!.periodEnd
        : (selectedPlan?.startDate ?? ""),
    );
  }, [runtime, selectedPlanId, plans]);

  useEffect(() => {
    // Runtime data is loaded asynchronously after encrypted DB initialization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((cause: unknown) =>
      setFailure(
        cause instanceof Error ? cause.message : "Không thể tải kế hoạch lãi.",
      ),
    );
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccruals().catch((cause: unknown) =>
      setFailure(
        cause instanceof Error ? cause.message : "Không thể tải kỳ lãi.",
      ),
    );
  }, [loadAccruals]);

  async function createPlan() {
    if (!runtime) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const match = /^(\d{1,4})(?:\.(\d{1,4}))?$/.exec(ratePercent.trim());
      if (!match)
        throw new Error(
          "APR phải là số thập phân từ 0 đến 1000, tối đa 4 chữ số lẻ.",
        );
      const ppm =
        BigInt(match[1]!) * 10_000n +
        BigInt((match[2] ?? "").padEnd(4, "0") || "0");
      const plan = await runtime.interest.createPlan({
        name,
        principalAccountId,
        interestIncomeAccountId: incomeAccountId,
        payoutAccountId: payoutAccountId || null,
        annualRatePpm: ppm,
        compounding,
        postingFrequency: frequency,
        startDate,
        maturityDate: maturityDate || null,
      });
      setSelectedPlanId(plan.id);
      setKind(compounding === "SIMPLE" ? "PAYOUT" : "CAPITALIZATION");
      setName("");
      setMessage("Đã tạo InterestPlan.");
      await load();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể tạo kế hoạch lãi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function previewPeriod() {
    if (!runtime || !selectedPlanId) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await runtime.interest.preview(
        selectedPlanId,
        periodStart,
        periodEnd,
      );
      setPreview(
        `Ngày tính: ${result.dayCount} · Lãi chính xác: ${result.numerator}/${result.denominator} minor units · HALF_UP: ${result.amountMinor.toString()} minor units`,
      );
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể preview lãi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function accruePeriod() {
    if (!runtime || !selectedPlanId) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const result = await runtime.interest.accruePeriod({
        planId: selectedPlanId,
        periodStart,
        periodEnd,
        kind,
      });
      setMessage(
        result.accrual
          ? `Đã tạo accrual ${result.accrual.id} · ${result.calculation.amountMinor.toString()} minor units (chưa ghi Ledger).`
          : "Giá trị lãi chưa đạt một minor unit; chưa tạo accrual để tránh làm tròn sớm. Hãy preview một kỳ dài hơn.",
      );
      await loadAccruals();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể accrue kỳ lãi.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function catchUp() {
    if (!runtime || !selectedPlanId) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const results = await runtime.interest.catchUp(
        selectedPlanId,
        periodEnd,
        kind,
      );
      setMessage(
        results.length > 0
          ? `Catch-up hoàn tất: ${results.length} kỳ đã được ghi nhận vào Ledger.`
          : "Không có kỳ đến hạn có thể ghi nhận.",
      );
      await Promise.all([load(), loadAccruals()]);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Catch-up thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function changePlanStatus(status: InterestPlan["status"]) {
    if (!runtime || !selectedPlanId) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      await runtime.interest.setPlanStatus(selectedPlanId, status);
      if (status === "CLOSED") {
        setSelectedPlanId("");
        setAccruals([]);
      }
      setMessage(
        status === "PAUSED"
          ? "Đã tạm dừng kế hoạch lãi."
          : status === "CLOSED"
            ? "Đã đóng kế hoạch lãi."
            : "Đã kích hoạt lại kế hoạch lãi.",
      );
      await load();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể cập nhật trạng thái kế hoạch.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function post(accrualId: string) {
    if (!runtime) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const result = await runtime.interest.postAccrual(accrualId);
      setMessage(
        `Đã ${result.status === "PAID" ? "payout" : "capitalization"} · Journal ${result.journalEntryId ?? "—"}.`,
      );
      await Promise.all([load(), loadAccruals()]);
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể ghi nhận lãi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenBackLink />
      <Text style={styles.eyebrow}>CORE FINANCE · TASK-05</Text>
      <Text style={styles.title}>Interest Engine</Text>
      <Text style={styles.subtitle}>
        Nominal APR · ACT/365 Fixed · daily accrual · HALF_UP khi posting.
        Accrued chưa POSTED không làm thay đổi số dư Ledger. MVP yêu cầu cùng base currency và principal được nạp trước ngày bắt đầu, không thay đổi ngoài InterestPlan.
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {failure ? <Text style={styles.error}>{failure}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tạo kế hoạch lãi</Text>
        <Text style={styles.label}>Tên kế hoạch</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Tiền gửi kỳ hạn 6 tháng"
          style={styles.input}
        />
        <Text style={styles.label}>Nominal APR (%)</Text>
        <TextInput
          value={ratePercent}
          onChangeText={setRatePercent}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Text style={styles.label}>Ngày bắt đầu (YYYY-MM-DD)</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          autoCapitalize="none"
          style={styles.input}
        />
        <Text style={styles.label}>
          Ngày đáo hạn (bắt buộc với at-maturity)
        </Text>
        <TextInput
          value={maturityDate}
          onChangeText={setMaturityDate}
          placeholder="2027-05-04"
          style={styles.input}
        />
        <AccountPicker
          title="Tài khoản gốc · INVESTMENT ASSET"
          accounts={principalAccounts}
          selectedId={principalAccountId}
          onSelect={(id) => {
            const currencyCode = accounts.find(
              (item) => item.id === id,
            )?.currencyCode;
            setPrincipalAccountId(id);
            setPayoutAccountId("");
            setIncomeAccountId(
              accounts.find(
                (item) =>
                  !item.isArchived &&
                  item.type === "INCOME" &&
                  item.currencyCode === currencyCode,
              )?.id ?? "",
            );
          }}
        />
        <AccountPicker
          title="Tài khoản thu nhập lãi · INCOME"
          accounts={incomeAccounts}
          selectedId={incomeAccountId}
          onSelect={setIncomeAccountId}
        />
        <AccountPicker
          title="Tài khoản nhận payout · tùy chọn"
          accounts={payoutAccounts}
          selectedId={payoutAccountId}
          onSelect={setPayoutAccountId}
        />
        <Text style={styles.label}>Phương thức tính lãi</Text>
        <View style={styles.wrap}>
          <Action
            label="Lãi đơn · trả lãi"
            selected={compounding === "SIMPLE"}
            onPress={() => setCompounding("SIMPLE")}
          />
          <Action
            label="Nhập gốc · lãi kép"
            selected={compounding === "AFTER_CAPITALIZATION"}
            onPress={() => setCompounding("AFTER_CAPITALIZATION")}
          />
        </View>
        <Text style={styles.muted}>
          Lãi đơn bắt buộc có tài khoản payout. Nhập lãi vào gốc chỉ được phép
          khi chọn lãi kép.
        </Text>
        <Text style={styles.label}>Lịch posting</Text>
        <View style={styles.wrap}>
          <Action
            label="Hàng tháng"
            selected={frequency === "MONTHLY"}
            onPress={() => setFrequency("MONTHLY")}
          />
          <Action
            label="Khi đáo hạn"
            selected={frequency === "AT_MATURITY"}
            onPress={() => setFrequency("AT_MATURITY")}
          />
        </View>
        <Action
          label={busy ? "Đang xử lý…" : "Tạo kế hoạch"}
          disabled={busy || !runtime}
          onPress={() => void createPlan()}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Kế hoạch hiện có</Text>
        {plans.length === 0 ? (
          <Text style={styles.muted}>Chưa có kế hoạch lãi.</Text>
        ) : null}
        {plans.map((plan) => (
          <Action
            key={plan.id}
            label={`${plan.name} · ${plan.status} · ${plan.annualRatePpm.toString()} ppm`}
            selected={selectedPlanId === plan.id}
            onPress={() => setSelectedPlanId(plan.id)}
          />
        ))}
      </View>

      {selectedPlanId ? (
        <View style={styles.card}>
          {selectedPlan ? (
            <>
              <Text style={styles.muted}>
                Trạng thái: {selectedPlan.status} · {selectedPlan.timezoneId}
              </Text>
              <View style={styles.wrap}>
                {selectedPlan.status === "ACTIVE" ? (
                  <Action
                    label="Tạm dừng"
                    disabled={busy}
                    onPress={() => void changePlanStatus("PAUSED")}
                  />
                ) : (
                  <Action
                    label="Tiếp tục"
                    disabled={busy}
                    onPress={() => void changePlanStatus("ACTIVE")}
                  />
                )}
                <Action
                  label="Đóng kế hoạch"
                  disabled={busy}
                  onPress={() => void changePlanStatus("CLOSED")}
                />
              </View>
            </>
          ) : null}
          <Text style={styles.sectionTitle}>Preview và ghi nhận kỳ lãi</Text>
          <Text style={styles.label}>Từ ngày (inclusive)</Text>
          <TextInput
            value={periodStart}
            onChangeText={setPeriodStart}
            placeholder="2026-11-01"
            style={styles.input}
          />
          <Text style={styles.label}>Đến ngày (exclusive)</Text>
          <TextInput
            value={periodEnd}
            onChangeText={setPeriodEnd}
            style={styles.input}
          />
          <View style={styles.wrap}>
            <Action
              label="Nhập gốc"
              selected={kind === "CAPITALIZATION"}
              onPress={() => setKind("CAPITALIZATION")}
            />
            <Action
              label="Trả lãi"
              selected={kind === "PAYOUT"}
              onPress={() => setKind("PAYOUT")}
            />
          </View>
          <View style={styles.wrap}>
            <Action
              label="Preview"
              disabled={busy}
              onPress={() => void previewPeriod()}
            />
            <Action
              label="Tạo accrual"
              disabled={busy}
              onPress={() => void accruePeriod()}
            />
            <Action
              label="Catch-up đến ngày"
              disabled={busy}
              onPress={() => void catchUp()}
            />
          </View>
          {preview ? (
            <Text selectable style={styles.muted}>
              {preview}
            </Text>
          ) : null}
          <Text style={styles.sectionTitle}>Lịch sử accrual</Text>
          {accruals.map((item) => (
            <View key={item.id} style={styles.accrualRow}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>
                  {item.periodStart} → {item.periodEnd}
                </Text>
                <Text style={styles.muted}>
                  {item.accrualKind} · {item.status} ·{" "}
                  {roundHalfUp(item.accruedNumerator, item.accruedDenominator).toString()} minor units (HALF_UP at posting)
                </Text>
                {item.journalEntryId ? (
                  <Text style={styles.muted}>
                    Journal: {item.journalEntryId}
                  </Text>
                ) : null}
              </View>
              {item.status === "ACCRUED" ? (
                <Action
                  label="Post"
                  disabled={busy}
                  onPress={() => void post(item.id)}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.mutedText,
  },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 16, lineHeight: 23, color: colors.mutedText },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
  },
  fieldGroup: { gap: spacing.xs },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  action: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionSelected: { borderColor: colors.primary, backgroundColor: "#EAF5EF" },
  actionText: { fontSize: 12, color: colors.text },
  actionTextSelected: { color: colors.primary, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  muted: { fontSize: 12, color: colors.mutedText },
  error: { fontSize: 14, color: "#B42318" },
  success: { fontSize: 14, color: colors.primary },
  accrualRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  flex: { flex: 1 },
  itemTitle: { fontSize: 14, color: colors.text, fontWeight: "600" },
});
