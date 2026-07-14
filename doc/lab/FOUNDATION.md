# L0 — AI Live Laboratory Foundation

## Решение

Первый исполнимый срез — не Docker-платформа и не автономная система агентов. Это локальная наблюдаемая лаборатория: оператор выбирает зарегистрированную задачу, запускает её обычным процессом Node, видит переходы состояния, поток лога, итог и сохранённые артефакты.

Это соответствует рабочему циклу проекта: сначала построить честный baseline, затем отдельно запускать `SCAN`, `GENERATOR_HUNT`, `EXTRACT` и `REVIEW`. Лаборатория становится местом, где эти будущие режимы смогут выполняться и оставлять evidence, но пока не имитирует их наличие.

## L0 scope

- Типизированный registry задач с явным task version, инструкцией, командой, timeout и capabilities.
- Локальный runner только для allow-listed задач; shell и browser-supplied command line отсутствуют.
- Канонические run states, append-only events и ограниченный live log.
- Runtime/debug/testing facades с разными возможностями.
- RPC transport через `wenay-common2` и наблюдаемый React UI через `wenay-react2`.
- Каталог `.laboratory/` для живых run records и artifacts; curated evidence остаётся в `doc/evidence/`.
- Несколько fixture-задач: успех, намеренная ошибка и отменяемое ожидание.

## Не входит в L0

- Docker, VM, Kubernetes или multi-tenant isolation.
- SSH executor, публикация, credentials и arbitrary terminal.
- Multiplayer simulation, Tank Arena, MCP, marketplace, self-evolution, генераторы или package extraction.
- Обещание security sandbox: локальный процесс ограничен policy runner-а, но не контейнерной границей.

## Почему без Docker

Сейчас главный неизвестный — полезность цикла «задача → запуск → наблюдение → evidence», а не способ упаковать ОС. Контейнер добавил бы образ, volumes, network policy, lifecycle и собственные диагностики прежде, чем доказан сам вертикальный путь. Когда появится задача, которой недостаточно ограниченного local runner-а, Docker будет отдельным `executor` binding за тем же контрактом.

## Критерий завершения L0

L0 завершён, когда чистый checkout проходит единую verify-команду, оператор видит запуск и его live-изменения в браузере, три разных terminal outcome сохраняются воспроизводимо, а документированная граница безопасности остаётся честной. После этого начинается отдельная BUILD-сессия L1 — `Realtime Simulation Lab`, а не расширение L0 до бесконечной платформы.
