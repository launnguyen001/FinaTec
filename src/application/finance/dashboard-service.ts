import type { FinanceReadRepository } from "../../domain/finance/finance-read-repository";
import type { LedgerRepository } from "../../domain/ledger/repository";
import type { AccountingService } from "../ledger/accounting-service";

export interface CurrencyTotal {
  currencyCode: string;
  amountMinor: bigint;
}
export interface DashboardSummary {
  availableByCurrency: CurrencyTotal[];
  incomeByCurrency: CurrencyTotal[];
  expenseByCurrency: CurrencyTotal[];
  netFlowByCurrency: CurrencyTotal[];
}

function toTotals(values: Map<string, bigint>): CurrencyTotal[] {
  return [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currencyCode, amountMinor]) => ({ currencyCode, amountMinor }));
}

export class DashboardService {
  constructor(
    private readonly ledger: LedgerRepository,
    private readonly accounting: AccountingService,
    private readonly reads: FinanceReadRepository,
  ) {}

  async getSummary(from: string, to: string): Promise<DashboardSummary> {
    if (!from.trim() || !to.trim() || from > to)
      throw new Error("Dashboard date range is invalid");
    const available = new Map<string, bigint>();
    const activeAccounts = (await this.ledger.listAccounts(false)).filter(
      (account) => account.type === "ASSET",
    );
    for (const account of activeAccounts) {
      const balance = await this.accounting.getAccountBalance(account.id);
      available.set(
        account.currencyCode,
        (available.get(account.currencyCode) ?? 0n) + balance.minorUnits,
      );
    }
    const income = new Map<string, bigint>();
    const expense = new Map<string, bigint>();
    const rows = await this.reads.listPostedLinesInRange(from, to);
    for (const row of rows) {
      if (row.accountType === "INCOME") {
        const delta =
          row.line.side === "CREDIT"
            ? row.line.amountMinor
            : -row.line.amountMinor;
        income.set(
          row.line.currencyCode,
          (income.get(row.line.currencyCode) ?? 0n) + delta,
        );
      } else if (row.accountType === "EXPENSE") {
        const delta =
          row.line.side === "DEBIT"
            ? row.line.amountMinor
            : -row.line.amountMinor;
        expense.set(
          row.line.currencyCode,
          (expense.get(row.line.currencyCode) ?? 0n) + delta,
        );
      }
    }
    const net = new Map<string, bigint>();
    for (const code of new Set([...income.keys(), ...expense.keys()]))
      net.set(code, (income.get(code) ?? 0n) - (expense.get(code) ?? 0n));
    return {
      availableByCurrency: toTotals(available),
      incomeByCurrency: toTotals(income),
      expenseByCurrency: toTotals(expense),
      netFlowByCurrency: toTotals(net),
    };
  }
}
