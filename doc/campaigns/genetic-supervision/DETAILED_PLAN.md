# Genetic Supervision Proof Campaign — 200 рабочих задач

Статус: `PROPOSED_GATED`.

Назначение: реализовать минимальный генетический supervisor, перенести в него
curated данные текущего проекта и провести причинный эксперимент, который
покажет, делает ли связка `repetition → module card → retrieval → diff check →
feedback → maturity` следующую связанную задачу дешевле и надёжнее.

Это не новый `NOW`. Единственный активный packet определяется
[CURRENT checkpoint](../../checkpoints/CURRENT.md) и
[master roadmap](../../roadmap/MASTER_ROADMAP.md). Кампания не получает права
на network, package install, stable promotion, credentials, publish, MCP или
автономную эволюцию только потому, что описана здесь.

## 1. Какой результат считается успехом

Кампания обязана различить четыре исхода:

- `PROVE` — supervisor воспроизводимо уменьшает полный verified cost следующей
  связанной задачи без критических regressions и непропорционального context tax;
- `NARROW` — полезен только конкретный механизм, module profile или класс задач;
- `KEEP_LOCAL` — результат полезен AI Live, но не доказан как переносимый модуль;
- `REJECT` — noise, стоимость, архитектурная гравитация или maintenance tax
  превышают измеримую пользу.

Generator, package и MCP не являются обязательными признаками успеха. Кампания
может успешно завершиться доказанным маленьким usage-check или обоснованным
отрицательным результатом.

## 2. Проверяемые гипотезы

| ID | Гипотеза |
| --- | --- |
| H1 | Change matcher находит релевантный наблюдаемый модуль без full-repo scan и неприемлемого noise. |
| H2 | Короткая module card повышает вероятность использования существующего canonical primitive. |
| H3 | Узкая diff-check обнаруживает реальные misuses раньше обычного review. |
| H4 | Scoped human correction уменьшает повтор того же false positive и той же ошибки. |
| H5 | Repetition scan находит полезные seeds, не превращая каждое совпадение в abstraction. |
| H6 | Maturity policy выбирает достаточную глубину проверки дешевле постоянной сильной модели. |
| H7 | Хотя бы один generator candidate превосходит `NO_GENERATOR`, layer или template на заявленном горизонте. |
| H8 | Composite view уменьшает активный контекст без потери доступа к canonical code и evidence. |
| H9 | Model routing по module/task profile лучше одного глобального рейтинга моделей. |
| H10 | Локальный опыт переносится в контрастный profile без domain leakage и скрытого authority expansion. |

## 3. Сравниваемые режимы

Для одинаковых task fixtures используются четыре arms:

1. `CONTROL` — обычная разработка без module card и genetic check;
2. `STATIC_CARD` — card доступна в документации, но не извлекается автоматически;
3. `TRIGGERED_CARD` — релевантная card добавляется на task/change boundary;
4. `SUPERVISED` — triggered card, diff-check, feedback и разрешённая эскалация.

Порядок arms counterbalanced. Task corpus, model/version, tools, authority и
budget фиксируются до просмотра результатов. Holdout не используется для
настройки cards, matcher или thresholds.

## 4. Ворота кампании

| Gate | Условие открытия | Что разрешает |
| --- | --- | --- |
| X0 | Этот план принят как proposal | уточнение scope, но не implementation |
| X1 | Master roadmap G2/G3 закрыты; отдельный admission decision | schemas и frozen baseline |
| X2 | Schemas, migration dry-run и rollback verified | минимальное no-op ядро |
| X3 | Change facts, matcher и checker имеют deterministic fixtures | первый seed pilot |
| X4 | Seed pilot имеет измеренные precision/noise/cost | feedback и module-card experiment |
| X5 | Controlled retrieval показывает causal signal либо честный reject | repetition discovery и maturity |
| X6 | Реальные repetitions и демоция candidates проверены | generator hunt |
| X7 | Generator победил простые альтернативы или отвергнут | model routing и transfer |
| X8 | Contrast profile и independent review завершены | optional external/MCP decisions |
| X9 | Longitudinal audit и полный cost ledger завершены | финальный `PROVE/NARROW/KEEP_LOCAL/REJECT` |

## 5. Целевая граница реализации

Предлагаемая форма следует правилам проекта и уточняется до BUILD:

```text
src/genetic-supervision/
├── contracts/       # serializable records и facade shapes
├── resource/        # registry/report state; без Git, model и UI imports
├── transform/       # matching, relevance, maturity transitions
├── coordination/    # task/change/review orchestration
├── facade/          # runtime, debug, testing projections
└── bindings/
    ├── git-change/  # read-only change facts
    ├── model/       # injected checker adapters
    ├── store-file/  # .laboratory live state
    └── web/         # read model и feedback intent
```

Фабрики принимают зависимости объектом и возвращают audience-based facade.
Новая внешняя dependency запрещена до отдельного `ACQUIRE` decision.

## 5.1. Контракт активации и Git-контроль

Supervisor обязан включаться не только по явному запросу. Он имеет четыре
независимые границы активации:

```text
task boundary       # до планирования релевантной задачи
change boundary     # после meaningful diff / перед checkpoint или commit
review boundary     # после результата, correction или maturity decision
periodic boundary   # bounded catch-up от последней подтверждённой Git revision
```

Periodic activation не означает регулярный full-repo prompt. Scheduler хранит
cursor:

```yaml
last_successful_revision:
working_tree_fingerprint:
registry_version:
instruction_versions:
last_periodic_run:
```

Один цикл выполняет:

1. Проверяет committed range `last_successful_revision..HEAD`.
2. Отдельно учитывает staged, unstaged и untracked-in-scope changes.
3. Обрабатывает rename/delete, modules с истекающим expiry и пропущенные runs.
4. Сопоставляет change facts с anchors и maturity policy.
5. При no-match записывает дешёвый no-op без вызова модели.
6. Запускает S0, затем узкую дешёвую check и разрешённую эскалацию.
7. Продвигает cursor только после terminal persisted report.

Idempotency key минимум включает `moduleId + baseRevision + head/fingerprint +
checkVersion`. Restart, повторный timer tick или два одинаковых hooks не должны
создавать два логических результата.

Cadence зависит от зрелости и риска наблюдаемого модуля:

- experimental seed — только relevant diff и ручной review boundary;
- часто используемый protected primitive — каждый relevant diff плюс bounded
  periodic catch-up;
- high-impact contract — каждый change boundary и обязательный pre-checkpoint;
- dormant/stale module — expiry review без model-вызова при отсутствии diff.

Scheduler запускает только зарегистрированную laboratory task. UI, card и
model не передают shell command, cwd или произвольный revision range.

## 6. Полный execution backlog

Статусы: `PROPOSED` — уточняется до admission; `GATED` — разрешается только
после указанной зависимости; `LATER_DECISION` — требует отдельного решения.

### A. Admission, authority и причинная честность — GS-001…GS-010

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-001 | Сопоставить кампанию с master roadmap 56–95; готово, когда у каждого исполнимого phase есть master gate и нет второго `NOW`. | X0 | PROPOSED |
| GS-002 | Сверить drift `CURRENT` и master roadmap; готово, когда один источник однозначно называет текущий packet и расхождение устранено отдельной правкой. | GS-001 | PROPOSED |
| GS-003 | Зафиксировать admission prerequisites: transport P2/P3, evidence hygiene и agent-ecology authority; готово, когда отсутствует неявный обход G2/G3. | GS-001 | PROPOSED |
| GS-004 | Создать отдельный decision на genetic experiment; готово, когда разрешены только bounded reads, `.candidates/` и `.laboratory/`, а stable promotion остаётся закрыт. | GS-003 | GATED |
| GS-005 | Назначить human owner цели, бюджета и финального verdict; готово, когда agent/model не может сам расширить decision options. | GS-004 | GATED |
| GS-006 | Зафиксировать baseline commit, Node/package versions и model aliases; готово, когда каждый run воспроизводимо ссылается на snapshot. | GS-004 | GATED |
| GS-007 | Записать non-goals: marketplace, self-training weights, arbitrary terminal, credentials, publish и automatic extraction; готово, когда они проверяются admission validator. | GS-004 | GATED |
| GS-008 | Создать risk register с owner-oracle для false gravity, noise, data loss, leakage и circular validation; готово, когда каждый P0/P1 риск имеет stop action. | GS-004 | GATED |
| GS-009 | Определить protocol остановки `CONTINUE/NARROW/DISABLE/REJECT`; готово, когда исчерпание бюджета не маскируется под успех. | GS-008 | GATED |
| GS-010 | Выпустить admission checkpoint; готово, когда X1 открыт evidence либо кампания остаётся честно `BLOCKED`. | GS-001…009 | GATED |

### B. Гипотезы, baselines и preregistration — GS-011…GS-020

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-011 | Разложить H1 на trigger precision, missed relevance и scan cost; готово, когда один итог matcher не скрывает три разных свойства. | GS-010 | GATED |
| GS-012 | Разложить H2 на card retrieval, фактическое использование и verified outcome; готово, когда показ card не считается пользой. | GS-010 | GATED |
| GS-013 | Разложить H3/H4 на true positive, false positive, false negative, true negative и recurrence; готово, когда каждый класс имеет fixture. | GS-010 | GATED |
| GS-014 | Разложить H5 на useful seed, distractor, premature abstraction и missed repetition; готово, когда discovery можно опровергнуть. | GS-010 | GATED |
| GS-015 | Разложить H6/H9 на quality, escalation rate, latency и verified cost; готово, когда дешёвая модель не выигрывает только ценой пропущенных ошибок. | GS-010 | GATED |
| GS-016 | Для H7 preregister сравнение `NO_GENERATOR/layer/template/patch/full`; готово, когда working generator сам по себе не означает победу. | GS-010 | GATED |
| GS-017 | Определить primary metric: полный verified cost следующей связанной задачи; готово, когда включены model, human triage, authoring, rework и maintenance. | GS-011…016 | GATED |
| GS-018 | Определить hard safety metrics: critical regression, stable write, authority breach и data loss; готово, когда любое нарушение останавливает phase. | GS-011…016 | GATED |
| GS-019 | Спроектировать counterbalanced four-arm study и contamination controls; готово, когда порядок, fresh sessions и task isolation заданы до run. | GS-017…018 | GATED |
| GS-020 | Опубликовать preregistration с task corpus, thresholds, exclusions и verdict rules; готово, когда thresholds нельзя менять после treatment results без нового experiment. | GS-019 | GATED |

### C. Baseline corpus и исходные данные — GS-021…GS-030

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-021 | Инвентаризировать все `layer.yaml`; готово, когда source path, maturity claim, anchors и tests сведены без повышения статуса. | GS-010 | GATED |
| GS-022 | Инвентаризировать capability index каталога; готово, когда `observed`, `profile`, `planned` и `candidate` не смешаны. | GS-010 | GATED |
| GS-023 | Собрать decisions и open questions, связанные с module/generator/ecology; готово, когда каждая запись имеет provenance и applicability. | GS-010 | GATED |
| GS-024 | Собрать relevant traces/evaluations; готово, когда raw evidence остаётся по исходным paths, а registry хранит только ссылки и hashes. | GS-010 | GATED |
| GS-025 | Выделить известные transport misuses и правильные patterns из P1–P3; готово, когда они представлены как fixtures, а не как память автора. | GS-023…024 | GATED |
| GS-026 | Выделить Arena protocol/scenario/replay/facade repetition corpus; готово, когда есть минимум по одному useful и distractor примеру на family. | GS-023…024 | GATED |
| GS-027 | Сформировать task corpus из related и unrelated изменений; готово, когда unrelated tasks способны измерить context/noise tax. | GS-020, GS-025…026 | GATED |
| GS-028 | Сформировать holdout с новым допустимым pattern и новым misuse; готово, когда он недоступен card/matcher authors. | GS-027 | GATED |
| GS-029 | Сохранить baseline outcomes без supervision; готово, когда известны time, tokens/cost units, human corrections, test result и rework. | GS-027 | GATED |
| GS-030 | Заморозить corpus manifest и hashes; готово, когда изменение corpus требует новой experiment version. | GS-028…029 | GATED |

### D. Модель данных и provenance — GS-031…GS-040

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-031 | Специфицировать `tModuleObservation`; готово, когда факт, inference, confidence, unknowns и evidence refs разделены. | GS-020 | GATED |
| GS-032 | Специфицировать `tModuleRecord`; готово, когда identity, maturity, anchors, instructions, lineage и expiry сериализуемы. | GS-031 | GATED |
| GS-033 | Специфицировать path/symbol/contract/task-intent anchors; готово, когда тип anchor не подменяет его confidence. | GS-032 | GATED |
| GS-034 | Специфицировать accepted/rejected/suspicious pattern с condition scope; готово, когда исключение нельзя случайно сделать глобальным. | GS-032 | GATED |
| GS-035 | Специфицировать task/change/review/periodic triggers и match explanation; готово, когда exact, related, weak-neighbour, due-only и no-match различимы. | GS-033 | GATED |
| GS-036 | Специфицировать module card и context budget; готово, когда card имеет purpose, use-when, example, variants и check, но не тащит весь corpus. | GS-032…035 | GATED |
| GS-037 | Специфицировать quality report; готово, когда учитываются findings, corrections, recurrence, card usage, cost и model/version. | GS-032…036 | GATED |
| GS-038 | Специфицировать maturity event и обратные переходы; готово, когда weaken/split/fuse/inline/archive/reject являются first-class. | GS-032 | GATED |
| GS-039 | Специфицировать experience record для model/task/module profile; готово, когда aggregate rating без условий невозможен. | GS-037 | GATED |
| GS-040 | Реализовать schema validators и invalid fixtures; готово, когда отсутствующие authority/provenance/condition отклоняются типизированно. | GS-031…039 | GATED |

### E. Архитектурный skeleton и dependency boundaries — GS-041…GS-050

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-041 | Проверить `wenay-common2`/`wenay-react2` на подходящие registry, resource и controller primitives; готово, когда reuse/absence документированы до новой логики. | GS-040 | GATED |
| GS-042 | Создать `layer.yaml` genetic-supervision candidate без завышенной maturity; готово, когда reading order, roles и non-goals явны. | GS-041 | GATED |
| GS-043 | Создать closure-based module registry resource; готово, когда core не импортирует Git, model, filesystem, React или transport. | GS-040…042 | GATED |
| GS-044 | Создать чистые transforms для maturity и match outcomes; готово, когда они тестируются без I/O. | GS-040…042 | GATED |
| GS-045 | Определить injected ports change source, checker, report store, clock и id; готово, когда testing может заменить каждый binding. | GS-043…044 | GATED |
| GS-046 | Разделить runtime/debug/testing facades; готово, когда runtime не может inject result или повысить maturity. | GS-043…045 | GATED |
| GS-047 | Определить coordination flow task/change/review/periodic boundaries; готово, когда scheduler вызывает одну каноническую операцию, не копируемую между facades. | GS-043…046 | GATED |
| GS-048 | Создать deterministic fake bindings; готово, когда весь lifecycle запускается без Git и model API. | GS-045…047 | GATED |
| GS-049 | Добавить architecture dependency tests; готово, когда resource core механически не импортирует forbidden bindings. | GS-042…048 | GATED |
| GS-050 | Выпустить X2 design review; готово, когда schemas/boundaries согласованы, а implementation можно удалить без влияния на stable behaviour. | GS-021…049 | GATED |

### F. Перенос текущих данных — GS-051…GS-060

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-051 | Создать staging importer `layer.yaml → observation`; готово, когда import не объявляет layer доказанным module. | GS-040, GS-050 | GATED |
| GS-052 | Создать importer capability index → registry seed/profile reference; готово, когда catalog status сохраняется без reinterpretation. | GS-040, GS-050 | GATED |
| GS-053 | Создать importer decisions → lineage/constraint refs; готово, когда normative decision не копируется в свободный model prompt. | GS-040, GS-050 | GATED |
| GS-054 | Создать importer evidence links → observation provenance; готово, когда raw traces не дублируются и hash проверяется. | GS-040, GS-050 | GATED |
| GS-055 | Создать importer notes → hypothesis records; готово, когда dialogue и research note не получают status `confirmed`. | GS-040, GS-050 | GATED |
| GS-056 | Перенести transport idempotency, replay, shared-hub и reset facts как раздельные records; готово, когда applicability/version явны. | GS-051…055 | GATED |
| GS-057 | Перенести run terminal-transition invariant и Arena deterministic invariants; готово, когда каждому соответствует executable oracle либо `UNVERIFIED`. | GS-051…055 | GATED |
| GS-058 | Реализовать deterministic IDs, deduplication и conflict report; готово, когда повторный import не размножает records. | GS-051…057 | GATED |
| GS-059 | Реализовать migration dry-run и rollback; готово, когда staging можно удалить и повторить без изменения исходных документов. | GS-051…058 | GATED |
| GS-060 | Провести независимый migration audit; готово, когда provenance loss, maturity inflation и private/live-data leakage равны нулю. | GS-051…059 | GATED |

### G. Git change facts и semantic neighbourhood — GS-061…GS-070

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-061 | Реализовать read-only Git binding для committed range, staged/unstaged и untracked-in-scope facts; готово, когда UI/model не задают shell/cwd/revision, а inputs записаны. | GS-045, GS-050 | GATED |
| GS-062 | Извлекать added/modified/deleted/renamed paths; готово, когда rename не выглядит как unrelated delete+add без explanation. | GS-061 | GATED |
| GS-063 | Извлекать hunks и изменённые line ranges; готово, когда binary/generated files классифицируются отдельно. | GS-061 | GATED |
| GS-064 | Извлекать TypeScript symbols через уже доступный compiler API либо обоснованный fallback; готово, когда новая dependency не добавлена по пути. | GS-062…063 | GATED |
| GS-065 | Извлекать imports/re-exports и непосредственные dependencies; готово, когда alias и barrel export покрыты fixtures. | GS-064 | GATED |
| GS-066 | Приближённо находить changed call sites/callers; готово, когда uncertainty явно выше при dynamic dispatch. | GS-064…065 | GATED |
| GS-067 | Находить shared contract/type impact; готово, когда изменение wire type активирует consumers даже без правки их файлов. | GS-064…066 | GATED |
| GS-068 | Рассчитать explainable proximity class exact/strong/medium/weak; готово, когда numeric score не скрывает основание match. | GS-062…067 | GATED |
| GS-069 | Создать fixture matrix exact, call-site, contract, alias, rename, deletion, weak-neighbour и unrelated; готово, когда expected facts frozen. | GS-062…068 | GATED |
| GS-070 | Реализовать persisted Git cursor, fingerprint и collector idempotency; готово, когда periodic catch-up bounded, restart-safe и не требует full-repo scan без причины. | GS-061…069 | GATED |

### H. Registry matcher и no-op kernel — GS-071…GS-080

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-071 | Реализовать path-anchor matcher; готово, когда include/exclude и deleted paths обрабатываются детерминированно. | GS-043…048, GS-062 | GATED |
| GS-072 | Реализовать symbol/call-site matcher; готово, когда overload и unresolved symbol дают `unknown`, а не ложный exact. | GS-064…066, GS-071 | GATED |
| GS-073 | Реализовать contract/dependency matcher; готово, когда transitive depth ограничен policy и отображается в explanation. | GS-065…068, GS-071 | GATED |
| GS-074 | Реализовать task-intent matcher как отдельный weak signal; готово, когда lexical совпадение не может само повысить severity. | GS-036, GS-071 | GATED |
| GS-075 | Объединять несколько anchors без двойного запуска одной check; готово, когда dedup сохраняет все reasons. | GS-071…074 | GATED |
| GS-076 | Реализовать `explainMatch`; готово, когда оператор видит module, anchor, proximity, maturity и выбранную policy. | GS-071…075 | GATED |
| GS-077 | Реализовать безопасный no-match/no-change/due-only path; готово, когда periodic tick без релевантного diff не вызывает model adapter или warning. | GS-071…076 | GATED |
| GS-078 | Реализовать suppress/disable/expiry; готово, когда stale card не активируется молча. | GS-032, GS-038, GS-071…077 | GATED |
| GS-079 | Проверить конфликт двух matched cards; готово, когда conflict эскалируется или остаётся явным, а порядок registry не выбирает победителя. | GS-071…078 | GATED |
| GS-080 | Прогнать deterministic matcher suite и открыть X3 только при зафиксированной confusion matrix на fixture corpus. | GS-069…079 | GATED |

### I. Checker execution и model escalation — GS-081…GS-090

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-081 | Реализовать instruction loader по declared registry paths; готово, когда module card не может читать произвольный файл. | GS-036, GS-045, GS-080 | GATED |
| GS-082 | Запускать deterministic S0 checks раньше model; готово, когда известный oracle не заменяется вероятностным verdict. | GS-047, GS-081 | GATED |
| GS-083 | Построить bounded context pack: diff, card, accepted patterns, selected code и tests; готово, когда каждый read объясним. | GS-036, GS-061…080 | GATED |
| GS-084 | Определить injected cheap-checker contract; готово, когда vendor/model name отсутствует в resource core. | GS-039, GS-045, GS-083 | GATED |
| GS-085 | Ограничить outcomes `ok/suspicious/unknown/invalid`; готово, когда model prose не становится lifecycle decision. | GS-084 | GATED |
| GS-086 | Реализовать escalation policy по severity, `unknown`, conflict и failed oracle; готово, когда prompt не может эскалировать собственный budget. | GS-082…085 | GATED |
| GS-087 | Реализовать time/token/cost budgets и cancellation; готово, когда зависший checker даёт typed terminal outcome. | GS-084…086 | GATED |
| GS-088 | Запретить checker stable writes и authority expansion; готово, когда malicious instruction fixture механически блокируется. | GS-004, GS-084…087 | GATED |
| GS-089 | Создать fake cheap/strong adapters с scripted outcomes; готово, когда escalation suite не зависит от внешнего API. | GS-048, GS-084…088 | GATED |
| GS-090 | Проверить error, timeout, malformed response, disagreement и disposal; готово, когда каждый run завершён и отражён в report. | GS-084…089 | GATED |

### J. Append-only reports и экономический ledger — GS-091…GS-100

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-091 | Реализовать append-only attempt/report store под `.laboratory/`; готово, когда live state не попадает в Git. | GS-037, GS-045, GS-090 | GATED |
| GS-092 | Сохранять revision, corpus, card, instruction, model и context hashes; готово, когда trial можно идентично реконструировать. | GS-039, GS-083, GS-091 | GATED |
| GS-093 | Считать trigger/card/check outcomes раздельно; готово, когда хороший matcher не маскирует плохой checker. | GS-037, GS-091 | GATED |
| GS-094 | Считать confirmed/dismissed/unknown findings; готово, когда отсутствие warning не объявляется true negative без oracle. | GS-037, GS-091 | GATED |
| GS-095 | Считать relevant true negatives и recurrence; готово, когда improvement после correction измерим во времени. | GS-037, GS-091…094 | GATED |
| GS-096 | Считать card retrieved/used/ignored/harmful; готово, когда primitive-use rate остаётся mechanism metric, не success metric. | GS-036…037, GS-091 | GATED |
| GS-097 | Считать fully burdened cost: inference, deterministic compute, human triage, authoring, maintenance, rework и rollback. | GS-017, GS-091…096 | GATED |
| GS-098 | Создать immutable curated projection в `doc/evidence/` только для значимых runs; готово, когда raw и interpretation разделены. | GS-091…097 | GATED |
| GS-099 | Реализовать report replay/consistency check; готово, когда агрегат воспроизводится из append-only events. | GS-091…098 | GATED |
| GS-100 | Провести X3 operational review; готово, когда no-op, match, check, escalation, cost и report проходят end-to-end на fake bindings. | GS-061…099 | GATED |

### K. Первый seed: transport usage protection — GS-101…GS-110

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-101 | Blind triage выбирает один seed из transport corpus; готово, когда выбор сделан по oracle/noise, а не ради красивого candidate. | GS-025, GS-030, GS-100 | GATED |
| GS-102 | Зафиксировать seed purpose и границу: idempotency, replay или hub ownership; готово, когда одна card не смешивает независимые правила. | GS-101 | GATED |
| GS-103 | Описать canonical и explicit-valid alternative patterns; готово, когда независимый reviewer подтверждает условия, но не видит treatment result. | GS-102 | GATED |
| GS-104 | Описать known misuse и severity; готово, когда critical и stylistic отклонения не смешаны. | GS-102…103 | GATED |
| GS-105 | Создать exact, related, unrelated, legacy-valid и new-valid diff fixtures; готово, когда fixture authors отделены от checker evaluator. | GS-102…104 | GATED |
| GS-106 | Написать минимальную cheap-check instruction с одним вектором; готово, когда она не просит общего code review или refactor. | GS-102…105 | GATED |
| GS-107 | Прогнать development corpus и один раз уточнить instruction; готово, когда изменение versioned и holdout не открыт. | GS-105…106 | GATED |
| GS-108 | Заморозить seed/card/check versions и provisional thresholds; готово, когда дальнейший tuning требует нового run id. | GS-107 | GATED |
| GS-109 | Прогнать immutable holdout и построить trigger/check confusion matrices; готово, когда silent misses включены в результат. | GS-108 | GATED |
| GS-110 | Принять `KEEP_SEED/NARROW/DISABLE/REJECT`; готово, когда X4 открывается только при acceptable noise и отсутствии critical miss. | GS-109 | GATED |

### L. Scoped feedback и локальная история — GS-111…GS-120

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-111 | Реализовать human feedback `confirmed/dismissed/valid-variant/needs-evidence`; готово, когда feedback не меняет code автоматически. | GS-110 | GATED |
| GS-112 | Сохранять condition scope для valid variant; готово, когда правило ограничено module/version/path/consumer по необходимости. | GS-034, GS-111 | GATED |
| GS-113 | Сохранять confirmed misuse + correction + oracle refs; готово, когда история компактна и не копирует полный chat. | GS-034, GS-111 | GATED |
| GS-114 | Повторить dismissed fixture; готово, когда тот же false positive не возвращается в том же scope. | GS-111…113 | GATED |
| GS-115 | Повторить misuse fixture в новом call site; готово, когда correction не подавляет настоящий warning. | GS-111…113 | GATED |
| GS-116 | Проверить spillover в соседний scope; готово, когда локальное исключение не ухудшает unrelated pass rate. | GS-112…115 | GATED |
| GS-117 | Реализовать version/expiry/revalidation feedback records; готово, когда API change инвалидирует старое исключение наблюдаемо. | GS-032, GS-038, GS-111 | GATED |
| GS-118 | Создать malicious-teaching fixtures; готово, когда model или пользователь без authority не может узаконить forbidden pattern. | GS-004, GS-111…117 | GATED |
| GS-119 | Измерить recurrence, correction benefit и human minutes; готово, когда история полезна экономически, а не только логически. | GS-114…118 | GATED |
| GS-120 | Принять feedback verdict `USE/STATIC_ONLY/DISABLE`; готово, когда механизм можно отделить от seed checker. | GS-119 | GATED |

### M. Module cards и causal retrieval experiment — GS-121…GS-130

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-121 | Реализовать deterministic card renderer из module record; готово, когда одинаковый record даёт одинаковую bounded card. | GS-036, GS-110 | GATED |
| GS-122 | Ограничить card purpose/use-when/example/variants/check; готово, когда history/evidence загружаются только on demand. | GS-036, GS-121 | GATED |
| GS-123 | Реализовать task-boundary retrieval с `top-k` и token cap; готово, когда лишние cards не вытесняют task input. | GS-074…080, GS-121…122 | GATED |
| GS-124 | Реализовать change-boundary retrieval отдельно от task intent; готово, когда слабый intent не скрывает сильный diff match. | GS-071…080, GS-121…123 | GATED |
| GS-125 | Подготовить neutral equal-token, random-card, stale-card и wrong-gravity controls; готово, когда card benefit нельзя объяснить дополнительными токенами. | GS-019…020, GS-121…124 | GATED |
| GS-126 | Запустить confirmatory `CONTROL` против `SUPERVISED` на frozen tasks; готово, когда sessions, budgets и model versions одинаковы. | GS-030, GS-120…125 | GATED |
| GS-127 | Запустить mechanism arms `STATIC_CARD/TRIGGERED_CARD/card-only/check-only/deterministic-only`; готово, когда вклад компонентов различим. | GS-126 | GATED |
| GS-128 | Запустить harmful controls stale/wrong/random; готово, когда измерен вред архитектурной гравитации, а не только happy path. | GS-125…127 | GATED |
| GS-129 | Измерить hit@k, harmful retrieval, verified success, context tax, irrelevant reads и rework; готово, когда card usage не считается outcome. | GS-126…128 | GATED |
| GS-130 | Принять `RETRIEVAL_WORKS/GENERIC_RETRIEVAL_ENOUGH/NO_RETRIEVAL`; готово, когда X5 не открывается по одному удачному task. | GS-129 | GATED |

### N. Repetition discovery и выбор формы — GS-131…GS-140

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-131 | Построить temporal corpus commits/tasks t0–t6 и periodic gaps по protocol, scenario, replay и facade families; готово, когда scan видит только t0–t2 и восстанавливает пропущенный range через cursor. | GS-026…030, GS-130 | GATED |
| GS-132 | Добавить distractors: lexical clone без общей semantics, одноразовый repeat и unstable source of truth; готово, когда `KEEP_LOCAL` проверяем. | GS-131 | GATED |
| GS-133 | Реализовать bounded repetition scout, выдающий observations, не modules; готово, когда он не пишет candidate code. | GS-031, GS-047, GS-131…132 | GATED |
| GS-134 | Сравнить genetic scout с blind human, generic repo review и простой clone detector; готово, когда vocabulary не даёт нечестную подсказку. | GS-133 | GATED |
| GS-135 | Для каждого signal потребовать alternatives `rule/layer/adapter/profile/generator/composition/KEEP_LOCAL`; готово, когда generator не default. | GS-016, GS-133…134 | GATED |
| GS-136 | Провести blind human triage observations; готово, когда seed создаётся только после applicability, oracle и next-task claim. | GS-133…135 | GATED |
| GS-137 | Материализовать сравнимые briefs одним independent builder process; готово, когда candidate quality не зависит от разных builders. | GS-136 | GATED |
| GS-138 | Выполнить скрытые t3–t5 tasks; готово, когда полезность границы измеряет будущая работа, а не reviewer agreement. | GS-137 | GATED |
| GS-139 | Посчитать useful-seed precision, missed repetition, false abstraction, glue и next-task cost; готово, когда rejected candidates входят в economics. | GS-134…138 | GATED |
| GS-140 | Принять `DISCOVERY_WORKS/MANUAL_ONLY/NARROW/REJECT`; готово, когда реальные repetitions отличены от искусственных examples. | GS-139 | GATED |

### O. Multi-view и composite maturity — GS-141…GS-150

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-141 | Специфицировать parent/child module relation без владения копией логики; готово, когда canonical operation остаётся одна. | GS-032, GS-038, GS-140 | GATED |
| GS-142 | Сделать child maturity независимой от parent view; готово, когда большой composite может содержать experimental seed без ложного promotion. | GS-141 | GATED |
| GS-143 | Реализовать request-dependent views business/foundry/implementation/audit; готово, когда один registry даёт разные проекции без дублирования data. | GS-036, GS-141…142 | GATED |
| GS-144 | Собрать compact composite card; готово, когда верхний view показывает capability, children и limitations в token budget. | GS-121…123, GS-141…143 | GATED |
| GS-145 | Пропагировать relevant child trigger к parent report; готово, когда parent не запускает все child checks без причины. | GS-071…080, GS-141…144 | GATED |
| GS-146 | Проверить изменение одного child и shared contract; готово, когда scope проверки соответствует реальному impact. | GS-145 | GATED |
| GS-147 | Смоделировать view `150 entities → 6–9 capabilities` без перемещения кода; готово, когда инженер может drill down до files/tests/evidence. | GS-143…146 | GATED |
| GS-148 | Измерить context reduction, missed dependency и time-to-correct-plan; готово, когда меньше tokens без correctness не считается победой. | GS-147 | GATED |
| GS-149 | Проверить split/fuse/demotion composite; готово, когда ошибочная крупная граница обратима. | GS-038, GS-141…148 | GATED |
| GS-150 | Выпустить X6 maturity review; готово, когда usage count не повышает maturity, а forward/backward gates доказаны fixtures. | GS-131…149 | GATED |

### P. Generator hunt, candidate и реальная миграция — GS-151…GS-160

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-151 | Выбрать один candidate family по repetition evidence, а не заранее; готово, когда protocol/scenario/facade и `NO_GENERATOR` сравнены одной matrix. | GS-016, GS-140…150 | GATED |
| GS-152 | Объявить family outputs, variation dimensions, source of truth, horizon и fallback; готово, когда critical unknown блокирует build. | GS-151 | GATED |
| GS-153 | Выбрать ownership `SPEC/SKELETON/PATCH/CODE/ROUND_TRIP`; готово, когда manual-edit drift имеет policy и oracle. | GS-151…152 | GATED |
| GS-154 | Реализовать `NO_GENERATOR`, улучшенный layer/template и generator briefs; готово, когда alternatives получают сопоставимый budget. | GS-151…153 | GATED |
| GS-155 | Материализовать generator только в `.candidates/<work-id>/`; готово, когда path guard, artifact hash и deletion rollback механически проходят. | G4 ecology, GS-154 | GATED |
| GS-156 | Проверить deterministic output, idempotent regeneration, golden fixtures и invalid inputs; готово, когда generated success не опирается на ручную правку. | GS-155 | GATED |
| GS-157 | Заморозить legacy data/fixtures и реализовать dry-run old→new converter на копии; готово, когда `.laboratory/` не переписывается in-place. | GS-152…156 | GATED |
| GS-158 | Перенести consumers по одному с shadow comparison: headless/test → coordinator/bot → runtime/debug binding; готово, когда каждый шаг имеет rollback. | GS-157 | GATED |
| GS-159 | Выполнить hidden next task и контрастный t6 consumer; готово, когда generator сравнен по full cost, glue, core changes и compatibility. | GS-154…158 | GATED |
| GS-160 | Независимо принять `NO_GENERATOR/KEEP_LOCAL/PROFILE/PROMOTE_CANDIDATE/REJECT`; готово, когда X7 не зависит от автора generator. | GS-151…159 | GATED |

### Q. Model routing и экономия эскалации — GS-161…GS-170

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-161 | Зафиксировать deployment aliases cheap/strong и реальные model/version/cost metadata; готово, когда смена версии создаёт новый profile. | GS-039, GS-100 | GATED |
| GS-162 | Определить static risk features: severity, match class, maturity, conflict, oracle и scope ambiguity; готово, когда features frozen до outcomes. | GS-035…039, GS-161 | GATED |
| GS-163 | Запустить `always-cheap` baseline; готово, когда critical misses и unknowns не отфильтрованы из отчёта. | GS-161…162 | GATED |
| GS-164 | Запустить `always-strong` baseline; готово, когда quality upper bound и полный cost измерены на том же corpus. | GS-161…162 | GATED |
| GS-165 | Реализовать static risk router; готово, когда routing explanation и stop reason видимы. | GS-086, GS-162…164 | GATED |
| GS-166 | Создать experience-based router candidate только на development/time-earlier data; готово, когда holdout и future model version не утекли. | GS-039, GS-161…165 | GATED |
| GS-167 | На случайной counterfactual subset запускать оба tiers; готово, когда selection bias измерим, а не скрыт policy. | GS-163…166 | GATED |
| GS-168 | Проверить routers на family/time/model-version holdout; готово, когда false non-escalation и excess critical escapes посчитаны. | GS-167 | GATED |
| GS-169 | Сравнить verified success, cost, latency, escalation precision/recall и human burden; готово, когда savings не покупаются деградацией. | GS-163…168 | GATED |
| GS-170 | Принять `STATIC_ROUTER/EXPERIENCE_ROUTER/ALWAYS_STRONG/NO_ROUTING`; готово, когда learned router может честно проиграть heuristic. | GS-169 | GATED |

### R. Experience registry, contrast domains и внешний мир — GS-171…GS-180

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-171 | Реализовать local experience registry projection из curated reports; готово, когда raw prompts/code не становятся обязательной памятью. | GS-039, GS-098, GS-170 | GATED |
| GS-172 | Добавить applicability, expiry и contradictory outcomes; готово, когда средний success не скрывает domain/model version. | GS-171 | GATED |
| GS-173 | Реализовать sanitized export/import как untrusted hypotheses; готово, когда private paths, code, credentials и authority отсутствуют. | GS-171…172 | GATED |
| GS-174 | Проверить contrast fixtures: headless table layer и exchange-adapter family с semantic negative controls; готово, когда direct code и `KEEP_LOCAL` остаются options. | GS-130, GS-140, GS-173 | GATED |
| GS-175 | Подготовить отдельный `ACQUIRE` decision для реальных внешних API specs; готово, когда provenance/license/hash/quarantine определены до network read. | X8, GS-174 | LATER_DECISION |
| GS-176 | Подготовить read-only browser/world-impact pilot; готово, когда разрешены только named observations/actions и нет publish/credentials. | X8, GS-175 | LATER_DECISION |
| GS-177 | Определить external before/after oracle: screenshot/state/result/cost/reversibility; готово, когда model claim не считается изменением мира. | GS-176 | LATER_DECISION |
| GS-178 | Сравнить direct library/profile с MCP projection на held-out agent task; готово, когда MCP проверяется как access form, а не maturity reward. | X8, GS-160, GS-175 | LATER_DECISION |
| GS-179 | Провести threat model MCP/external registry: injection, output limits, concurrency, cancellation, audit и revoke; готово, когда authority не расширена. | GS-173, GS-178 | LATER_DECISION |
| GS-180 | Принять `LOCAL_ONLY/TRANSFERRED/NO_EXTERNAL/NO_MCP/MCP_CANDIDATE`; готово, когда внешний успех не отменяет локальные oracles. | GS-171…179 | LATER_DECISION |

### S. Operator UI, recovery и эксплуатационная проверка — GS-181…GS-190

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-181 | Спроектировать read model registry/modules/cards без write authority; готово, когда UI проецирует canonical resource. | GS-046…047, GS-100 | GATED |
| GS-182 | Показать match explanation и selected policy; готово, когда оператор понимает, почему check запущена. | GS-076, GS-181 | GATED |
| GS-183 | Показать quality/cost report и raw evidence links; готово, когда aggregate не скрывает dismissed/unknown. | GS-091…099, GS-181 | GATED |
| GS-184 | Добавить feedback intent с typed scope; готово, когда UI не может вписать arbitrary instruction или повысить maturity. | GS-111…118, GS-181 | GATED |
| GS-185 | Показать lineage, expiry, conflicts и demotion; готово, когда stale/wrong gravity видима оператору. | GS-038, GS-117, GS-149, GS-181 | GATED |
| GS-186 | Показать model tier, budget, escalation и stop reason; готово, когда стоимость и authority видимы до следующего запуска. | GS-087, GS-161…170, GS-181 | GATED |
| GS-187 | Проверить reconnect/service-reset и scheduler restart recovery; готово, когда stale report не принимается, cursor не перескакивает и тот же periodic range не применяется дважды. | master P2/P3, GS-070, GS-181…186 | GATED |
| GS-188 | Ввести retention/redaction policy для `.laboratory/`; готово, когда live reports очищаются без потери curated evidence. | GS-091, GS-171…173 | GATED |
| GS-189 | Провести visual/operator smoke: no-match, warning, unknown, feedback, expiry, conflict и rollback; готово, когда каждый state объясним без terminal access. | GS-181…188 | GATED |
| GS-190 | Прогнать full acceptance и rollback rehearsal; готово, когда supervisor можно отключить и удалить без деградации baseline. | GS-100…189 | GATED |

### T. Longitudinal audit и финальное решение — GS-191…GS-200

| ID | Работа и критерий готовности | Зависит от | Статус |
| --- | --- | --- | --- |
| GS-191 | Повторить confirmatory tasks после card ageing и symbol rename; готово, когда stale detection и maintenance cost измерены. | X8, GS-190 | GATED |
| GS-192 | Повторить после model/version change; готово, когда прошлый routing profile не переносится молча. | GS-170, GS-191 | GATED |
| GS-193 | Выполнить новый in-domain holdout и leave-one-family-out test; готово, когда эффект не ограничен memorized fixtures. | GS-030, GS-190…192 | GATED |
| GS-194 | Выполнить unrelated-work audit; готово, когда context, latency и warning tax обычных задач посчитаны. | GS-027, GS-190…193 | GATED |
| GS-195 | Посчитать amortized authoring/maintenance/migration cost на заявленном горизонте; готово, когда скрытый human tax включён. | GS-097, GS-159, GS-191…194 | GATED |
| GS-196 | Провести adversarial audit wrong/stale/conflicting/malicious cards и bad candidate; готово, когда система умеет демотировать привлекательную ошибку. | GS-118, GS-128, GS-149, GS-190 | GATED |
| GS-197 | Провести independent review отдельно для `PROTECT`, `GROW` и `ROUTE`; готово, когда один успех не маскирует провал другого контура. | GS-160, GS-170, GS-190…196 | GATED |
| GS-198 | Выбрать component verdicts и общий `PROVE/NARROW/KEEP_LOCAL/REJECT`; готово, когда facts, inference, limits и rejected alternatives разделены. | GS-197 | GATED |
| GS-199 | Обновить requirements/decisions/catalog/roadmap только по доказанным выводам; готово, когда гипотезы из notes не повышены без evidence. | GS-198 | GATED |
| GS-200 | Выпустить X9 final checkpoint и следующий bounded packet либо archive; готово, когда raw artifacts, reproducibility, cost и rollback доступны следующему reviewer. | GS-191…199 | GATED |

## 7. Стартовые decision thresholds v0

Это preregistration candidates, а не универсальные истины. Они один раз
калибруются на development corpus и затем замораживаются до holdout.

| Контур | Начальный gate |
| --- | --- |
| Authority | 0 stable writes, scope expansion, package install, publish и hidden-oracle mutation |
| Reproducibility | 100% trials имеют revision/input/context/instruction/model hashes |
| Trigger | overall recall ≥ 90%, critical recall 100%, precision ≥ 80%, unrelated activation ≤ 10% |
| Retrieval | relevant card hit@3 ≥ 90%, ≤ 0.5 irrelevant card/task, harmful retrieval ≤ 2% |
| Context | card context ≤ 5% task budget либо ≤ 1500 tokens для pilot |
| Checker | known misuse recall ≥ 90%, critical recall 100%, confirmed precision ≥ 75%, ≤ 0.1 warning/unrelated diff |
| Correction | recurrence снижается ≥ 50%, spillover ухудшает unrelated pass rate не более чем на 2 п.п. |
| Discovery | `KEEP_LOCAL/NO_GENERATOR` specificity ≥ 85%, false materialization recommendation ≤ 10% |
| Routing | success не хуже always-strong более чем на 2 п.п.; 0 excess critical escapes; inference cost ниже ≥ 30% |
| Transfer | обязательные tests сохранены; declared core contract не перепроектирован под второй consumer |
| Payback | первый generator окупается не позже третьей связанной задачи либо отвергается |

Hard correctness/authority всегда выше economic score. Weighted сумма не может
компенсировать critical regression.

## 8. Stop conditions

Batch немедленно останавливается при stable write вне authority, изменении
hidden oracle, невозможности rollback, утрате provenance, holdout leakage,
critical regression из-за card, выдаче `UNKNOWN` за `PASS`, silent expansion
correction scope или невоспроизводимом artifact hash.

Компонент сужается или отвергается, если:

- retrieval не лучше generic retrieval или equal-token control;
- card usage растёт, а verified outcome не улучшается;
- false-positive review tax поглощает экономию;
- candidate окупается только на исходном примере;
- transfer требует переписать core под consumer;
- обычный layer/template стабильно лучше generator;
- static router не хуже experience router;
- maintenance cards/evaluators дороже предотвращённого rework;
- independent reviewer не способен воспроизводимо отвергнуть bad candidate.

## 9. Initial migration map

| Текущий источник | Новая проекция | Правило |
| --- | --- | --- |
| `src/**/layer.yaml` | observations/module records | maturity не повышается при импорте |
| `doc/catalog/ai-live.yaml` | capability/profile references | исходный status сохраняется |
| `doc/decisions/` | constraints/lineage refs | decision остаётся source of truth |
| `doc/evidence/` | evidence refs + hashes | raw evidence не копируется в prompt |
| `doc/notes/` | hypotheses | note никогда не становится confirmed автоматически |
| tests/acceptance | oracle refs | отсутствие executable test даёт `UNVERIFIED` |
| Git history pilot scope | change facts/corpus | raw history не объявляется правильным pattern |
| `.laboratory/` | live attempts/reports | не коммитится и не мигрируется in-place |

## 10. Первый исполнимый packet после admission

Не начинать с generator, MCP или общего repetition scanner. Первый packet:

```text
GS-031…040 schemas
→ GS-051…060 migration dry-run
→ GS-061…080 change facts + matcher
→ GS-081…100 fake checker/report kernel
→ один seed из GS-101…110
```

Он должен закончиться X4 verdict даже при отрицательном результате. Только
после этого разрешено проверять architectural gravity и выращивание modules.

## 11. Предварительная ручная репетиция Terra/Luna

До реализации matcher и scheduler разрешена только protocol rehearsal, не
меняющая roadmap `NOW`: [TL-001](./pilots/terra-luna-001-line-buffer/README.md).

Она заставляет Terra явно войти в module session, выполнить две bounded
iteration boundaries, трижды вызвать no-tools Luna, сохранить append-only log
и остановиться без Git diff, promotion или stable writes. Результат TL-001
проверяет исполнимость orchestration; эффективность всей затеи он не доказывает
без отдельного Terra-only control.
