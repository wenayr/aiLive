# Первый этап: подробный план L0

Статус: исполняемый baseline plan. Он намеренно детализирует ближайший проверяемый срез, но не замораживает будущую архитектуру «живых модулей».

## 0. Цель и измеримый результат

1. Создать один локально запускаемый сервис и одну веб-панель.
2. Дать оператору увидеть, что процесс действительно стартовал, а не только что UI сменил цвет.
3. Сохранить воспроизводимый trace, task version, вход, время, итог и артефакты каждого запуска.
4. Доказать три terminal outcome: success, failure и cancellation/timeout.
5. Не добавить Docker, SSH, публикацию или произвольное исполнение команд ради «полноты».
6. Получить baseline, на котором следующая задача станет дешевле: новый fixture добавляется manifest-ом и script-ом, а не новым экраном и отдельным transport path.

## 1. Управление и источники истины

1. `project.yaml` фиксирует scope, entrypoints, policies и acceptance-команду.
2. `AGENTS.md` фиксирует кодовый стиль и технические границы, а не длинный универсальный prompt.
3. `doc/lab/FOUNDATION.md` отвечает за scope/non-goals L0.
4. `doc/lab/ARCHITECTURE.md` отвечает за ownership слоёв и trust boundary.
5. `doc/lab/OPERATIONS.md` будет единственным местом для start/stop/recovery инструкций.
6. `doc/decisions/DECISIONS.md` дополнится решениями только после работающего evidence.
7. Живые логи и временные артефакты не попадают в git: `.laboratory/` ignored.
8. Curated trace/evaluation после эксперимента попадёт в `doc/evidence/` с commit, командами и результатом.
9. Любая новая внешняя библиотека проходит отдельный ACQUIRE: источник, версия, лицензия, безопасность, local test.
10. Каждое широкое изменение сопровождается временным progress-файлом; при завершении остаётся durable documentation, а progress удаляется.

## 2. Технологическая база

1. Один Node/TypeScript repository, без преждевременного workspace/package splitting.
2. React 19.2.x и Vite дают локальный web binding.
3. Express + Socket.IO дают development service binding.
4. `wenay-common2` даёт typed RPC, `Listen`, `Observe`/Replay semantics и reconnect-aware transport contract.
5. `wenay-react2` даёт controller-first UI: toolbar, modal, update bridge, grid/log primitives and layout persistence.
6. Локальные зависимости закрепляются на собранные sibling packages `../wenay-common2/dist` и `../weay-react2/dist`.
7. После install проверяется единственная runtime-копия React, чтобы hooks не работали через два разных React instance.
8. `tsx` запускает TypeScript service и node:test без отдельной compile-to-JS development loop.
9. `vite build` создаёт `dist/web`; service способен отдать его для локальной production-like проверки.
10. `npm run verify` объединяет typecheck, tests и build.

## 3. Канонические contracts

1. Ввести `tTaskDefinition`: `id`, `version`, `title`, `summary`, `kind`, declared capabilities, timeout, command, instruction and evidence expectations.
2. Ввести `tTaskCommand`, где program и args заданы manifest-ом, не UI.
3. Ввести `tRunRequest`; L0 принимает только task id and validated declared input.
4. Ввести `tRunStatus`: `queued`, `starting`, `running`, `passed`, `failed`, `canceled`, `timed_out`.
5. Ввести `tRunRecord`: immutable identifiers, timing, task snapshot, result, state and artifact refs.
6. Ввести `tRunEvent`: `runId`, sequence, timestamp, kind and serializable payload.
7. Ввести `tArtifactRef`: relative path, media type, bytes and provenance, never an arbitrary absolute filesystem path.
8. Ввести `tLabSnapshot`: server information, task list, recent runs and transport status.
9. Ввести runtime/debug/testing facade types in a contract-only directory; the browser must not import Node bindings.
10. Derive implementation-facing public types from factories where possible; contracts remain explicit where they cross process boundaries.

## 4. Run state machine and trace

1. Implement transition table as a pure transform.
2. Permit `queued → starting → running` only once.
3. Permit `running → passed|failed|canceled|timed_out` only once.
4. Reject transition from a terminal state.
5. Attach next monotonic sequence number to every event.
6. Add state event before/after process startup so a missing child-process signal is visible.
7. Normalize stdout and stderr to structured log events with source and line count.
8. Bound in-memory log retention; write complete durable trace through file binding.
9. Record exit code, signal, duration, timeout reason and cancel actor when present.
10. Make replay an observation of stored events, not a second source of truth.

## 5. Task registry

1. Place each task below `tasks/<taskId>/`.
2. Require `task.json`; optional `TASK.md` explains human/agent intent and acceptance.
3. Load manifests at service startup and report malformed manifests as health diagnostics rather than silently skipping them.
4. Validate id syntax and prohibit path separators, dot segments and duplicates.
5. Resolve each task working directory under canonical `tasks/` root and reject escape paths.
6. Use manifest version in every run record, even if it initially mirrors the repository version.
7. Declare capabilities descriptively now; local runner policy enforces only the safe initial subset.
8. Never use task description as an executable shell fragment.
9. Provide a deterministic seed fixture, intentional failure fixture and cancellation fixture.
10. Make one fixture emit a small artifact to prove the artifact lifecycle.

## 6. Local executor

1. Implement executor as a binding behind a small port: `start`, `cancel`, `status`.
2. Use `child_process.spawn` with `shell: false`.
3. Allow only explicitly supported programs in L0, initially Node itself.
4. Pass validated static args from task manifest only.
5. Set cwd to the validated task/run workspace only.
6. Use a minimal explicit environment allow-list; do not forward secrets by default.
7. Create `.laboratory/runs/<runId>/` before process start.
8. Stream stdout and stderr separately; split lines predictably and retain incomplete tail correctly.
9. Enforce per-task timeout and emit `timed_out` with a reason.
10. Implement cancellation using a process handle and record its requested/actual result.
11. Treat child process spawn error as a terminal failure, not as a hanging run.
12. Do not call it a security sandbox: allowed task code can still access the operator environment.
13. Keep a Docker executor as a future compatible implementation of the same port, only when required.

## 7. Persistence and evidence

1. File binding owns `.laboratory/` layout.
2. `runs/<runId>/record.json` stores the terminal/current run record.
3. `runs/<runId>/trace.ndjson` stores append-only serializable events.
4. `runs/<runId>/artifacts/` contains task-produced declared files.
5. Every write uses a path containment check.
6. A failed file write becomes visible diagnostic evidence, never silently disappears.
7. On service restart, loader lists historical run records and marks formerly live runs as interrupted/requires-review rather than pretending they completed.
8. Snapshot endpoint returns bounded recent history, not every artifact ever made.
9. An explicit evidence export later copies selected summaries to `doc/evidence/`; L0 does not auto-commit output.
10. Record git commit/dirty status when practical, but do not block a local baseline if git metadata is unavailable.

## 8. Runtime, debug and testing facades

1. Runtime facade exposes `snapshot`, `listTasks`, `startTask`, `cancelRun` and health.
2. Debug facade exposes trace/replay and artifact metadata.
3. Testing facade exposes fixture reset and deterministic assertions only to local tests, not browser production UI.
4. All facades use canonical coordination operations; none duplicates state-machine logic.
5. `startTask` accepts task ID and declared input; it does not accept program, arguments or cwd.
6. RPC ordinary commands are not auto-retried after reconnect because start/cancel are side effects.
7. Start requests include an idempotency/request id once remote UI is introduced; L0 still records enough information to identify duplicate clicks.
8. Snapshot happens before live subscription; reconnect gets a new snapshot or trace resume coordinate.
9. Keep static strict RPC schema for registered facade; avoid `noStrict` unless a later bounded dynamic key API requires it.
10. Do not expose debug injection or publish operation in runtime service.

## 9. Transport binding

1. Compose Socket.IO only at service boundary.
2. Adapt its `emit/on` shape into `createRpcServerAuto`.
3. Use a per-connection disconnect Listen to clean transport subscriptions.
4. Create browser `createRpcClientHub` by injecting Socket.IO client factory.
5. Connect anonymously in L0; auth is explicitly out of scope.
6. Subscribe to server status through true `wenay-common2` Listen/Replay nodes, never an imitation `{on(){}}` object.
7. Set RPC limits before accepting unbounded browser payloads.
8. Keep log replay policy explicit: audit stream queues; high-rate presentation stream may frame/conflate only when justified.
9. Make health endpoint available over HTTP for simple service checks.
10. Do not make the Socket.IO protocol itself a public domain contract; the facade is the contract.

## 10. Web interface

1. Show clear connection state: connecting, live, disconnected or error.
2. Show service identity, local runner capabilities and its honest non-sandbox warning.
3. Show task cards with purpose, version, timeout, capabilities and one Run action.
4. Show a recent-runs table/list with task, status, timestamps, duration and result.
5. Open a run inspector showing state timeline, live logs, terminal reason and artifact references.
6. Use `ModalProvider` for inspector lifecycle.
7. Use a `wenay-react2` controller/toolbar for command strip and layout persistence.
8. Call `memoryCache.load()` at app startup; the app, not library primitives, owns debounced persistence and pagehide flush.
9. Fold high-frequency trace events into a bounded controller buffer, not a `useState` call per line.
10. Use semantic status colors and text; color alone is not state evidence.
11. Disable/annotate Run when a task is already active according to runner policy.
12. Do not render a fake SSH/publish button in L0; absent capability is clearer than a dead control.

## 11. Verification

1. Unit test pure transition table, including every illegal terminal transition.
2. Unit test event sequence monotonicity and bounded log projection.
3. Unit test task manifest validation and path escape rejection.
4. Unit test executor policy rejects shell, unknown program and escaping cwd.
5. Integration test successful fixture: lifecycle, output, artifact and record persistence.
6. Integration test intentional failure: stderr, exit result and terminal state.
7. Integration test cancellation and timeout separately where platform permits.
8. Contract test facade shape through `createRpcInProc` or a real Socket.IO connection.
9. Browser E2E later proves initial snapshot, Run, live update and terminal inspector.
10. `npm run verify` is the one documented gate.
11. Manual local smoke: run service and Vite, open browser, trigger all fixture outcomes.
12. Store baseline commands and outputs as evidence before declaring L0 done.

## 12. Delivery sequence

1. Create repository configuration, policies, docs and ignore rules.
2. Implement contract/resource/transform tests without UI or network.
3. Add manifest registry and local executor binding.
4. Add file evidence binding and recovery loader.
5. Compose runtime/debug/testing facades.
6. Add typed RPC transport and HTTP health.
7. Add React web binding and controller-based UI.
8. Add fixture tasks and integration tests.
9. Verify cold install, tests, build and production-like start.
10. Capture baseline evidence and update decisions.
11. Stop L0; begin L1 Tank Arena in a separately scoped BUILD session.

## 13. Explicit stop conditions

Stop and ask for direction if implementation requires:

1. real credentials, SSH host selection or remote publication;
2. a choice between destructive task capabilities;
3. a task that must execute untrusted code but has no OS isolation policy;
4. a new external dependency whose acquisition cannot be justified from current local packages;
5. a decision to convert a local layer into package/MCP/generator before L0 evidence exists.
