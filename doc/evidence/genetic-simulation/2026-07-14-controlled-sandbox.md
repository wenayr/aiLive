# Controlled genetic sandbox run

- Candidate: `13b3004 feat: add controlled genetic module sandbox`
- Protocol probe: `genetic-prepare-20260714-02`.
- Plumbing smoke: `genetic-smoke-20260714-02`.
- Materialization: local controller with one tracked exchange-adapter case.
- Review: `npm run verify` after the final smoke.

## Question

Can the current genetic resource be placed around a tightly controlled coding
loop so that model context, writes, disk-derived revisions, instructions,
inspections, and results are attributable without waiting for a Git commit?

## Materialized boundary

1. The tracked recipe creates a fresh ignored candidate workspace and copies
   only the case seed.
2. The baseline is a SHA-256 snapshot, so the module sees pre-commit work.
3. Every model request contains actual file content, base SHA, one allowed
   path, byte/file limits, a strict response contract, and `tools: none`.
4. The controller archives a serializable raw response before validating its
   metadata or response body.
5. A full-file replacement is accepted only when request id, protocol, kind,
   path, base SHA, count, and byte size are valid.
6. The controller captures exact touched paths immediately after its write and
   flushes the real genetic event gate.
7. Requests, responses, patches, state snapshots, trace, check, and report stay
   below `.laboratory/`; mutable code stays below `.candidates/`.
8. The registered AST check parses but never imports or executes candidate code.
9. No candidate is promoted automatically.

## Observed trace

The protocol probe stopped at `awaiting-response`. It made zero model calls and
left the copied candidate equal to the seed.

The smoke used five calls, all recorded as `fixture / luna-simulated-v0` with
`simulated: true`: first code, repeated code, focused inspection, repair, and
repair inspection. The real genetic resource installed one instruction,
selected it for the repeated touched path, recorded two inspections, and ended
with no pending action. The structural AST check passed and the result was
`candidate-ready-for-review`.

Contract tests also proved that an out-of-allowlist path and a stale base SHA
cause zero writes, stable seed source remains unchanged, and an invalid model
envelope is archived before its empty provider metadata rejects the run.

## Result

The control boundary works for this one-file L0 experiment. It is now possible
to inspect exactly what a model would see, what response was returned, what
bytes were accepted, and what the genetic resource did after that accepted
write. A Git commit, polling loop, and broad repository scan are not required
for the controller-owned patch path.

This is not evidence that the genetic idea improves coding. The fixture selects
answers by request id and ignores whether the supplied instruction changed its
reasoning. The discovery observation is predefined in `sandbox.json` and
submitted by the controller; autonomous Terra discovery was not tested.

## Explicit limitations

- No real Luna or other provider was called.
- `sandbox:genetic` is a non-resumable protocol probe, not the first half of a
  real external run.
- A real run still needs one explicit in-process `callModel` adapter.
- The synthetic post-write `file-saved` capture proves deduplication, not a
  filesystem watcher or arbitrary editor event.
- Builder and inspector share one fixture caller; independence is not proven.
- The AST oracle checks the focused adapter structure, not runtime behavior.
- Candidate code is never executed; this remains a controlled local workspace,
  not an OS security sandbox.

## Decision

Keep this sandbox as the plumbing and control baseline. Do not add more
simulation layers to claim value.

The next useful experiment is one real, low-cost, provider-approved A/B run on
the same repeated task:

1. baseline model receives the repeat task without the selected instruction;
2. candidate model receives the identical task with the instruction;
3. a separately routed inspector reviews both;
4. record model versions, prompts, tokens, latency, invalid responses, defects,
   repair calls, and final independent verdict;
5. compare benefit against the module's orchestration and token overhead.

Only that comparison can begin answering whether the genetic module improves
the system rather than merely recording and replaying a rule.
