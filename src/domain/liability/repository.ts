import type {
  Liability,
  LiabilityInstallment,
  LiabilityPayment,
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
  list(includeArchived?: boolean): Promise<Liability[]>;
  listInstallments(liabilityId: string): Promise<LiabilityInstallment[]>;
  listPayments(liabilityId: string): Promise<LiabilityPayment[]>;
  commitPayment(input: LiabilityPaymentCommit): Promise<LiabilityPayment>;
  syncStatuses(liabilityId: string, localDate: string): Promise<void>;
  archive(id: string, archivedAt: string): Promise<void>;
  reconcile(
    id: string,
  ): Promise<{
    ledgerPrincipalMinor: bigint;
    recordedPrincipalMinor: bigint;
    differenceMinor: bigint;
  }>;
}
