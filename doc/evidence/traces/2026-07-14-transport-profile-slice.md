# Transport profile slice — 2026-07-14

Status: first implementation slice passed.

## Commands

```sh
npm run verify
npm run acceptance:realtime
```

## New oracle

`src/lab/bindings/web/project-transport.test.ts` starts a real local Socket.IO service, registers both `lab` and `arena` in one `createProjectTransport` hub, and subscribes to the Arena replay wire using `Replay.replaySubscribe`.

Observed result:

- one physical Socket.IO client was created for both typed RPC keys;
- both channels completed their RPC handshake;
- the Arena subscriber received a replay keyframe and a non-negative sequence;
- a transient client disconnect followed by a server tick recovered the missed replay tail after reconnect;
- releasing the two retained consumers tore down the shared physical socket;
- six L0 tests and ten L1 tests passed;
- headless replay acceptance still ended with equal `badf946a` hashes.

## Boundaries now enforced

- Browser-facing Arena control sends a narrow intent with a client command id; the server schedules canonical tick/sequence data.
- Repeated client command ids return the original outcome instead of queueing a second command.
- Invalid shapes and unsupported protocol versions receive typed rejected outcomes before entering the simulation queue.
- Service RPC channels use explicit payload limits, subscription ceilings, replay auto-exposure and invalid-packet hooks.

## Remaining T4 evidence

This slice does not yet prove no duplicate command after an in-flight RPC failure, stale timing or service-restart semantics. The Node oracle deliberately tests RPC/replay without importing browser-only `wenay-react2` controllers; the latter remain covered by typecheck/build and need a separate browser smoke when their visual contract changes.
