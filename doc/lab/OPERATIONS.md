# Операции L0

## Local development

Install dependencies once:

```sh
npm install
```

Start the service and Vite web binding:

```sh
npm run dev
```

The service listens on `http://127.0.0.1:4311`; Vite serves the panel at `http://127.0.0.1:5173` and proxies RPC/WebSocket traffic to the service.

For a production-like local run:

```sh
npm run build
npm start
```

Then open `http://127.0.0.1:4311`.

## Runtime data

- `.laboratory/runs/<runId>/record.json` — run state and result.
- `.laboratory/runs/<runId>/trace.ndjson` — append-only trace.
- `.laboratory/runs/<runId>/artifacts/` — task outputs.

These files are deliberately ignored. Move only reviewed evidence into `doc/evidence/`.

## Verification

```sh
npm run verify
```

The command type-checks source, executes Node tests and builds the web binding. It is not a claim of OS-level sandbox security.

## L1 headless acceptance

```sh
npm run acceptance:realtime
```

This command runs the deterministic two-bot `Networked Tank Arena` trace without starting the service or opening a browser. It reports scenario identity, command/event counts, final tanks and both live/replay state hashes. The result is a correctness trace for the simulation core, not a network-load or security test.

## Operational limits

- The runner executes registered local Node fixture tasks; it does not accept raw commands from the browser.
- No Docker/VM, SSH, auth, package publishing or remote terminal is configured.
- A service restart may interrupt an active child process; recovery records that fact rather than fabricating a terminal success.
- Before future SSH publication, create a separate task decision covering credentials, destination, rollback, approval and evidence.
