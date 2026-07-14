# Transport stewardship plan — progress

Goal: prevent partial use of `wenay-common2` from becoming an accidental transport design.

- [x] Read project transport usage and the relevant `wenay-common2` RPC/replay guidance.
- [x] Register goals and observed transport capabilities in the Project Catalog.
- [x] Write a detailed, ordered remediation plan with delivery classes and exit gates.
- [x] Execute T0 as a bounded design/inventory pass.
- [x] Complete T1/T2/T3 shared-hub, replay mirror and command-boundary implementation and verify it against a real local socket.
- [x] Complete T4 foundation: reconnect tail recovery, teardown and stale detection pass.
- [x] Execute P1 response-loss idempotency oracle from `TRANSPORT_COMPLETION_PLAN.md`.
- [ ] Execute P2/P3; they are the remaining operational acceptance before human review.

Decision: do not create a shared transport package yet. First prove a project-local transport profile across Lab and Arena, then evaluate extraction only with transfer and review evidence.

Test note: browser controllers depend on the Vite-resolved `wenay-react2` surface and are not imported by Node transport tests. T4 therefore tests RPC/replay with real Socket.IO directly; browser behaviour remains a separate build/browser smoke concern.

Evidence: `doc/evidence/traces/2026-07-14-transport-profile-slice.md` and `doc/evidence/traces/2026-07-14-transport-p1-response-loss.md`. The project now works under the transport-profile implementation scope; no extracted package or candidate exists.

Decision: `PROFILE`, recorded in `doc/evidence/evaluations/2026-07-14-transport-profile-decision.md`. Extraction is blocked pending transfer and independent review.
