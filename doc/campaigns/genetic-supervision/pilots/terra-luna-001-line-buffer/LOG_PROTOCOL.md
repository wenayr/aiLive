# TL-001 append-only log protocol

## Назначение

Лог должен позволить восстановить, что Terra прочитала, что спросила у Luna,
какое решение приняла, какой artifact создала и какие команды действительно
выполнились. Итоговый рассказ без событий не считается логом.

## Каталог

Для предоставленного `run-id` Terra создаёт:

```text
.laboratory/genetic-supervision/terra-luna-001/<run-id>/
├── events.jsonl
├── module-session-start.yaml
├── module-session-end.yaml
├── source-snapshot-before.json
├── source-snapshot-after.json
├── candidate-root-inventory.json
├── artifact-manifest-final.json
├── iteration-1/
│   ├── candidate-manifest.json
│   ├── line-buffer.test.ts
│   ├── terra-pre-luna-plan.yaml
│   ├── materialization-plan.yaml
│   ├── targeted-test.txt
│   └── result.yaml
├── iteration-2/
│   ├── candidate-manifest.json
│   ├── line-buffer.test.ts
│   ├── triage.yaml
│   ├── targeted-test.txt
│   ├── project-verify.txt
│   └── result.yaml
├── luna/
│   ├── 01-prepare-request.yaml
│   ├── 01-prepare-response.yaml
│   ├── 01-prepare-receipt.yaml
│   ├── 02-review-request.yaml
│   ├── 02-review-response.yaml
│   ├── 02-review-receipt.yaml
│   ├── 03-verify-request.yaml
│   ├── 03-verify-response.yaml
│   └── 03-verify-receipt.yaml
└── final-report.yaml
```

Iteration snapshot — полная копия candidate file на границе итерации, а не
diff. Earlier snapshots не переписываются.

## Формат события

Каждая строка `events.jsonl` — один JSON object:

```json
{"sequence":1,"at":"2026-07-14T00:00:00.000Z","iteration":0,"actor":"Terra","kind":"run.started","status":"ok","summary":"TL-001 started","refs":[],"metrics":{}}
```

Обязательные поля:

- `sequence` — целое число, строго +1;
- `at` — ISO timestamp;
- `iteration` — `0`, `1` или `2`;
- `actor` — `Terra`, `Luna`, `S0` или `operator`;
- `kind` — объявленный event kind;
- `status` — `started`, `ok`, `failed`, `blocked` или `unknown`;
- `summary` — одна фактическая фраза;
- `refs` — paths созданных request/response/output/snapshot artifacts;
- `metrics` — duration, exit code, token/cost units, bytes либо пустой object.

Нельзя записывать credentials, environment secrets или скрытое reasoning.
Нужны observable inputs, decisions и outcomes, а не chain-of-thought.

## Обязательные event kinds

### Initialization

1. `run.started`
2. `authority.checked`
3. `paths.created`
4. `inputs.read`
5. `module.session.started`
6. `source.snapshot.before`

### Iteration 1

7. `module.checkpointed`
8. `terra.baseline.plan.recorded`
9. `luna.prepare.requested`
10. `luna.prepare.responded`
11. `terra.plan.frozen`
12. `candidate.written`
13. `oracle.targeted.started`
14. `oracle.targeted.finished`
15. `iteration.snapshot.saved`
16. `iteration.completed`

### Iteration 2

17. `module.checkpointed` для review
18. `luna.review.requested`
19. `luna.review.responded`
20. `terra.feedback.triaged`
21. `candidate.updated` либо `candidate.no_change`
22. `oracle.targeted.started`
23. `oracle.targeted.finished`
24. `oracle.project.started`
25. `oracle.project.finished`
26. `iteration.snapshot.saved`
27. `candidate.inventory.saved`
28. `module.checkpointed` для final verify
29. `luna.verify.requested`
30. `luna.verify.responded`
31. `iteration.completed`

### Finalization

32. `source.snapshot.after`
33. `authority.rechecked`
34. `artifacts.manifested`
35. `terra.evaluation.provisional`
36. `module.session.ended`
37. `evaluation.recorded`
38. `run.completed`

Дополнительные events разрешены, но обязательные не пропускаются. При blocked
ветке невыполнимые будущие events не фабрикуются; записываются `run.blocked` и
`run.completed` с точной причиной.

## Append-only правило

- Существующая строка никогда не редактируется и не удаляется.
- Ошибка в предыдущем событии исправляется новым `log.correction` с
  `corrects_sequence`.
- Candidate snapshot итерации 1 не заменяется snapshot итерации 2.
- Plan, result, triage, Luna request/response/receipt, command output, snapshot,
  candidate inventory и module-session record создаются один раз и затем
  immutable.
- Каждый event, создающий artifact, записывает его bytes и SHA-256 в `metrics`.
- Если append или snapshot не удался, Terra прекращает materialization и
  завершает run как `BLOCKED`.

`artifact-manifest-final.json` перечисляет path, bytes и SHA-256 всех immutable
run artifacts, существующих до evaluation. Сам `events.jsonl`, manifest и
`final-report.yaml` в него не входят. Это обнаруживает случайное последующее
переписывание artifacts, но не является криптографическим доказательством
истории действий Terra.

`candidate-root-inventory.json` создаётся после final candidate freeze. Он
перечисляет каждую direct/recursive entry candidate root с относительным path,
kind, bytes и SHA-256 для files. PASS требует ровно один file
`line-buffer.test.ts` и ни одного directory/symlink/другого entry. Inventory
является evidence для candidate-scope gate, а не заменой filesystem isolation.

## Snapshot без Git diff

До первой candidate write Terra сохраняет SHA-256, bytes и path для каждого
`integrity_hash_inputs` из work order. После второй итерации повторяет snapshot.
Минимальный формат:

```json
{
  "algorithm": "SHA-256",
  "files": [
    {
      "path": "src/lab/utility/line-buffer.ts",
      "bytes": 0,
      "sha256": "..."
    }
  ]
}
```

Список не дублируется здесь: source of truth — точный
`integrity_hash_inputs` в `WORK_ORDER.yaml`. Before/after mismatch означает
`FAILED_AUTHORITY_CHECK`, даже если tests зелёные. Snapshot всё ещё не
доказывает отсутствие изменения и восстановления файла между границами или
записи в не перечисленный stable path; ограничения явно записываются в final
report. Полный Git change control будет следующей версией protocol.

## Command record

Для каждой команды до запуска создаётся `*.started` event с точной command и
canonical repository cwd и timeout. После завершения сохраняются:

- exit code;
- elapsed milliseconds;
- stdout/stderr artifact path;
- verdict `passed/failed`.

Нельзя пересказывать предполагаемый результат команды, которую фактически не
запускали.

`npm run verify` имеет одно узкое исключение: сама команда может создавать
игнорируемые build/test outputs только под `dist/web/` и
`.laboratory/test-runs/`. Это не stable write. Terra не редактирует эти paths
напрямую и логирует исключение в `oracle.project.started`.

## Module session records

`module-session-start.yaml` создаётся один раз до первой candidate write и не
переписывается. Он содержит `run_id`, issuer, assignee, `module_id`,
`module_version`, work-order version, Terra/Luna model binding metadata,
objective, allowed roots, activation time и status `active`.

`module-session-end.yaml` создаётся после provisional evaluation и до
post-close audit. Он содержит ссылку на start record, число фактических
materialization iterations и Luna calls, Terra provisional outcome,
deactivation time и status `closed`. Final outcome находится только в
`final-report.yaml` и может совпасть с provisional либо быть понижен audit-ом.
Этот record закрывает module session, но не весь run; run закрывает только
последний event `run.completed` после успешного post-close audit.

Перед каждым вызовом Luna событие `module.checkpointed` фиксирует неизменные
`module_id/version`, текущую iteration, mode следующего вызова и refs на
актуальные artifacts. Несовпадение module card и start record блокирует run.

Если run останавливается после активации module session, Terra всё равно
создаёт end record и `module.session.ended` через terminal-finally path. Если
сломался сам append, отсутствие этих записей остаётся наблюдаемым failure;
Terra сообщает `BLOCKED_LOG_UNAVAILABLE` operator и не фабрикует задним числом
успешное завершение.
