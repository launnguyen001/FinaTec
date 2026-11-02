import migration0000 from "./0000_ledger_foundation.sql";

const migrationTime = 1_793_520_000_000;

export const ledgerMigrations = {
  journal: {
    entries: [
      {
        idx: 0,
        when: migrationTime,
        tag: "0000_ledger_foundation",
        breakpoints: false,
      },
    ],
  },
  migrations: {
    m0000: migration0000,
  },
};
