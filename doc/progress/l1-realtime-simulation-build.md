# L1 realtime simulation BUILD — progress

Goal: build the honest `Networked Tank Arena` baseline before any SCAN, extraction or generator work.

Checkpoints:

- [x] Re-read campaign acceptance, BUILD instruction and L0 operating rules.
- [x] Fix L1 scope, contracts and layered entrypoints.
- [x] Build deterministic scenario, simulation and replay core.
- [x] Prove headless baseline with contract and replay tests.
- [x] Add runtime/debug facades, transport and two web consumers.
- [x] Capture BUILD evidence and hand off to blind SCAN.

Decisions so far:

- L1 stays inside this repository as an ordinary baseline; no workspace package/generator/MCP extraction.
- The first executable unit is headless deterministic simulation. Network transport and UI consume it later; they do not define it.
- World coordinates, ordering and state hashes are integer/canonical to keep replay evidence meaningful.
- `npm run acceptance:realtime` is the stable no-browser trace command; its JSON is evidence input, not a test fixture copied into prose.
- The service binding exposes a separate `arena` RPC surface. Its authoritative tick loop and bot consumers are not part of the deterministic core.
- The browser panel has an arena runtime action surface and a debug observation surface. Socket reconnect refreshes the snapshot and resubscribes to replayed updates; it is a local smoke implementation, not a latency/load result.
- BUILD concluded with `doc/evidence/evaluations/2026-07-14-l1-build-handoff.md`; project mode is now `L1_SCAN`. Stable code is read-only until that separate AS-IS report is complete.
