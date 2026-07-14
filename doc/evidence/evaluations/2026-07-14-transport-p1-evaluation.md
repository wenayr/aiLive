# Evaluation — Transport P1 response loss — 2026-07-14

Решение: сохранить `PROFILE` как project-local transport policy.

## Наблюдение

Реальный Socket.IO oracle подтвердил: обычный RPC не получает автоматический
retry после потери response. Серверный idempotency ledger возвращает тот же
typed outcome при единственном ручном retry с тем же `clientCommandId`; второй
canonical command и второй simulation effect не появляются.

## Интерпретация

Critical command policy теперь имеет end-to-end evidence для наиболее опасной
неоднозначности: «outcome мог быть применён, а ответ потерян». UI/client не
должны угадывать delivery и не должны повторять вызов автоматически; повтор
только явный и с тем же idempotency identity.

## Ограничения

- Проверен один project-local Arena boundary, а не transfer consumer.
- P2 service-reset semantics и P3 browser-state smoke остаются обязательными.
- Это не evidence для package extraction или module promotion.

## Следующее решение

Перейти к P2: добавить server-generated session epoch и проверить terminal
reset вместо ложного replay recovery после restart service.
