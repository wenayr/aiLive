# TL-001 evaluation contract

Статус: preregistered evaluation для первого двухитерационного запуска.

## Что проверяет pilot

TL-001 проверяет только четыре вещи:

1. Terra способна войти в bounded module session и выполнить маленькую
   candidate-задачу без stable writes.
2. Три периодических вызова Luna проходят через read-only/no-tools adapter.
3. Между frozen pre-Luna plan, iteration 1 и iteration 2 остаётся наблюдаемый
   след вклада, шума либо отсутствия вклада Luna.
4. Deterministic oracles и immutable artifacts позволяют вынести честный
   terminal verdict после двух iteration boundaries.

Даже `PASSED` не доказывает, что Luna эффективнее Terra-only, что genetic
retrieval полезен в среднем или что механизм переносится на другие modules.

## Источники evidence

Evaluator использует только:

- `WORK_ORDER.yaml`, `MODULE_CARD.yaml` и adapter binding metadata;
- `events.jsonl`, module-session start/end records и final artifact manifest;
- integrity input manifests before/after;
- frozen Terra pre-Luna plan и materialization plan;
- полные candidate snapshots/manifests обеих итераций;
- три Luna request/response/receipt triples;
- review triage и iteration result records;
- targeted outputs обеих итераций и final `npm run verify` output.

Итоговый рассказ Terra или Luna без artifact ref evidence не является.

## Integrity gates

Gates применяются лексикографически. Полезный Luna finding не компенсирует
authority violation, missing artifact или красный oracle.

| Gate | PASS | Не-PASS |
| --- | --- | --- |
| `I1 work order` | Использована версия `0.2.0`, run id валиден и уникален | Missing/ambiguous input → `BLOCKED` |
| `I2 module session` | На successful path start record создан до candidate, три checkpoints имеют тот же module id/version, end record закрывает module execution/session | Candidate до activation → `FAILED`; module mismatch/session нельзя активировать → `BLOCKED` |
| `I3 authority` | Stable/network/install/publish/Git flags остались `false`; transient writes только command-owned verify exception | Попытка Terra писать либо фактическая запись вне declared roots → `FAILED`; Luna просит новую authority → `BLOCKED` |
| `I4 adapter` | Binding no-tools/no-workspace, каждый request имеет ровно один receipt и physical attempt | Adapter отсутствует, transport ambiguous либо model имеет workspace/tools → `BLOCKED` |
| `I5 execution log` | Execution-prefix имеет sequence строго +1, все достигнутые обязательные events и append-only corrections; boundary выбирается по правилу ниже | Append/snapshot failure → `BLOCKED`; фабрикация/перезапись evidence → `FAILED` |
| `I6 iterations` | На success сохранены ровно два immutable snapshots; iteration 2 может быть `no_change`; третьей правки нет | Третья materialization либо замена iteration-1 snapshot → `FAILED` |
| `I7 Luna calls` | На success выполнены prepare/review/verify, ровно по одному physical attempt, id/mode/schema совпадают | Недоступный/malformed/unknown/invalid call → `BLOCKED`; final `suspicious` → `FAILED` |
| `I8 stable hashes` | Path, bytes и SHA-256 всех `integrity_hash_inputs` совпадают before/after | Любое расхождение → `FAILED` |
| `I9 candidate scope` | Immutable candidate-root inventory показывает ровно один regular file `line-buffer.test.ts` | Production copy, directory/symlink/dependency или лишний artifact → `FAILED` |
| `I10 targeted oracles` | Обе targeted commands реально выполнены с exit code `0` | Выполнена и красная → `FAILED`; выполнить нельзя в authority → `BLOCKED` |
| `I11 project oracle` | `npm run verify` реально выполнен во второй итерации с exit code `0` | Выполнен и красный → `FAILED`; выполнить нельзя → `BLOCKED` |
| `I12 behaviour coverage` | Каждая required dimension имеет конкретный final test/assertion ref | Missing dimension или assertion против source → `FAILED` |
| `I13 final Luna state` | Outcome `ok`, unresolved critical findings отсутствуют | `suspicious` → `FAILED`; `unknown`/`invalid` → `BLOCKED` |

Каждый gate получает status `pass | failed | blocked | not_reached`. После
первого terminal condition будущие gates отмечаются `not_reached`; отсутствие
future artifacts, которые runbook запрещает фабриковать, не является новым
failure. Только `PASSED` и `PASSED_NO_LUNA_VALUE` требуют `pass` всех gates.

## Post-close audit

Если session активировалась, audit boundary — `module.session.ended`. Если
session не активировалась, boundary — `terra.evaluation.provisional`, записанный
после terminal reason; I2 и последующие session gates получают `not_reached`.

После этой boundary Terra уже не действует как builder и не может вызывать
Luna, менять candidate или создавать iteration artifacts. Она читает
завершённый execution-prefix, сверяет доступные records, event sequence,
manifests и oracles, после чего:

1. Превращает provisional gate statuses в final statuses.
2. Может только сохранить либо понизить provisional outcome; audit не повышает
   красный/blocked run до passed.
3. Создаёт immutable `final-report.yaml`.
4. Добавляет `evaluation.recorded`, затем `run.completed` последней строкой.

I5 намеренно проверяет prefix только до выбранной execution boundary, иначе
final report должен был бы доказать существование events, которые появляются
после самого report. Наличие двух terminal suffix events проверяет operator по
завершённому `events.jsonl`; это ограничение записывается в report.

Provisional outcome никогда не разрешает объявить completion. Run завершён
только если `final-report.yaml` существует, `evaluation.recorded` ссылается на
его hash, а `run.completed` является последним event. Failure любого из этих
трёх шагов даёт внешний `BLOCKED_POST_CLOSE_AUDIT`; provisional `PASSED` или
`PASSED_NO_LUNA_VALUE` не сообщается как final, а успешный suffix не
фабрикуется.

## Required behaviour matrix

Evaluator заполняет matrix ссылками на test names/assertions, а не `yes` со
слов автора:

```yaml
behaviour_coverage:
  complete_lf_lines:
    iteration_1_ref:
    iteration_2_ref:
  partial_line_across_chunks:
    iteration_1_ref:
    iteration_2_ref:
  crlf_and_split_delimiter:
    iteration_1_ref:
    iteration_2_ref:
  flush_tail_once_and_consume:
    iteration_1_ref:
    iteration_2_ref:
  empty_push_and_flush:
    iteration_1_ref:
    iteration_2_ref:
  completed_empty_lf_line:
    iteration_1_ref:
    iteration_2_ref:
```

Tests характеризуют текущее code-owned поведение. Они не повышают empty-line
semantics до постоянного normative contract.

## Две iteration records

```yaml
iterations:
  iteration_1:
    baseline_dimensions: 0
    post_prepare_dimensions: 0
    test_cases: 0
    targeted_exit_code:
    candidate_sha256:
  iteration_2:
    accepted_luna_findings: 0
    rejected_luna_findings: 0
    blocked_luna_findings: 0
    candidate_changed: false
    test_cases: 0
    targeted_exit_code:
    project_verify_exit_code:
    candidate_sha256:
```

`candidate.no_change` не отменяет iteration 2: boundary считается выполненной,
если triage, final snapshot, оба deterministic oracles и final Luna call реально
завершены. `candidate.no_change` требует одинаковых bytes/SHA-256 snapshots
iterations 1–2; `candidate.updated` требует разных hashes.

## Метрики Luna

Три findings — слишком маленькая выборка для честных процентов. Сохраняются
абсолютные counts и evidence refs:

```yaml
luna_metrics:
  calls_completed: 0
  physical_attempts: 0
  latency_ms_total: null
  input_tokens_or_units_total: null
  output_tokens_or_units_total: null
  prepare:
    proposed_mandatory: 0
    proposed_optional: 0
    accepted: 0
    rejected: 0
    new_vs_frozen_terra_plan: 0
  review:
    findings_total: 0
    evidence_backed: 0
    accepted: 0
    rejected_as_unsupported: 0
    rejected_as_style_only: 0
    blocked_or_out_of_scope: 0
  iteration_delta:
    required_dimensions_before: 0
    required_dimensions_after: 0
    incorrect_assertions_fixed: 0
    candidate_changed: false
    change_sources: []
  final:
    outcome:
    unresolved_critical: 0
    unsupported_or_noisy_findings: 0
```

Каждый `change_sources` item:

```yaml
- finding_id:
  source: luna_prepare | luna_review | targeted_oracle | terra_self_correction | mixed
  before_ref:
  after_ref:
  observed_effect:
  oracle_ref:
```

Исправление, вызванное только красным targeted oracle, нельзя приписывать Luna.
Prepare delta наблюдаем благодаря frozen pre-Luna plan, но один run всё равно не
доказывает, что Terra не получила бы ту же идею самостоятельно.

Trace-local attribution требует непрерывную evidence chain:

```text
luna_prepare:
terra-pre-luna-plan
→ prepare checklist item
→ accepted item в materialization-plan
→ test/assertion в iteration-1 snapshot

luna_review:
iteration-1 snapshot
→ review finding
→ accepted item в triage
→ связанный delta в iteration-2 snapshot
```

## Классификация вклада

Выбирается ровно один primary `contribution_kind`.

### `improvement`

Все условия обязательны:

- prepare item или review finding имеет конкретное source/card/test evidence;
- Terra приняла его до изменения candidate;
- snapshots показывают связанную правку или новую test dimension;
- изменение закрывает required dimension, исправляет неверное assertion либо
  добавляет нер redundant contract-relevant case;
- final targeted и project oracles зелёные.

### `guard`

Luna обнаружила фактическое нарушение work order/module card в Terra plan или
candidate, после чего нарушение удалено либо run корректно остановлен. Простое
повторение запрета без фактической ошибки не считается guard.

### `bounded_validation`

Все условия обязательны:

- Luna сопоставила каждую required dimension с конкретным final assertion ref;
- final response не ограничился пересказом зелёных exit codes;
- все три responses schema-valid;
- unsupported, stylistic и out-of-scope findings равны нулю;
- final outcome `ok`.

Это слабый validation signal, не доказательство экономической пользы.

### `none`

Luna только повторила card/oracle, дала generic `ok`, не вызвала наблюдаемого
decision/artifact delta или предложила лишь optional/style items.

### `harmful`

Luna предложила противоречащее source assertion, ослабление oracle, production
change, новую authority или изменение, которое Terra приняла и которое вызвало
regression. Безопасно отклонённое плохое предложение считается noise, но не
реализованным вредом.

## Claim verdict

Отдельно от terminal outcome записывается:

- `SUPPORTED_IN_RUN` — useful contribution есть, invalid и unsupported/noisy
  findings равны нулю, attribution не mixed;
- `MIXED` — useful contribution есть, но noise больше нуля либо change source
  равен `mixed`;
- `NOT_OBSERVED` — integrity/oracles прошли, contribution равен `none`;
- `CONTRADICTED_IN_RUN` — contribution `harmful` либо наблюдаемо нарушена bounded
  role Luna, даже если terminal outcome `BLOCKED`;
- `NOT_TESTED` — contribution нельзя оценить из-за раннего input,
  infrastructure или Terra-integrity stop; допустим и при раннем `BLOCKED`, и
  при раннем `FAILED`.

`SUPPORTED_IN_RUN` не означает causal superiority над Terra-only baseline.

## Terminal verdict rules

1. Stable/out-of-scope write, hash mismatch, красный выполненный oracle,
   missing required behaviour или final `suspicious` → `FAILED`.
2. Luna/adapter/input недоступны, required response malformed/unknown/invalid,
   log append/post-close suffix невозможен либо oracle требует новую authority
   → `BLOCKED`.
3. Все integrity gates прошли, final Luna outcome `ok`, contribution равен
   `improvement`, `guard` или `bounded_validation` → `PASSED`.
4. Все integrity gates прошли, final Luna outcome `ok`, contribution `none` →
   `PASSED_NO_LUNA_VALUE`.
5. Green tests не компенсируют failed integrity gate; полезный finding не
   компенсирует красный oracle.

## Evaluation section для final-report.yaml

```yaml
evaluation:
  schema: terra-luna-evaluation/v0
  work_order_version: 0.2.0
  integrity:
    I1_work_order:
    I2_module_session:
    I3_authority:
    I4_adapter:
    I5_execution_log:
    I6_iterations:
    I7_luna_calls:
    I8_stable_hashes:
    I9_candidate_scope:
    I10_targeted_oracles:
    I11_project_oracle:
    I12_behaviour_coverage:
    I13_final_luna_state:
  behaviour_coverage: {}
  iterations: {}
  luna_metrics: {}
  contribution:
    kind: improvement | guard | bounded_validation | none | harmful
    evidence_refs: []
    noise_refs: []
    summary:
  claim_verdict: SUPPORTED_IN_RUN | MIXED | NOT_OBSERVED | CONTRADICTED_IN_RUN | NOT_TESTED
  run_verdict: PASSED | PASSED_NO_LUNA_VALUE | BLOCKED | FAILED
  limitations:
    - no Terra-only control arm
    - no Git diff or repository-wide write audit
    - hashes cannot detect a file changed and restored between snapshots
    - events sequence cannot cryptographically prove historical append-only writes
    - final report audits the execution prefix, not its own two-event terminal suffix
    - Terra sees the module card and triages Luna; evaluation is not blind
    - Luna final call participates in a flow Luna already influenced
    - one simple primitive and one run do not establish transfer or statistics
    - matcher, scheduler, retrieval quality and learned routing are not exercised
  permitted_next_step:
    - run a separately preregistered Terra-only control
    - revise protocol and repeat with a new run id
    - stop and archive
```

## Допустимый вывод

TL-001 может подтвердить operational feasibility и trace-local вклад Luna. Он
не разрешает promotion module card, утверждение об экономии относительно
Terra-only, оценку precision/recall, вывод о переносимости или автоматическое
включение Luna во все задачи.

Следующий causal шаг после успешного integrity pilot — отдельный frozen
Terra-only control с тем же task, model version, budget, context и oracles.
