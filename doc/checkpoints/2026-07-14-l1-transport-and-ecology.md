# Checkpoint 2026-07-14 — L1 transport и agent ecology

Статус: active
Период: foundation L0 → первый L1 transport-profile slice
Область: local laboratory, realtime simulation, границы transport и следующий
пилот agent ecology.

Основание: [headless baseline](../evidence/traces/2026-07-14-l1-headless-baseline.md),
[local service smoke](../evidence/traces/2026-07-14-l1-local-service-smoke.md),
[transport profile slice](../evidence/traces/2026-07-14-transport-profile-slice.md),
[transport decision](../evidence/evaluations/2026-07-14-transport-profile-decision.md),
[completion plan](../campaigns/realtime-simulation/TRANSPORT_COMPLETION_PLAN.md)
и [agent ecology plan](../campaigns/agent-ecology/DETAILED_PLAN.md).

## Подтверждено

- L0 — наблюдаемый local runner только для allow-listed Node-задач; это не
  security sandbox и не Docker/VM среда (D-009).
- L1 grid core детерминирован: canonical command trace воспроизводит тот же
  state hash в headless replay (D-011 и headless baseline).
- Lab и Arena используют один browser-side RPC Hub при общем local authority;
  initial keyframe, reconnect tail, teardown и stale имеют real-socket evidence.
- Команды Arena передаются как intent; tick и sequence назначаются сервером,
  idempotency key участвует в обработке. Invalid input имеет observable rejection
  path.
- Текущая архитектурная ставка — project-local `PROFILE`, не extracted package и
  не module promotion (D-015).

## Противоречия и дрейф

- Явного противоречия в имеющемся evidence не зафиксировано.
- Риск дрейфа остаётся: typed RPC сам по себе не доказывает delivery semantics.
  Любая новая transport boundary должна пройти inventory и acceptance, иначе
  проект вновь начнёт придумывать локальный transport поверх `wenay-common2`.

## Неизвестно / заблокировано

- **P1:** нет end-to-end oracle для потери ответа critical RPC после применения
  side effect; нельзя утверждать non-retry только по текущему коду.
- **P2:** service restart recovery и browser reset UX не классифицированы.
- **P3:** нет browser-controller visual smoke для runtime-состояний reconnect,
  stale и reset; Node transport test намеренно этого не покрывает.
- Не существует второго независимого consumer/contrast transfer, поэтому
  package extraction запрещён.
- E0/E1 agent ecology не запускаются: её первый safe pilot зависит от закрытия
  P1–P3, чтобы агенты не опирались на неподтверждённую transport основу.

## Решения с прошлого checkpoint

- D-014: первый transport-profile slice реализован и проверен частично.
- D-015: transport остаётся project-local profile.
- D-016: будущая agent ecology — evidence pipeline: дешёвые scouts создают
  ограниченные попытки, дорогие adjudicators разбирают evidence; stable writes и
  публикация не делегируются.
- D-017: периодическая event-driven сводка становится обязательной точкой
  синхронизации фактов, решений и неизвестных.

## Следующая ставка

1. Выполнить P1: воспроизвести потерю RPC response после server-side apply,
   проверить ровно-один apply и typed terminal outcome без автоматического
   повтора.
2. Выполнить P2: определить и проверить terminal state/reconnect путь после
   restart service.
3. Выполнить P3: провести browser-controller visual smoke по этим состояниям.
4. Сразу создать следующий checkpoint и только затем открыть E1 — read-only
   scout pilot с фиксированным work order, cost ledger и deterministic verifier.

## До следующего checkpoint не делаем

- Не извлекаем shared transport package и не меняем статус `PROFILE`.
- Не выдаём agents права на stable write, publish, dependency installation или
  расширение authority.
- Не добавляем Docker, SSH publication или произвольный terminal execution в
  foundation runtime.

## Указатели на evidence

- [Project catalog](../catalog/ai-live.yaml)
- [Transport completion plan](../campaigns/realtime-simulation/TRANSPORT_COMPLETION_PLAN.md)
- [Transport steward plan](../progress/transport-steward-plan.md)
- [Agent ecology detailed plan](../campaigns/agent-ecology/DETAILED_PLAN.md)
- [Decisions D-009…D-017](../decisions/DECISIONS.md)
