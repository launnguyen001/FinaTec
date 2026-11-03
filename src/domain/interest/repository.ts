import type {
  InterestAccrual,
  InterestPlan,
  InterestPlanStatus,
} from "./interest";
import type { JournalEntry, JournalLine } from "../ledger/repository";

export type CreateInterestPlanRecord = InterestPlan;
export type CreateInterestAccrualRecord = InterestAccrual;

export interface InterestPostingCommit {
  accrualId: string;
  journalEntry: JournalEntry;
  journalLines: JournalLine[];
  postedAt: string;
  amountMinor: bigint;
}

export interface InterestRepository {
  createPlan(plan: CreateInterestPlanRecord): Promise<void>;
  findPlanById(id: string): Promise<InterestPlan | null>;
  listPlans(includeClosed?: boolean): Promise<InterestPlan[]>;
  setPlanStatus(
    id: string,
    status: InterestPlanStatus,
    updatedAt: string,
  ): Promise<void>;
  createAccrual(accrual: CreateInterestAccrualRecord): Promise<void>;
  findAccrualById(id: string): Promise<InterestAccrual | null>;
  findAccrualByIdempotencyKey(key: string): Promise<InterestAccrual | null>;
  listAccruals(planId: string): Promise<InterestAccrual[]>;
  hasExternalPrincipalMovements(plan: InterestPlan): Promise<boolean>;
  /** Persists the posted Journal Entry and accrual state in one SQLite transaction. */
  commitPostedAccrual(input: InterestPostingCommit): Promise<InterestAccrual>;
}
