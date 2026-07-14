# L1 BUILD handoff — 2026-07-14

Author: BUILD session.

## Scope frozen for analysis

`Networked Tank Arena` is a local L1 baseline inside this repository. It contains a deterministic grid simulation, replay, bot consumers, an authoritative local service binding and runtime/debug browser views. No package, generator, MCP projection or external component has been added.

## Reproducible baseline

```sh
npm run verify
npm run acceptance:realtime
```

Observed result: 5 L0 tests and 9 L1 tests pass; production build completes. The headless two-bot trace runs 16 ticks with 8 commands and 6 damage events; live and replay both finish at `badf946a`.

Evidence:

- `doc/evidence/traces/2026-07-14-l1-headless-baseline.md`
- `doc/evidence/traces/2026-07-14-l1-local-service-smoke.md`

## Confirmed facts

- Canonical state and transitions have no React, Socket.IO or filesystem imports.
- Command ordering is explicit (`tick`, `sequence`, actor id and kind); replay is tested against live state hash.
- The service exposes the Arena through a separate typed `arena` RPC facade.
- Runtime client operations and debug observation are separate surfaces.

## Limits retained for SCAN

- The browser smoke is one-machine only; it is not a reconnect-under-process-restart or load test.
- Current consumers are within one project. There is no contrast-project transfer evidence.
- Existing boundaries may simply be convenient project folders; none is yet a module candidate.
- Build has warnings inherited from `wenay-common2` direct `eval` and a client bundle above the default size warning. They do not fail the baseline gate, but belong in later dependency/performance assessment.

## Handoff decision

BUILD is complete enough to start a read-only `SCAN`. The next mode must recover AS-IS facts without consulting the campaign's expected candidate list. It may produce only scan/evidence documents and must not materialize a layer or alter stable code.
