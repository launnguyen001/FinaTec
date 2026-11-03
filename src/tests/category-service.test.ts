import { CategoryService } from "../application/category/category-service";
import type { Category } from "../domain/category/category";
import type {
  CategoryRepository,
  CreateCategoryRecord,
} from "../domain/category/repository";

class InMemoryCategoryRepository implements CategoryRepository {
  readonly items = new Map<string, Category>();
  async create(input: CreateCategoryRecord): Promise<Category> {
    const value: Category = { ...input, isArchived: false };
    this.items.set(value.id, value);
    return value;
  }
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async list(includeArchived = false) {
    return [...this.items.values()].filter(
      (item) => includeArchived || !item.isArchived,
    );
  }
  async update(
    id: string,
    input: { name: string; parentId: string | null; updatedAt: string },
  ) {
    const current = this.items.get(id);
    if (!current) throw new Error("missing");
    const value = { ...current, ...input };
    this.items.set(id, value);
    return value;
  }
  async archive(id: string, updatedAt: string) {
    const current = this.items.get(id);
    if (current)
      this.items.set(id, { ...current, isArchived: true, updatedAt });
  }
}

describe("CategoryService", () => {
  let repository: InMemoryCategoryRepository;
  let service: CategoryService;
  let nextId: number;
  beforeEach(() => {
    repository = new InMemoryCategoryRepository();
    nextId = 0;
    service = new CategoryService(repository, {
      createId: () => `category-${++nextId}`,
      now: () => "2026-11-03T00:00:00.000Z",
    });
  });

  it("creates an income category tree and returns nested children", async () => {
    const parent = await service.create({ name: "Salary", kind: "INCOME" });
    await service.create({
      name: "Bonus",
      kind: "INCOME",
      parentId: parent.id,
    });
    const tree = await service.listTree();
    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.name).toBe("Bonus");
  });

  it("rejects a parent with a different category kind", async () => {
    const parent = await service.create({ name: "Food", kind: "EXPENSE" });
    await expect(
      service.create({ name: "Salary", kind: "INCOME", parentId: parent.id }),
    ).rejects.toThrow(/same kind/);
  });

  it("rejects hierarchy cycles when reparenting", async () => {
    const parent = await service.create({ name: "Food", kind: "EXPENSE" });
    const child = await service.create({
      name: "Lunch",
      kind: "EXPENSE",
      parentId: parent.id,
    });
    await expect(service.reparent(parent.id, child.id)).rejects.toThrow(
      /cycle/,
    );
  });

  it("updates category name and parent through one validated metadata operation", async () => {
    const firstParent = await service.create({ name: "Food", kind: "EXPENSE" });
    const secondParent = await service.create({
      name: "Living",
      kind: "EXPENSE",
    });
    const child = await service.create({
      name: "Lunch",
      kind: "EXPENSE",
      parentId: firstParent.id,
    });

    const updated = await service.updateMetadata(child.id, {
      name: "Dining",
      parentId: secondParent.id,
    });
    expect(updated).toMatchObject({
      name: "Dining",
      parentId: secondParent.id,
    });

    await expect(
      service.updateMetadata(secondParent.id, {
        name: "Living",
        parentId: child.id,
      }),
    ).rejects.toThrow(/cycle/);
  });

  it("archives without deleting historical category identity", async () => {
    const category = await service.create({ name: "Rent", kind: "EXPENSE" });
    await service.archive(category.id);
    expect(await repository.findById(category.id)).toMatchObject({
      isArchived: true,
      name: "Rent",
    });
    expect(await service.listTree()).toHaveLength(0);
    expect(await service.listTree(true)).toHaveLength(1);
  });
});
