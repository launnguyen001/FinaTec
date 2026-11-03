import "../infrastructure/background/asset-refresh-task";
import { Stack } from "expo-router";

import { runSqlCipherFileDiagnostic } from "../infrastructure/database/spike/sqlcipher-file-diagnostic";
import { runSqlCipherKeyLossDiagnostic } from "../infrastructure/database/spike/sqlcipher-key-loss-diagnostic";
import { createFinanceRuntime } from "../infrastructure/finance-runtime";
import { DatabaseSpikeProvider } from "../presentation/providers/DatabaseSpikeProvider";
import { FinanceRuntimeProvider } from "../presentation/providers/FinanceRuntimeProvider";

export default function RootLayout() {
  return (
    <DatabaseSpikeProvider
      run={runSqlCipherFileDiagnostic}
      runFileDiagnostic={runSqlCipherFileDiagnostic}
      runKeyLossDiagnostic={runSqlCipherKeyLossDiagnostic}
    >
      <FinanceRuntimeProvider createRuntime={createFinanceRuntime}>
        <Stack screenOptions={{ headerShown: false }} />
      </FinanceRuntimeProvider>
    </DatabaseSpikeProvider>
  );
}
