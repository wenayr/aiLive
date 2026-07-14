# Pilot TL-001 — Terra выполняет candidate-задачу, Luna проверяет модуль

Статус: `PROTOCOL_READY_ADAPTER_BINDING_REQUIRED`, не запущен.

Packet можно передать Terra, но в текущем виде он условно исполним: operator
сначала обязан предоставить реальный no-tools Luna adapter. Обычный workspace
subagent не подходит и должен привести к `BLOCKED_LUNA_ADAPTER_UNAVAILABLE`.

## Зачем этот pilot

Проверить минимальный operational loop до реализации Git matcher, scheduler и
настоящего model router:

```text
work order
→ Terra получает bounded scope
→ Terra входит в объявленную module session
→ Terra вызывает Luna через genetic-check role
→ Terra материализует candidate
→ deterministic oracle
→ Luna проверяет результат
→ Terra выполняет ровно одну correction iteration
→ final oracle + module close
→ post-close audit + append-only final report
```

Pilot проверяет orchestration, authority, logging и полезность Luna на одном
маленьком примере. Он не доказывает эффективность всей генетической системы:
для причинного вывода позже потребуется отдельный control run без Luna/card.

## Задача

Создать candidate test suite для существующего
`src/lab/utility/line-buffer.ts`. Stable implementation не меняется. Candidate
должен характеризовать разбиение chunks на завершённые строки, сохранение tail
и поведение `flush`.

Это намеренно простая задача:

- реальный project primitive уже существует;
- oracle выполняется за секунды;
- есть содержательные edge cases;
- Luna способна принести конкретное замечание либо показать, что её вызов был
  лишним;
- candidate полностью удаляем.

## Порядок чтения Terra

1. [WORK_ORDER.yaml](./WORK_ORDER.yaml).
2. [MODULE_CARD.yaml](./MODULE_CARD.yaml).
3. [LOG_PROTOCOL.md](./LOG_PROTOCOL.md).
4. [LUNA_ADAPTER_CONTRACT.md](./LUNA_ADAPTER_CONTRACT.md).
5. [LUNA_PROTOCOL.md](./LUNA_PROTOCOL.md).
6. [TERRA_RUNBOOK.md](./TERRA_RUNBOOK.md).
7. [EVALUATION.md](./EVALUATION.md).

## Как operator запускает Terra

1. Выбирает новый `RUN_ID` из `[a-z0-9-]`.
2. Связывает alias Luna с конкретной моделью через no-tools adapter; credentials
   Terra не передаются.
3. Передаёт Terra `RUN_ID`, `TERRA_BINDING`, `LUNA_BINDING` и opaque
   `LUNA_CALL`.
4. Передаёт последнюю цитату из раздела `Activation instruction для Terra` в
   `TERRA_RUNBOOK.md`.
5. После этого не подсказывает решение внутри run: Terra начинает с Phase 0,
   проходит две iteration boundaries, закрывает module session, выполняет
   post-close audit и сама останавливается.

Если adapter не удовлетворяет contract, запуск должен закончиться `BLOCKED`, а
не незаметной заменой Luna другим агентом.

## Артефакты запуска

Live-артефакты не коммитятся:

```text
.candidates/terra-luna-001/<run-id>/
└── line-buffer.test.ts

.laboratory/genetic-supervision/terra-luna-001/<run-id>/
├── events.jsonl
├── module-session-start.yaml
├── module-session-end.yaml
├── source-snapshot-before.json
├── source-snapshot-after.json
├── candidate-root-inventory.json
├── artifact-manifest-final.json
├── iteration-1/
├── iteration-2/
├── luna/
└── final-report.yaml
```

Git diff в v0 не используется. Контроль ограничен declared scope, tool log,
полными candidate snapshots и SHA-256 manifest до/после. Это осознанное
ограничение первого pilot, а не предлагаемая постоянная policy.

Единственное write-исключение вне run roots принадлежит самой базовой команде
`npm run verify`: она создаёт ignored outputs в `dist/web/` и временно в
`.laboratory/test-runs/`. Terra не получает произвольного write-доступа к этим
paths и не считает их продуктом pilot.

«Войти в модуль» здесь означает не метафору и не отдельный процесс: Terra
сверяет `module_id/version`, связывает входящую agent task с module card,
создаёт immutable start record и только после этого получает право писать
candidate. Перед каждым из трёх вызовов Luna Terra повторно фиксирует module
checkpoint; после оценки закрывает session отдельным end record.

## Terminal outcomes

- `PASSED` — обе итерации и обязательные oracles завершены, final Luna verdict
  `ok` и есть evidence-backed improvement, guard или bounded validation;
- `PASSED_NO_LUNA_VALUE` — задача прошла, но Luna не добавила полезного сигнала;
- `BLOCKED` — Luna/adapter недоступны, infrastructure append невозможен,
  authority/input отсутствует или oracle нельзя выполнить в объявленном scope;
- `FAILED` — нарушена authority, evidence сфабрикован/переписан, обязательный
  oracle не прошёл либо после двух итераций остался critical finding.

Третья materialization iteration запрещена. Новый цикл требует нового run id и
work order version.
