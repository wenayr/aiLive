# Transport profile decision — 2026-07-14

Decision: `PROFILE` (project-local), not `PROMOTE_CANDIDATE`.

## Evidence evaluated

- T0 inventory: `doc/campaigns/realtime-simulation/TRANSPORT_INVENTORY.md`
- Real-socket multiplex/replay/reconnect/teardown/stale oracles: `src/lab/bindings/web/project-transport.test.ts`
- Core command validation/idempotency tests: `src/campaigns/realtime-simulation/coordination/arena-coordinator.test.ts`
- Build/replay evidence: `doc/evidence/traces/2026-07-14-transport-profile-slice.md`

## Reasoning

The local profile removes demonstrated transport mistakes: duplicate browser connections, plain consumption of replay lines and browser-owned authoritative scheduling. It is useful and evidence-backed, but it has one project authority, no contrast consumer and no source of truth independent of Arena/Lab bindings. Extracting now would optimize a hypothetical reuse case and violate the campaign's growth gate.

## Mandatory next evidence

P1 in-flight response-loss idempotency, P2 terminal service-reset semantics and P3 browser transport-state smoke must complete before declaring the local profile operationally complete. Candidate extraction remains blocked until a separate transfer experiment and independent review.
