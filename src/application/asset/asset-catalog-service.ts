import type { AssetRepository } from "../../domain/asset/repository";

export interface AssetCatalogServiceOptions {
  now: () => string;
  createId: () => string;
}

export class AssetCatalogService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly options: AssetCatalogServiceOptions,
  ) {}

  async createAssetType(input: {
    name: string;
    assetClass: "CRYPTO" | "METAL" | "STOCK" | "OTHER";
    valuationModel: "STABLE_VALUE" | "MARKET_VALUED";
    unitCode: string;
    quantityPrecision: number;
    pricePrecision: number;
    quoteCurrency: string;
  }) {
    const name = input.name.trim();
    const unitCode = input.unitCode.trim().toUpperCase();
    if (!name || !unitCode) {
      throw new Error("Asset type name and unit code are required");
    }
    if (
      !Number.isInteger(input.quantityPrecision) ||
      input.quantityPrecision < 0 ||
      input.quantityPrecision > 12 ||
      !Number.isInteger(input.pricePrecision) ||
      input.pricePrecision < 0 ||
      input.pricePrecision > 12
    ) {
      throw new Error("Asset precision must be an integer between 0 and 12");
    }
    const quoteCurrency = input.quoteCurrency.trim().toUpperCase();
    if (input.assetClass === "CRYPTO" && quoteCurrency !== "USDT") {
      throw new Error(
        "Crypto asset types must use USDT as their quote currency",
      );
    }
    const now = this.options.now();
    return this.assets.createAssetType({
      id: this.options.createId(),
      name,
      assetClass: input.assetClass,
      valuationModel: input.valuationModel,
      unitCode,
      quantityPrecision: input.quantityPrecision,
      pricePrecision: input.pricePrecision,
      quoteCurrency,
      createdAt: now,
      updatedAt: now,
    });
  }

  async createAsset(input: {
    assetTypeId: string;
    name: string;
    symbol: string;
    providerSymbol?: string | null;
  }) {
    const assetType = (await this.assets.listAssetTypes()).find(
      (item) => item.id === input.assetTypeId,
    );
    if (!assetType) throw new Error("Asset type does not exist or is archived");
    const name = input.name.trim();
    const symbol = input.symbol.trim().toUpperCase();
    if (!name || !symbol) throw new Error("Asset name and symbol are required");
    const now = this.options.now();
    return this.assets.createAsset({
      id: this.options.createId(),
      assetTypeId: assetType.id,
      name,
      symbol,
      providerSymbol: input.providerSymbol?.trim() || null,
      quoteCurrency: assetType.quoteCurrency,
      createdAt: now,
      updatedAt: now,
    });
  }

  async archiveAsset(assetId: string) {
    if (!assetId.trim()) throw new Error("Asset id is required");
    await this.assets.archiveAsset(assetId, this.options.now());
  }

  async archiveAssetType(assetTypeId: string) {
    if (!assetTypeId.trim()) throw new Error("Asset type id is required");
    await this.assets.archiveAssetType(assetTypeId, this.options.now());
  }

  listAssetTypes(includeArchived = false) {
    return this.assets.listAssetTypes(includeArchived);
  }

  listAssets(includeArchived = false) {
    return this.assets.listAssets(includeArchived);
  }
}
