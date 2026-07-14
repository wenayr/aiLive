# L1 local service and web smoke — 2026-07-14

Status: passed locally.

## Procedure

1. Build and start the local service with `npm start`.
2. Query `GET /api/health`, `GET /api/arena/snapshot` and `GET /api/arena/metrics`.
3. Open `http://127.0.0.1:4311/` and wait for both Socket.IO RPC consumers to connect.

## Observed result

The HTTP probe reported `service: live`, `executor: local-guarded`, two arena tanks and a running authoritative tick loop. The browser showed the existing L0 panel as `live` and the `Networked Tank Arena` section as `live`; it displayed a 250 ms tick interval, state hash, authoritative tick, tank state, and the runtime `Queue fire` controls.

The local service hosts the L1 facade under a separate `arena` typed RPC key. Its runtime API exposes only `snapshot` and `submitCommand`; update replay, metrics and events stay under `debug`. Server-side deterministic bots make the baseline observable without browser input.

## Scope limit

This is a one-machine functional smoke. It does not measure network latency, concurrent users, packet loss, browser recovery across a process restart or production publication. Those are future L1 operational acceptance items, not satisfied merely because the panel renders.
