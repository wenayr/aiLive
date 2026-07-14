# Архитектура лаборатории

## Карта

```text
task.json + TASK.md
        ↓
task registry ────────────────→ runtime facade
        ↓                              ↓
resource state ← coordination / runner → wenay-common2 RPC
        ↓                              ↓
file evidence binding             browser mirror/controller
        ↓                              ↓
.laboratory/                   wenay-react2 web UI
```

```text
src/lab/
├── contracts/             # канонические serializable types и wire facade shapes
├── resource/              # run state machine и state resource; без I/O
├── transform/             # validation, reducer и event projections; чистые функции
├── utility/               # id, time, path and log helpers; без domain policy
├── horizontal/            # trace, storage and capability ports
├── coordination/          # registry + lifecycle orchestration
├── facade/
│   ├── runtime/           # list/start/cancel and current snapshot
│   ├── debug/             # trace/replay/inspect only
│   └── testing/           # deterministic reset and assertions
└── bindings/
    ├── executor-local/    # Node child-process adapter, no shell
    ├── store-file/        # .laboratory/ records and artifacts
    ├── transport/         # Socket.IO adapter + wenay-common2 RPC
    ├── service/           # Express application/runtime composition
    └── web/               # React consumer binding over controllers
```

## Ownership and facades

| Surface | Owns | May do | Must not do |
| --- | --- | --- | --- |
| Resource | canonical run record and legal transitions | hold state | import UI/transport/process APIs |
| Transform | validation and projections | derive next state | read filesystem or spawn process |
| Coordination | lifecycle policy | start, finish, cancel a registered task | parse browser shell input |
| Runtime facade | normal operator operations | list, snapshot, start, cancel | inject events or read arbitrary files |
| Debug facade | observation | trace, logs, artifact metadata | bypass executor policy |
| Testing facade | deterministic verification | fixtures, reset, assertion helpers | become a runtime backdoor |
| Executor binding | process resource | execute one validated manifest | choose task policy |
| Web binding | display and user intent | render, request a facade operation | own authoritative state |

The facade split follows both the project standard and `wenay-common2` closure/facade convention. A shared operation is implemented once below the facade and projected to the appropriate audience.

## State and evidence flow

1. The task registry reads a versioned manifest from `tasks/<id>/task.json`.
2. The runtime facade validates `taskId` and asks coordination to create a run.
3. The resource reducer records `queued → starting → running` and attaches a monotonically increasing event sequence.
4. The local executor receives only the validated executable/args/cwd; it cannot receive a shell string from the UI.
5. stdout/stderr become structured trace events and a bounded in-memory log; file binding writes the durable run record below `.laboratory/runs/<runId>/`.
6. Terminal transition is exactly one of `passed`, `failed`, `canceled`, `timed_out`.
7. `wenay-common2` serves an initial snapshot and a live Listen/Replay channel. Reconnection must request a snapshot or resume from an acknowledged sequence; no command is automatically retried.
8. The React binding folds state into a controller/grid rather than using a new React state update for every log line.

## Transport contract

`wenay-common2` owns the typed RPC contract; Socket.IO is only injected transport. The server exposes a static strict facade through `createRpcServerAuto`. The browser creates a `createRpcClientHub`, gets the initial snapshot explicitly, then subscribes to a Listen/Replay stream. The system does not make arbitrary websocket messages a public API.

## UI contract

`wenay-react2` is used as UI/controller infrastructure, not as a laboratory domain model:

- `ModalProvider` and `useModal` own task/run inspection overlays;
- `createToolbar` owns configurable command-strip state;
- `createGridBuffer`/`useAgGrid` or a thin list projection receives run updates;
- `createUpdateApi` or Observe React hooks connect mutable controllers to React;
- `memoryCache` persists user layout only when the application explicitly requests it.

## Trust boundary

The browser is untrusted with respect to process execution. It can select a task ID and a declared input shape, but cannot provide a command, cwd, environment override, network target or publish operation. This L0 boundary prevents accidental UI-driven shell execution; it is not OS isolation against malicious code already contained in an allowed task. Docker/VM is a future executor binding if that stronger boundary becomes necessary.
