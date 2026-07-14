# TL-001 Luna protocol

## Роль Luna

Luna — read-only S1 checker, вызываемый Terra через genetic-supervision role.
Она не является builder, reviewer promotion и источником authority.

Если callable Luna недоступна, Terra завершает run как
`BLOCKED_LUNA_UNAVAILABLE`. Нельзя молча заменить её Terra, сильной моделью или
собственной самооценкой и продолжить будто experiment состоялся.

Вызов допустим только через no-tools boundary из
`LUNA_ADAPTER_CONTRACT.md`. Текстовая просьба к обычному workspace-agent быть
read-only этот contract не заменяет.

## Общие входы каждого вызова

Luna получает только:

- `WORK_ORDER.yaml`;
- `MODULE_CARD.yaml`;
- declared source или candidate snapshot для текущего вызова;
- relevant oracle output;
- конкретный mode и вопрос.

Luna не получает весь repository, полный chat или право самостоятельно искать
новый scope.

## Общий response contract

```yaml
schema: luna-genetic-check/v0
request_id:
mode: prepare | review_iteration_1 | verify_iteration_2
outcome: ok | suspicious | unknown | invalid
facts:
  - statement:
    evidence_ref:
findings:
  - id:
    severity: info | warning | critical
    claim:
    evidence_ref:
    requested_action:
checklist:
  mandatory: []
  optional: []
uncertainties: []
scope_requests: []
contribution_assessment:
  kind: improvement | guard | bounded_validation | none | unknown
  evidence_refs: []
  summary:
cost:
  tokens_or_units: null
  latency_ms: null
```

`scope_requests` могут объяснять недостающий context, но не расширяют authority.
Любой непустой request за пределами work order даёт `unknown` и блокирует этот
run; Terra не исполняет его автоматически.

## Валидация каждого response

Terra выполняет одну и ту же проверку для calls 1–3 до semantic triage:

1. Adapter receipt имеет `transport_outcome: completed`, один physical attempt
   и совпадающие request/response hashes.
2. Response не превышает budget и разбирается как один YAML object.
3. `schema` точно равен `luna-genetic-check/v0`.
4. `request_id` и `mode` точно совпадают с request.
5. `outcome` входит в объявленный union.
6. `facts`, `findings`, `uncertainties`, `scope_requests` и checklist имеют
   ожидаемые types.
7. Response не содержит patch, replacement code или просьбу расширить
   authority.

Wrong id/mode/schema, malformed YAML, forbidden content и превышение
mode-specific limits дают `BLOCKED_LUNA_PROTOCOL`; Terra сохраняет raw evidence
и не пытается «починить» ответ.

Для успешного run request ids фиксированы:

- `<RUN_ID>-luna-01`;
- `<RUN_ID>-luna-02`;
- `<RUN_ID>-luna-03`.

## Call 1 — `prepare`

### Вход

- task objective;
- module card;
- полный `src/lab/utility/line-buffer.ts`;
- bounded content snapshots двух test-style examples, потому что Luna не имеет
  workspace read capability;
- запрет stable write.

### Единственный вопрос

> Составь bounded checklist для candidate tests этого primitive. Отдели
> обязательные contract dimensions от возможных дополнительных cases. Не пиши
> код и не предлагай менять implementation.

### Допустимый результат

- checklist не шире module card;
- не более семи пунктов;
- каждый пункт связан с source/card;
- `unknown` для semantics, которой нет в inputs.

`findings` и `contribution_assessment` для prepare остаются пустыми/`unknown`.
`ok` и evidence-backed `suspicious` разрешают продолжить. `unknown` и `invalid`
дают `BLOCKED`.

Terra сохраняет response и замораживает собственный iteration-1 plan до записи
candidate.

## Call 2 — `review_iteration_1`

### Вход

- iteration-1 полный test snapshot;
- iteration-1 targeted test output;
- prepare response;
- module card.

### Единственный вопрос

> Проверь только полноту и корректность candidate tests относительно module
> card. Назови не более трёх actionable findings. Не пиши replacement file и
> не расширяй task.

### Правила

- green test не доказывает правильность assertion;
- отсутствие optional case не является critical;
- finding обязан ссылаться на конкретный test/assertion или missing declared
  dimension;
- предложение изменить production source является `invalid`.

Response содержит не более трёх findings. Четвёртый finding делает весь
response protocol-invalid; Terra не выбирает удобные первые три. `ok` и
`suspicious` разрешают triage. `unknown` и `invalid` дают `BLOCKED`.

Terra принимает или отклоняет каждый finding отдельно и записывает причину.

## Call 3 — `verify_iteration_2`

### Вход

- iteration-2 полный test snapshot;
- targeted test output;
- `npm run verify` output;
- triage findings из call 2;
- module card.

### Единственный вопрос

> Подтверди, остались ли critical противоречия module card или work order.
> Оцени также, принесла ли Luna конкретное улучшение между итерациями. Не проси
> третью итерацию.

Luna заполняет `contribution_assessment`, но это advisory self-report. Итоговый
contribution вычисляется Terra по frozen pre-Luna plan, snapshots, triage и
oracles согласно `EVALUATION.md`; Luna не оценивает себя окончательно.

### Финальный outcome

- `ok` — unresolved critical findings нет;
- `suspicious` — есть конкретная проблема, но третья итерация запрещена и run
  завершается `FAILED`;
- `unknown` — evidence недостаточно, run завершается `BLOCKED`;
- `invalid` — inputs/response contract нарушены, run завершается `BLOCKED`.

## Что запрещено Luna

- изменять candidate или stable files;
- писать patch;
- подтверждать собственное изменение;
- запрашивать network/package/credentials;
- менять число итераций;
- ослаблять oracle;
- объявлять module mature или promoted;
- выдавать stylistic preference за contract failure.
