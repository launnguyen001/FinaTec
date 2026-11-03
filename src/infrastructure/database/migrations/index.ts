import { migration0000 } from "./0000_ledger_foundation";
import { migration0001 } from "./0001_core_finance";
import { migration0002 } from "./0002_asset_management";
import { migration0003 } from "./0003_asset_remaining_cost_basis";
import { migration0004 } from "./0004_usdt_currency_code";
import { migration0005 } from "./0005_interest_engine";
import { migration0006 } from "./0006_liability_management";
import { migration0007 } from "./0007_liability_rate_history";
import { migration0008 } from "./0008_liability_fx_snapshots";
import { migration0009 } from "./0009_liability_payment_corrections";
import { migration0010 } from "./0010_liability_payment_order";

const migrationTime = 1_793_520_000_000;
const coreFinanceMigrationTime = 1_793_700_000_000;
const assetManagementMigrationTime = 1_793_800_000_000;
const assetRemainingCostBasisMigrationTime = 1_793_900_000_000;
const usdtCurrencyMigrationTime = 1_794_000_000_000;
const interestEngineMigrationTime = 1_794_100_000_000;
const liabilityManagementMigrationTime = 1_794_200_000_000;
const liabilityRateHistoryMigrationTime = 1_794_300_000_000;
const liabilityFxSnapshotMigrationTime = 1_794_400_000_000;
const liabilityPaymentCorrectionMigrationTime = 1_794_500_000_000;
const liabilityPaymentOrderMigrationTime = 1_794_600_000_000;

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
      {
        idx: 4,
        when: usdtCurrencyMigrationTime,
        tag: "0004_usdt_currency_code",
        breakpoints: true,
      },
      {
        idx: 5,
        when: interestEngineMigrationTime,
        tag: "0005_interest_engine",
        breakpoints: true,
      },
      {
        idx: 6,
        when: liabilityManagementMigrationTime,
        tag: "0006_liability_management",
        breakpoints: true,
      },
      {
        idx: 7,
        when: liabilityRateHistoryMigrationTime,
        tag: "0007_liability_rate_history",
        breakpoints: true,
      },
      {
        idx: 8,
        when: liabilityFxSnapshotMigrationTime,
        tag: "0008_liability_fx_snapshots",
        breakpoints: true,
      },
      {
        idx: 9,
        when: liabilityPaymentCorrectionMigrationTime,
        tag: "0009_liability_payment_corrections",
        breakpoints: true,
      },
      {
        idx: 10,
        when: liabilityPaymentOrderMigrationTime,
        tag: "0010_liability_payment_order",
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000: migration0000,
    m0001: migration0001,
    m0002: migration0002,
    m0003: migration0003,
    m0004: migration0004,
    m0005: migration0005,
    m0006: migration0006,
    m0007: migration0007,
    m0008: migration0008,
    m0009: migration0009,
    m0010: migration0010,
  },
};
