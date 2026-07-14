# Transport operational decisions

Status: current local profile policy.

## Critical Arena intents

An ordinary RPC failure is ambiguous: the server may have accepted the request even if the client did not receive its response. The client therefore never retries an intent automatically. A user-driven retry reuses the same `clientCommandId`; the coordinator returns the saved outcome and does not enqueue a second command. A new user action receives a new id.

## Reconnect and stale state

For a transient disconnect to the same running service, the Arena mirror keeps its last replay sequence. `replaySubscribe` recovers tail/keyframe before later events are applied, and the UI marks the state as `recovering` or `stale` rather than fabricating a fresh `live` state.

The current UI threshold is 2.5 seconds. It is a local responsiveness threshold, not a network SLA. The real-socket stale oracle uses a shorter controlled threshold only to prove the mechanism.

## Service restart

The L1 service keeps Arena session state only in process memory. A process restart therefore starts a new session and cannot truthfully recover the old replay sequence. This is a terminal reset, not a transient reconnect. The next UI/acceptance packet must show an explicit `service-reset`/new-session state and require a fresh snapshot; it must never silently continue the prior mirror.

## Frame policy

Arena canonical state is lossless replay with queue/recovery semantics. No replaceable telemetry stream exists yet, so no `replayOpts.highWater` policy is configured. A future telemetry stream may opt into frame/latest recovery only with its own measured oracle; it cannot alter the canonical state line.
