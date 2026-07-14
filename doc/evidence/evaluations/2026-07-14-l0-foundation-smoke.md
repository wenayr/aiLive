# L0 foundation smoke — 2026-07-14

Scope: local baseline of AI Live Laboratory L0.

Snapshot:

- Repository baseline: current working tree during initial foundation implementation.
- Service: `npm start` on `127.0.0.1:4311`.
- Browser consumer: production `dist/web` served by the same service.
- Executor: guarded local Node process; no Docker/VM/SSH/publish capability.

Observed scenarios:

| Fixture | Observed terminal state | Evidence |
| --- | --- | --- |
| `seeded-probe` | `passed` | stdout hash, `result.json`, exit `0`, eight sequenced events |
| `intentional-failure` | `failed` | stderr text and known exit `23` remain visible in the run row |
| `cancelable-wait` | `canceled` | live `running` state and active-run count became visible; operator cancellation produced `SIGTERM` and a terminal cancellation record |

Checks performed:

1. Browser connected through `wenay-common2` RPC and showed all three task manifests.
2. Runtime snapshot and live replay updated the UI without page reload.
3. Run inspector displayed status, timestamps, output trace and artifact metadata.
4. `.laboratory/runs/<runId>/record.json` and `trace.ndjson` were written for all three outcomes.
5. A duplicate React runtime from local sibling dependencies was detected by this smoke test and fixed by Vite dedupe/alias policy before acceptance.
6. Reactive `Observe` records were converted to raw JSON snapshots at the resource facade boundary; direct Proxy serialization had caused a stack overflow and is now covered by an automated test.
7. A start/stop lifecycle test verifies that Socket.IO, rather than a second explicit `httpServer.close()`, owns graceful service shutdown.

Known limits:

- This evidence does not demonstrate OS isolation, authentication, remote execution or reconnect replay correctness across service restart.
- Build emits an inherited direct-`eval` warning from `wenay-common2` and a large bundled chunk warning. Neither was changed locally; code-splitting and library build policy are separate follow-up concerns.
