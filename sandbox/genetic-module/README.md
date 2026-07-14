# Genetic module sandbox

This directory is the tracked recipe for controlling an external coding model
and observing the genetic module around its patches. Runtime data never lives
here.

## Directories

```text
sandbox/genetic-module/                 tracked recipe and controller
.candidates/genetic-sandbox/<run-id>/   mutable candidate workspace, ignored
.laboratory/genetic-sandbox/<run-id>/   requests, responses and results, ignored
doc/evidence/genetic-simulation/         optional curated conclusions only
```

The controller gives a model file contents and SHA revisions, but no filesystem
or terminal. The model returns full-file replacements. The controller validates
the path, expected SHA, response size, and request id before writing the
candidate. Stable project files are never model targets.

The registered final check is static: it reads candidate source but never
imports or executes model-written code. This L0 directory is not an OS security
sandbox. Behavioral execution of external-model code therefore stays out of
scope until a real isolation or an explicit trust gate exists.

## Commands

Prepare a candidate and inspect the first provider-neutral request:

```powershell
npm run sandbox:genetic
```

The command intentionally stops with `awaiting-response`. It does not invent a
Luna answer. Inspect the printed run directory and its `requests/` folder.
This probe does not resume in a second process. A complete real run starts once
with an explicitly injected `callModel` adapter; no network or credential
adapter is bundled.

Run the complete deterministic plumbing smoke with an explicitly simulated
fixture model:

```powershell
npm run sandbox:genetic:smoke
```

Run sandbox contract tests:

```powershell
npm run test:sandbox:genetic
```

## Controlled run

1. Read `AGENTS.md`, `sandbox.json`, and `case/GOAL.md`.
2. Start a unique run. Confirm that the candidate is below `.candidates/` and
   the report directory is below `.laboratory/`.
3. For a complete run, inject one approved provider adapter before starting.
   The controller gives that adapter only the structured request.
4. Archive the JSON-serializable raw response before validating its metadata or
   response contract, including malformed or rejected responses.
5. Let the controller validate and apply it. Never apply model text manually to
   stable code.
6. Observe the patch capture, pending genetic action, focused inspection, and
   allow-listed check in the run trace.
7. Read `result.json`, `report.md`, `genetic/state-final.json`, and
   `evaluation/check.json` before drawing a conclusion.
8. Promote nothing automatically. Curate evidence only after an independent
   review of the candidate and complete trace.

The included case deliberately repeats an exchange-adapter task. The first
change establishes a normalization instruction. The second change violates it;
the focused inspection requests one repair, and the fixed candidate is checked
deterministically.

The exact operator and AI procedure is in [`RUNBOOK.md`](./RUNBOOK.md).
