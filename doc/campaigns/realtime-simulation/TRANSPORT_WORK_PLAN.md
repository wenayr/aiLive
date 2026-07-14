# Transport work plan — correct use of `wenay-common2`

Status: approved planning scope. This is a project-local transport remediation plan, not a new package or module promotion.

## Problem statement

The project uses individual `wenay-common2` primitives but does not yet use their joint contract. In particular, replay-enabled updates are consumed as ordinary `Listen` events, two browser factories create separate Socket.IO connections to one authority, and RPC boundaries omit declared validation/limits/hooks. A correct transport layer must make ownership, delivery, recovery and failure semantics explicit.

## Non-negotiable transport rules

| Traffic class | Required rule | `wenay-common2` mechanism |
| --- | --- | --- |
| Critical command | Request/response; no automatic retry; typed result and idempotency policy owned by the server. | `func`/`strict` RPC call; do not replay a failed ordinary call. |
| Canonical state/update stream | Sequence-aware subscription, tail/keyframe recovery and duplicate suppression. | `Replay.replayListen` + `replaySubscribe`. |
| Replaceable telemetry | Consumer may choose frame/latest recovery under lag; source must remain recoverable. | replay `frame` policy and server `replayOpts`, never RPC throttle on a replay line. |
| Connection lifecycle | One owner observes transient disconnect, terminal dispose and reauth separately. | Hub `connectListen` / `disconnectListen`; explicit `close`/new generation. |
| Untrusted boundary | Shape, size, authority and subscription count are checked server-side. | RPC hooks, `limits`, `maxPerListen`; domain validators. |

## Work packets

### T0 — transport contract inventory

1. Make a table of every current RPC method and stream: authority, input/output, delivery class, idempotency, replay source, keyframe, recovery owner and failure presentation.
2. Mark all direct `io(...)`, `createRpcClientHub`, `createRpcServerAuto`, `Replay.replayListen` and plain `.on(...)` calls in the project.
3. Record the current physical-connection count for one browser session and the current subscription count per server channel.
4. Add a review checklist adjacent to project transport bindings so future work cannot select one primitive without declaring the surrounding policy.

Exit: every transport use has a named owner and one of the four traffic classes above.

### T1 — shared browser hub and lifecycle ownership

1. Create one project-local transport owner at the web binding boundary; it creates the Socket.IO adapter through DI and registers `lab` and `arena` channel keys in one hub.
2. Refactor `lab-client` and `arena-client` to consume this owner rather than create sockets independently.
3. Keep application state/controller ownership local; sharing a hub must not merge Lab and Arena facades.
4. Define terminal teardown, transient reconnect and explicit reauth as distinct operations.
5. Add a test/instrumentation point proving one browser session has one physical socket and that each consumer disposes only its own listener.

Exit: no browser feature creates an undocumented RPC hub for the same authority.

### T2 — replay-correct Arena mirror

1. Treat `debug.updates` as an event envelope stream, not a plain callback stream.
2. Subscribe with `replaySubscribe`, persist the last delivered sequence in the client controller and initialize from a server keyframe/snapshot.
3. On transient reconnect, recover tail or keyframe before declaring the mirror live; deduplicate delivery by sequence.
4. Surface `recovery`, `stale`, `last sequence`, `last arrival` and `desync` as debug state, not runtime controls.
5. Choose `queue` versus `frame` only per stream. Arena canonical state defaults to lossless queue/recovery; replaceable telemetry may opt into frame recovery with measured high/low-water settings.

Exit: a dropped connection cannot silently produce a live-looking stale mirror.

### T3 — command and server boundary policy

1. Replace the browser's direct construction of an authoritative `tArenaCommand` with a narrow intent input; the coordinator assigns/schedules canonical tick/sequence data.
2. Define idempotency identity and typed command outcome before any retry feature is considered. Failed ordinary RPC calls remain non-retried by default.
3. Validate protocol version and structural domain input at the RPC boundary; translate failures to an explicit transport/domain outcome rather than relying on TypeScript-only types.
4. Configure justified `RpcLimits`, `maxPerListen` and request hooks for `lab` and `arena`; log rejected requests without exposing debug controls to runtime clients.
5. Retain `disconnectListen` cleanup and audit per-connection replay gates/subscription teardown.

Exit: malformed, late and duplicate commands have specified server outcomes.

### T4 — observability and real-socket acceptance

1. Expose read-only transport diagnostics: connection generation, active subscriptions, pending RPC requests/callbacks, replay sequence, recovery count, stale state and desync count.
2. Write real Socket.IO acceptance tests for: initial keyframe, tail recovery after transient disconnect, no duplicate critical command after call failure, listener teardown and protocol rejection.
3. Add a service-restart test that explicitly classifies whether state recovery is supported or the client must show a terminal reset.
4. Test high-water frame policy only for telemetry; prove it is not applied to canonical replay lines.
5. Record traces and update the L1 acceptance matrix with measured results.

Exit: transport correctness is an automated oracle, not an optimistic UI property.

### T5 — design decision after evidence

1. Compare three options: keep the project-local profile, extract a small reusable profile, or leave the APIs direct with a checklist only.
2. Count actual repeated bindings and contrast consumers; do not use directory structure as evidence.
3. If extraction is justified, create it only in `.candidates/` with source of truth, rollback, transfer target and independent reviewer.
4. Otherwise record `KEEP_LOCAL` or `PROFILE` and keep the implementation inside this project.

## Execution order

`T0 inventory → T1 hub ownership → T2 replay mirror → T3 boundary policy → T4 real-socket evidence → T5 decision`.

No external package acquisition, Docker, SSH publication, generator or module promotion is authorized by this plan.
