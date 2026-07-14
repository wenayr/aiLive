# Agent Ecology — detailed execution plan

Status: planned programme. It starts only after the current transport profile completes P1–P3; no autonomous write, publish or model acquisition is authorised by this document.

## 1. Purpose

Build a local laboratory in which many low-cost agents can explore bounded hypotheses, create candidate artifacts and run cheap checks, while stronger agents concentrate on ambiguity, conflict, architecture and lifecycle decisions.

The goal is not a self-directed code factory. The goal is to make the next related engineering task cheaper and more reliable through a visible chain:

```text
human objective
  → typed work order
  → bounded scout attempts
  → candidate artifacts
  → deterministic checks
  → evidence bundle
  → expensive adjudication
  → human-visible decision
  → approved local action or archive
```

## 2. Core rules

1. Cheap-agent agreement is a signal, never proof. Correlated prompts and the same missing context can produce the same wrong answer many times.
2. Agents do not write stable code, modify credentials, publish, install packages, invoke SSH or expand permissions. Materialization is confined to `.candidates/<work-id>/`.
3. Every attempt must produce a structured result: claim, inputs read, patch/artifact if any, checks run, cost, confidence and reason for failure.
4. A deterministic verifier outranks an agent verdict for claims it can check.
5. An expensive adjudicator sees summarized evidence and disagreements, not an unlimited repository dump.
6. Human approval remains required for promotion, external acquisition, credentials, publish and irreversible changes.
7. `NO_CHANGE`, `KEEP_LOCAL`, `ARCHIVE` and `REJECT` are successful outcomes when evidence supports them.

## 3. Logical tiers and permissions

Model labels are deployment aliases, not fixed vendors. The scheduler routes by risk, expected value and available budget rather than by a prompt’s preference.

| Tier | Suggested alias | Job | Reads | Writes | Cannot do |
| --- | --- | --- | --- | --- | --- |
| S0 | deterministic | tests, typecheck, hash, lint, diff, policy validation | declared workspace | evidence result only | infer semantics or alter code |
| S1 | `Luna` / scout | inventory, locate symbols, enumerate alternatives, derive small test cases, classify failures | context pack only | attempt report | stable/candidate code, approvals |
| S2 | `Terra` / builder | bounded candidate patch, test fixture, adapter draft, evidence synthesis | scope + contracts + tests | one candidate workspace | stable, promotion, external install |
| S3 | `Sol` / adjudicator | resolve conflicts, choose experiment, assess architecture/risk, review evidence | compact evidence bundle + selected source | decision/review report | materialize its own approved promotion |
| H | human | objective, budget, authority and final acceptance | any approved context | scoped action | delegated automatically |

An S3 model may ask for more evidence, but it may not convert its own recommendation into a stable change. That preserves separation between proposer, materializer and reviewer.

## 4. Work-order contract

Every run starts with a checked `work-order.yaml` stored under `.laboratory/work-orders/` and mirrored as reviewed evidence when it matters.

```yaml
id: transport-p1-response-loss
objective: Prove idempotent manual retry after response loss.
mode: EXPERIMENT
scope:
  read:
    - src/lab/bindings/web/
    - src/campaigns/realtime-simulation/
  write: .candidates/transport-p1-response-loss/
authority:
  stable_write: false
  network: false
  package_install: false
  publish: false
budget:
  scout_attempts: 12
  builder_attempts: 2
  adjudications: 1
  stop_after_failures: 5
oracles:
  required:
    - npm run typecheck
    - npm run test
  optional:
    - real-socket-response-loss
decision_options: [KEEP_LOCAL, PROFILE, REJECT]
```

Required fields: objective, mode, bounded read/write scope, authority, budget, oracle list, stop condition and permissible decisions. Free-form agent text cannot add authority.

## 5. State machine

```text
DRAFT
  → TRIAGED
  → SCOUTING
  → CANDIDATE_READY | NO_SIGNAL | BLOCKED
  → VERIFYING
  → ADJUDICATING
  → KEEP_LOCAL | PROFILE | PROMOTE_CANDIDATE | REJECT | ARCHIVE
```

Terminal transitions carry a reason and evidence references. A candidate can return to `SCOUTING` only through an explicit new work order; it cannot silently spend more budget.

## 6. Cheap-agent swarm design

### 6.1 Partition by independent questions

Do not ask twenty agents to “solve the bug.” Create orthogonal questions:

- inventory: which interfaces and callers exist;
- invariant: what must never change;
- counterexample: how could the design fail;
- test design: smallest executable oracle;
- locality: which files must co-change;
- alternative: keep local vs profile vs candidate;
- documentation drift: where declared and actual behaviour disagree.

Each scout receives a small context pack: `ENTRY`, relevant contract, one facade, relevant tests and precise source paths. It returns claims with file/line evidence and `UNKNOWN` when the pack is insufficient.

### 6.2 Diversity rather than voting

The scheduler intentionally varies role prompt, context partition and expected output. It groups duplicate claims but does not count them as independent confirmation when they use the same evidence. Escalate when:

- two scouts reach incompatible conclusions;
- a scout names a high-impact risk;
- a deterministic oracle fails;
- the claim crosses scope or authority;
- the expected rework cost exceeds the S1 budget.

### 6.3 Cheap failure is valuable

An S1 attempt is successful when it eliminates an invalid route, finds a counterexample or improves a regression test. Store a concise rejected-hypothesis record so later agents do not repeat it blindly.

## 7. Builder lane

S2 receives only an adjudicated candidate brief, not an open-ended instruction.

Required inputs:

- independent ability statement;
- source of truth and ownership mode;
- candidate workspace path;
- accepted invariants and required oracles;
- rollback procedure;
- maximum files/lines or explicit exception;
- comparison baseline.

Required outputs:

- patch only under `.candidates/<id>/`;
- machine-readable manifest;
- tests and raw command results;
- explanation of failed alternatives;
- exact affected paths.

The builder may request clarification but cannot modify the work order itself.

## 8. Deterministic verifier lane

S0 runs before any S3 adjudication:

1. schema validation of work order and attempt result;
2. candidate path and authority check;
3. diff boundary check: no stable writes;
4. typecheck/tests/build/replay commands declared by the work order;
5. contract-specific oracles;
6. artifact hash and reproducibility record;
7. baseline regression comparison.

If S0 cannot verify a semantic claim, it records `UNVERIFIED`, not `PASS`.

## 9. Expensive adjudication

S3 is invoked only after S0 and only for a compact bundle:

```text
objective + acceptance
AS-IS map
candidate summary/diff statistics
oracle results
scout disagreement table
cost/attempt ledger
rollback and unknowns
```

It must return one of the allowed decisions, confidence, rejected alternatives, next smallest experiment and stop rationale. It must distinguish facts from inference and cannot approve its own materialization.

## 10. Scheduling and cost control

### 10.1 Admission

Only work orders with a measurable outcome enter the queue. A task is rejected at triage when it has no bounded scope, no oracle and no decision it could influence.

### 10.2 Routing

1. Start with S0 for repository facts and existing tests.
2. Run 3–12 S1 scouts with distinct questions.
3. Escalate to S3 if uncertainty/risk remains material.
4. Run at most two S2 builders for a single candidate; do not create a competing swarm of patches.
5. S0 verifies every candidate.
6. S3 adjudicates only when a real decision remains.

### 10.3 Budget ledger

Track per work order: attempt count, model tier, token/cost units, wall time, files read, files changed, tests executed, failure class and final value. Stop when:

- the budget ceiling is reached;
- identical evidence has appeared twice;
- a required oracle is impossible without new human authority;
- the expected value no longer exceeds remaining cost;
- a high-severity guard failure occurs.

## 11. Evidence and memory

Store append-only attempt envelopes in `.laboratory/agent-runs/`; promote only curated facts into `doc/evidence/`.

```yaml
attempt_id:
work_order_id:
tier:
role:
input_manifest_hash:
claims:
  - statement:
    evidence_paths: []
    confidence: low|medium|high
    status: confirmed|contradicted|unknown
artifact:
  candidate_path: null
  patch_hash: null
oracles: []
cost:
decision: null
```

The reusable memory is not a long chat transcript. It is a catalog of evidence-backed capabilities, rejected hypotheses, known invariants and decision outcomes with expiration/applicability fields.

## 12. Human-facing web panel

Extend the existing L0 panel only after the runner contract supports it. The panel must show:

- work-order queue and authority envelope;
- attempts by tier, status and spend;
- candidate diff/oracle summary;
- disagreements and escalations;
- explicit stop reason;
- decision awaiting human review.

It must not become a raw terminal, prompt injection surface or hidden publish control.

## 13. Phased implementation

### E0 — prerequisites

Complete transport P1–P3. The agent ecology depends on truthful session/reset status and real-socket reliability; it must not be built on an ambiguous control plane.

### E1 — read-only scout pilot

Implement work-order schema, S0 validator and one S1 scout task. Scope it to a documentation/architecture inventory with no candidate write permission.

Exit: ten bounded scout attempts produce structured, deduplicated claims and a human-readable evidence table.

### E2 — evidence ledger and triage

Persist work-order/attempt envelopes, budgets and stop reasons. Add the panel read model and allow humans to approve/reject a proposed escalation.

Exit: cost and authority are visible for every attempt.

### E3 — candidate builder pilot

Allow one S2 builder in `.candidates/` on a low-risk task with a deterministic oracle, such as a protocol validator or test fixture—not a transport rewrite.

Exit: candidate path isolation and rollback are mechanically checked.

### E4 — adjudication pilot

Run one S3 decision on competing scout/builder evidence. The valid result may be `REJECT` or `KEEP_LOCAL`.

Exit: adjudication produces a decision record with alternatives, uncertainty and next action.

### E5 — contrast transfer and review

Only after a candidate survives E3/E4, test it against a second usage profile and send the evidence to an independent reviewer.

Exit: `PROMOTE_CANDIDATE`, `PROFILE`, `INLINE` or `REJECT`; never silent promotion.

## 14. Metrics and anti-metrics

Measure:

- time/cost from work order to verified decision;
- fraction of scout claims confirmed, contradicted and unknown;
- deterministic oracle coverage;
- duplicate-attempt suppression;
- candidate rollback success;
- context files/tokens consumed by a typical task;
- rework avoided in the next related change.

Do not optimize:

- number of spawned agents;
- number of generated files/packages;
- agreement rate without evidence diversity;
- raw token volume;
- promotion count.

## 15. Immediate next action

Finish the existing transport P1 response-loss oracle. It is the best first work order because it is bounded, high-risk, deterministic and already has a concrete acceptance definition. Do not start E1 until P1–P3 are complete.
