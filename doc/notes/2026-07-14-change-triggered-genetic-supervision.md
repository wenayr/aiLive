# 2026-07-14 — change-triggered genetic supervision

Статус: исследовательская модель из рабочего диалога. Она уточняет границу
генетического модуля, но ещё не является runtime contract или доказанной
эффективностью.

## Главное уточнение

Минимальный генетический модуль — не генетическая память и не накопленный опыт
в чистом виде. Это небольшая инструкция обработки других модулей в зависимости
от их зрелости и факта релевантного изменения.

Отдельно существуют:

- реестр наблюдаемых модулей;
- module-specific instructions и допустимые варианты использования;
- короткая история решений и исправлений конкретного модуля;
- отчёт о качестве и стоимости supervision;
- более широкая генетическая база, если она позднее окажется полезной.

Генетический модуль читает эти данные, выбирает нужную проверку и записывает
результат. Он не обязан владеть знаниями наблюдаемого модуля, создавать новый
код или самостоятельно менять stable.

## Минимальное ядро

```text
Git diff / change facts
        ↓
matcher наблюдаемых модулей
        ↓
maturity policy
        ↓
узкая дешёвая проверка
        ↓ при подозрении
локальная эскалация
        ↓
quality report
```

Начальный runtime можно свести к четырём частям:

1. Получить изменённые paths, symbols и call sites.
2. Сопоставить их с массивом наблюдаемых модулей и близкими зависимостями.
3. По зрелости модуля выбрать одну узкую инструкцию проверки.
4. Записать outcome, обратную связь, стоимость и основание эскалации.

Если ни один наблюдаемый модуль не затронут, генетический проход ничего не
делает.

## Два контура: защита и выращивание

Change-triggered проверка защищает уже известные модули, но не объясняет, как
появляется новый module candidate. Для этого нужен второй, также ограниченный
контур:

```text
повторение похожей работы
        ↓
маленькое наблюдение: здесь может быть общий primitive
        ↓
выбор формы: rule / layer / adapter / profile / generator / KEEP_LOCAL
        ↓
релевантное напоминание в следующих задачах
        ↓
usage и quality report
        ↓
укрепить / уточнить / ослабить / отвергнуть candidate
```

Повторение понимается широко. Это не только просьба создать новый вариант уже
существующего объекта:

| Наблюдаемое повторение | Возможная первая форма |
| --- | --- |
| Несколько подключений бирж с похожим auth/order/data flow | exchange adapter/profile |
| Повторяющееся управление таблицами | headless table layer + usage instruction |
| Несколько похожих 3D-моделей | asset generator candidate |
| Повторяющийся вызов helper в нескольких верхних методах | маленькая usage check |
| Одинаковая подготовка mocks или fixtures | mock/fixture generator |
| Повторяемое browser-действие | action profile или binding |

Generator является одним из возможных результатов, а не обязательной целью.
Иногда правильный результат — короткое правило использования существующей
функции; иногда — shared layer; иногда — adapter над внешним API; иногда —
`KEEP_LOCAL`.

## Релевантное напоминание как архитектурная гравитация

Для AI-разработки полезность candidate может появиться ещё до extraction.
Когда task intent, diff или изменённые symbols совпадают с module anchors,
система добавляет в рабочий context маленькую module card:

```text
что уже существует
когда это следует использовать
один канонический пример
известные допустимые варианты
одна ближайшая проверка
```

Повторное релевантное предъявление создаёт внешний project-local prior: модель
чаще выбирает канонический primitive, потому что он доступен в нужный момент и
подтверждён окружающим кодом. Это не переобучение весов модели и не гарантия
поведения. Поэтому напоминание соединяется с diff-check и quality report.

Цикл выглядит так:

```text
повторение замечено
→ candidate получил module card
→ card релевантно извлечена в следующей задаче
→ primitive использован или отвергнут
→ diff-check проверил применение
→ результат изменил confidence и retrieval priority
```

Так удачные primitives постепенно становятся «любимчиками» AI внутри проекта,
не превращаясь в глобальное обязательное правило.

Напоминание не должно быть периодическим шумом. Есть три разумные границы:

1. `task boundary` — показать несколько наиболее релевантных module cards до
   планирования;
2. `change boundary` — проверить anchors и близкие связи после изменения;
3. `review boundary` — обновить quality report и решение о зрелости.

Отдельный bounded scan может изредка искать повторения, ещё не попавшие в
registry. Он только предлагает candidates и не материализует их самостоятельно.

## Запись наблюдаемого модуля

Концептуальный минимальный формат:

```yaml
id: canonical-label-usage
maturity: seed
anchors:
  symbols:
    - createLabel
    - applyLabel
  related_symbols:
    - createField
accepted_patterns:
  - id: canonical
    condition: default
  - id: explicit-legacy
    condition: legacy adapter only
trigger:
  - anchor_changed
  - call_site_changed
  - related_contract_changed
check: checks/canonical-label-usage.md
escalate_on:
  - suspicious
  - unknown
retrieval:
  intents:
    - create field labels
  priority: experimental
```

Instruction может лежать вне production-кода. Комментарий около функции может
служить discovery pointer, но не обязан содержать всю политику.

## Проверка нескольких допустимых вариантов

Частота не равна правильности. Если функция канонически вызывается двумя
способами, оба способа становятся явными допустимыми patterns. Третий вариант
не объявляется ошибкой автоматически: он получает `suspicious` и узкую
проверку.

Когда человек объясняет, что новый вариант корректен, система сохраняет не
размытое «запомнить всё», а маленькое scoped-решение:

```text
pattern
+ condition применения
+ пример
+ решение человека
+ связанный module/version
```

Следующая дешёвая проверка получает только эту компактную историю данного
правила. Если вариант оказался ошибкой, сохраняются неправильная форма,
исправление и oracle. Если это допустимое исключение, оно не должно снова
поднимать тот же шум в том же scope.

## Триггер по diff и близости

Проверка активируется на change boundary, а не периодическим полным чтением
проекта. Сила связи различается:

| Связь с изменением | Начальный вес |
| --- | --- |
| Изменён anchor symbol или его call site | сильный |
| Изменён shared type, contract или непосредственный caller | сильный |
| Изменён import/dependency neighbour | средний |
| Изменён соседний файл без доказанной связи | слабый |

`git diff` даёт факт изменения. Symbols, imports, callers и contracts уточняют
семантическую близость. Простая близость файлов может вызвать дешёвый scout, но
не должна сама подтверждать проблему.

## Рост по зрелости наблюдаемого модуля

```text
seed
→ одна change-triggered инструкция
→ несколько известных допустимых и ошибочных patterns
→ связанная группа подмодулей и интеграционная проверка
→ mocks / fixtures / evaluator
→ generator candidate
→ module foundry с проверкой outputs и consumers
→ API / library / MCP projection при доказанной необходимости
```

Растёт наблюдаемый модуль и его operational envelope. Генетическое ядро может
оставаться простым dispatcher-ом: оно только применяет другую maturity policy.

Generator не обязан немедленно заменить существующий код. Он может сначала
создавать mocks, fixtures или новый вариант, пока handwritten implementation
остаётся source of truth. MCP является одной проекцией зрелой способности, а не
самой зрелостью.

Для сложного модуля этот рост остаётся композицией. Например, игровой module
может объединить level generator, object generator, simulation core и rendering
binding; exchange module — auth, market-data normalization, order adapter и
reconciliation checks. Генетическое ядро не исполняет эти способности: оно
управляет их cards, triggers, maturity decisions и reports.

За MCP по-прежнему находится исполняемая реализация: выбранный code fragment,
library, generator, process, service или их композиция. Module manifest и
lifecycle decision определяют физическую форму; MCP только проецирует
разрешённые операции для agent consumer.

## Общий архив опыта и выбор модели

Локальные quality reports позднее могут проецироваться в отдельный experience
registry для сравнения проектов и strategies. Минимальная запись должна
сохранять не только «успех», но и условия:

```yaml
module_profile:
task_profile:
model_and_version:
instruction_version:
cost:
latency:
outcome:
human_correction:
regression_result:
limitations:
```

Такой архив позволяет выбирать модель по конкретной способности: дешёвая
модель может быть достаточна для usage check, а сильная — для нового generator
candidate. Общий рейтинг модели без task/module profile для этого недостаточен.

Внешний registry не является authority для локального promotion. Его записи
считаются недоверенными hypotheses, требуют provenance и локального повтора;
код, credentials и project-private context туда не попадают автоматически.

## Возможный отрицательный эффект

Механизм способен усиливать не только удачный primitive, но и раннюю неверную
абстракцию. Частое напоминание также может засорить context и заставить AI
использовать слой там, где прямой код проще.

Поэтому retrieval и maturity используют отрицательные сигналы:

- card была показана, но оказалась нерелевантной;
- primitive пришлось обходить или существенно переделывать;
- integration/glue cost превысил прямое решение;
- предупреждения регулярно отклоняются;
- новый consumer не укладывается в declared variation dimensions;
- candidate давно не подтверждался и требует повторной проверки.

Candidate можно ослабить, сузить, разделить, оставить локальным или отвергнуть.
Частота использования повышает приоритет наблюдения, но сама по себе не
подтверждает качество.

## Quality report

Отчёт нужен не для самооценки модели, а для проверки полезности supervision:

```yaml
relevant_changes:
checks_run:
no_findings:
warnings:
confirmed_issues:
dismissed_warnings:
escalations:
recurrences:
cards_retrieved:
cards_used:
cards_irrelevant:
estimated_cost:
```

Особенно важны `dismissed_warnings` и релевантные изменения без предупреждения.
Если правило постоянно шумит, оно понижается, уточняется или отключается. Если
после нескольких исправлений релевантные изменения проходят корректно, это
может означать, что правило было усвоено людьми и агентами, а не стало
бесполезным.

## Соотношение с существующими исследованиями

- [Guided Pattern Mining for API Misuse Detection](https://link.springer.com/article/10.1007/s10515-021-00294-x)
  подтверждает полезность just-in-time анализа изменений: commit-based search
  сокращает объём, а method-level filtering оказался полезнее file-level.
- [A Systematic Evaluation of Static API-Misuse Detectors](https://arxiv.org/abs/1712.00242)
  показывает главный риск: отклонение от самого частого pattern нельзя наивно
  считать misuse; у существующих detectors были низкие precision и recall.
- [Tricorder](https://research.google/pubs/tricorder-building-a-program-analysis-ecosystem/)
  показывает ценность integration в change review, actionable findings,
  developer feedback и строгого контроля false positives.
- [Long-term static analysis rule quality monitoring](https://www.amazon.science/publications/long-term-static-analysis-rule-quality-monitoring-using-true-negatives)
  предлагает учитывать true negatives: релевантные изменения, в которых
  разработчик уже не повторил известную ошибку.
- [Getafix](https://engineering.fb.com/2018/11/06/developer-tools/getafix-how-facebook-tools-learn-to-fix-bugs-automatically/)
  демонстрирует дальнейшую ступень: patterns исправлений можно извлекать из
  истории вместе с окружающим контекстом и предлагать человеку candidate fix.
- [NATURALIZE](https://arxiv.org/abs/1402.4182) показывает, что локальные
  conventions можно выводить из самого проекта. Для этой модели style остаётся
  вторичным: приоритет имеют ошибки использования, contracts и architecture
  invariants.

Эти работы подтверждают отдельные primitives, но не доказывают целиком нашу
maturity-driven композицию, model escalation или её экономическую выгоду.

## Первый проверяемый эксперимент

1. Выбрать одну реальную функцию с двумя допустимыми patterns и одним известным
   misuse.
2. Описать anchors, conditions и короткую instruction без нового generator.
3. На серии git-diff fixtures проверить exact, related и irrelevant changes.
4. Дешёвую модель вызывать только для matched scope; `unknown` эскалировать.
5. Добавить одну человеческую поправку как scoped accepted pattern.
6. Повторить изменения и измерить noise, пропуски, стоимость и recurrence.

Успехом является не число проверок, а раннее обнаружение реальной ошибки без
непропорционального шума и без заметного налога на обычную разработку.

## Уточнение: первая ручная репетиция Terra/Luna

До change matcher выбран более ранний operational probe. Terra выступает
основным builder-агентом, явно входит в module session и выполняет маленькую
задачу из-под module envelope. В трёх заранее заданных точках она вызывает Luna
как дешёвый read-only genetic checker:

```text
до materialization → Luna prepare
после iteration 1 → Luna review
после iteration 2 → Luna final verify
```

У successful run ровно две bounded iteration boundaries. Вторая может не
менять candidate, если Luna не нашла полезной поправки, но всё равно обязана
сохранить отдельный snapshot и выполнить final oracles. Третья итерация
запрещена: unresolved finding становится честным `FAILED` или `BLOCKED`, а не
поводом бесконечно улучшать результат.

Git diff в этой репетиции сознательно отложен: кода и scope мало. Вместо него
используются declared paths, hashes всех control inputs before/after, полные
candidate snapshots и append-only event log. Это ограничение v0, а не будущая
policy генетического supervision.

Чтобы увидеть вклад Luna, Terra фиксирует свой plan до первого Luna response.
После run сравниваются pre-Luna dimensions, Luna checklist/findings, две версии
candidate, deterministic tests, стоимость и шум. Generic `ok` вкладом не
считается; bounded validation требует assertion-level evidence.

Полный protocol packet сохранён в
[TL-001 Terra/Luna pilot](../campaigns/genetic-supervision/pilots/terra-luna-001-line-buffer/README.md).
Он условно исполним только после подключения no-tools Luna adapter, пока не
запущен и не доказывает причинное превосходство над Terra-only. Следующий
честный шаг после integrity run — замороженный control без Luna.
