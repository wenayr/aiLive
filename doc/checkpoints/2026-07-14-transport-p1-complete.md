# Checkpoint 2026-07-14 — Transport P1 complete

Статус: active
Период: response-loss acceptance packet.
Область: ordinary Arena RPC после server-side apply и до delivery response.

Основание: [P1 trace](../evidence/traces/2026-07-14-transport-p1-response-loss.md),
[P1 evaluation](../evidence/evaluations/2026-07-14-transport-p1-evaluation.md),
[transport completion plan](../campaigns/realtime-simulation/TRANSPORT_COMPLETION_PLAN.md)
и [P1 real-socket test](../../src/lab/bindings/web/project-transport.test.ts).

## Подтверждено

- После server-side save/schedule потеря RPC response отклоняет исходный
  ordinary call; библиотека не выполняет скрытый retry после reconnect.
- До ручного retry server видел один `submitIntent` и хранит одну queued
  canonical command.
- Ручной retry с тем же `clientCommandId` возвращает сохранённый outcome и не
  создаёт второй command/effect.
- `npm run verify` и `npm run acceptance:realtime` прошли; canonical replay
  hash остался `badf946a`.

## Противоречия и дрейф

- В P1 не найдено противоречие declared command policy.
- Предыдущее «P1 не проверен» больше не должно встречаться как active tension;
  старые traces остаются историческими снимками.

## Неизвестно / заблокировано

- **P2:** restart service не имеет versioned terminal reset semantics.
- **P3:** browser controller ещё не доказал truthful presentation recovering,
  stale и reset states.
- Transfer consumer отсутствует; transport остаётся local `PROFILE`.

## Решения с прошлого checkpoint

- D-019: P1 принят как evidence-backed property project-local profile, но не
  как основание для extraction или operational-complete status.

## Следующая ставка

24 / P2: ввести server-generated session epoch в Arena snapshot/update,
очищать старый mirror при его смене и доказать real-socket restart reset.

## До следующего checkpoint не делаем

- Не автоматизируем retry critical commands.
- Не открываем agent ecology E1.
- Не меняем `PROFILE` на package candidate.

## Указатели на evidence

- [P1 trace](../evidence/traces/2026-07-14-transport-p1-response-loss.md)
- [P1 evaluation](../evidence/evaluations/2026-07-14-transport-p1-evaluation.md)
- [Master roadmap](../roadmap/MASTER_ROADMAP.md)
