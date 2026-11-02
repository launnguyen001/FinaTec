# TASK-04 — Asset Management

- Phase: 3 — MVP 2
- Priority: P1
- Status: BLOCKED
- Dependencies: TASK-02, TASK-03

## Objective
Track owned assets, holdings, acquisition/disposal history, lots, fees, cost basis and realized/unrealized profit and loss. The app records holdings; it does not execute trades.

## Scope
- Asset classes and asset records.
- Quantity and storage-location metadata.
- Acquisition and disposal linked to funding accounts and ledger.
- Asset lots, fees and approved cost-basis method (weighted average or FIFO).
- Manual/market valuation, price history and stale-state display.
- Offline digital-asset tracking limited to quantity and location.

Out of scope: trade execution, custody, investment advice and external provider integration before terms/reliability review.

## Context
Read specification sections 5 and 6.3, asset screen description and roadmap Phase 3.

## Business rules
- Disposal quantity cannot exceed holdings.
- Acquisition cost includes fees under approved policy.
- Realized P&L uses the selected cost-basis method.
- Market price changes affect estimated value and unrealized P&L only.
- Cash and asset value must not be double-counted.
- Stale prices display timestamp and warning.
- Never store recovery phrases or private keys.

## Proposed changes
Asset/lot domain models; cost-basis service; acquisition/disposal use cases; ledger mappings; PriceProvider interface and cached history; asset list/detail/lot screens; valuation and P&L queries.

## Data changes
Implement only approved asset, lot, price-source and price-history schema with ledger traceability.

## Implementation plan
1. Approve asset taxonomy, quantity precision and cost-basis policy.
2. Model asset and lot lifecycle.
3. Implement acquisition/disposal use cases.
4. Implement the selected cost-basis calculator.
5. Define provider contract, cache and stale-price policy.
6. Build asset screens and P&L summaries.
7. Reconcile holdings with ledger.

## Test plan
Multiple acquisitions at different prices/fees; partial/full disposal; insufficient quantity; cost-basis and rounding; realized/unrealized separation; provider failure, stale cache and offline display; double-counting checks.

## Acceptance criteria
- [ ] Holdings and lots are traceable.
- [ ] Acquisition/disposal reconcile with accounts and ledger.
- [ ] Overselling is rejected.
- [ ] Cost basis and P&L match approved method.
- [ ] Stale prices are marked and cached values remain available offline.
- [ ] Sensitive wallet credentials are never stored.
- [ ] Asset and ledger balances reconcile.

## Progress log
- Done: Task defined from Phase 3.
- Doing: Blocked pending accounting and core finance.
- Next: Approve asset model and cost-basis policy.
- Issues: Provider and precision policy remain open.
- Verification: Not run.