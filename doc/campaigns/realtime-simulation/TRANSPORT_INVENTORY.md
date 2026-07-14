# T0 transport contract inventory

Status: observed 2026-07-14. This is the source checklist for the following implementation packets.

| Surface | Authority / owner | Traffic class | Current mechanism | Required policy | Gap before T1–T4 |
| --- | --- | --- | --- | --- | --- |
| `lab.runtime.startTask`, `cancelRun` | L0 service / Lab coordinator | critical command | typed RPC `func` | never automatic-retry; typed outcome; server owns side effect | idempotency and boundary rejection are not documented |
| `lab.debug.updates` | Lab coordinator | canonical update | `Replay.replayListen`, browser plain `Listen.on` | sequence/keyframe recovery | browser does not use replay recovery |
| `arena.runtime.submitCommand` | Arena coordinator | critical command | typed RPC `func` | server assigns canonical scheduling and idempotency outcome | browser manufactures a canonical command; no structural boundary validation |
| `arena.debug.updates` | Arena coordinator | canonical state/update | `Replay.replayListen`, browser plain `Listen.on` | `replaySubscribe`, sequence persistence, stale/desync status | replay surface exists but is unused by the browser mirror |
| `arena.debug.metrics/events` | Arena coordinator | debug query / trace | typed RPC | read-only, bounded diagnostic surface | no transport lifecycle or subscription metrics in facade |
| Lab browser hub | Lab client | connection lifecycle | one `createRpcClientHub` + one `io()` | shared authority owner | duplicates Arena connection |
| Arena browser hub | Arena client | connection lifecycle | one `createRpcClientHub` + one `io()` | shared authority owner | duplicates Lab connection |
| Service channels `lab`, `arena` | L0 service | server binding | two `createRpcServerAuto` on one Socket.IO socket | limits, hooks, per-stream policy and disconnect cleanup | disconnect cleanup exists; limits/hooks/replay policy are implicit |

## Measured baseline

- One browser session creates two physical Socket.IO clients (`lab-client.ts` and `arena-client.ts` each call `io(...)`).
- Both RPC channels are already multiplexable on one physical socket because the server binds keys `lab` and `arena` inside one Socket.IO `connection` handler.
- Both update sources are `Replay.replayListen` instances. The server auto-exposes their replay wire surface, but the browser consumes only their legacy plain-listen projection.

## Binding checklist

Every future transport binding must state: authority; traffic class; command idempotency; runtime validation; replay source/keyframe; reconnect owner; stale behaviour; limits/hooks; and acceptance oracle.
