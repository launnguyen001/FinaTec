import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Category, CategoryKind } from "../../domain/category/category";
import { useFinanceRuntime } from "../providers/FinanceRuntimeProvider";
import { ScreenBackLink } from "../components/ScreenBackLink";
import { colors, spacing, typography } from "../../shared/theme/tokens";

const kinds: CategoryKind[] = ["EXPENSE", "INCOME"];

export function CategoriesScreen() {
  const { runtime, loading, error } = useFinanceRuntime();
  const [tree, setTree] = useState<Array<Category & { children: Category[] }>>([]);
  const [flat, setFlat] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("EXPENSE");
  const [parentId, setParentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!runtime) return;
    const [nextTree, nextFlat] = await Promise.all([runtime.categories.listTree(true), runtime.categories.list(true)]);
    setTree(nextTree); setFlat(nextFlat);
    if (parentId && !nextFlat.some((item) => item.id === parentId && item.kind === kind && !item.isArchived)) setParentId(null);
  }, [runtime, parentId, kind]);

  useEffect(() => { void refresh().catch((cause: unknown) => setFailure(cause instanceof Error ? cause.message : "Không thể tải danh mục.")); }, [refresh]);

  async function createCategory() {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null); setMessage(null);
    try { await runtime.categories.create({ name, kind, parentId }); setName(""); setParentId(null); setMessage("Đã tạo danh mục."); await refresh(); }
    catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể tạo danh mục."); }
    finally { setBusy(false); }
  }

  async function saveRename(id: string) {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null); setMessage(null);
    try { await runtime.categories.rename(id, editingName); setEditingId(null); setEditingName(""); setMessage("Đã đổi tên danh mục."); await refresh(); }
    catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể đổi tên danh mục."); }
    finally { setBusy(false); }
  }
  async function archiveCategory(id: string) {
    if (!runtime || busy) return;
    setBusy(true); setFailure(null); setMessage(null);
    try { await runtime.categories.archive(id); setMessage("Đã archive danh mục."); await refresh(); }
    catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể archive danh mục."); }
    finally { setBusy(false); }
  }

  function renderNodes(nodes: Array<Category & { children: Category[] }>, depth = 0): ReactNode {
    return nodes.map((item) => <View key={item.id}>
      <View style={[styles.categoryRow, { paddingLeft: spacing.md + depth * spacing.lg }]}><View style={styles.categoryBody}>{editingId === item.id ? <TextInput accessibilityLabel={`Tên mới cho ${item.name}`} value={editingName} onChangeText={setEditingName} style={styles.input} maxLength={80} /> : <><Text style={styles.categoryName}>{item.name}</Text><Text style={styles.categoryMeta}>{item.kind}{item.isArchived ? " · Đã archive" : ""}</Text></>}</View>{!item.isArchived ? <>{editingId === item.id ? <Pressable accessibilityRole="button" disabled={busy || !editingName.trim()} onPress={() => void saveRename(item.id)} style={styles.archiveButton}><Text style={styles.archiveText}>Lưu</Text></Pressable> : <Pressable accessibilityRole="button" onPress={() => { setEditingId(item.id); setEditingName(item.name); }} style={styles.archiveButton}><Text style={styles.archiveText}>Sửa</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel={`Archive ${item.name}`} disabled={busy} onPress={() => void archiveCategory(item.id)} style={styles.archiveButton}><Text style={styles.archiveText}>Archive</Text></Pressable></> : null}</View>
      {item.children.length > 0 ? renderNodes(item.children as Array<Category & { children: Category[] }>, depth + 1) : null}
    </View>);
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenBackLink />
    <Text style={styles.eyebrow}>PHÂN LOẠI</Text><Text style={styles.title}>Danh mục</Text>
    <Text style={styles.subtitle}>Danh mục độc lập với tài khoản kế toán, có thể tổ chức theo cây cha–con.</Text>
    {loading ? <ActivityIndicator color={colors.primary} /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tạo danh mục</Text>
      <Text style={styles.label}>Tên danh mục</Text>
      <TextInput accessibilityLabel="Tên danh mục" value={name} onChangeText={setName} placeholder="Ví dụ: Ăn uống, Lương" style={styles.input} maxLength={80} />
      <Text style={styles.label}>Loại</Text><View style={styles.options}>{kinds.map((value) => <Option key={value} label={value} selected={kind === value} onPress={() => { setKind(value); setParentId(null); }} />)}</View>
      <Text style={styles.label}>Danh mục cha (không bắt buộc)</Text>
      <View style={styles.options}><Option label="Không có" selected={parentId === null} onPress={() => setParentId(null)} />{flat.filter((item) => item.kind === kind && !item.isArchived).map((item) => <Option key={item.id} label={item.name} selected={parentId === item.id} onPress={() => setParentId(item.id)} />)}</View>
      <Pressable accessibilityRole="button" disabled={busy || !name.trim()} onPress={() => void createCategory()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (busy || !name.trim()) && styles.disabled]}><Text style={styles.primaryButtonText}>{busy ? "Đang lưu…" : "Tạo danh mục"}</Text></Pressable>
      {message ? <Text style={styles.success}>{message}</Text> : null}{failure ? <Text style={styles.error}>{failure}</Text> : null}
    </View>
    <Text style={styles.sectionTitle}>Cây danh mục</Text>
    {tree.length === 0 ? <Text style={styles.empty}>Chưa có danh mục nào.</Text> : renderNodes(tree)}
    <Text style={styles.note}>Danh mục đã archive vẫn được giữ để tra cứu giao dịch cũ. Không thể xóa vĩnh viễn danh mục đã tạo.</Text>
  </ScrollView>;
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
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
  categoryRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  categoryBody: { flex: 1 },
  categoryName: { color: colors.text, fontSize: typography.body, fontWeight: "700" },
  categoryMeta: { marginTop: 3, color: colors.mutedText, fontSize: typography.caption },
  archiveButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 10, backgroundColor: "#FFF2F2" },
  archiveText: { color: "#9B3838", fontSize: typography.caption, fontWeight: "700" },
  empty: { color: colors.mutedText, fontSize: typography.caption, paddingVertical: spacing.md },
  note: { color: colors.mutedText, fontSize: typography.caption, lineHeight: 18 },
  success: { color: colors.primary, fontSize: typography.caption },
  error: { color: "#9B3838", fontSize: typography.caption },
});
