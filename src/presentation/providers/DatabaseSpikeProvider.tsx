import { createContext, useContext, type PropsWithChildren } from "react";

type DatabaseSpikeRunner = () => Promise<string>;

const DatabaseSpikeContext = createContext<DatabaseSpikeRunner | null>(null);
const FileDiagnosticContext = createContext<DatabaseSpikeRunner | null>(null);
const KeyLossDiagnosticContext = createContext<DatabaseSpikeRunner | null>(
  null,
);

export function DatabaseSpikeProvider({
  run,
  runFileDiagnostic,
  runKeyLossDiagnostic,
  children,
}: PropsWithChildren<{
  run: DatabaseSpikeRunner;
  runFileDiagnostic: DatabaseSpikeRunner;
  runKeyLossDiagnostic: DatabaseSpikeRunner;
}>) {
  return (
    <DatabaseSpikeContext.Provider value={run}>
      <FileDiagnosticContext.Provider value={runFileDiagnostic}>
        <KeyLossDiagnosticContext.Provider value={runKeyLossDiagnostic}>
          {children}
        </KeyLossDiagnosticContext.Provider>
      </FileDiagnosticContext.Provider>
    </DatabaseSpikeContext.Provider>
  );
}

export function useSqlCipherKeyLossDiagnostic(): DatabaseSpikeRunner {
  const runner = useContext(KeyLossDiagnosticContext);
  if (!runner) {
    throw new Error("SQLCipher key-loss diagnostic is not configured.");
  }
  return runner;
}

export function useDatabaseSpike(): DatabaseSpikeRunner {
  const runner = useContext(DatabaseSpikeContext);
  if (!runner) {
    throw new Error("Database spike runner is not configured.");
  }
  return runner;
}

export function useSqlCipherFileDiagnostic(): DatabaseSpikeRunner {
  const runner = useContext(FileDiagnosticContext);
  if (!runner) {
    throw new Error("SQLCipher file diagnostic is not configured.");
  }
  return runner;
}
