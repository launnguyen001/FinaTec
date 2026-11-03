import { useCallback, useEffect, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  AssetRecord,
  AssetTypeRecord,
} from "../../domain/asset/repository";
import type { CurrencyRecord } from "../../domain/ledger/repository";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { colors, spacing, typography } from "../../shared/theme/tokens";

type AssetClass = "CRYPTO" | "METAL" | "STOCK" | "OTHER";
type ValuationModel = "MARKET_VALUED" | "STABLE_VALUE";

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

export function AssetsScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [assetTypes, setAssetTypes] = useState<AssetTypeRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [typeName, setTypeName] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("CRYPTO");
  const [valuationModel, setValuationModel] =
    useState<ValuationModel>("MARKET_VALUED");
  const [unitCode, setUnitCode] = useState("UNIT");
  const [quantityPrecision, setQuantityPrecision] = useState("8");
  const [pricePrecision, setPricePrecision] = useState("2");
  const [quoteCurrency, setQuoteCurrency] = useState("USDT");

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetSymbol, setAssetSymbol] = useState("");
  const [providerSymbol, setProviderSymbol] = useState("");

  const [manualAssetId, setManualAssetId] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextTypes, nextAssets, nextCurrencies] = await Promise.all([
      runtime.assetCatalog.listAssetTypes(),
      runtime.assetCatalog.listAssets(),
      runtime.ledger.listCurrencies(false),
    ]);
    const nextQuantities = await Promise.all(
      nextAssets.map(
        async (asset) =>
          [
            asset.id,
            await runtime.assetRepository.getCurrentQuantity(asset.id),
          ] as const,
      ),
    );
    setAssetTypes(nextTypes);
    setAssets(nextAssets);
    setCurrencies(nextCurrencies);
    setQuantities(Object.fromEntries(nextQuantities));
    if (!selectedTypeId && nextTypes[0]) setSelectedTypeId(nextTypes[0].id);
    const marketAssets = nextAssets.filter((asset) =>
      nextTypes.some(
        (type) =>
          type.id === asset.assetTypeId &&
          type.valuationModel === "MARKET_VALUED",
      ),
    );
    if (
      !manualAssetId ||
      !marketAssets.some((asset) => asset.id === manualAssetId)
    ) {
      setManualAssetId(marketAssets[0]?.id ?? "");
    }
    if (!nextCurrencies.some((currency) => currency.code === quoteCurrency)) {
      setQuoteCurrency(
        nextCurrencies.find((currency) => currency.isActive)?.code ?? "VND",
      );
    }
  }, [runtime, selectedTypeId, manualAssetId, quoteCurrency]);

  useEffect(() => {
    // Loading is asynchronous and depends on the initialized finance runtime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch((cause: unknown) =>
      setFailure(
        cause instanceof Error
          ? cause.message
          : "Không thể tải danh mục tài sản.",
      ),
    );
  }, [refresh]);

  async function createType() {
    if (!runtime || busy) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      await runtime.assetCatalog.createAssetType({
        name: typeName,
        assetClass,
        valuationModel,
        unitCode,
        quantityPrecision: Number(quantityPrecision),
        pricePrecision: Number(pricePrecision),
        quoteCurrency,
      });
      setTypeName("");
      setMessage("Đã tạo loại tài sản.");
      await refresh();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể tạo loại tài sản.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createProfile() {
    if (!runtime || busy) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      await runtime.assetCatalog.createAsset({
        assetTypeId: selectedTypeId,
        name: assetName,
        symbol: assetSymbol,
        providerSymbol,
      });
      setAssetName("");
      setAssetSymbol("");
      setProviderSymbol("");
      setMessage("Đã tạo hồ sơ tài sản.");
      await refresh();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể tạo hồ sơ tài sản.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveManualPrice() {
    if (!runtime || busy) return;
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      const result = await runtime.assetValuations.recordManualPrice({
        assetId: manualAssetId,
        price: manualPrice,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      setManualPrice("");
      setMessage(
        result
          ? "Đã lưu giá thủ công và cập nhật snapshot trong ngày."
          : "Quote đã được lưu nhưng snapshot không thay đổi vì ngày đã chốt hoặc dữ liệu cũ hơn.",
      );
      await refresh();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu giá thủ công.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenBackLink />
      <Text style={styles.eyebrow}>ASSET MANAGEMENT</Text>
      <Text style={styles.title}>Tài sản</Text>
      <Text style={styles.subtitle}>
        Theo dõi holdings, giá vốn và định giá. Số dư tiền vẫn lấy trực tiếp từ
        Ledger, không tạo bản sao.
      </Text>
      <View style={styles.choices}>
        <Link href="/asset-history" style={styles.navigationLink}>
          Lịch sử định giá
        </Link>
        <Link href="/asset-settings" style={styles.navigationLink}>
          Cài đặt định giá
        </Link>
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {failure ? <Text style={styles.error}>{failure}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cập nhật giá từ provider</Text>
        <Text style={styles.muted}>
          Hiện hỗ trợ crypto qua CoinPaprika và CoinGecko Demo. Kim loại chưa có
          provider được phê duyệt; lỗi provider sẽ giữ giá gần nhất và đánh dấu
          stale.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy || !runtime}
          onPress={async () => {
            if (!runtime) return;
            setBusy(true);
            setFailure(null);
            setMessage(null);
            try {
              const outcomes =
                await runtime.assetPriceRefresh.refreshDueAssets(true);
              const updated = outcomes.filter(
                (item) => item.status === "UPDATED",
              ).length;
              const failed = outcomes.filter(
                (item) => item.status === "FAILED",
              ).length;
              const skipped = outcomes.filter(
                (item) => item.status === "SKIPPED",
              ).length;
              setMessage(
                `Refresh hoàn tất: ${updated} cập nhật, ${skipped} bỏ qua, ${failed} lỗi.`,
              );
              await refresh();
            } catch (cause) {
              setFailure(
                cause instanceof Error
                  ? cause.message
                  : "Không thể refresh giá.",
              );
            } finally {
              setBusy(false);
            }
          }}
          style={[styles.primaryButton, busy && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>Refresh giá crypto</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Danh mục tài sản</Text>
        {assets.length === 0 ? (
          <Text style={styles.muted}>Chưa có tài sản nào được khai báo.</Text>
        ) : (
          assets.map((asset) => {
            const type = assetTypes.find(
              (item) => item.id === asset.assetTypeId,
            );
            return (
              <View key={asset.id} style={styles.assetRow}>
                <View style={styles.assetIdentity}>
                  <Text style={styles.assetSymbol}>{asset.symbol}</Text>
                  <Text style={styles.assetName}>{asset.name}</Text>
                  <Text style={styles.muted}>
                    {type?.name ?? "Loại tài sản"} · {type?.unitCode ?? ""}
                  </Text>
                </View>
                <View style={styles.assetActions}>
                  <Text style={styles.quantity}>
                    {quantities[asset.id] ?? "—"}
                  </Text>
                  {quantities[asset.id] === "0" ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={async () => {
                        if (!runtime) return;
                        setBusy(true);
                        setFailure(null);
                        setMessage(null);
                        try {
                          await runtime.assetCatalog.archiveAsset(asset.id);
                          setMessage("Đã archive hồ sơ tài sản.");
                          await refresh();
                        } catch (cause) {
                          setFailure(
                            cause instanceof Error
                              ? cause.message
                              : "Không thể archive tài sản.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                      style={styles.archiveButton}
                    >
                      <Text style={styles.archiveButtonText}>Archive</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quản lý loại tài sản</Text>
        {assetTypes.length === 0 ? (
          <Text style={styles.muted}>Chưa có loại tài sản.</Text>
        ) : (
          assetTypes.map((type) => {
            const profileCount = assets.filter(
              (asset) => asset.assetTypeId === type.id,
            ).length;
            return (
              <View key={type.id} style={styles.assetRow}>
                <View style={styles.assetIdentity}>
                  <Text style={styles.assetSymbol}>{type.name}</Text>
                  <Text style={styles.muted}>
                    {type.assetClass} · {type.valuationModel} · {profileCount}{" "}
                    hồ sơ đang hoạt động
                  </Text>
                </View>
                {profileCount === 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={async () => {
                      if (!runtime) return;
                      setBusy(true);
                      setFailure(null);
                      setMessage(null);
                      try {
                        await runtime.assetCatalog.archiveAssetType(type.id);
                        setMessage("Đã archive loại tài sản.");
                        await refresh();
                      } catch (cause) {
                        setFailure(
                          cause instanceof Error
                            ? cause.message
                            : "Không thể archive loại tài sản.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                    style={styles.archiveButton}
                  >
                    <Text style={styles.archiveButtonText}>Archive type</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tạo loại tài sản</Text>
        <TextInput
          accessibilityLabel="Tên loại tài sản"
          placeholder="Ví dụ: Cryptocurrency"
          value={typeName}
          onChangeText={setTypeName}
          style={styles.input}
        />
        <Text style={styles.label}>Asset class</Text>
        <View style={styles.choices}>
          {(["CRYPTO", "METAL", "STOCK", "OTHER"] as AssetClass[]).map(
            (item) => (
              <Choice
                key={item}
                value={item}
                selected={assetClass === item}
                onPress={() => setAssetClass(item)}
              />
            ),
          )}
        </View>
        <Text style={styles.label}>Valuation model</Text>
        <View style={styles.choices}>
          {(["MARKET_VALUED", "STABLE_VALUE"] as ValuationModel[]).map(
            (item) => (
              <Choice
                key={item}
                value={item}
                selected={valuationModel === item}
                onPress={() => setValuationModel(item)}
              />
            ),
          )}
        </View>
        <TextInput
          accessibilityLabel="Đơn vị đo"
          placeholder="Unit code"
          autoCapitalize="characters"
          value={unitCode}
          onChangeText={setUnitCode}
          style={styles.input}
        />
        <View style={styles.twoColumns}>
          <View style={styles.flex}>
            <Text style={styles.label}>Quantity precision</Text>
            <TextInput
              accessibilityLabel="Quantity precision"
              keyboardType="number-pad"
              value={quantityPrecision}
              onChangeText={setQuantityPrecision}
              style={styles.input}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>Price precision</Text>
            <TextInput
              accessibilityLabel="Price precision"
              keyboardType="number-pad"
              value={pricePrecision}
              onChangeText={setPricePrecision}
              style={styles.input}
            />
          </View>
        </View>
        <Text style={styles.label}>Quote currency</Text>
        <View style={styles.choices}>
          {currencies
            .filter((item) => item.isActive)
            .map((item) => (
              <Choice
                key={item.code}
                value={item.code}
                selected={quoteCurrency === item.code}
                onPress={() => setQuoteCurrency(item.code)}
              />
            ))}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void createType()}
          style={[styles.primaryButton, busy && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>Tạo loại tài sản</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tạo hồ sơ tài sản</Text>
        <Text style={styles.label}>Asset type</Text>
        <View style={styles.choices}>
          {assetTypes.map((item) => (
            <Choice
              key={item.id}
              value={item.name}
              selected={selectedTypeId === item.id}
              onPress={() => setSelectedTypeId(item.id)}
            />
          ))}
        </View>
        <TextInput
          accessibilityLabel="Tên tài sản"
          placeholder="Tên hiển thị"
          value={assetName}
          onChangeText={setAssetName}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Symbol"
          placeholder="Symbol, ví dụ BTC"
          autoCapitalize="characters"
          value={assetSymbol}
          onChangeText={setAssetSymbol}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Provider symbol"
          placeholder="Provider symbol (optional)"
          value={providerSymbol}
          onChangeText={setProviderSymbol}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy || !selectedTypeId}
          onPress={() => void createProfile()}
          style={[
            styles.primaryButton,
            (busy || !selectedTypeId) && styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>Tạo hồ sơ tài sản</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cập nhật giá thủ công</Text>
        <Text style={styles.muted}>
          Giá được lưu với nguồn MANUAL, không ghi đè lịch sử quote cũ và không
          tạo Journal Entry.
        </Text>
        <View style={styles.choices}>
          {assets
            .filter((asset) =>
              assetTypes.some(
                (type) =>
                  type.id === asset.assetTypeId &&
                  type.valuationModel === "MARKET_VALUED",
              ),
            )
            .map((item) => (
              <Choice
                key={item.id}
                value={item.symbol}
                selected={manualAssetId === item.id}
                onPress={() => setManualAssetId(item.id)}
              />
            ))}
        </View>
        <TextInput
          accessibilityLabel="Giá thị trường thủ công"
          placeholder="Unit price"
          keyboardType="decimal-pad"
          value={manualPrice}
          onChangeText={setManualPrice}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy || !manualAssetId}
          onPress={() => void saveManualPrice()}
          style={[
            styles.primaryButton,
            (busy || !manualAssetId) && styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>Lưu giá thủ công</Text>
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
  sectionTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: "700",
  },
  muted: {
    color: colors.mutedText,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  assetIdentity: {
    flex: 1,
    gap: 2,
  },
  assetActions: { alignItems: "flex-end", gap: spacing.xs },
  archiveButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  archiveButtonText: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
  },
  navigationLink: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "700",
    paddingVertical: spacing.xs,
  },
  assetSymbol: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800",
  },
  assetName: {
    color: colors.text,
    fontSize: typography.body,
  },
  quantity: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
  },
  label: {
    color: colors.mutedText,
    fontSize: typography.caption,
    fontWeight: "700",
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
  twoColumns: {
    flexDirection: "row",
    gap: spacing.md,
  },
  flex: {
    flex: 1,
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
