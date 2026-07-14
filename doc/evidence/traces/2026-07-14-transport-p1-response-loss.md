# Transport P1 — response-loss idempotency oracle — 2026-07-14

Статус: passed.

## Вопрос

Что происходит, если Arena server уже сохранил outcome и поставил canonical
command в очередь, но RPC response не дошёл до клиента?

## Oracle

`src/lab/bindings/web/project-transport.test.ts` поднимает настоящий local
Socket.IO service. Test-only composition hook существует только в
`createLabService`: после `arenaCoordinator.submitIntent()` он разрывает
response path до отправки RPC `RESP`. Этот hook не входит в Arena runtime
facade и не доступен browser client.

Тест проверяет последовательность:

1. Первый `submitIntent` с `clientCommandId: p1-response-loss-fire` сохраняет
   outcome, но promise клиента отклоняется из-за разрыва соединения.
2. Клиент вручную reconnect-ится; до явного retry server видел ровно один
   `submitIntent` и имеет ровно одну queued canonical command.
3. Ручной retry с тем же idempotency key возвращает исходный accepted outcome;
   число queued commands остаётся равным одному.
4. Два ручных tick-а применяют один `projectile-fired` effect в назначенном
   canonical tick.

## Команды и результат

```sh
npm run typecheck
npm run test -- --test-name-pattern "ordinary Arena RPC"
npm run verify
npm run acceptance:realtime
```

Все команды завершились успешно: 8 L0/binding tests, 10 realtime tests,
production build и headless replay acceptance. Последняя acceptance сохранила
равные live/replay hashes `badf946a`.

## Ограничение

Oracle доказывает только выбранный ambiguous-response case. Он не определяет
service restart semantics (P2) и не доказывает browser presentation state (P3).
