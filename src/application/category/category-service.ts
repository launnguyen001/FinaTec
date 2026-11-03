import { assertNoCategoryCycle, assertValidCategoryParent, buildCategoryTree, normalizeCategoryName, type Category, type CategoryKind } from "../../domain/category/category";
import type { CategoryRepository } from "../../domain/category/repository";

export interface CategoryServiceOptions {
  createId: () => string;
  now: () => string;
}

export class CategoryService {
  constructor(private readonly repository: CategoryRepository, private readonly options: CategoryServiceOptions) {}

  async create(input: { name: string; kind: CategoryKind; parentId?: string | null }): Promise<Category> {
    const id = this.options.createId();
    const parentId = input.parentId ?? null;
    const parent = parentId ? await this.repository.findById(parentId) : null;
    if (parentId && !parent) throw new Error(`Category parent does not exist: ${parentId}`);
    const candidate = { id, kind: input.kind };
    assertValidCategoryParent(candidate, parent);
    const timestamp = this.options.now();
    return this.repository.create({ id, name: normalizeCategoryName(input.name), kind: input.kind, parentId, createdAt: timestamp, updatedAt: timestamp });
  }

  async rename(id: string, name: string): Promise<Category> {
    const current = await this.requireCategory(id);
    if (current.isArchived) throw new Error("Archived categories cannot be renamed");
    return this.repository.update(id, { name: normalizeCategoryName(name), parentId: current.parentId, updatedAt: this.options.now() });
  }

  async reparent(id: string, parentId: string | null): Promise<Category> {
    const current = await this.requireCategory(id);
    if (current.isArchived) throw new Error("Archived categories cannot be reparented");
    const parent = parentId ? await this.repository.findById(parentId) : null;
    if (parentId && !parent) throw new Error(`Category parent does not exist: ${parentId}`);
    assertValidCategoryParent(current, parent);
    const all = await this.repository.list(true);
    assertNoCategoryCycle(id, parentId, all);
    return this.repository.update(id, { name: current.name, parentId, updatedAt: this.options.now() });
  }

  async archive(id: string): Promise<void> {
    const current = await this.requireCategory(id);
    if (current.isArchived) return;
    const categories = await this.repository.list(false);
    if (categories.some((category) => category.parentId === id)) throw new Error("A category with active children cannot be archived");
    await this.repository.archive(id, this.options.now());
  }

  async listTree(includeArchived = false) {
    return buildCategoryTree(await this.repository.list(includeArchived));
  }

  private async requireCategory(id: string): Promise<Category> {
    const category = await this.repository.findById(id);
    if (!category) throw new Error(`Category does not exist: ${id}`);
    return category;
  }
}
