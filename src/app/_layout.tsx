import { Stack } from "expo-router";

import { runSqlCipherFileDiagnostic } from "../infrastructure/database/spike/sqlcipher-file-diagnostic";
import { runSqlCipherKeyLossDiagnostic } from "../infrastructure/database/spike/sqlcipher-key-loss-diagnostic";
import { DatabaseSpikeProvider } from "../presentation/providers/DatabaseSpikeProvider";

export default function RootLayout() {
  return (
    <DatabaseSpikeProvider
      run={runSqlCipherFileDiagnostic}
      runFileDiagnostic={runSqlCipherFileDiagnostic}
      runKeyLossDiagnostic={runSqlCipherKeyLossDiagnostic}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </DatabaseSpikeProvider>
  );
}
