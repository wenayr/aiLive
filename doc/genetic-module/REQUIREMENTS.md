# Требования к генетическому модулю

Статус: `experimental-kernel/v0`. Здесь обязательное отделено от исследовательских гипотез.

## Назначение

Генетический модуль создаёт evidence-backed представление развития проекта и предлагает ограниченные candidate-изменения, способные сделать будущую связанную работу дешевле, надёжнее или понятнее.

Он не обязан создавать package, generator или MCP. `NO_CHANGE` и `KEEP_LOCAL` являются корректными результатами.

## Нормативное ядро v0

### K1. Наблюдение отделено от изменения

Первый проход восстанавливает AS-IS и неизвестные. Он не меняет stable, не выбирает целевую архитектуру и не подгоняет факты под заранее заданную модель слоёв.

### K2. У каждого вывода есть основание

Архитектурное утверждение содержит evidence, confidence и unknowns. Мнение prompt или модели само по себе evidence не является.

### K3. Предписание имеет варианты

После AS-IS можно предложить несколько TO-BE под разные цели либо аргументированно оставить систему без изменений. Нужно явно разделять факт, интерпретацию и рекомендацию.

### K4. Candidate ограничен и обратим

Изменение материализуется в candidate scope, имеет заявленный контракт, область воздействия, проверки и rollback. Обязательные baseline tests нельзя ослаблять ради успеха candidate.

### K5. Promotion независим

Проход, создавший candidate, не подтверждает его готовность к stable. Независимый review проверяет evidence и принимает отдельное lifecycle-решение.

### K6. Внешнее считается недоверенным

Внешние код, packages, skills, prompts и MCP требуют provenance, версии/hash, license review, quarantine и локальных acceptance tests.

### K7. Генератор объявляет владение

Generator candidate до реализации указывает source of truth, ownership mode generated-кода, семейство выходов, variation dimensions, validation и fallback.

### K8. Количество сущностей не является целью

Число packages, modules, generators, facades, prompts и MCP не используется как метрика успеха.

## Рабочая архитектурная доктрина

Для кода, создаваемого в рамках этого проекта, рекомендуются:

- явные resource, transform, horizontal и facade boundaries;
- одна каноническая реализация операции и несколько consumer projections;
- локальные contracts, mocks и tests;
- разделение `Module Core`, `Usage Profile` и `Project Binding` у module candidates;
- progressive disclosure: entrypoint → manifest → relevant facade/tests → code on demand.

Это требования к нашему целевому стилю, но не категории, которые SCAN обязан обнаружить в любом существующем проекте.

## Выходы режимов v0

### SCAN

- границы исследованной области;
- AS-IS entities и dependencies;
- потребители и public surfaces;
- tests/evidence map;
- архитектурные напряжения;
- contradictions, confidence и unknowns.

### GENERATOR_HUNT

- независимые генеративные векторы;
- `NO_GENERATOR` как baseline;
- candidates с source of truth и ownership mode;
- ожидаемый выигрыш, долг и способ проверки;
- внешние альтернативы, если отдельный ACQUIRE-проход был выполнен.

### EXTRACT

- candidate core/profile/binding либо аргументированная другая форма;
- public contract и compatibility notes;
- перенесённые и новые tests;
- migration и rollback;
- evidence bundle.

### REVIEW

- проверка baseline, regressions и новых invariants;
- анализ context reduction, glue и maintenance cost;
- решение `KEEP_LOCAL`, `PROMOTE_CANDIDATE`, `PROMOTE_STABLE`, `PROFILE`, `INLINE`, `FUSE`, `ARCHIVE` или `REJECT`;
- список неизвестных и следующий эксперимент.

## Исследовательские возможности, пока не являющиеся обязательными

- автоматический поиск module boundaries во всём репозитории;
- обязательный интернет-поиск при каждом анализе;
- обязательный второй независимый проект;
- автоматическое физическое выделение packages;
- synthesis макромодулей;
- самостоятельные `PRUNE` и `EVOLVE_SELF`;
- универсальный schema генома;
- генерация архитектурных стилей;
- числовая scorecard с фиксированными порогами;
- обязательная MCP-проекция;
- автономное изменение самого генетического модуля.

Эти возможности проверяются экспериментами и могут быть повышены до требований только через журнал решений и evidence.

## Основная метрика

Для выбранного горизонта измеряется, стала ли следующая связанная задача дешевле и надёжнее без непропорционального integration и maintenance tax.

До появления baseline и повторного сценария следует говорить о гипотезе пользы, а не о доказанном модуле.
