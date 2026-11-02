import { Currency } from "../domain/ledger/currency";
import {
  calculateAccountBalance,
  normalBalanceOf,
  validateDraftForPosting,
} from "../domain/ledger/posting";
import type {
  Account,
  JournalEntry,
  JournalLine,
} from "../domain/ledger/repository";

const timestamp = "2026-11-03T00:00:00.000Z";
const vnd = new Currency("VND", 0);
const cash: Account = {
  id: "cash",
  name: "Cash",
  type: "ASSET",
  currencyCode: "VND",
  isSystem: false,
  isArchived: false,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const income: Account = {
  ...cash,
  id: "salary",
  name: "Salary",
  type: "INCOME",
};
const entry: JournalEntry = {
  id: "entry-1",
  occurredAt: timestamp,
  description: "Salary",
  status: "DRAFT",
  baseCurrencyCode: "VND",
  idempotencyKey: null,
  reversalOfId: null,
  createdAt: timestamp,
  postedAt: null,
};
const line = (
  id: string,
  lineNumber: number,
  account: Account,
  side: "DEBIT" | "CREDIT",
  amountMinor: bigint,
): JournalLine => ({
  id,
  entryId: entry.id,
  lineNumber,
  accountId: account.id,
  currencyCode: account.currencyCode,
  side,
  amountMinor,
  fxRateNumerator: "1",
  fxRateDenominator: "1",
  baseAmountMinor: amountMinor,
  memo: null,
  createdAt: timestamp,
});
const context = {
  accounts: new Map([
    [cash.id, cash],
    [income.id, income],
  ]),
  currencies: new Map([
    ["VND", { code: "VND", minorUnit: 0, isActive: true }],
    ["USD", { code: "USD", minorUnit: 2, isActive: true }],
  ]),
};

describe("accounting posting invariants", () => {
  it("defines normal balance sides for all account types", () => {
    expect(normalBalanceOf("ASSET")).toBe("DEBIT");
    expect(normalBalanceOf("EXPENSE")).toBe("DEBIT");
    expect(normalBalanceOf("LIABILITY")).toBe("CREDIT");
    expect(normalBalanceOf("EQUITY")).toBe("CREDIT");
    expect(normalBalanceOf("INCOME")).toBe("CREDIT");
  });

  it("accepts a balanced draft and recomputes base amounts", () => {
    expect(() =>
      validateDraftForPosting(
        entry,
        [
          line("line-1", 1, cash, "DEBIT", 2_000_000n),
          line("line-2", 2, income, "CREDIT", 2_000_000n),
        ],
        context,
      ),
    ).not.toThrow();
  });

  it("rejects an unbalanced draft", () => {
    expect(() =>
      validateDraftForPosting(
        entry,
        [
          line("line-1", 1, cash, "DEBIT", 2_000_000n),
          line("line-2", 2, income, "CREDIT", 1_900_000n),
        ],
        context,
      ),
    ).toThrow(/not balanced/);
  });

  it("rejects a forged converted base amount", () => {
    const forged = {
      ...line("line-2", 2, income, "CREDIT", 2_000_000n),
      baseAmountMinor: 1n,
    };
    expect(() =>
      validateDraftForPosting(
        entry,
        [line("line-1", 1, cash, "DEBIT", 2_000_000n), forged],
        context,
      ),
    ).toThrow(/does not match/);
  });

  it("rejects a line whose account currency differs", () => {
    const mismatched = {
      ...line("line-2", 2, income, "CREDIT", 2_000_000n),
      currencyCode: "USD",
    };
    expect(() =>
      validateDraftForPosting(
        entry,
        [line("line-1", 1, cash, "DEBIT", 2_000_000n), mismatched],
        context,
      ),
    ).toThrow(/match its account currency/);
  });

  it("calculates debit-normal and credit-normal account balances", () => {
    const debitBalance = calculateAccountBalance(
      cash,
      [
        line("line-1", 1, cash, "DEBIT", 2_000n),
        line("line-2", 2, cash, "CREDIT", 500n),
      ],
      vnd,
    );
    const creditBalance = calculateAccountBalance(
      income,
      [
        line("line-3", 1, income, "CREDIT", 2_000n),
        line("line-4", 2, income, "DEBIT", 500n),
      ],
      vnd,
    );
    expect(debitBalance.minorUnits).toBe(1_500n);
    expect(creditBalance.minorUnits).toBe(1_500n);
    expect(debitBalance.currency.code).toBe("VND");
    expect(debitBalance.currency.minorUnit).toBe(0);
  });
});
