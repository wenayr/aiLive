# Genetic sandbox — binding instruction

These rules apply to every AI working inside this directory or responding to a
request produced by its controller.

## Read first

1. `README.md`.
2. `sandbox.json`.
3. `case/GOAL.md` and the exact request JSON saved for the current run.
4. `RUNBOOK.md` before operating a complete run.

## External-model boundary

- Treat the candidate workspace path from the controller as the only writable
  project. Never edit the stable repository.
- Do not use a terminal, Git, network, package manager, credentials, publish,
  MCP tools, or arbitrary filesystem access.
- Read only file contents included in the request. Ask the controller for a new
  request if required context is absent.
- Return one JSON value matching the response contract in the request. Markdown
  around JSON, implicit edits, tool calls, and commands are invalid responses;
  the adapter result and its `raw` field must remain JSON-serializable.
- A code response may replace only the paths listed in `limits.allowedPaths`.
  Each replacement must repeat the exact `baseRevision` from the request and
  provide the complete new content, or `null` for deletion.
- An inspection response evaluates only the supplied instruction and changed
  files. It must not expand into a general code review.

## Controller procedure

1. Create a unique candidate below `.candidates/genetic-sandbox/<run-id>/`.
2. Copy only the tracked seed and establish a SHA baseline.
3. Save every request before invoking a model and every raw response before
   parsing it.
4. Validate request id, schema, allowlist, base SHA, file count, and byte limit
   before any write. Invalid or stale responses perform zero writes.
5. Apply accepted replacements only inside the candidate workspace.
6. Immediately call patch capture for the exact touched paths, then explicitly
   flush the genetic gate.
7. Permit only one pending Terra or Luna action. Resolve it before another
   model request or patch.
8. Run only the registered static-source check named by `sandbox.json`; it
   must read, never import or execute, candidate code.
9. Save requests, responses, patches, genetic snapshots, check result, usage,
   and final verdict under `.laboratory/genetic-sandbox/<run-id>/`.
10. Never merge, commit, push, promote, install, publish, or delete evidence as
    part of a sandbox run.

This is a controlled local development workspace, not an OS security sandbox.
Untrusted executable code, secrets, and unrestricted network access remain out
of scope.

`npm run sandbox:genetic` is a non-resumable protocol probe. A complete
external-model run requires an explicit wrapper that injects the `callModel`
port before the run starts; the repository intentionally ships no provider,
credential, network, or package-install adapter.
