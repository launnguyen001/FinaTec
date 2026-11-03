import { AccountingService } from "../application/ledger/accounting-service";
import type { Account, CurrencyRecord } from "../domain/ledger/repository";
import { InMemoryLedgerRepository } from "./helpers/in-memory-ledger-repository";

const timestamp = "2026-11-03T00:00:00.000Z";

const currencies: CurrencyRecord[] = [
  {
    code: "VND",
    name: "Vietnamese Dong",
    minorUnit: 0,
    isActive: true,
    createdAt: timestamp,
  },
  {
    code: "USD",
    name: "US Dollar",
    minorUnit: 2,
    isActive: true,
    createdAt: timestamp,
  },
];

function account(
  id: string,
  name: string,
  type: Account["type"],
  currencyCode: string,
): Account {
  return {
    id,
    name,
    type,
    currencyCode,
    isSystem: false,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const accounts = {
  cash: account("cash", "Cash", "ASSET", "VND"),
  bank: account("bank", "Bank", "ASSET", "VND"),
  walletUsd: account("wallet-usd", "USD wallet", "ASSET", "USD"),
  salary: account("salary", "Salary", "INCOME", "VND"),
  food: account("food", "Food", "EXPENSE", "VND"),
  openingVnd: account("opening-vnd", "Opening equity VND", "EQUITY", "VND"),
  openingUsd: account("opening-usd", "Opening equity USD", "EQUITY", "USD"),
};

async function createFixture() {
  const repository = new InMemoryLedgerRepository();
  for (const currency of currencies) {
    await repository.createCurrency(currency);
  }
  for (const value of Object.values(accounts)) {
    await repository.createAccount(value);
  }
  await repository.setBaseCurrencyCode("VND");

  let nextId = 0;
  const service = new AccountingService(repository, {
    createId: () => `id-${++nextId}`,
    now: () => timestamp,
  });
  return { repository, service };
}

describe("accounting use cases", () => {
  it("creates a positive opening balance against equity", async () => {
    const { repository, service } = await createFixture();

    const result = await service.createOpeningBalance({
      idempotencyKey: "opening-1",
      accountId: accounts.cash.id,
      offsetAccountId: accounts.openingVnd.id,
      amountMinor: 5_000_000n,
    });

    expect(result.created).toBe(true);
    expect(result.entry.status).toBe("POSTED");
    expect(result.entry.reversalOfId).toBeNull();
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]).toMatchObject({
      accountId: accounts.cash.id,
      side: "DEBIT",
      amountMinor: 5_000_000n,
      baseAmountMinor: 5_000_000n,
    });
    expect(result.lines[1]).toMatchObject({
      accountId: accounts.openingVnd.id,
      side: "CREDIT",
      amountMinor: 5_000_000n,
    });

    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      5_000_000n,
    );
    expect(
      (await service.getAccountBalance(accounts.openingVnd.id)).minorUnits,
    ).toBe(5_000_000n);
    expect(repository.entries.size).toBe(1);
  });

  it("records a negative opening balance as an approved contra posting", async () => {
    const { service } = await createFixture();

    const result = await service.createOpeningBalance({
      idempotencyKey: "opening-negative",
      accountId: accounts.cash.id,
      offsetAccountId: accounts.openingVnd.id,
      amountMinor: -2_000_000n,
    });

    expect(result.lines[0]).toMatchObject({
      accountId: accounts.cash.id,
      side: "CREDIT",
      amountMinor: 2_000_000n,
    });
    expect(result.lines[1]).toMatchObject({
      accountId: accounts.openingVnd.id,
      side: "DEBIT",
      amountMinor: 2_000_000n,
    });
    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      -2_000_000n,
    );
  });

  it("returns the original opening result for a retried command", async () => {
    const { repository, service } = await createFixture();
    const input = {
      idempotencyKey: "opening-retry",
      accountId: accounts.cash.id,
      offsetAccountId: accounts.openingVnd.id,
      amountMinor: 1_000_000n,
    };

    const first = await service.createOpeningBalance(input);
    const second = await service.createOpeningBalance({
      ...input,
      amountMinor: 9_000_000n,
    });

    expect(second.created).toBe(false);
    expect(second.entry.id).toBe(first.entry.id);
    expect(second.lines).toEqual(first.lines);
    expect(repository.entries.size).toBe(1);
    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      1_000_000n,
    );
  });

  it("transfers between same-currency asset accounts without income or expense", async () => {
    const { repository, service } = await createFixture();
    await service.createOpeningBalance({
      idempotencyKey: "opening-transfer",
      accountId: accounts.cash.id,
      offsetAccountId: accounts.openingVnd.id,
      amountMinor: 10_000_000n,
    });

    const transfer = await service.transferFunds({
      idempotencyKey: "transfer-1",
      fromAccountId: accounts.cash.id,
      toAccountId: accounts.bank.id,
      amountMinor: 3_000_000n,
    });

    expect(transfer.lines).toHaveLength(2);
    expect(transfer.lines[0]).toMatchObject({
      accountId: accounts.cash.id,
      side: "CREDIT",
      amountMinor: 3_000_000n,
    });
    expect(transfer.lines[1]).toMatchObject({
      accountId: accounts.bank.id,
      side: "DEBIT",
      amountMinor: 3_000_000n,
    });
    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      7_000_000n,
    );
    expect((await service.getAccountBalance(accounts.bank.id)).minorUnits).toBe(
      3_000_000n,
    );

    const touchedTypes = new Set(
      [...repository.linesByEntry.values()]
        .flat()
        .map((line) => repository.accounts.get(line.accountId)?.type),
    );
    expect(touchedTypes.has("INCOME")).toBe(false);
    expect(touchedTypes.has("EXPENSE")).toBe(false);
  });

  it("supports a balanced cross-currency transfer with explicit snapshots", async () => {
    const { service } = await createFixture();
    await service.createOpeningBalance({
      idempotencyKey: "opening-usd",
      accountId: accounts.walletUsd.id,
      offsetAccountId: accounts.openingUsd.id,
      amountMinor: 10_000n,
      fxRateNumerator: "254505",
      fxRateDenominator: "10",
    });

    const transfer = await service.transferFunds({
      idempotencyKey: "transfer-cross-currency",
      fromAccountId: accounts.walletUsd.id,
      toAccountId: accounts.cash.id,
      amountMinor: 5_000n,
      toAmountMinor: 1_272_525n,
      fxRateNumerator: "254505",
      fxRateDenominator: "10",
    });

    expect(transfer.lines[0]).toMatchObject({
      accountId: accounts.walletUsd.id,
      side: "CREDIT",
      amountMinor: 5_000n,
      baseAmountMinor: 1_272_525n,
    });
    expect(transfer.lines[1]).toMatchObject({
      accountId: accounts.cash.id,
      side: "DEBIT",
      amountMinor: 1_272_525n,
      baseAmountMinor: 1_272_525n,
    });
    expect(
      (await service.getAccountBalance(accounts.walletUsd.id)).minorUnits,
    ).toBe(5_000n);
    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      1_272_525n,
    );
  });

  it("rejects a cross-currency transfer that is off by one base minor unit", async () => {
    const { repository, service } = await createFixture();
    await service.createOpeningBalance({
      idempotencyKey: "opening-usd",
      accountId: accounts.walletUsd.id,
      offsetAccountId: accounts.openingUsd.id,
      amountMinor: 10_000n,
      fxRateNumerator: "254505",
      fxRateDenominator: "10",
    });

    await expect(
      service.transferFunds({
        idempotencyKey: "transfer-imbalanced",
        fromAccountId: accounts.walletUsd.id,
        toAccountId: accounts.cash.id,
        amountMinor: 5_000n,
        toAmountMinor: 1_272_524n,
        fxRateNumerator: "254505",
        fxRateDenominator: "10",
      }),
    ).rejects.toThrow(/not balanced/);
    expect(repository.entries.size).toBe(1);
  });

  it("reverses a posted entry once and preserves the original snapshot", async () => {
    const { repository, service } = await createFixture();
    const original = await service.createOpeningBalance({
      idempotencyKey: "opening-reversal",
      accountId: accounts.cash.id,
      offsetAccountId: accounts.openingVnd.id,
      amountMinor: 8_000_000n,
    });

    const reversal = await service.reverseEntry({
      idempotencyKey: "reversal-1",
      originalEntryId: original.entry.id,
    });

    expect(reversal.entry.reversalOfId).toBe(original.entry.id);
    expect(reversal.entry.baseCurrencyCode).toBe(
      original.entry.baseCurrencyCode,
    );
    expect(reversal.lines).toHaveLength(original.lines.length);
    reversal.lines.forEach((line, index) => {
      const source = original.lines[index]!;
      expect(line.accountId).toBe(source.accountId);
      expect(line.amountMinor).toBe(source.amountMinor);
      expect(line.fxRateNumerator).toBe(source.fxRateNumerator);
      expect(line.fxRateDenominator).toBe(source.fxRateDenominator);
      expect(line.baseAmountMinor).toBe(source.baseAmountMinor);
      expect(line.side).not.toBe(source.side);
    });

    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      0n,
    );
    expect(
      (await service.getAccountBalance(accounts.openingVnd.id)).minorUnits,
    ).toBe(0n);

    const retry = await service.reverseEntry({
      idempotencyKey: "reversal-1",
      originalEntryId: original.entry.id,
    });
    expect(retry.created).toBe(false);
    expect(retry.entry.id).toBe(reversal.entry.id);

    await expect(
      service.reverseEntry({
        idempotencyKey: "reversal-2",
        originalEntryId: original.entry.id,
      }),
    ).rejects.toThrow(/already been reversed/);
    expect(repository.entries.size).toBe(2);
  });

  it("keeps drafts out of balances until they are posted", async () => {
    const { service } = await createFixture();
    const draft = await service.createDraft({
      idempotencyKey: "draft-1",
      description: "Pending salary",
      lines: [
        {
          accountId: accounts.cash.id,
          side: "DEBIT",
          amountMinor: 2_000_000n,
          fxRateNumerator: "1",
          fxRateDenominator: "1",
        },
        {
          accountId: accounts.salary.id,
          side: "CREDIT",
          amountMinor: 2_000_000n,
          fxRateNumerator: "1",
          fxRateDenominator: "1",
        },
      ],
    });

    expect(draft.entry.status).toBe("DRAFT");
    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      0n,
    );

    const posted = await service.postDraft(draft.entry.id);
    expect(posted.entry.status).toBe("POSTED");
    expect(posted.created).toBe(true);
    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      2_000_000n,
    );

    const retried = await service.postDraft(draft.entry.id);
    expect(retried.created).toBe(false);
    expect(retried.entry.id).toBe(draft.entry.id);
  });

  it("revalidates account state when a draft is posted", async () => {
    const { repository, service } = await createFixture();
    const draft = await service.createDraft({
      idempotencyKey: "draft-archived",
      lines: [
        {
          accountId: accounts.cash.id,
          side: "DEBIT",
          amountMinor: 1_000n,
          fxRateNumerator: "1",
          fxRateDenominator: "1",
        },
        {
          accountId: accounts.salary.id,
          side: "CREDIT",
          amountMinor: 1_000n,
          fxRateNumerator: "1",
          fxRateDenominator: "1",
        },
      ],
    });
    repository.accounts.set(accounts.cash.id, {
      ...accounts.cash,
      isArchived: true,
    });

    await expect(service.postDraft(draft.entry.id)).rejects.toThrow(
      /Archived account/,
    );
    expect(repository.entries.get(draft.entry.id)?.status).toBe("DRAFT");
  });

  it("returns the original entry when a direct posting command is retried", async () => {
    const { repository, service } = await createFixture();
    const lines = [
      {
        accountId: accounts.cash.id,
        side: "DEBIT" as const,
        amountMinor: 4_000_000n,
        fxRateNumerator: "1",
        fxRateDenominator: "1",
      },
      {
        accountId: accounts.salary.id,
        side: "CREDIT" as const,
        amountMinor: 4_000_000n,
        fxRateNumerator: "1",
        fxRateDenominator: "1",
      },
    ];

    const first = await service.postEntry({
      idempotencyKey: "post-entry-retry",
      description: "Salary",
      lines,
    });
    const second = await service.postEntry({
      idempotencyKey: "post-entry-retry",
      description: "Different payload",
      lines: [
        { ...lines[0]!, amountMinor: 1n },
        { ...lines[1]!, amountMinor: 1n },
      ],
    });

    expect(second.created).toBe(false);
    expect(second.entry.id).toBe(first.entry.id);
    expect(second.entry.description).toBe("Salary");
    expect(repository.entries.size).toBe(1);
    expect((await service.getAccountBalance(accounts.cash.id)).minorUnits).toBe(
      4_000_000n,
    );
  });

  it("does not persist anything when the atomic commit fails", async () => {
    const { repository, service } = await createFixture();
    repository.failNextCommit = new Error("simulated disk failure");

    await expect(
      service.postEntry({
        idempotencyKey: "post-failure",
        lines: [
          {
            accountId: accounts.cash.id,
            side: "DEBIT",
            amountMinor: 1_000n,
            fxRateNumerator: "1",
            fxRateDenominator: "1",
          },
          {
            accountId: accounts.salary.id,
            side: "CREDIT",
            amountMinor: 1_000n,
            fxRateNumerator: "1",
            fxRateDenominator: "1",
          },
        ],
      }),
    ).rejects.toThrow(/simulated disk failure/);

    expect(repository.commitCount).toBe(1);
    expect(repository.entries.size).toBe(0);
    expect(repository.linesByEntry.size).toBe(0);
  });

  it("rejects invalid commands before they reach persistence", async () => {
    const { repository, service } = await createFixture();

    await expect(
      service.postEntry({
        idempotencyKey: "post-unbalanced",
        lines: [
          {
            accountId: accounts.cash.id,
            side: "DEBIT",
            amountMinor: 1_000n,
            fxRateNumerator: "1",
            fxRateDenominator: "1",
          },
          {
            accountId: accounts.salary.id,
            side: "CREDIT",
            amountMinor: 999n,
            fxRateNumerator: "1",
            fxRateDenominator: "1",
          },
        ],
      }),
    ).rejects.toThrow(/not balanced/);

    await expect(
      service.transferFunds({
        idempotencyKey: "transfer-income-account",
        fromAccountId: accounts.salary.id,
        toAccountId: accounts.cash.id,
        amountMinor: 1_000n,
      }),
    ).rejects.toThrow(/ASSET source accounts/);

    await expect(
      service.createOpeningBalance({
        idempotencyKey: "opening-wrong-offset",
        accountId: accounts.cash.id,
        offsetAccountId: accounts.food.id,
        amountMinor: 1_000n,
      }),
    ).rejects.toThrow(/EQUITY account/);

    await expect(
      service.postEntry({
        idempotencyKey: "",
        lines: [
          {
            accountId: accounts.cash.id,
            side: "DEBIT",
            amountMinor: 1n,
            fxRateNumerator: "1",
            fxRateDenominator: "1",
          },
          {
            accountId: accounts.salary.id,
            side: "CREDIT",
            amountMinor: 1n,
            fxRateNumerator: "1",
            fxRateDenominator: "1",
          },
        ],
      }),
    ).rejects.toThrow(/idempotency key is required/i);

    expect(repository.commitCount).toBe(0);
    expect(repository.entries.size).toBe(0);
  });
});
