# Журнал архитектурных решений

## D-001 — Четыре плоскости знания

Статус: принято.

Диалог/design pressures, спецификация, operational instructions и evidence/decisions хранятся отдельно. Большой v5 считается исследовательским корпусом, а не runtime-инструкцией.

## D-002 — Наблюдение до предписания

Статус: принято.

`SCAN` сначала восстанавливает AS-IS без навязывания онтологии живых модулей. TO-BE и соответствие стандарту рассматриваются отдельным проходом.

## D-003 — Генераторизация как независимая ось

Статус: принято как рабочая модель.

Generator не является обязательным этапом зрелости и может производить не основной код, а tests, mocks, contracts, bindings или facades.

## D-004 — MCP как проекция

Статус: принято.

MCP создаётся только при необходимости независимого агентного доступа. Он не является критерием зрелости модуля.

## D-005 — Candidate и независимый review

Статус: принято.

Анализ, materialization и promotion разделяются. Stable не должен изменяться тем же проходом, который создал candidate. Техническое обеспечение этого правила относится к среде, а не к prompt.

## D-006 — Контролируемая интернет-проницаемость

Статус: принято как политика.

Внешние решения нужно рассматривать до дорогостоящей разработки с нуля, но код, skills и instructions проходят provenance, license check, quarantine, pinning и локальные tests.

## D-007 — Core, Profile, Binding

Статус: принято для module candidates этого проекта.

Разделение не должно использоваться SCAN как универсальная схема фактической архитектуры чужого кода.

## D-008 — Не одна идеальная архитектура

Статус: принято.

Генетический модуль предлагает варианты под разные цели: минимальная миграция, повторное использование, изоляция, контекстная экономия и стоимость сопровождения.

## D-009 — L0 как наблюдаемый local runner

Статус: принято для первого исполнимого baseline.

Первая лаборатория запускает только явным образом зарегистрированные локальные Node-задачи и показывает их состояние, trace и artifacts. Она не поднимает Docker/VM ради самого факта изоляции и не называется security sandbox. Docker остаётся будущим executor binding, если появится задача, которой нужна более сильная техническая граница.

## D-010 — Wenay bindings остаются bindings

Статус: принято для L0.

`wenay-common2` используется для typed RPC и event/replay transport, `wenay-react2` — для controller-first UI. Их детали не входят в resource/transform core. Локальная Vite-конфигурация принудительно разрешает один React runtime и один `wenay-common2`, потому что sibling package tree иначе способен создать несовместимые экземпляры hooks/runtime.

## D-011 — L1 начинается с детерминированного grid core

Статус: принято для первого realtime baseline.

`Networked Tank Arena` сначала реализуется как integer-grid simulation с фиксированным tick, явным `sequence` команд и каноническим hash state. Транспорт, React-экран и reconnect обязаны быть потребителями этого core. Это намеренно не попытка заранее выделить библиотеку: границы остаются baseline-кодом до отдельного SCAN/review.

## D-012 — Переход L1 из BUILD в SCAN; рост слоёв отложен

Статус: принято.

BUILD-handoff L1 зафиксирован 2026-07-14 после прохода project verification, headless replay acceptance и local service/UI smoke. Проект переходит в `L1_SCAN`: этот режим только восстанавливает AS-IS и не меняет stable-код. `realtime-simulation-baseline` остаётся `M1_CLEAN_LAYER`.

«Выращивание» границы разрешено не из-за её размера, фасадов или каталогов. Нужны: установленная SCAN независимая способность и повторяемое давление изменений; затем candidate в `.candidates/` с source of truth, rollback и сохранёнными baseline tests; contrast transfer; независимый reviewer. До этого допустимые решения — `KEEP_LOCAL` или `PROFILE`, а не promotion.

## D-013 — Транспорт рассматривается как целостный profile

Статус: запланировано к выполнению.

Проблема L1 не в отсутствии `wenay-common2`, а в частичном применении его primitives. Проект обязан описывать для каждой границы delivery class, владельца connection lifecycle, replay/recovery, idempotency и server guardrails. В первую очередь это исправляется как project-local transport profile: общий hub для одного authority, sequence-aware replay mirror, явная command policy и real-socket acceptance. Новый shared package запрещён до evidence повторного использования, contrast transfer и отдельного review.

## D-014 — Первый transport-profile slice выполнен локально

Статус: принято как промежуточный результат.

L0 и Arena теперь используют один browser-side RPC Hub для общего local authority; Arena state mirror подключается через `Replay.replaySubscribe`, а не plain `Listen.on`. Runtime передаёт server-owned command intent с idempotency key, после чего coordinator сам назначает canonical tick и sequence. RPC bindings получили явные limits, subscription ceiling, replay declaration и invalid-packet hooks. Реальный Socket.IO oracle доказал multiplexing и initial replay keyframe.

Это не promotion. Reconnect tail, teardown и stale уже имеют real-socket evidence; до операционной полноты остаются non-retry при in-flight failure и явный service-reset user state.

## D-015 — Transport остаётся project-local profile

Статус: принято по текущему evidence.

После реальных Socket.IO checks multiplexing, keyframe, reconnect tail, teardown и stale доказаны для L0/Arena. Решение — `PROFILE`: правила и owner остаются в этом проекте. `PROMOTE_CANDIDATE` запрещён до contrast transfer, source of truth вне Arena/Lab, rollback и независимого review. Операционная полнота текущего profile ещё требует P1 response-loss idempotency, P2 service-reset semantics и P3 browser-state smoke; они перечислены в `TRANSPORT_COMPLETION_PLAN.md`.

## D-016 — Будущая agent ecology строится как evidence pipeline

Статус: запланировано, заблокировано текущими transport P1–P3.

Дешёвые модели будут выполнять ограниченные scout-задачи и создавать candidate artifacts только в изолированной области. Дорогие модели получат роль adjudicator: анализировать конфликтующее evidence, риск и варианты решения. Детерминированные checks и независимый review сильнее любого model consensus. Ни один agent tier не получает неявное право менять stable, публиковать, устанавливать зависимости или расширять authority. Подробный execution plan: `doc/campaigns/agent-ecology/DETAILED_PLAN.md`.

## D-017 — Состояние проекта собирается event-driven checkpoints

Статус: принято.

После заметного delivery slice, нового противоречия, смены режима, handoff или
пяти существенных evidence-артефактов проект создаёт короткий checkpoint.
Checkpoint связывает подтверждённое, неизвестное, решения и ближайшую
проверяемую ставку с первичными traces/evaluations; он не подменяет evidence и
не может сам повысить зрелость модуля. `CURRENT.md` — вход для следующего
оператора или agent run, а исправление прошлого вывода создаёт новый снимок, не
переписывает историю.

## D-018 — Лаборатория движется по dependency-aware master roadmap

Статус: принято.

Работа лаборатории ведётся по единой нумерованной очереди, где у каждого
пункта есть критерий готовности, зависимости и статус. Одновременно в
реализации допускается только один `NOW` packet; следующий выбирается после
evidence и checkpoint, а не по привлекательности новой идеи. Docker, SSH,
внешние зависимости, package extraction и promotion остаются отдельными
decision gates, а не последствиями общего roadmap.

## D-019 — P1 подтверждает manual idempotent retry, но не завершает transport profile

Статус: принято.

Реальный Socket.IO oracle доказал ambiguous response-loss case: server-side
intent сохраняется один раз, ordinary RPC не повторяется автоматически после
disconnect, а явный retry с тем же `clientCommandId` возвращает сохранённый
outcome без второго canonical effect. Это закрепляет command policy текущего
project-local `PROFILE`; P2 service reset и P3 browser truthfulness остаются
обязательными до operational completion. Extraction и agent ecology не
разрешаются этим результатом.
