import type { Category, CategoryKind } from "./category";

export interface CreateCategoryRecord {
  id: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRepository {
  create(input: CreateCategoryRecord): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  list(includeArchived?: boolean): Promise<Category[]>;
  update(id: string, input: { name: string; parentId: string | null; updatedAt: string }): Promise<Category>;
  archive(id: string, updatedAt: string): Promise<void>;
}
