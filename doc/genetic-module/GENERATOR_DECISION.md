# Решение о создании генератора

Генераторизация — самостоятельная ось зрелости. Она не обязана предшествовать package или MCP и не определяется размером кода.

## Ортогональные вопросы

Для участка отдельно проверить возможность генерации:

- основного кода;
- mocks и fixtures;
- tests и test matrix;
- schemas, codecs и типов;
- adapters и project bindings;
- consumer, debug и testing facades;
- конфигураций и deployment profiles;
- примеров, scenarios и стендов;
- архитектурного каркаса;
- MCP-проекции;
- составного маршрута из других модулей.

Плохой candidate для генерации business logic может быть сильным candidate для test matrix или binding generator.

## Необходимые условия

Generator candidate заслуживает эксперимента, если одновременно правдоподобны следующие утверждения:

- существует семейство сходных выходов, а не один красивый пример;
- variation dimensions можно назвать и типизировать;
- есть устойчивый source of truth;
- результат можно независимо проверить;
- ожидается повторное применение на выбранном горизонте;
- поддержка generator потенциально дешевле повторного ручного открытия;
- готовое внешнее решение, template или обычный слой не очевидно лучше;
- определён режим владения generated code;
- существует fallback и обратимый эксперимент.

Если отсутствуют source of truth или oracle, реализацию generator следует отложить даже при высокой повторяемости.

## Режим владения

- `SPEC_OWNED` — generated code не редактируется вручную.
- `SKELETON_OWNED` — generator создаёт каркас и явные extension points.
- `PATCH_OWNED` — generator анализирует существующий проект и выдаёт проверяемый candidate patch.
- `CODE_OWNED` — код остаётся источником истины; generator создаёт вспомогательные артефакты.
- `ROUND_TRIP_EXPERIMENTAL` — двусторонняя синхронизация допустима только при сильной проверке обратимости.

## Evidence matrix

Для каждого фактора записать `strong`, `weak`, `contradictory` или `unknown` и ссылку на evidence. Значения не складываются в магический итоговый балл.

| Фактор | Вопрос |
|---|---|
| Повторяемость | Выход реально понадобится снова в объявленном горизонте? |
| Вариативность | Изменения образуют понятные dimensions? |
| Проверяемость | Output имеет автоматический или независимый oracle? |
| Экономия | Генерация дешевле следующей ручной реализации? |
| Стабильность | Source of truth достаточно устойчив? |
| Переносимость | Есть контрастный scenario или consumer? |
| Внешняя альтернатива | Собственный generator выгоднее адаптации или composition? |
| Сопровождение | Generator debt не поглотит ожидаемую пользу? |
| Владение | Исключён дрейф spec, generated output и ручного кода? |
| Обратимость | Candidate можно отклонить без разрушения baseline? |

Критические противоречия по source of truth, проверяемости, владению или обратимости блокируют реализацию. Остальные неизвестные превращаются в минимальные эксперименты.

## Сравниваемые варианты

До выбора сравнить:

1. `NO_GENERATOR` — оставить текущий код;
2. улучшить обычный слой, tests или фасад;
3. template или записанный workflow;
4. patch generator;
5. полноценный generator;
6. внешняя библиотека/generator;
7. composition существующих модулей.

## Формат результата

```yaml
generator_candidate:
  target: null
  family_of_outputs: []
  variation_dimensions: []
  source_of_truth:
    kind: code | schema | model | examples | external
    reference: null
  ownership_mode: CODE_OWNED
  application_horizon: null
  evidence_matrix: []
  external_alternatives: []
  checks: []
  fallback: null
  unknowns: []
  decision: EXPERIMENT | DEFER | REJECT | NO_GENERATOR
```

Candidate-решение разрешает только ограниченный эксперимент, но не promotion.
