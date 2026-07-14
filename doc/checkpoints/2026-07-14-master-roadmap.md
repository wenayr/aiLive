# Checkpoint 2026-07-14 — master roadmap и старт P1

Статус: active
Период: переход от разрозненных campaign plans к единой очереди работ.
Область: управление последовательностью разработки лаборатории; реализация P1
ещё не считается завершённой этим снимком.

Основание: [master roadmap](../roadmap/MASTER_ROADMAP.md),
[предыдущий L1 checkpoint](./2026-07-14-l1-transport-and-ecology.md),
[transport completion plan](../campaigns/realtime-simulation/TRANSPORT_COMPLETION_PLAN.md)
и [D-018](../decisions/DECISIONS.md).

## Подтверждено

- Собрана единая очередь из 100 проверяемых work packets с критериями готовности,
  зависимостями и воротами между фазами.
- Одновременно допускается только один implementation packet: **22 / P1
  response-loss oracle**.
- P1 остаётся правильной первой ставкой: это самая опасная не проверенная
  delivery-семантика, для которой уже есть bounded acceptance design.
- Docker, SSH/publication, external acquisition, package extraction и promotion
  помещены за отдельные decision gates; roadmap сам не даёт права их запускать.

## Противоречия и дрейф

- Сам факт появления roadmap не является evidence корректности transport и не
  закрывает P1–P3.
- Ранний план содержал бы ложную зависимость P1 от полного governance backlog;
  она устранена. P1 зависит только от актуального transport inventory и своего
  acceptance design.

## Неизвестно / заблокировано

- P1, P2 и P3 из предыдущего checkpoint остаются незакрытыми.
- E0 agent ecology заблокирован до G2/G3; не создаются agents, model routes или
  write authority раньше времени.
- Статусы остальных 99 пунктов — планирование, а не обещание наличия реализации.

## Решения с прошлого checkpoint

- D-018: лаборатория движется по dependency-aware master roadmap и выбирает
  следующий packet по evidence, а не по привлекательности новой функции.

## Следующая ставка

Реализовать и проверить 22 / P1: test-only seam теряет RPC response только
после server-side outcome, затем manual retry с тем же `clientCommandId`
доказывает ровно один canonical effect.

## До следующего checkpoint не делаем

- Не объявляем transport operationally complete.
- Не запускаем E1 agent ecology.
- Не переходим к P2, пока P1 не имеет собственного trace/evaluation.

## Указатели на evidence

- [Master roadmap](../roadmap/MASTER_ROADMAP.md)
- [Transport completion plan](../campaigns/realtime-simulation/TRANSPORT_COMPLETION_PLAN.md)
- [Project catalog](../catalog/ai-live.yaml)
- [Previous checkpoint](./2026-07-14-l1-transport-and-ecology.md)
