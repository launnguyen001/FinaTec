import type { JournalEntry, JournalLine } from "../ledger/repository";
import type {
  RepaymentMethod,
  RepaymentInstallment,
} from "./repayment-schedule";

export type LiabilityStatus = "ACTIVE" | "PAID_OFF" | "ARCHIVED";
export type RepaymentStatus =
  "UPCOMING" | "DUE" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
export type EarlyPaymentPolicy =
  "KEEP_MATURITY_REDUCE_INSTALLMENT" | "KEEP_INSTALLMENT_SHORTEN_TERM";

export interface Liability {
  id: string;
  name: string;
  liabilityAccountId: string;
  interestExpenseAccountId: string;
  currencyCode: string;
  originalPrincipalMinor: bigint;
  outstandingPrincipalMinor: bigint;
  annualRatePpm: bigint;
  repaymentMethod: RepaymentMethod;
  termMonths: number;
  startDate: string;
  firstDueDate: string;
  timezoneId: string;
  earlyPaymentPolicy: EarlyPaymentPolicy;
  status: LiabilityStatus;
  createdAt: string;
  updatedAt: string;
  paidOffAt: string | null;
}

export interface LiabilityInstallment extends RepaymentInstallment {
  id: string;
  liabilityId: string;
  annualRatePpm: bigint;
  principalPaidMinor: bigint;
  interestPaidMinor: bigint;
  status: RepaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LiabilityPayment {
  id: string;
  liabilityId: string;
  scheduleId: string | null;
  sourceAccountId: string;
  journalEntryId: string;
  idempotencyKey: string;
  paidAt: string;
  principalPaidMinor: bigint;
  interestPaidMinor: bigint;
  feePaidMinor: bigint;
  note: string | null;
  createdAt: string;
}

export interface LiabilityJournalCommit {
  journalEntry: JournalEntry;
  journalLines: JournalLine[];
}

export interface LiabilityPaymentCommit extends LiabilityJournalCommit {
  payment: LiabilityPayment;
  outstandingPrincipalMinor: bigint;
  installmentUpdates: LiabilityInstallment[];
  newInstallments: LiabilityInstallment[];
}
