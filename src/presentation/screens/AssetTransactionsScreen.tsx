import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { decimalToMinorUnits } from "../../domain/asset/asset";
import type { AssetLotRecord, AssetRecord, AssetTypeRecord } from "../../domain/asset/repository";
import type { Account } from "../../domain/ledger/repository";
import type { Category } from "../../domain/category/category";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { colors, spacing, typography } from "../../shared/theme/tokens";

type Mode = "BUY" | "SELL" | "DCA";

function Choice({
  value,
  selected,
  onPress,
}: {
  value: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {value}
      </Text>
    </Pressable>
  );
}

export function AssetTransactionsScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [mode, setMode] = useState<Mode>("BUY");
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [types, setTypes] = useState<AssetTypeRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lots, setLots] = useState<AssetLotRecord[]>([]);
  const [assetId, setAssetId] = useState("");
  const [lotId, setLotId] = useState("");
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("");
  const [executionPrice, setExecutionPrice] = useState("");
  const [feeAmount, setFeeAmount] = useState("0");
  const [cashAccountId, setCashAccountId] = useState("");
  const [investmentAccountId, setInvestmentAccountId] = useState("");
  const [feeAccountId, setFeeAccountId] = useState("");
  const [feeCategoryId, setFeeCategoryId] = useState("");
  const [gainAccountId, setGainAccountId] = useState("");
  const [lossAccountId, setLossAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedAsset = assets.find((item) => item.id === assetId);
  const selectedType = types.find((item) => item.id === selectedAsset?.assetTypeId);
  const currencyCode = selectedAsset?.quoteCurrency ?? "";
  const currency = runtime
    ? accounts.find((account) => account.currencyCode === currencyCode)
    : undefined;
  const currencyMinorUnit = currency
    ? 0
    : 0;

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextAssets, nextTypes, nextAccounts, nextCategories] = await Promise.all([
      runtime.assetCatalog.listAssets(),
      runtime.assetCatalog.listAssetTypes(),
      runtime.accounts.list(false),
      runtime.categories.list(true),
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
    setAccounts(nextAccounts);
    setCategories(nextCategories);
    if (!marketAssets.some((item) => item.id === assetId)) {
      setAssetId(marketAssets[0]?.id ?? "");
    }
  }, [runtime, assetId]);

  const refreshLots = useCallback(async () => {
    if (!runtime || !assetId) {
      setLots([]);
      return;
    }
    const nextLots = await runtime.assetRepository.listLots(assetId);
    setLots(nextLots);
    if (!nextLots.some((item) => item.id === lotId)) setLotId(nextLots[0]?.id ?? "");
    setSelectedLotIds((current) =>
      current.filter((id) => nextLots.some((item) => item.id === id)),
    );
  }, [runtime, assetId, lotId]);

  useEffect(() => {
    // Load options after the encrypted finance runtime is ready.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch((cause: unknown) =>
      setFailure(cause instanceof Error ? cause.message : "Không thể tải dữ liệu."),
    );
  }, [refresh]);

  useEffect(() => {
    // Lot list is derived from the selected asset and refreshed on route focus.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshLots().catch((cause: unknown) =>
      setFailure(cause instanceof Error ? cause.message : "Không thể tải các lot."),
    );
  }, [refreshLots]);

  const cashAccounts = accounts.filter(
    (item) =>
      item.type === "ASSET" &&
      !item.isInvestment &&
      item.currencyCode === currencyCode,
  );
  const investmentAccounts = accounts.filter(
    (item) =>
      item.type === "ASSET" &&
      item.isInvestment &&
      item.currencyCode === currencyCode,
  );
  const expenseAccounts = accounts.filter(
    (item) => item.type === "EXPENSE" && item.currencyCode === currencyCode,
  );
  const incomeAccounts = accounts.filter(
    (item) => item.type === "INCOME" && item.currencyCode === currencyCode,
  );
  const expenseCategories = categories.filter(
    (item) => item.kind === "EXPENSE" && !item.isArchived,
  );

  async function submit() {
    if (!runtime || busy || !selectedAsset || !selectedType) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const currencyRecord = (await runtime.ledger.listCurrencies(false)).find(
        (item) => item.code === currencyCode,
      );
      if (!currencyRecord) throw new Error("Không tìm thấy tiền tệ của tài sản.");
      const feeMinor = decimalToMinorUnits(feeAmount || "0", currencyRecord.minorUnit);

      if (mode === "BUY") {
        const result = await runtime.assetTransactions.buy({
          assetId,
          quantity,
          executionPrice,
          currencyCode,
          cashAccountId,
          investmentAccountId,
          feeMinor,
          feeAccountId: feeMinor > 0n ? feeAccountId : null,
          feeCategoryId: feeMinor > 0n ? feeCategoryId : null,
          idempotencyKey: runtime.createId(),
        });
        setMessage(result.created ? "Đã ghi nhận giao dịch mua." : "Giao dịch mua đã được ghi nhận trước đó.");
      } else if (mode === "SELL") {
        const result = await runtime.assetTransactions.sell({
          assetId,
          lotId,
          quantity,
          executionPrice,
          currencyCode,
          cashAccountId,
          investmentAccountId,
          feeMinor,
          feeAccountId: feeMinor > 0n ? feeAccountId : null,
          feeCategoryId: feeMinor > 0n ? feeCategoryId : null,
          realizedGainAccountId: gainAccountId || null,
          realizedLossAccountId: lossAccountId || null,
          idempotencyKey: runtime.createId(),
        });
        setMessage(result.created ? "Đã ghi nhận giao dịch bán." : "Giao dịch bán đã được ghi nhận trước đó.");
      } else {
        if (selectedLotIds.length < 2) {
          throw new Error("DCA cần chọn ít nhất hai lot.");
        }
        await runtime.assetTransactions.mergeDca(selectedLotIds);
        setMessage("Đã hợp nhất các lot thành DCA aggregate.");
      }
      setQuantity("");
      setExecutionPrice("");
      setFeeAmount("0");
      setSelectedLotIds([]);
      await refreshLots();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Không thể lưu giao dịch tài sản.");
    } finally {
      setBusy(false);
    }
  }

  function toggleLot(id: string) {
    setSelectedLotIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenBackLink />
      <Text style={styles.eyebrow}>ASSET LEDGER</Text>
      <Text style={styles.title}>Giao dịch tài sản</Text>
      <Text style={styles.subtitle}>
        Giá thực hiện do anh xác nhận. Phí được hạch toán riêng và mọi thay đổi
        lot cùng Journal Entry được commit nguyên tử.
      </Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {failure ? <Text style={styles.error}>{failure}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.label}>Loại thao tác</Text>
        <View style={styles.choices}>
          {(["BUY", "SELL", "DCA"] as Mode[]).map((value) => (
            <Choice
              key={value}
              value={value}
              selected={mode === value}
              onPress={() => setMode(value)}
            />
          ))}
        </View>
        <Text style={styles.label}>Tài sản</Text>
        <View style={styles.choices}>
          {assets.map((item) => (
            <Choice
              key={item.id}
              value={item.symbol}
              selected={assetId === item.id}
              onPress={() => setAssetId(item.id)}
            />
          ))}
        </View>
        {!selectedAsset ? (
          <Text style={styles.muted}>Chưa có market-valued asset. Tạo hồ sơ tại màn hình Tài sản.</Text>
        ) : (
          <>
            <Text style={styles.muted}>
              {selectedAsset.name} · {currencyCode} · {selectedType?.unitCode}
            </Text>
            {mode !== "DCA" ? (
              <>
                {mode === "SELL" ? (
                  <>
                    <Text style={styles.label}>Lot nguồn</Text>
                    <View style={styles.choices}>
                      {lots.map((lot) => (
                        <Choice
                          key={lot.id}
                          value={`${lot.remainingQuantity} · ${lot.acquiredAt.slice(0, 10)}`}
                          selected={lotId === lot.id}
                          onPress={() => setLotId(lot.id)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  accessibilityLabel="Quantity"
                  keyboardType="decimal-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0.00000000"
                  style={styles.input}
                />
                <Text style={styles.label}>Execution price ({currencyCode})</Text>
                <TextInput
                  accessibilityLabel="Execution price"
                  keyboardType="decimal-pad"
                  value={executionPrice}
                  onChangeText={setExecutionPrice}
                  placeholder="0.00"
                  style={styles.input}
                />
                <Text style={styles.label}>Tài khoản tiền</Text>
                <View style={styles.choices}>
                  {cashAccounts.map((item) => (
                    <Choice
                      key={item.id}
                      value={item.name}
                      selected={cashAccountId === item.id}
                      onPress={() => setCashAccountId(item.id)}
                    />
                  ))}
                </View>
                <Text style={styles.label}>Investment account</Text>
                <View style={styles.choices}>
                  {investmentAccounts.map((item) => (
                    <Choice
                      key={item.id}
                      value={item.name}
                      selected={investmentAccountId === item.id}
                      onPress={() => setInvestmentAccountId(item.id)}
                    />
                  ))}
                </View>
                <Text style={styles.label}>Phí giao dịch ({currencyCode})</Text>
                <TextInput
                  accessibilityLabel="Transaction fee"
                  keyboardType="decimal-pad"
                  value={feeAmount}
                  onChangeText={setFeeAmount}
                  style={styles.input}
                />
                {Number(feeAmount) > 0 ? (
                  <>
                    <Text style={styles.label}>Fee account (EXPENSE)</Text>
                    <View style={styles.choices}>
                      {expenseAccounts.map((item) => (
                        <Choice
                          key={item.id}
                          value={item.name}
                          selected={feeAccountId === item.id}
                          onPress={() => setFeeAccountId(item.id)}
                        />
                      ))}
                    </View>
                    <Text style={styles.label}>Fee category</Text>
                    <View style={styles.choices}>
                      {expenseCategories.map((item) => (
                        <Choice
                          key={item.id}
                          value={item.name}
                          selected={feeCategoryId === item.id}
                          onPress={() => setFeeCategoryId(item.id)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
                {mode === "SELL" ? (
                  <>
                    <Text style={styles.label}>Realized gain account (INCOME)</Text>
                    <View style={styles.choices}>
                      {incomeAccounts.map((item) => (
                        <Choice
                          key={item.id}
                          value={item.name}
                          selected={gainAccountId === item.id}
                          onPress={() => setGainAccountId(item.id)}
                        />
                      ))}
                    </View>
                    <Text style={styles.label}>Realized loss account (EXPENSE)</Text>
                    <View style={styles.choices}>
                      {expenseAccounts.map((item) => (
                        <Choice
                          key={item.id}
                          value={item.name}
                          selected={lossAccountId === item.id}
                          onPress={() => setLossAccountId(item.id)}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.label}>Chọn các lot cần hợp nhất</Text>
                <View style={styles.choices}>
                  {lots.map((lot) => (
                    <Choice
                      key={lot.id}
                      value={`${lot.remainingQuantity} · ${lot.acquiredAt.slice(0, 10)}`}
                      selected={selectedLotIds.includes(lot.id)}
                      onPress={() => toggleLot(lot.id)}
                    />
                  ))}
                </View>
                <Text style={styles.muted}>
                  Đã chọn {selectedLotIds.length} lot. DCA chỉ tổng hợp dữ liệu,
                  không tạo bút toán hoặc thay đổi số dư Ledger.
                </Text>
              </>
            )}
          </>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={busy || !selectedAsset || (mode === "SELL" && !lotId)}
          onPress={() => void submit()}
          style={[styles.primaryButton, (busy || !selectedAsset) && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Đang xử lý…" : mode === "BUY" ? "Xác nhận mua" : mode === "SELL" ? "Xác nhận bán" : "Hợp nhất DCA"}
          </Text>
        </Pressable>
      </View>
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
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800",
  },
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
  label: {
    color: colors.mutedText,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  muted: {
    color: colors.mutedText,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: "#E7F3ED",
  },
  choiceText: {
    color: colors.mutedText,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  choiceTextSelected: {
    color: colors.primary,
  },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: typography.body,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: typography.body,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: "#B42318",
    fontSize: typography.body,
  },
  success: {
    color: colors.primary,
    fontSize: typography.body,
  },
});
