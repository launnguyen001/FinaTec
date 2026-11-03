import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Account, AccountSubtype, AccountType, CurrencyRecord } from "../../domain/ledger/repository";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { colors, spacing, typography } from "../../shared/theme/tokens";

const accountTypes: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
const assetSubtypes: AccountSubtype[] = ["CASH", "BANK", "EWALLET", "SAVINGS", "OTHER"];

export function AccountsScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [items, setItems] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRecord[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [type, setType] = useState<AccountType>("ASSET");
  const [subtype, setSubtype] = useState<AccountSubtype>("CASH");
  const [currencyCode, setCurrencyCode] = useState("VND");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextItems, nextCurrencies] = await Promise.all([runtime.accounts.list(true), runtime.ledger.listCurrencies(false)]);
    setItems(nextItems);
    setCurrencies(nextCurrencies);
    if (!nextCurrencies.some((item) => item.code === currencyCode && item.isActive)) setCurrencyCode(nextCurrencies.find((item) => item.isActive)?.code ?? "VND");
  }, [runtime, currencyCode]);

  useEffect(() => { void refresh().catch((cause: unknown) => setFailure(cause instanceof Error ? cause.message : "Không thể tải tài khoản.")); }, [refresh]);

  async function createAccount() {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null); setMessage(null);
    try {
      await runtime.accounts.create({ name, type, subtype: type === "ASSET" ? subtype : null, currencyCode });
      setName(""); setMessage("Đã tạo tài khoản."); await refresh();
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể tạo tài khoản."); }
    finally { setBusy(false); }
  }

  async function saveRename(id: string) {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null); setMessage(null);
    try { await runtime.accounts.rename(id, editingName); setEditingId(null); setEditingName(""); setMessage("Đã cập nhật tên tài khoản."); await refresh(); }
    catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể cập nhật tài khoản."); }
    finally { setBusy(false); }
  }
  async function archiveAccount(id: string) {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null); setMessage(null);
    try { await runtime.accounts.archive(id); setMessage("Đã archive tài khoản."); await refresh(); }
    catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể archive tài khoản."); }
    finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenBackLink />
    <Text style={styles.eyebrow}>QUẢN LÝ</Text>
    <Text style={styles.title}>Tài khoản</Text>
    <Text style={styles.subtitle}>Mỗi tài khoản giữ một loại tiền tệ cố định. Số dư được suy ra từ Ledger.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tạo tài khoản</Text>
      <Text style={styles.label}>Tên tài khoản</Text>
      <TextInput accessibilityLabel="Tên tài khoản" value={name} onChangeText={setName} placeholder="Ví dụ: Tiền mặt, Ngân hàng A" style={styles.input} maxLength={80} />
      <Text style={styles.label}>Loại kế toán</Text>
      <View style={styles.options}>{accountTypes.map((value) => <Option key={value} label={value} selected={type === value} onPress={() => setType(value)} />)}</View>
      {type === "ASSET" ? <><Text style={styles.label}>Nguồn tiền</Text><View style={styles.options}>{assetSubtypes.map((value) => <Option key={value} label={value} selected={subtype === value} onPress={() => setSubtype(value)} />)}</View></> : null}
      <Text style={styles.label}>Tiền tệ</Text>
      <View style={styles.options}>{currencies.filter((item) => item.isActive).map((item) => <Option key={item.code} label={item.code} selected={currencyCode === item.code} onPress={() => setCurrencyCode(item.code)} />)}</View>
      <Pressable accessibilityRole="button" disabled={busy || !name.trim() || !currencyCode} onPress={() => void createAccount()} style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed, (!name.trim() || busy) && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Đang lưu…" : "Tạo tài khoản"}</Text></Pressable>
      {message ? <Text style={styles.success}>{message}</Text> : null}{failure ? <Text style={styles.error}>{failure}</Text> : null}
    </View>
    <Text style={styles.sectionTitle}>Danh sách tài khoản</Text>
    {items.length === 0 ? <Text style={styles.empty}>Chưa có tài khoản nào.</Text> : items.map((item) => <View key={item.id} style={styles.accountRow}>
      <View style={styles.accountBody}>{editingId === item.id ? <TextInput accessibilityLabel={`Tên mới cho ${item.name}`} value={editingName} onChangeText={setEditingName} style={styles.input} maxLength={80} /> : <><Text style={styles.accountName}>{item.name}</Text><Text style={styles.accountMeta}>{item.type}{item.subtype ? ` · ${item.subtype}` : ""} · {item.currencyCode}{item.isArchived ? " · Đã archive" : ""}</Text></>}</View>
      {!item.isArchived && !item.isSystem ? <>{editingId === item.id ? <Pressable accessibilityRole="button" disabled={busy || !editingName.trim()} onPress={() => void saveRename(item.id)} style={styles.archiveButton}><Text style={styles.archiveText}>Lưu</Text></Pressable> : <Pressable accessibilityRole="button" onPress={() => { setEditingId(item.id); setEditingName(item.name); }} style={styles.archiveButton}><Text style={styles.archiveText}>Sửa</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel={`Archive ${item.name}`} disabled={busy} onPress={() => void archiveAccount(item.id)} style={styles.archiveButton}><Text style={styles.archiveText}>Archive</Text></Pressable></> : null}
    </View>)}
    <Text style={styles.note}>Tài khoản đã archive vẫn giữ lịch sử. Không hỗ trợ xóa vĩnh viễn.</Text>
  </ScrollView>;
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  eyebrow: { color: colors.mutedText, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.mutedText, fontSize: typography.caption, lineHeight: 19 },
  card: { padding: spacing.md, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: typography.subtitle, fontWeight: "700" },
  label: { color: colors.text, fontSize: typography.caption, fontWeight: "700", marginTop: spacing.sm },
  input: { minHeight: 48, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background, color: colors.text, fontSize: typography.body },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  option: { minHeight: 38, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  optionSelected: { borderColor: colors.primary, backgroundColor: "#EAF4EF" },
  optionText: { color: colors.mutedText, fontSize: typography.caption, fontWeight: "600" },
  optionTextSelected: { color: colors.primary },
  primaryButton: { minHeight: 48, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  primaryButtonText: { color: "#FFFFFF", fontSize: typography.body, fontWeight: "700" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  sectionTitle: { marginTop: spacing.md, color: colors.text, fontSize: typography.subtitle, fontWeight: "700" },
  accountRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  accountBody: { flex: 1 },
  accountName: { color: colors.text, fontSize: typography.body, fontWeight: "700" },
  accountMeta: { marginTop: 3, color: colors.mutedText, fontSize: typography.caption },
  archiveButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 10, backgroundColor: "#FFF2F2" },
  archiveText: { color: "#9B3838", fontSize: typography.caption, fontWeight: "700" },
  empty: { color: colors.mutedText, fontSize: typography.caption, paddingVertical: spacing.md },
  note: { color: colors.mutedText, fontSize: typography.caption, lineHeight: 18 },
  success: { color: colors.primary, fontSize: typography.caption },
  error: { color: "#9B3838", fontSize: typography.caption },
});
