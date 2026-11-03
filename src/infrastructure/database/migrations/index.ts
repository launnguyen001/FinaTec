import { migration0000 } from "./0000_ledger_foundation";
import { migration0001 } from "./0001_core_finance";

const migrationTime = 1_793_520_000_000;
const coreFinanceMigrationTime = 1_793_700_000_000;

export const ledgerMigrations = {
  journal: {
    entries: [
      { idx: 0, when: migrationTime, tag: "0000_ledger_foundation", breakpoints: true },
      { idx: 1, when: coreFinanceMigrationTime, tag: "0001_core_finance", breakpoints: true },
    ],
  },
  migrations: {
    m0000: migration0000,
    m0001: migration0001,
  },
};
