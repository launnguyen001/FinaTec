import type {
  Liability,
  LiabilityInstallment,
  LiabilityPayment,
  LiabilityRateChange,
  LiabilityPaymentReversal,
  LiabilityJournalCommit,
  LiabilityPaymentCommit,
} from "./liability";

export interface CreateLiabilityRecord {
  liability: Liability;
  installments: LiabilityInstallment[];
  journal: LiabilityJournalCommit;
}

export interface LiabilityRepository {
  createLiability(input: CreateLiabilityRecord): Promise<void>;
  findById(id: string): Promise<Liability | null>;
  findPaymentById(id: string): Promise<LiabilityPayment | null>;
  list(includeArchived?: boolean): Promise<Liability[]>;
  listInstallments(liabilityId: string): Promise<LiabilityInstallment[]>;
  listPayments(liabilityId: string): Promise<LiabilityPayment[]>;
  listRateChanges(liabilityId: string): Promise<LiabilityRateChange[]>;
  addRateChange(
    change: LiabilityRateChange,
    installments: LiabilityInstallment[],
  ): Promise<void>;
  reversePayment(input: {
    paymentId: string;
    reversal: LiabilityJournalCommit;
    record: LiabilityPaymentReversal;
  }): Promise<void>;
  findPaymentReversal(
    paymentId: string,
  ): Promise<LiabilityPaymentReversal | null>;
  listPaymentReversals(
    liabilityId: string,
  ): Promise<LiabilityPaymentReversal[]>;
  commitPayment(input: LiabilityPaymentCommit): Promise<LiabilityPayment>;
  syncStatuses(liabilityId: string, localDate: string): Promise<void>;
  archive(id: string, archivedAt: string): Promise<void>;
  reconcile(id: string): Promise<{
    ledgerPrincipalMinor: bigint;
    recordedPrincipalMinor: bigint;
    differenceMinor: bigint;
  }>;
}
