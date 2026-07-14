# Transport profile — completion and decision plan

Status: ready for human review. This document is the consolidated execution plan after T0–T4 evidence; it is not a package-extraction proposal.

## What is now proven

| Contract | Oracle | Result |
| --- | --- | --- |
| One authority uses one physical browser connection | Real Socket.IO test opens `lab` and `arena` through `createProjectTransport` | passed |
| Replay has an initial recovery point | `replaySubscribe` receives an Arena keyframe and sequence | passed |
| Transient disconnect does not silently lose a tick | A server tick while the client is offline is recovered by replay tail after reconnect | passed |
| Releasing all consumers tears down the connection | Retain/release test observes socket closure | passed |
| Silent producer death is visible | Stopped Arena tick triggers `onStale` | passed |
| Browser cannot author canonical scheduling | Runtime accepts intent; coordinator assigns tick/sequence | passed |
| Intent retry key is idempotent | Same `clientCommandId` returns the saved outcome | passed |
| Invalid data does not reach simulation queue | Coordinator test rejects malformed and `arena/v0` input | passed |

## Current operational profile

1. `project-transport.ts` owns the physical Hub and registers project channels.
2. Controller instances retain/release that owner; they do not own sockets themselves.
3. Canonical state is a replay line and must use sequence-aware subscription.
4. Commands are ordinary RPC calls: automatic retry is prohibited.
5. A manual retry uses the same idempotency key; the server answers with the prior outcome.
6. Canonical state keeps queue/recovery semantics. No frame-dropping policy is allowed without a separate telemetry stream and oracle.
7. A process restart is a terminal reset because L1 session state is memory-only.

## Completed implementation packet

### P1 — ambiguous in-flight command acceptance — passed 2026-07-14

Purpose: prove the most dangerous case, where the server may apply a command while the response is lost.

1. Add a test-only delay seam **below the RPC facade** and above `submitIntent`; never expose it to runtime clients.
2. Start an intent RPC call, wait until the server has saved its outcome, then sever the response path.
3. Reconnect and submit the same `clientCommandId` once manually.
4. Assert exactly one queued canonical command and one applied simulation effect.
5. Assert no library/client code performs an automatic replay of the first failed ordinary call.

Exit achieved: ambiguous delivery has an explicit user-retry/idempotency oracle.

Evidence: `doc/evidence/traces/2026-07-14-transport-p1-response-loss.md`.

## Remaining implementation packets

### P2 — terminal service-reset UX and acceptance

Purpose: make the memory-only restart boundary visible instead of treating it as a failed transient reconnect.

1. Add a server-generated session epoch to Arena snapshot/update contracts.
2. Persist the epoch in the browser mirror alongside replay sequence.
3. If a reconnect obtains a different epoch, clear the old mirror, increment `desyncCount`, expose `service-reset`, and require a fresh snapshot/keyframe.
4. Real-socket test: start service A, subscribe, stop it, start service B, then assert reset—not tail recovery.
5. Browser smoke: display reset state and disallow runtime action until fresh state is loaded.

Exit: restart has one truthful and tested user-visible meaning.

### P3 — browser contract smoke and diagnostics presentation

1. Run the production local server and verify the Arena panel shows connection, recovery/stale state, replay sequence and desync count.
2. Verify reconnect moves through `recovering` before `live`.
3. Surface transport diagnostics as read-only debug data; retain runtime facade restrictions.
4. Keep Node real-socket tests as the transport oracle; do not import browser-only `wenay-react2` runtime into them.

Exit: UI presents the same state machine the transport tests prove.

## Decision: keep a project-local profile

Decision for this campaign: `PROFILE`.

No reusable package is created now because there is only one project authority and one domain-specific replay mirror. The evidence proves a useful local policy, but not an independent capability with a contrast consumer. Reconsider candidate extraction only when all are true:

- a second independent project uses the same Hub ownership and replay/idempotency rules;
- it can depend on a transport core without importing Arena contracts or UI terminology;
- a candidate has a declared source of truth, rollback and transfer test;
- an independent reviewer evaluates it against keeping this profile local.

## Review checklist

- [x] Every existing RPC surface has a traffic class and owner.
- [x] Initial, reconnect, stale and teardown behavior have real-socket evidence.
- [x] Automatic retry of ordinary commands is prohibited and manual retry is idempotent.
- [ ] In-flight response-loss behaviour has its own oracle (P1).
- [ ] Service reset is a versioned user-visible state (P2).
- [ ] Browser UI visibly reports the transport state machine (P3).
- [x] Extraction is deferred pending transfer and independent review.
