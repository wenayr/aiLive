# Первая кампания: Realtime Simulation Lab

## Почему этот проект

Первый полигон должен быть достаточно сложным, чтобы породить реальные архитектурные напряжения, но иметь конечную проверяемую границу. Поэтому предлагается не MMO целиком, а лаборатория авторитетных realtime-систем с первым сценарием `Networked Tank Arena`.

Проект одновременно проверяет:

- resource и transformation layers;
- разные consumer facades;
- realtime transport и reconnect;
- contracts, codecs и generated mocks;
- deterministic simulation и replay;
- procedural scenario generation;
- debug/evidence pipeline;
- перенос candidates в негровые потребители.

## Vertical slice

Должны работать:

1. Авторитетный сервер с фиксированным simulation tick.
2. Два web-клиента и минимум два server-side bot-клиента.
3. Управление корпусом, башней и снарядом с простым damage model.
4. Версионируемый command/event protocol.
5. Snapshot, reconnect и продолжение сессии.
6. Replay из seed и входных команд.
7. Процедурная карта из scenario spec.
8. Debug stream с timeline, state inspection и event injection в тестовом режиме.
9. Web-панель текущих соединений, tick lag и рассинхронизаций.
10. Автоматические acceptance tests без ручной игры.

## Non-goals первой версии

- массовая MMO-инфраструктура;
- финальные 3D assets и production rendering;
- сложная физика разрушений;
- экономика, аккаунты и matchmaking;
- marketplace модулей;
- автономный self-evolution;
- публикация внешнего MCP.

Non-goals ограничивают продукт, но не делают инженерную задачу игрушечной.

## Baseline acceptance

- одинаковые seed и команды дают одинаковый state hash;
- replay заканчивается тем же state hash, что live session;
- временное отключение клиента восстанавливает session без потери critical commands;
- transient telemetry может теряться без нарушения simulation invariants;
- несовместимая версия protocol завершается типизированной ошибкой;
- debug facade наблюдает все события, runtime facade не получает debug-only операции;
- scenario spec создаёт валидную проходимую карту;
- headless acceptance запускается одной документированной командой.

## Архитектурные гипотезы, но не предписанная структура baseline

После SCAN ожидается проверить, существуют ли самостоятельные candidates:

- `protocol family` → types, codecs, validators, client/server stubs, mocks и contract tests;
- `transport profile` → reconnect, delivery classes, metrics и test harness;
- `simulation schema` → components, snapshots, hashing и replay;
- `scenario spec` → map, bot setup и acceptance trace;
- `facade manifest` → runtime/debug/testing/agent projections;
- `realtime suite` → композиционный макромодуль над доказанными нижними частями.

Ожидаемость не является доказательством. SCAN должен быть способен не обнаружить эти границы.

## Последовательность

### Этап A — честный baseline

BUILD создаёт работающий slice без преждевременного package extraction. Сохраняются архитектурные решения, tests и traces.

### Этап B — слепой AS-IS

SCAN выполняется без списка ожидаемых candidates. Его вывод сравнивается с картой гипотез только после завершения.

### Этап C — ортогональный generator hunt

Минимум три разных участка рассматриваются по всем векторам генерации. Для каждого обязателен вариант `NO_GENERATOR`.

### Этап D — internet acquisition

Для двух candidates сравниваются зрелая внешняя реализация, собственный generator и композиция. В stable ничего не устанавливается.

### Этап E — materialization

Выбирается один candidate с высоким ожидаемым leverage и сильным oracle. Хороший первый выбор — protocol family, потому что source of truth и outputs формализуемы.

### Этап F — контрастный transfer

Candidate проверяется по очереди на одном из проектов:

- `Collaborative Scene Editor`: presence, concurrent commands, conflicts и history;
- `Operations Dashboard`: streaming telemetry, backfill, alerts и replay.

Core не должен содержать `Tank`, `Projectile` или игровые auth assumptions, если они не объявлены usage profile.

### Этап G — independent review

Reviewer сравнивает candidate не только с baseline, но и с вариантом оставить слой внутри проекта.

## Наиболее ценные первые generator candidates

### 1. Protocol family generator

Source: versioned message schema.

Outputs: TypeScript types, binary/JSON codecs, validators, compatibility table, mock peers, contract tests и trace decoder.

Преимущество: сильный oracle и несколько потребителей.

Риск: generated code начнут править вручную; поэтому предпочтителен `SPEC_OWNED`.

### 2. Scenario generator

Source: declarative scenario spec и seed.

Outputs: arena layout, spawn graph, bot setup, expected invariants и replay fixture.

Преимущество: генерация одновременно создаёт продукт и проверку.

Риск: валидность карты не равна интересному gameplay; визуальная/игровая оценка остаётся отдельным oracle.

### 3. Facade projection generator

Source: canonical operation registry и consumer policies.

Outputs: runtime/debug/testing facades, capability manifest и permission tests.

Преимущество: проверяет идею пересекающихся фасадов.

Риск: новый метаслой может оказаться дороже нескольких ручных exports.

## Критерий завершения кампании

Кампания успешна, если получен хотя бы один candidate, который:

- воспроизводимо работает в baseline;
- переносится в контрастный сценарий;
- имеет тонкий binding;
- уменьшает стоимость следующего изменения;
- проходит независимый review;
- либо честно отвергнут с evidence, которое улучшает критерии генетического модуля.

Отрицательный результат также полезен, если он обнаруживает ложный сигнал генераторизации или модульности.
