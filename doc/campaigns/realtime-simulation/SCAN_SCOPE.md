# L1 SCAN scope — Networked Tank Arena

Mode: `SCAN`.

## Objective

Recover the actual L1 architecture as it exists after BUILD. This pass does not choose a target extraction, generator or package structure.

## Bounded scope

- `src/campaigns/realtime-simulation/`
- the Arena composition points in `src/lab/bindings/service/` and `src/lab/bindings/web/`
- L1 tests, commands and evidence

## Required observations

1. Canonical state, operations and public surfaces.
2. Dependency and consumer map, including each point where Arena joins L0 infrastructure.
3. Tests, traces and unverified behaviour.
4. Co-change pressure, accidental coupling and contradictions between docs and code.
5. Confidence and unknowns for every architectural conclusion.

## Guard

Do not read the expected-candidate list in `FIRST_CAMPAIGN.md` until the AS-IS report is complete. Do not create a package, generator, candidate or implementation patch. `KEEP_LOCAL` is a valid outcome.

## Growth gate

The current layer remains `M1_CLEAN_LAYER`. It may become a candidate for growth only after SCAN documents an independent ability and a concrete repeated change pressure. Promotion then additionally needs candidate-scoped materialization, an explicit source of truth and rollback, a contrast-project transfer, preserved baseline tests and an independent review. Only the reviewer may select `PROMOTE_STABLE`.
