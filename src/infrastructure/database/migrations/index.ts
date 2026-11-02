import { migration0000 } from "./0000_ledger_foundation";

const migrationTime = 1_793_520_000_000;

export const ledgerMigrations = {
  journal: {
    entries: [
      {
        idx: 0,
        when: migrationTime,
        tag: "0000_ledger_foundation",
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000: migration0000,
  },
};
