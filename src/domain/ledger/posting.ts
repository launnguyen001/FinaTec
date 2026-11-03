import { Currency } from "./currency";
import { FxRate } from "./fx-rate";
import { Money } from "./money";
import type {
  Account,
  AccountType,
  JournalEntry,
  JournalLine,
} from "./repository";

export interface PostingCurrency {
  code: string;
  minorUnit: number;
  isActive: boolean;
}

export interface PostingContext {
  accounts: ReadonlyMap<string, Account>;
  currencies: ReadonlyMap<string, PostingCurrency>;
}

export type NormalBalance = "DEBIT" | "CREDIT";

/** Balances are positive when they follow the account type's normal side. */
export function normalBalanceOf(accountType: AccountType): NormalBalance {
  switch (accountType) {
    case "ASSET":
    case "EXPENSE":
      return "DEBIT";
    case "LIABILITY":
    case "EQUITY":
    case "INCOME":
      return "CREDIT";
  }
}

/**
 * Validates entry metadata and every line before the entry is persisted as
 * POSTED. Each line's base amount is recomputed from its exact FX snapshot;
 * a caller-supplied conversion is never trusted.
 */
export function validateJournalEntry(
  entry: JournalEntry,
  lines: readonly JournalLine[],
  context: PostingContext,
): void {
  if (!entry.id.trim() || !entry.baseCurrencyCode.trim()) {
    throw new Error("Journal entry identity and base currency are required");
  }
  if (entry.status !== "DRAFT" && entry.status !== "POSTED") {
    throw new Error("Journal entry status must be DRAFT or POSTED");
  }
  if (
    (entry.status === "DRAFT" && entry.postedAt !== null) ||
    (entry.status === "POSTED" && entry.postedAt === null)
  ) {
    throw new Error("Journal entry posted timestamp does not match its status");
  }
  if (lines.length < 2) {
    throw new Error("A journal entry must contain at least two lines");
  }

  const baseCurrencyRecord = context.currencies.get(entry.baseCurrencyCode);
  if (!baseCurrencyRecord?.isActive) {
    throw new Error("Entry base currency is missing or inactive");
  }
  const baseCurrency = new Currency(
    baseCurrencyRecord.code,
    baseCurrencyRecord.minorUnit,
  );

  const lineNumbers = new Set<number>();
  const lineIds = new Set<string>();
  let debitTotal = 0n;
  let creditTotal = 0n;
  let hasDebit = false;
  let hasCredit = false;

  for (const line of lines) {
    if (line.entryId !== entry.id) {
      throw new Error(
        "Every journal line must belong to the entry being posted",
      );
    }
    if (!line.id.trim() || lineIds.has(line.id)) {
      throw new Error("Journal line identities must be non-empty and unique");
    }
    lineIds.add(line.id);
    if (
      !Number.isSafeInteger(line.lineNumber) ||
      line.lineNumber <= 0 ||
      lineNumbers.has(line.lineNumber)
    ) {
      throw new Error("Journal line numbers must be unique positive integers");
    }
    lineNumbers.add(line.lineNumber);

    if (line.amountMinor <= 0n) {
      throw new Error("Journal line native amount must be positive");
    }
    if (line.side !== "DEBIT" && line.side !== "CREDIT") {
      throw new Error("Journal line side must be DEBIT or CREDIT");
    }

    const account = context.accounts.get(line.accountId);
    if (!account) {
      throw new Error(`Account does not exist: ${line.accountId}`);
    }
    if (account.isArchived) {
      throw new Error(
        `Archived account cannot receive a new posting: ${line.accountId}`,
      );
    }
    if (account.currencyCode !== line.currencyCode) {
      throw new Error("Journal line currency must match its account currency");
    }

    const nativeCurrencyRecord = context.currencies.get(line.currencyCode);
    if (!nativeCurrencyRecord?.isActive) {
      throw new Error(
        `Line currency is missing or inactive: ${line.currencyCode}`,
      );
    }
    const nativeCurrency = new Currency(
      nativeCurrencyRecord.code,
      nativeCurrencyRecord.minorUnit,
    );

    if (
      !/^[1-9]\d*$/.test(line.fxRateNumerator) ||
      !/^[1-9]\d*$/.test(line.fxRateDenominator)
    ) {
      throw new Error(
        "FX snapshot must contain positive integer numerator and denominator",
      );
    }

    if (line.currencyCode === entry.baseCurrencyCode) {
      if (line.fxRateNumerator !== "1" || line.fxRateDenominator !== "1") {
        throw new Error("Base-currency lines must use FX 1/1");
      }
    }

    const rate = new FxRate(
      BigInt(line.fxRateNumerator),
      BigInt(line.fxRateDenominator),
      nativeCurrency,
      baseCurrency,
    );
    const calculatedBaseAmount = rate.convertToBase(
      new Money(line.amountMinor, nativeCurrency),
    );
    if (calculatedBaseAmount.minorUnits <= 0n) {
      throw new Error("Journal line rounds to zero in the entry base currency");
    }
    if (calculatedBaseAmount.minorUnits !== line.baseAmountMinor) {
      throw new Error(
        "Stored base amount does not match the FX snapshot calculation",
      );
    }

    if (line.side === "DEBIT") {
      debitTotal += calculatedBaseAmount.minorUnits;
      hasDebit = true;
    } else {
      creditTotal += calculatedBaseAmount.minorUnits;
      hasCredit = true;
    }
  }

  if (!hasDebit || !hasCredit) {
    throw new Error(
      "A journal entry must contain at least one DEBIT and one CREDIT",
    );
  }
  if (debitTotal !== creditTotal) {
    throw new Error(
      `Journal entry is not balanced in ${entry.baseCurrencyCode}: debit=${debitTotal}, credit=${creditTotal}`,
    );
  }
}

/**
 * Validates a complete draft before it can transition to POSTED.
 * This is the draft lifecycle guard; balanced posted entries may also be
 * checked directly with {@link validateJournalEntry}.
 */
export function validateDraftForPosting(
  entry: JournalEntry,
  lines: readonly JournalLine[],
  context: PostingContext,
): void {
  if (entry.status !== "DRAFT" || entry.postedAt !== null) {
    throw new Error("Only a DRAFT journal entry can be posted");
  }
  validateJournalEntry(entry, lines, context);
}

/**
 * Returns the account's native-currency balance, positive on its normal
 * balance side and negative when it has a contra-balance.
 */
export function calculateAccountBalance(
  account: Pick<Account, "id" | "type" | "currencyCode">,
  postedLines: readonly JournalLine[],
  currency: Currency,
): Money {
  if (currency.code !== account.currencyCode) {
    throw new Error("Balance currency must match account currency");
  }
  const normalSide = normalBalanceOf(account.type);
  let balance = 0n;

  for (const line of postedLines) {
    if (line.accountId !== account.id) continue;
    if (line.currencyCode !== account.currencyCode) {
      throw new Error(
        "Account balance contains a line in a different currency",
      );
    }
    if (line.amountMinor <= 0n) {
      throw new Error(
        "Account balance cannot include a non-positive journal line",
      );
    }
    balance += line.side === normalSide ? line.amountMinor : -line.amountMinor;
  }

  return new Money(balance, currency);
}
