import { migration0000 } from "./0000_ledger_foundation";
import { migration0001 } from "./0001_core_finance";
import { migration0002 } from "./0002_asset_management";
import { migration0003 } from "./0003_asset_remaining_cost_basis";

const migrationTime = 1_793_520_000_000;
const coreFinanceMigrationTime = 1_793_700_000_000;
const assetManagementMigrationTime = 1_793_800_000_000;
const assetRemainingCostBasisMigrationTime = 1_793_900_000_000;

export const ledgerMigrations = {
  journal: {
    entries: [
      {
        idx: 0,
        when: migrationTime,
        tag: "0000_ledger_foundation",
        breakpoints: true,
      },
      {
        idx: 1,
        when: coreFinanceMigrationTime,
        tag: "0001_core_finance",
        breakpoints: true,
      },
      {
        idx: 2,
        when: assetManagementMigrationTime,
        tag: "0002_asset_management",
        breakpoints: true,
      },
      {
        idx: 3,
        when: assetRemainingCostBasisMigrationTime,
        tag: "0003_asset_remaining_cost_basis",
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000: migration0000,
    m0001: migration0001,
    m0002: migration0002,
    m0003: migration0003,
  },
};
