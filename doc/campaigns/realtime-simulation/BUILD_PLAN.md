# L1 BUILD plan — Realtime Simulation Lab

Status: active BUILD session. This is the first real consumer of L0; it is not a candidate-extraction exercise.

## Outcome

Deliver a `Networked Tank Arena` baseline in five vertical work packets. At every point the smallest useful running result is preferred over a generic platform.

## Packet 0 — campaign contract

1. Create a dedicated campaign directory and layer map.
2. Record L1 boundaries in `project.yaml`: ordinary baseline, no package promotion, no MCP, no external acquisition.
3. Define one documented command that runs headless acceptance.
4. Separate canonical simulation contracts from server, Socket.IO and React bindings.
5. Make every state that crosses replay/transport JSON-serializable and versioned.

Exit: the reading order, sources of truth, non-goals and test command are explicit.

## Packet 1 — deterministic world core

1. Define protocol version `arena/v1`.
2. Define a grid arena scenario: dimensions, seed, obstacle map, spawns and initial tank records.
3. Generate obstacle maps from a seeded PRNG, preserving a connected path between all active spawns.
4. Use integer grid coordinates and cardinal body/turret directions; no floating-point physics.
5. Define commands with `tick`, `sequence`, `actorId` and explicit kind.
6. Sort commands canonically before application so arrival order cannot change result.
7. Define state: tick, tanks, projectiles and event stream.
8. Define a canonical state hash whose field and collection ordering is explicit.

Exit: same seed + canonical command trace produces one state hash in pure unit tests.

## Packet 2 — authoritative simulation and replay

1. Create a closure-based simulation controller with a small runtime facade and a broader testing/debug facade.
2. On each fixed tick: cool down tanks, canonicalize scheduled commands, apply legal actions, advance projectiles, resolve damage, emit events.
3. Reject invalid/dead/out-of-turn commands as typed simulation events rather than hidden exceptions.
4. Store no transport or React object inside simulation state.
5. Create replay runner that rebuilds from scenario plus command trace only.
6. Prove replay hash equals live hash.
7. Add deterministic server-side bots that generate command traces using current snapshot only.

Exit: two bots can complete a finite headless arena trace; success, miss, damage and rejection appear in evidence.

## Packet 3 — headless acceptance

1. Add tests for scenario connectivity, protocol compatibility, command ordering, movement blocking, damage and terminal tank state.
2. Add acceptance test for two independent live runs with identical scenario/trace hashes.
3. Add acceptance test: live execution hash equals replay execution hash.
4. Add acceptance test: incompatible `arena/v0` input is rejected with a typed error.
5. Add acceptance test: runtime facade has no debug injection member while testing/debug facade does.
6. Expose `npm run test:realtime` and include it in the project verification gate.
7. Record the baseline trace and commands under `doc/evidence/` after tests are stable.

Exit: no manual browser play is needed to prove core correctness.

## Packet 4 — service and consumer bindings

1. Host an authoritative arena session in a dedicated server binding.
2. Project canonical operations into runtime, debug and testing RPC facades.
3. Classify messages: critical commands/replay must be reliable; telemetry may be transient.
4. Build a reconnecting client mirror from snapshot + event sequence.
5. Add two web clients in the L0 panel or a dedicated arena screen, plus two server-side bots.
6. Show connections, current tick, tick lag, state hash and desync count.
7. Add debug timeline/state inspector and test-only event injection; omit it from runtime facade.

Exit: one browser can see a real authoritative session and verify reconnect without violating core determinism.

## Packet 5 — BUILD evidence and handoff

1. Capture project map, dependency map, commands, baseline results and known limitations.
2. State explicitly which suspected boundaries are only hypotheses.
3. Do not extract `protocol`, `transport`, `scenario` or `simulation` just because their directories look reusable.
4. End BUILD once vertical acceptance passes.
5. Start a separate blind `SCAN`, which reads AS-IS without this plan's candidate list.

## Non-goals retained in L1

- MMO scale, account system, matchmaking, final art, 3D rendering and economic loops.
- Docker/VM infrastructure, SSH publish, external package acquisition and autonomous evolution.
- Literal genetic algorithms, generator generation and module promotion.

## First implementation order

`contracts → scenario → simulation → replay → tests → bots → transport → UI`.

That order preserves the key causal direction: consumers observe a proven world core; the core never learns about a consumer in order to pass its test.
