# Controlled patch-event capture run

- Candidate: `6224726 feat: capture patch events from workspace files`
- Scope: `bindings/patch-event-capture.ts`
- Materialization: a temporary workspace was changed with `writeFile` and
  `unlink`; the binding read its SHA-256 revisions through the sampler.
- Review: `npm run verify`.

## Question

Can an agent controller explicitly capture the actual files named by a finished
patch, without Git or a watcher, and hand one deduplicated event to the genetic
gate?

## Trace

1. The binding establishes a baseline for `adapter.ts` and `normalizer.ts`.
2. A real write changes `adapter.ts`; `agent-patch-applied` capture accepts
   only its new SHA revision.
3. A second capture labelled `file-saved` reads the same files and suppresses
   the unchanged duplicate.
4. After the controlled instruction is installed, `unlink(normalizer.ts)` is
   followed by another explicit capture.
5. The capture turns the missing named path into `revision: null`; flushing
   emits a focused Luna action with the sampler's former normalizer SHA and
   `afterRevision: null`.

## Result

The controller now has a real, bounded call point immediately after its own
patch: it supplies the known touched paths and receives an event derived from
disk state. It does not need a commit, push, polling loop, or a broad workspace
scan. Duplicate save reporting is suppressed by revision.

No real Luna endpoint was used. The next unresolved question is model value:
whether a configured low-cost model's focused response changes the next patch
for a real repeated coding task.

## Decision

Keep this capture boundary. Do not add filesystem watching yet. The next run
must use this exact `capture → flush → pending action` boundary with one real
model connection and record the returned answer, cost, and subsequent patch.
