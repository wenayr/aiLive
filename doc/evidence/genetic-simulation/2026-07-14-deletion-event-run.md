# Luna deletion-event controlled run

- Candidate: `bcc883f feat: detect deleted files in genetic event gate`
- Scope: nullable revision in the event gate and focused deletion trace.
- Materialization: Codex simulated the Luna result as deterministic test input.
- Review: `npm run verify`.

## Question

Does a watched-file deletion survive the event boundary and become one focused
Luna inspection, rather than silently disappearing because the file has no
current revision?

## Trace

1. An adapter edit creates the local `src/` instruction.
2. `agent-patch-applied` reports `src/normalizer.ts` with `revision: null`.
3. The following `file-saved` event with the same `null` revision is
   suppressed as a duplicate.
4. `flush` emits one Luna inspection containing exactly
   `{path: 'src/normalizer.ts', beforeRevision: 'v1', afterRevision: null}`.
5. The simulated Luna result reports the removal and proposes an instruction
   refinement; the review persists it.

## Result

The event contract now represents deletion explicitly. The resource's existing
file-difference logic carries it without a second code path, and the event gate
does not duplicate the check when an agent event and disk event describe the
same removal.

This is a controlled semantic case, not an external Luna evaluation. It says
nothing yet about whether a real low-cost model will classify the removal
correctly or help the next patch. It does establish the minimum input a real
model needs to see that case at all.

## Decision

Do not add more synthetic event variants. The next experiment must bind a real
completed-patch source, then use one configured low-cost model on a repeated
coding task and measure whether its response changes the following patch.
