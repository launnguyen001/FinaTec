export type CategoryKind = "INCOME" | "EXPENSE";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function normalizeCategoryName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error("Category name is required");
  if (normalized.length > 80) throw new Error("Category name must be at most 80 characters");
  return normalized;
}

export function assertValidCategoryParent(
  category: Pick<Category, "id" | "kind">,
  parent: Category | null,
): void {
  if (!parent) return;
  if (parent.id === category.id) throw new Error("A category cannot be its own parent");
  if (parent.kind !== category.kind) throw new Error("Category parent and child must have the same kind");
  if (parent.isArchived) throw new Error("An archived category cannot be a parent");
}

export function assertNoCategoryCycle(
  categoryId: string,
  parentId: string | null,
  categories: readonly Category[],
): void {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const visited = new Set<string>();
  let currentId = parentId;
  while (currentId !== null) {
    if (currentId === categoryId) throw new Error("Category hierarchy cannot contain a cycle");
    if (visited.has(currentId)) throw new Error("Existing category hierarchy contains a cycle");
    visited.add(currentId);
    currentId = byId.get(currentId)?.parentId ?? null;
  }
}

export function buildCategoryTree(categories: readonly Category[]) {
  const nodes = new Map(categories.map((item) => [item.id, { ...item, children: [] as Category[] }]));
  const roots: Array<Category & { children: Category[] }> = [];
  for (const item of categories) {
    const node = nodes.get(item.id)!;
    if (item.parentId && nodes.has(item.parentId)) nodes.get(item.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}
