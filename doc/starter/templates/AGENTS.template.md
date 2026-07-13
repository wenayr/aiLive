# Инструкция проекта для агентов

## Точки входа

1. Прочитай `project.yaml`.
2. Выбери только релевантный `layer.yaml`.
3. Прочитай entrypoint, public facade и локальные contracts.
4. Загружай реализацию и history только по необходимости.

## Архитектурные правила

- Сохраняй канонические resource types и явные transformations.
- Не дублируй операции между consumer facades.
- Не переноси project-specific assumptions в module core без evidence.
- Не редактируй generated output вопреки объявленному ownership mode.
- Не создавай package, generator или MCP без отдельного решения.

## Проверки

Команды baseline: заполнить в конкретном проекте.

Candidate scope: заполнить в конкретном проекте.

Stable policy: заполнить техническими ограничениями среды.

## Генетический режим

Для анализа используй инструкции из `doc/starter/prompts/`. Один запуск — один режим. Findings сохраняй как evidence, а не как скрытые правки архитектуры.
