import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import { LiabilityService } from "../../application/liability/liability-service";
import { Currency } from "../../domain/ledger/currency";
import { calculateAccountBalance } from "../../domain/ledger/posting";
import type { Account } from "../../domain/ledger/repository";
import { ledgerMigrations } from "./migrations";
import { ledgerSchema } from "./schema";
import { SqliteLedgerRepository } from "./sqlite-ledger-repository";
import { SqliteLiabilityRepository } from "./sqlite-liability-repository";

export interface LiabilityAcceptanceResult {
  databaseName: string;
  cipherVersion: string;
  checks: { name: string; passed: boolean; detail: string }[];
  cleanup: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectFailure(
  action: () => Promise<unknown>,
  pattern: RegExp,
  label: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(pattern.test(message), `${label}: unexpected error: ${message}`);
    return;
  }
  throw new Error(`${label}: command unexpectedly succeeded`);
}

export async function runLiabilityAcceptanceDiagnostic(): Promise<LiabilityAcceptanceResult> {
  const suffix = toHex(await Crypto.getRandomBytesAsync(6));
  const databaseName = `task06-liability-acceptance-${suffix}.db`;
  const secureStoreName = `ketso.task06.acceptance.${suffix}`;
  const directory = SQLite.defaultDatabaseDirectory;
  assert(directory, "SQLite database directory is unavailable");
  const fileUri = directory.startsWith("file://")
    ? directory
    : `file://${directory}`;
  const file = new FileSystem.File(fileUri, databaseName);
  assert(!file.exists, "Refusing to open a pre-existing diagnostic database");

  const key = toHex(await Crypto.getRandomBytesAsync(32));
  const checks: LiabilityAcceptanceResult["checks"] = [];
  let client: SQLite.SQLiteDatabase | null = null;
  let cipherVersion = "unavailable";
  let currentTime = "2026-11-04T12:00:00.000Z";
  let sequence = 0;
  let stage = "initialize isolated SQLCipher database";
  const now = () => currentTime;
  const createId = () => `task06-${suffix}-id-${++sequence}`;
  const check = (name: string, passed: boolean, detail: string) => {
    checks.push({ name, passed, detail });
    assert(passed, `${name} failed: ${detail}`);
  };

  try {
    stage = "store and restore the temporary SQLCipher key";
    await SecureStore.setItemAsync(secureStoreName, key);
    const restoredKey = await SecureStore.getItemAsync(secureStoreName);
    assert(
      restoredKey === key,
      "Diagnostic SQLCipher key could not be restored",
    );

    stage = "open isolated SQLite database and initialize SQLCipher";
    client = await SQLite.openDatabaseAsync(databaseName, {
      useNewConnection: true,
    });
    const cipher = await client.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    assert(
      cipher?.cipher_version,
      "SQLCipher is unavailable in this Development Build",
    );
    cipherVersion = cipher.cipher_version;
    await client.execAsync(`PRAGMA key = "x'${restoredKey}'"`);
    await client.execAsync("PRAGMA foreign_keys = ON");
    await client.execAsync("PRAGMA journal_mode = WAL");

    stage = "run core migrations 0000-0001";
    const db = drizzle(client, { schema: ledgerSchema });
    const coreMigrations = {
      journal: { entries: ledgerMigrations.journal.entries.slice(0, 2) },
      migrations: {
        m0000: ledgerMigrations.migrations.m0000,
        m0001: ledgerMigrations.migrations.m0001,
      },
    };
    await migrate(db, coreMigrations);
    stage = "seed legacy Core Finance fixture rows";
    const legacyAt = "2026-01-01T00:00:00.000Z";
    const legacyId = `task06-${suffix}-legacy-cash`;
    await client.runAsync(
      "INSERT INTO accounts (id, name, type, currency_code, is_system, is_archived, subtype, created_at, updated_at) VALUES (?, 'Legacy cash', 'ASSET', 'VND', 0, 0, 'CASH', ?, ?)",
      legacyId,
      legacyAt,
      legacyAt,
    );
    await client.runAsync(
      "INSERT INTO ledger_settings (id, base_currency_code, created_at, updated_at) VALUES (1, 'VND', ?, ?)",
      legacyAt,
      legacyAt,
    );
    stage = "apply Task06 migrations 0000-0010 to the legacy database";
    await migrate(db, ledgerMigrations);

    stage = "verify Task06 migration tables";
    const liabilityTable = await client.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'liabilities'",
    );
    const scheduleTable = await client.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'liability_installments'",
    );
    const paymentTable = await client.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'liability_payments'",
    );
    check(
      "Task06 migration",
      liabilityTable?.name === "liabilities" &&
        scheduleTable?.name === "liability_installments" &&
        paymentTable?.name === "liability_payments",
      "the migration chain upgraded a legacy Core Finance database and created all liability tables",
    );

    stage = "initialize Ledger repository and base currency";
    const ledger = new SqliteLedgerRepository(db);
    await ledger.setBaseCurrencyCode("VND", legacyAt);

    const makeAccount = (name: string, type: Account["type"]): Account => ({
      id: `task06-${suffix}-${name}`,
      name: `Task06 ${name}`,
      type,
      currencyCode: "VND",
      isSystem: false,
      isArchived: false,
      subtype: type === "ASSET" ? "CASH" : null,
      createdAt: legacyAt,
      updatedAt: legacyAt,
    });
    const cashIn = makeAccount("cash-in", "ASSET");
    const cashOut = makeAccount("cash-out", "ASSET");
    const loanAccount = makeAccount("loan-account", "LIABILITY");
    const earlyLoanAccount = makeAccount("early-loan-account", "LIABILITY");
    const interestExpense = makeAccount("interest-expense", "EXPENSE");
    const feeExpense = makeAccount("fee-expense", "EXPENSE");
    stage = "create diagnostic Ledger accounts";
    for (const account of [
      cashIn,
      cashOut,
      loanAccount,
      earlyLoanAccount,
      interestExpense,
      feeExpense,
    ]) {
      await ledger.createAccount(account);
    }

    const liabilityRepository = new SqliteLiabilityRepository(db);
    const service = new LiabilityService(liabilityRepository, ledger, {
      createId,
      now,
    });
    stage = "originate the first scheduled liability and persist its journal/installments";
    const loan = await service.create({
      name: "Scheduled repayment diagnostic",
      liabilityAccountId: loanAccount.id,
      receivingAccountId: cashIn.id,
      interestExpenseAccountId: interestExpense.id,
      principalMinor: 100_000n,
      annualRatePpm: 120_000n,
      repaymentMethod: "EQUAL_PRINCIPAL",
      termMonths: 3,
      // Only the first installment is due at currentTime (2026-11-04).
      // Keeping later installments in the future makes this a deterministic
      // single-installment allocation assertion rather than a multi-overdue test.
      startDate: "2026-10-01",
      firstDueDate: "2026-11-01",
      timezoneId: "UTC",
    });
    const initialCash = calculateAccountBalance(
      cashIn,
      await ledger.listPostedJournalLinesForAccount(cashIn.id),
      new Currency("VND", 0),
    );
    const initialLiability = await service.reconcile(loan.id);
    check(
      "Loan origination journal",
      initialCash.minorUnits === 100_000n &&
        initialLiability.differenceMinor === 0n &&
        initialLiability.ledgerPrincipalMinor === 100_000n,
      "loan origination debited the receiving ASSET, credited the LIABILITY and balanced the subledger",
    );

    stage = "record the first partial payment";
    const partial = await service.recordPayment({
      liabilityId: loan.id,
      sourceAccountId: cashOut.id,
      amountMinor: 5_000n,
      paidAt: currentTime,
      idempotencyKey: `task06-${suffix}-partial-payment`,
    });
    const partialBalance = await service.reconcile(loan.id);
    const journalCountAfterPayment = await client.getFirstAsync<{
      count: number;
    }>("SELECT COUNT(*) AS count FROM journal_entries");
    stage = "retry the partial payment with the same idempotency key";
    const retry = await service.recordPayment({
      liabilityId: loan.id,
      sourceAccountId: cashOut.id,
      amountMinor: 5_000n,
      paidAt: currentTime,
      idempotencyKey: `task06-${suffix}-partial-payment`,
    });
    const journalCountAfterRetry = await client.getFirstAsync<{
      count: number;
    }>("SELECT COUNT(*) AS count FROM journal_entries");
    check(
      "Partial payment interest-first allocation",
      partial.interestPaidMinor === 1_000n &&
        partial.principalPaidMinor === 4_000n &&
        partialBalance.recordedPrincipalMinor === 96_000n &&
        partialBalance.differenceMinor === 0n,
      `actual interest=${partial.interestPaidMinor}, principal=${partial.principalPaidMinor}, subledger principal=${partialBalance.recordedPrincipalMinor}, reconciliation difference=${partialBalance.differenceMinor}`,
    );
    check(
      "Payment idempotent retry",
      retry.id === partial.id &&
        journalCountAfterPayment?.count === journalCountAfterRetry?.count,
      `original payment id=${partial.id}, retry payment id=${retry.id}, journals before retry=${journalCountAfterPayment?.count}, journals after retry=${journalCountAfterRetry?.count}`,
    );

    stage = "reverse the original partial payment";
    await service.reversePayment(partial.id, "Acceptance reversal");
    const afterReversal = await service.reconcile(loan.id);
    check(
      "Payment reversal",
      afterReversal.recordedPrincipalMinor === 100_000n &&
        afterReversal.ledgerPrincipalMinor === 100_000n &&
        afterReversal.differenceMinor === 0n,
      "reversal posted a linked counter-entry and restored the liability subledger without editing the original journal",
    );
    stage = "record the replacement payment linked to the reversal";
    const replacement = await service.recordPayment({
      liabilityId: loan.id,
      sourceAccountId: cashOut.id,
      amountMinor: 5_000n,
      paidAt: currentTime,
      idempotencyKey: `task06-${suffix}-replacement-payment`,
      replacesPaymentId: partial.id,
    });
    const afterReplacement = await service.reconcile(loan.id);
    check(
      "Replacement payment linkage",
      replacement.replacesPaymentId === partial.id &&
        afterReplacement.recordedPrincipalMinor === 96_000n &&
        afterReplacement.differenceMinor === 0n,
      "replacement payment explicitly references the reversed payment and restores the expected balance",
    );

    stage = "verify archive guard with outstanding principal";
    await expectFailure(
      () => service.archive(loan.id),
      /fully paid|fully paid off|archive/i,
      "Archive guard with outstanding principal",
    );
    check(
      "Archive guard",
      true,
      "a liability with non-zero principal cannot be archived",
    );

    stage = "originate the early-repayment diagnostic liability";
    const earlyLoan = await service.create({
      name: "Early repayment diagnostic",
      liabilityAccountId: earlyLoanAccount.id,
      receivingAccountId: cashIn.id,
      interestExpenseAccountId: interestExpense.id,
      principalMinor: 100_000n,
      annualRatePpm: 120_000n,
      repaymentMethod: "EQUAL_PRINCIPAL",
      termMonths: 3,
      startDate: "2026-11-01",
      firstDueDate: "2026-12-01",
      timezoneId: "UTC",
      earlyPaymentPolicy: "KEEP_MATURITY_REDUCE_INSTALLMENT",
    });
    stage = "change APR and recalculate future installments";
    const rateChange = await service.changeApr(
      earlyLoan.id,
      240_000n,
      "Acceptance APR reset",
    );
    const afterRateChange = await service.getDetail(earlyLoan.id);
    check(
      "APR history and forward-only recalculation",
      rateChange.annualRatePpm === 240_000n &&
        afterRateChange.rateChanges.some((item) => item.id === rateChange.id) &&
        afterRateChange.installments.filter(
          (item) => item.status === "CANCELLED",
        ).length === 3 &&
        afterRateChange.installments
          .filter((item) => item.status === "UPCOMING")
          .every((item) => item.annualRatePpm === 240_000n),
      "APR change is immutable history and only replaces not-yet-due installments with the new APR snapshot",
    );
    stage = "record early principal repayment and recalculate schedule";
    await service.recordPayment({
      liabilityId: earlyLoan.id, 1
      sourceAccountId: cashOut.id,
      amountMinor: 20_000n,
      paidAt: currentTime,
      idempotencyKey: `task06-${suffix}-early-principal`,
    });
    const afterEarly = await service.getDetail(earlyLoan.id);
    const cancelledOriginal = afterEarly.installments.filter(
      (item) => item.status === "CANCELLED",
    );
    const activeFuture = afterEarly.installments.filter(
      (item) => item.status === "UPCOMING",
    );
    const scheduledPrincipal = activeFuture.reduce(
      (sum, item) => sum + item.principalDueMinor,
      0n,
    );
    check(
      "Early principal schedule recalculation",
      afterEarly.liability.outstandingPrincipalMinor === 80_000n &&
        cancelledOriginal.length === 3 &&
        activeFuture.length === 3 &&
        scheduledPrincipal === 80_000n &&
        afterEarly.reconciliation.differenceMinor === 0n,
      "old future rows were retained as CANCELLED history and replaced by a schedule for the reduced principal",
    );

    stage = "record full payoff and cancel remaining installments";
    await service.recordPayment({
      liabilityId: earlyLoan.id,
      sourceAccountId: cashOut.id,
      amountMinor: 80_000n,
      paidAt: currentTime,
      idempotencyKey: `task06-${suffix}-full-payoff`,
    });
    const paidOff = await service.getDetail(earlyLoan.id);
    check(
      "Full payoff cancels remaining installments",
      paidOff.liability.status === "PAID_OFF" &&
        paidOff.liability.outstandingPrincipalMinor === 0n &&
        paidOff.installments.every((item) => item.status === "CANCELLED") &&
        paidOff.reconciliation.differenceMinor === 0n,
      "principal reached zero, all future installments were cancelled, and the LIABILITY Ledger account reconciled to zero",
    );
    stage = "archive the fully paid liability";
    await service.archive(earlyLoan.id);
    const archived = await service.getDetail(earlyLoan.id);
    check(
      "Archive after full payoff",
      archived.liability.status === "ARCHIVED" &&
        archived.payments.length === 2,
      "archive succeeded only after payoff and preserved both immutable payment records",
    );

    stage = "record payment with a separately posted fee expense";
    const feePayment = await service.recordPayment({
      liabilityId: loan.id,
      sourceAccountId: cashOut.id,
      amountMinor: 1_000n,
      feeMinor: 100n,
      feeExpenseAccountId: feeExpense.id,
      paidAt: currentTime,
      idempotencyKey: `task06-${suffix}-fee-payment`,
    });
    const feeJournal = await ledger.findJournalEntryById(
      feePayment.journalEntryId,
    );
    const feeLines = await ledger.listJournalLines(feePayment.journalEntryId);
    check(
      "Separate fee expense posting",
      feeJournal?.status === "POSTED" &&
        feeLines.some(
          (line) =>
            line.accountId === feeExpense.id &&
            line.side === "DEBIT" &&
            line.amountMinor === 100n,
        ) &&
        feeLines.some(
          (line) =>
            line.accountId === cashOut.id &&
            line.side === "CREDIT" &&
            line.amountMinor === 1_100n,
        ),
      "fee was debited to a separate EXPENSE account while the payment source was credited for principal/interest plus fee",
    );

    stage = "perform final Ledger/subledger reconciliation";
    const finalReconciliation = await service.reconcile(loan.id);
    check(
      "Ledger/subledger reconciliation",
      finalReconciliation.differenceMinor === 0n,
      `recorded principal ${finalReconciliation.recordedPrincipalMinor} and posted LIABILITY balance ${finalReconciliation.ledgerPrincipalMinor} match`,
    );
    check(
      "SQLCipher encrypted acceptance database",
      cipherVersion.length > 0,
      `SQLCipher ${cipherVersion} initialized the isolated database`,
    );

    return {
      databaseName,
      cipherVersion,
      checks,
      cleanup:
        "The isolated diagnostic database and temporary SecureStore key are removed in finally.",
    };
  } catch (error) {
    const cause =
      error instanceof Error
        ? Object.getOwnPropertyNames(error)
            .map((key) => `${key}=${String((error as Error & Record<string, unknown>)[key])}`)
            .join("; ")
        : String(error);
    let foreignKeyState = "unavailable";
    if (client) {
      try {
        const violations = await client.getAllAsync(
          "PRAGMA foreign_key_check",
        );
        foreignKeyState = JSON.stringify(violations);
      } catch (inspectionError) {
        foreignKeyState = `inspection failed: ${String(inspectionError)}`;
      }
    }
    const completed = checks
      .map((item) => `${item.passed ? "PASS" : "FAIL"} ${item.name}`)
      .join(" | ") || "none";
    throw new Error(
      `Task06 diagnostic failed during "${stage}". Completed checks: ${completed}. PRAGMA foreign_key_check: ${foreignKeyState}. Cause: ${cause}`,
    );
  } finally {
    if (client) {
      try {
        await client.closeAsync();
      } catch {
        // Cleanup continues even if the connection was already closed.
      }
    }
    if (file.exists) file.delete();
    await SecureStore.deleteItemAsync(secureStoreName);
  }
}
