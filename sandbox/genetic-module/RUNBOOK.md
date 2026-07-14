# Genetic sandbox runbook

This is the binding procedure for the first controlled genetic-module
experiment. It separates three questions:

1. can an external model be constrained to a candidate workspace;
2. does the real genetic resource route a saved change into one pending action;
3. does a learned instruction improve a later model patch?

The included fixture answers only the first two at plumbing level. It does not
answer the third question.

## Fixed layout

```text
sandbox/genetic-module/                   tracked recipe, controller and case
.candidates/genetic-sandbox/<run-id>/     mutable candidate; ignored by Git
.laboratory/genetic-sandbox/<run-id>/     complete live trace; ignored by Git
doc/evidence/genetic-simulation/           reviewed conclusions; tracked
```

There is no Git repository or initial commit inside the candidate. The genetic
trigger must see pre-commit work, so the baseline is the SHA-256 snapshot made
when the candidate is prepared. Git controls the stable recipe and curated
evidence only.

## Mode A — protocol probe

Use this mode to inspect exactly what a provider adapter would receive:

```powershell
npm run sandbox:genetic -- --run-id=genetic-prepare-<unique-id>
```

Then:

1. confirm the printed workspace is below `.candidates/genetic-sandbox/`;
2. confirm artifacts are below `.laboratory/genetic-sandbox/`;
3. open `requests/01-code-first.json`;
4. verify actual source, its SHA, allowed path, limits, contract, and `policy`;
5. open `result.json` and confirm `status` is `awaiting-response`;
6. open `report.md` and confirm zero calls and zero candidate changes;
7. stop.

This is deliberately a non-resumable probe. Starting a second process with the
same run id is rejected. Do not manually apply a response to its candidate or
describe it as a completed external-model run.

## Mode B — deterministic plumbing smoke

```powershell
npm run sandbox:genetic:smoke -- --run-id=genetic-smoke-<unique-id>
```

The expected controlled chain is:

1. simulated `code-first` adds Bybit;
2. the real genetic resource emits a Terra discovery action;
3. the controller installs the case's predefined normalization observation;
4. simulated `code-repeat` adds a deliberately drifting OKX adapter;
5. `inspect-repeat` reports the focused instruction violation;
6. `code-repair` delegates OKX to `normalizeQuote`;
7. `inspect-repair` reports clear.

Only five entries are model calls because steps 2 and 3 are resource/controller
operations. Every model record must say `provider: fixture`,
`model: luna-simulated-v0`, and `simulated: true`.

This smoke proves routing, response validation, bounded candidate writes,
revision capture, duplicate suppression, instruction selection, one pending
action, response archiving, and static evaluation. The fixture chooses answers
by request id and discovery text comes from `sandbox.json`; it proves neither
autonomous discovery nor improved model behavior.

## Mode C — real external adapter

A complete real run must start and finish in one process by injecting
`tSandboxModelCaller` into `createGeneticSandbox`. The repository intentionally
contains no provider SDK, API key handling, network call, package installation,
or built-in resume mechanism. Adding one first requires the project's separate
acquisition and runtime decision.

The wrapper must:

1. create a unique run id;
2. construct `createGeneticSandbox({projectRoot, runId, callModel})`;
3. expose no tools, shell, filesystem, Git, browser, or MCP surface to the model;
4. send only the supplied request value;
5. route builder and inspector roles to the intended model or separate models;
6. return `{provider, model, simulated: false, raw, usage}` with serializable raw;
7. honor the supplied `AbortSignal` and enforce its own provider timeout;
8. call `sandbox.control.run()` once;
9. place no credentials or secrets in candidate or artifacts.

The controller archives each request before the call and each serializable raw
response before validating metadata or response content. It validates request
id, protocol, kind, allowlist, base SHA, file count, and byte limit before any
candidate write.

## Instruction for the responding AI

For every request:

1. read only `goal`, `files`, `instructions`, `limits`, `policy`, and contract;
2. do not infer access to files that were not supplied;
3. do not call tools or issue commands;
4. for code, return a complete allowed-file replacement with exact base SHA;
5. for inspection, evaluate only the supplied change against one instruction;
6. return one JSON object and nothing around it;
7. when context is insufficient, report that limitation instead of inventing.

## What to inspect

| Artifact | Question |
| --- | --- |
| `manifest.json` | Which case, limits, directories, and model mode ran? |
| `requests/*.json` | What exact context and instruction did the model see? |
| `responses/*.json` | Which provider/model answered; was it simulated? |
| `patches/*.json` | What before/after content and SHA were accepted? |
| `genetic/state-*.json` | When was the instruction installed and selected? |
| `trace.ndjson` | Was request → response → patch → action ordering preserved? |
| `evaluation/check.json` | Did the static AST contract pass without execution? |
| `result.json` | Is the run failed, waiting, rejected, or ready for review? |
| `report.md` | Does the summary agree with detailed artifacts? |

The post-write `file-saved` record is synthetic and tests only revision
deduplication. There is no watcher or polling loop. The authoritative trigger
is exact touched-path capture immediately after the controller's accepted write.

## Evidence decision

Mark the control boundary successful only if out-of-scope and stale responses
perform zero writes, every call is attributable, no action remains pending, and
stable source is unchanged.

Do not claim genetic effectiveness from the fixture. That needs a later A/B run
on the same repeated task: baseline without the selected instruction versus
candidate with it, recording models, tokens, errors, repairs, latency, and an
independent review.

Never promote automatically. `candidate-ready-for-review` means only that the
focused inspection cleared and the fixture-level structural AST check passed.
Human review stays mandatory. Candidate code is never imported or executed by
this L0 sandbox.
