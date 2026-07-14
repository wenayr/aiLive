# Event-gated Luna simulation

- Candidate: `5bf7748 feat: gate genetic scans on change events`
- Scope: `src/campaigns/genetic-simulation/coordination/event-gate.ts`
- Materialization: controlled Luna-role simulation by Codex.
- Review: deterministic `event-gate.test.ts` plus `npm run verify`.

## Question

Can one completed-agent-edit event and its duplicate file-save event become one
scan, while a newer revision waits for the current focused review instead of
creating an overlapping model request?

## Trace

| Input or action | Result |
| --- | --- |
| `agent-patch-applied`, `src/adapter.ts@v2` | queued |
| `file-saved`, `src/adapter.ts@v2` | suppressed as the same revision |
| explicit `flush` | one Terra discovery action; no automatic model call |
| `agent-patch-applied`, `src/adapter.ts@v3` then `flush` | one Luna inspection action |
| `file-saved`, `src/adapter.ts@v4` while that inspection is pending | queued; `flush` returns `blocked` with no second Luna action |
| simulated Luna result and Terra review | queued `v4` is then flushed into one new Luna action |

Measured trace totals: 4 input events, 3 unique revisions, 1 suppressed
duplicate, 1 deferred revision, and 3 explicit agent actions. No timer, Git
event, filesystem watcher, or real model invocation participated in the test.

## Result

The gate preserves the only useful property needed for the next experiment:
semantic and disk events cannot immediately multiply requests, but a later
revision is not discarded while a focused check is open.

This does **not** measure Luna quality, token cost, false-positive rate, or
whether the resulting advice changes a real next edit. The Terra/Luna values in
this trace are deterministic submitted fixtures, not an external model run.

## Decision

Keep the gate unchanged. Do not add polling, timers, more policies, or model
adapters yet. The next evidence must connect one real `agent-patch-applied`
source and one configured low-cost model to a small repeated coding task, then
record whether its advice changes the next patch.
