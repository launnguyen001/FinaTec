import { asc, eq } from "drizzle-orm";
import type {
  CategoryRepository,
  CreateCategoryRecord,
} from "../../domain/category/repository";
import type { Category } from "../../domain/category/category";
import type { LedgerDatabase } from "./database";
import { categories } from "./schema";

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly db: LedgerDatabase) {}

  async create(input: CreateCategoryRecord): Promise<Category> {
    await this.db.insert(categories).values({ ...input, isArchived: false });
    const created = await this.findById(input.id);
    if (!created) throw new Error("Category was not persisted");
    return created;
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .get();
    return row ?? null;
  }

  async list(includeArchived = false): Promise<Category[]> {
    const query = this.db
      .select()
      .from(categories)
      .orderBy(asc(categories.kind), asc(categories.name));
    if (includeArchived) return query.all();
    return query.where(eq(categories.isArchived, false)).all();
  }

  async update(
    id: string,
    input: { name: string; parentId: string | null; updatedAt: string },
  ): Promise<Category> {
    await this.db
      .update(categories)
      .set(input)
      .where(eq(categories.id, id))
      .run();
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Category does not exist: ${id}`);
    return updated;
  }

  async archive(id: string, updatedAt: string): Promise<void> {
    await this.db
      .update(categories)
      .set({ isArchived: true, updatedAt })
      .where(eq(categories.id, id))
      .run();
  }
}
