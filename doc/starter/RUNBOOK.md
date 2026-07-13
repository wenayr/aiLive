# Runbook первых семи сессий

Каждая сессия должна завершаться отдельным артефактом и коммитом candidate-ветки. Не объединяйте все режимы в один длинный автономный запуск.

## Сессия 1 — BUILD

Создать реальный vertical slice Networked Tank Arena обычным инженерным способом, соблюдая стандарт слоёв и фасадов. Не выделять пакеты заранее. Зафиксировать acceptance tests, dependency map и исходные решения.

Результат: работающий baseline и `project.yaml`.

## Сессия 2 — SCAN

Восстановить фактическую архитектуру baseline: ресурсы, преобразования, горизонтальные политики, фасады, потребители, тесты и места напряжения.

Результат: AS-IS карта без изменения stable.

## Сессия 3 — GENERATOR_HUNT

Рассмотреть перспективные участки по независимым векторам генерации: код, contracts, codecs, mocks, tests, adapters, facades, конфигурации, сценарии и MCP-проекции.

Результат: несколько generator candidates, включая аргументированное `NO_GENERATOR`.

## Сессия 4 — ACQUIRE

Для двух самых сильных кандидатов найти внешние библиотеки, generators, стандарты, MCP и близкие проекты. Сравнить `BUILD`, `ADAPT`, `COMPOSE`, `REJECT`. Ничего найденного не подключать в stable без карантина.

Результат: acquisition report с происхождением, лицензиями, рисками и pinned-версиями.

## Сессия 5 — EXTRACT

Материализовать ровно один candidate. Объявить source of truth, ownership mode generated-кода, public facades, tests, rollback и project binding.

Результат: candidate package или внутренний workspace package.

## Сессия 6 — TRANSFER

Подключить candidate к контрастному потребителю: Collaborative Scene Editor или Operations Dashboard. Не менять core только ради имитации переносимости; фиксировать все необходимые изменения.

Результат: второй usage profile, binding и измеренный Glue Ratio.

## Сессия 7 — REVIEW

Независимо проверить baseline, transfer, regression, сложность сопровождения и снижение контекста. Принять одно решение: `PROMOTE`, `PROFILE`, `FUSE`, `INLINE`, `ARCHIVE`, `REJECT`.

Результат: evidence-backed review и предлагаемая поправка genome.

## После цикла

Обновить:

1. фактические требования генетического модуля;
2. критерии решения о generator;
3. только те operational prompts, поведение которых должно измениться;
4. список неизвестных и следующий эксперимент.
