# Guard, evidence и promotion

## Разделение полномочий

- `SCAN` читает и фиксирует факты; не проектирует patch.
- Design-проход предлагает варианты; не меняет stable.
- Materializer пишет только в candidate scope.
- Reviewer не должен быть тем же проходом, который создал candidate.
- Publisher технически отделён и действует только после принятого решения.

Prompt описывает эти границы, но права файловой системы, sandbox, immutable tests и publish permissions должны обеспечиваться средой.

## Минимальный evidence bundle

Candidate хранит:

- исходную проблему и baseline;
- AS-IS evidence с путями и наблюдениями;
- выбранный вариант и отвергнутые альтернативы;
- diff или воспроизводимый generator input;
- локальные tests и результаты;
- project acceptance result;
- regression result;
- provenance внешних компонентов;
- измерения стоимости, контекста и glue;
- rollback procedure;
- reviewer decision и unknowns.

## Promotion gates

1. Контракт и source of truth объявлены.
2. Candidate воспроизводим из сохранённых входов.
3. Обязательные baseline tests не ослаблены.
4. Новые invariants имеют локальную проверку.
5. Project binding отделён либо причина невозможности записана.
6. Риски безопасности и лицензии внешних компонентов проверены.
7. Rollback испытан или тривиально доказан.
8. Независимый reviewer выбрал `PROMOTE_STABLE`.

## Возможные решения

- `KEEP_LOCAL` — полезный слой остаётся внутри проекта;
- `PROMOTE_CANDIDATE` — гипотеза заслуживает дополнительных испытаний;
- `PROMOTE_STABLE` — доказанный вариант становится поддерживаемой нормой;
- `PROFILE` — сохранить способ применения без отделения нового core;
- `INLINE` — вернуть слишком дорогую границу внутрь потребителя;
- `FUSE` — объединить фрагментированные candidates;
- `ARCHIVE` — сохранить evidence без активного использования;
- `REJECT` — явно отклонить гипотезу;
- `PRUNE` — удалить из активного каталога после отдельного допуска.

## Интернет

External candidate до допуска считается одновременно исполняемым и инструктивным supply-chain риском. Нужны источник, версия/hash, license, dependency tree, quarantine run и локальные acceptance tests.
