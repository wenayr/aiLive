# Документация проекта

## Рекомендуемый порядок чтения

Для первого знакомства не нужно читать 4000-строчный исследовательский документ целиком.

1. [Текущая модель живых модулей](./concept/CURRENT_MODEL.md).
2. [Ортогональная критическая оценка](./concept/ORTHOGONAL_ASSESSMENT.md).
3. [Как соотносятся диалог, спецификация, инструкции и evidence](./concept/DIALOGUE_TO_RUNTIME.md).
4. [Требования к генетическому модулю](./genetic-module/REQUIREMENTS.md).
5. [Стандарт слоёв и фасадов](./starter/standards/LAYERS_AND_FACADES.md) и [оси зрелости](./starter/standards/MATURITY.md).
6. [Решение о создании генератора](./genetic-module/GENERATOR_DECISION.md).
7. [Первая сложная кампания](./starter/experiments/FIRST_CAMPAIGN.md), [Runbook](./starter/RUNBOOK.md) и [200 задач проверки genetic supervision](./campaigns/genetic-supervision/DETAILED_PLAN.md).
8. [Master roadmap (100 пунктов)](./roadmap/MASTER_ROADMAP.md), [текущий checkpoint](./checkpoints/CURRENT.md), [Design pressures](./concept/DESIGN_PRESSURES.md), [решения](./decisions/DECISIONS.md) и [открытые вопросы](./decisions/OPEN_QUESTIONS.md).
9. [Рабочие заметки](./notes/README.md) и [полный исследовательский корпус v5](./concept/living_modules_genetic_architecture_v5.md) — для истории развития и глубокого контекста.

## Разделы

- `concept/` — текущая модель, источник замысла, тонкие напряжения и исследовательский корпус.
- `notes/` — новые мысли из диалога до проверки и продвижения в нормативную модель.
- `genetic-module/` — нормативное ядро, решение о generator и импортированная общая operator-инструкция.
- `starter/` — исполнимые стандарты, шаблоны, режимные prompts и эксперименты.
- `decisions/` — принятые решения и неизвестные; они не теряются внутри длинного prompt.
- `evidence/` — traces и независимые evaluations реальных запусков.
- `checkpoints/` — короткие event-driven сводки: что доказано, что неизвестно и какой следующий проверяемый ход.
- `roadmap/` — единая очередь работ с зависимостями, воротами и критериями готовности.
- `prompts/` — исследовательский master prompt для передачи контекста, не runtime-router.
- `archive/` — исходные импортированные артефакты v5 и их provenance.

## Какой файл является источником истины

- Текущий смысл: `concept/CURRENT_MODEL.md` и `decisions/`.
- Обязательное поведение: `genetic-module/REQUIREMENTS.md` и технические policies среды.
- Конкретный запуск: один файл из `starter/prompts/`.
- Факт полезности: `evidence/`, tests и воспроизводимые артефакты.
- Текущее собранное состояние: `checkpoints/CURRENT.md`; он всегда ссылается на первичные evidence.
- Текущий порядок работ: `roadmap/MASTER_ROADMAP.md`; он не отменяет requirements и decisions.
- История замысла: полный v5, design pressures и ссылка на исходную беседу.

Встроенные prompts внутри v5 и импортированный `GENETIC_BASE_OPERATOR_PROMPT_v2.md` считаются историческими общими версиями. Актуальные рабочие режимы находятся в `starter/prompts/`.

## Статус восстановления

На компьютере найден исходный пакет v5 из беседы «Модульная система агентов». Его содержимое сохранено с контрольными суммами. Упомянутый в беседе v6 из 71 файла локально отсутствовал, поэтому практическая часть восстановлена по подробному описанию и последним уточнениям.

Восстановленный starter-kit не выдаётся за побайтовую копию исчезнувшего архива. Это новая рабочая редакция, согласованная с v5 и дальнейшим диалогом.
