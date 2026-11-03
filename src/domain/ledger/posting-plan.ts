import { Currency } from "./currency";
import { FxRate } from "./fx-rate";
import { Money } from "./money";
import { validateJournalEntry, type PostingContext } from "./posting";
import type {
  JournalEntry,
  JournalLine,
  JournalSide,
  JournalStatus,
} from "./repository";

/** A line described in its account's native currency, before FX conversion. */
export interface PostingLineSpec {
  accountId: string;
  side: JournalSide;
  amountMinor: bigint;
  fxRateNumerator: string;
  fxRateDenominator: string;
  memo?: string | null;
}

export interface JournalPostingSpec {
  id: string;
  occurredAt: string;
  description?: string | null;
  status: JournalStatus;
  baseCurrencyCode: string;
  idempotencyKey: string | null;
  reversalOfId: string | null;
  replacementOfId: string | null;
  transactionKind?: import("./repository").TransactionKind;
  categoryId?: string | null;
  createdAt: string;
  postedAt: string | null;
  lines: readonly PostingLineSpec[];
  /** One new identity per line, in the same order as {@link lines}. */
  lineIds: readonly string[];
}

export interface BuiltJournalPosting {
  entry: JournalEntry;
  lines: JournalLine[];
}

/**
 * Resolves the FX snapshot for a new line. A base-currency line must use the
 * identity quote; a non-base line needs an explicit, caller-supplied quote.
 * The snapshot is verified again when the posting is validated.
 */
export function resolveFxSnapshot(
  currencyCode: string,
  baseCurrencyCode: string,
  numerator?: string,
  denominator?: string,
): { numerator: string; denominator: string } {
  if (numerator !== undefined && denominator !== undefined) {
    return { numerator, denominator };
  }
  if (numerator !== undefined || denominator !== undefined) {
    throw new Error("FX snapshot requires both numerator and denominator");
  }
  if (currencyCode === baseCurrencyCode) {
    return { numerator: "1", denominator: "1" };
  }
  throw new Error(
    `An explicit FX snapshot is required for ${currencyCode} when the base currency is ${baseCurrencyCode}`,
  );
}

/**
 * Builds a complete draft or posted entry and recomputes every line's base
 * amount from the supplied FX snapshot. The result is validated as a whole so
 * an invalid posting cannot reach a repository.
 */
export function buildJournalPosting(
  spec: JournalPostingSpec,
  context: PostingContext,
): BuiltJournalPosting {
  if (spec.lines.length !== spec.lineIds.length) {
    throw new Error("Every journal line must receive exactly one identity");
  }

  const baseCurrencyRecord = context.currencies.get(spec.baseCurrencyCode);
  if (!baseCurrencyRecord) {
    throw new Error(
      `Entry base currency does not exist: ${spec.baseCurrencyCode}`,
    );
  }
  const baseCurrency = new Currency(
    baseCurrencyRecord.code,
    baseCurrencyRecord.minorUnit,
  );

  const entry: JournalEntry = {
    id: spec.id,
    occurredAt: spec.occurredAt,
    description: spec.description ?? null,
    status: spec.status,
    baseCurrencyCode: spec.baseCurrencyCode,
    idempotencyKey: spec.idempotencyKey,
    reversalOfId: spec.reversalOfId,
    replacementOfId: spec.replacementOfId,
    transactionKind: spec.transactionKind ?? "LEGACY",
    categoryId: spec.categoryId ?? null,
    createdAt: spec.createdAt,
    postedAt: spec.postedAt,
  };

  const lines: JournalLine[] = spec.lines.map((lineSpec, index) => {
    const account = context.accounts.get(lineSpec.accountId);
    if (!account) {
      throw new Error(`Account does not exist: ${lineSpec.accountId}`);
    }
    const nativeCurrencyRecord = context.currencies.get(account.currencyCode);
    if (!nativeCurrencyRecord) {
      throw new Error(
        `Account currency does not exist: ${account.currencyCode}`,
      );
    }
    const nativeCurrency = new Currency(
      nativeCurrencyRecord.code,
      nativeCurrencyRecord.minorUnit,
    );

    if (
      !/^[1-9]\d*$/.test(lineSpec.fxRateNumerator) ||
      !/^[1-9]\d*$/.test(lineSpec.fxRateDenominator)
    ) {
      throw new Error(
        "FX snapshot must contain positive integer numerator and denominator",
      );
    }

    const rate = new FxRate(
      BigInt(lineSpec.fxRateNumerator),
      BigInt(lineSpec.fxRateDenominator),
      nativeCurrency,
      baseCurrency,
    );
    const baseAmount = rate.convertToBase(
      new Money(lineSpec.amountMinor, nativeCurrency),
    );

    return {
      id: spec.lineIds[index]!,
      entryId: spec.id,
      lineNumber: index + 1,
      accountId: account.id,
      currencyCode: account.currencyCode,
      side: lineSpec.side,
      amountMinor: lineSpec.amountMinor,
      fxRateNumerator: lineSpec.fxRateNumerator,
      fxRateDenominator: lineSpec.fxRateDenominator,
      baseAmountMinor: baseAmount.minorUnits,
      memo: lineSpec.memo ?? null,
      createdAt: spec.createdAt,
    };
  });

  validateJournalEntry(entry, lines, context);

  return { entry, lines };
}
