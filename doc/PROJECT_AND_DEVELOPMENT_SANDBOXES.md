# Продуктовая площадка и development-песочница

## Зафиксированная карта уровней

```text
aiLive/
├── projects/tableer/              реальный продукт: обычные модули
├── development/tableer/           внешняя работа агента и genetic memory
│   ├── sandbox.json               явная связь только с projects/tableer/
│   ├── tasks/                     реальные следующие продуктовые задачи
│   └── memory/                    локальное runtime-состояние, не в Git
├── projects/tanks3d-simple/       прямой сравнительный browser-product
├── projects/tanks3d-sandbox/      generator browser-product
├── development/tanks3d-sandbox/   внешний agent-layer generator-варианта
└── sandbox/genetic-module/        переиспользуемый engine и его mechanics probe
```

Это не вложенные модули одного дерева. `projects/tableer/` — объект разработки.
`development/tableer/` — архитектурная песочница, из которой агент развивает и
наблюдает объект. `sandbox/genetic-module/` — реализация малого механизма
наблюдения, а не место, куда помещается Tableer.

## Что находится в каждом уровне

| Уровень | Содержит | Не содержит |
| --- | --- | --- |
| `projects/tableer/` | table resource, filter, facade, продуктовые тесты | агента, genetic memory, pending actions, runtime-инструкции разработки |
| `development/tableer/` | инструкции агенту, привязку цели, реальные задачи, локальную память | копию Tableer, классические модули Tableer, встроенный provider/model API |
| `projects/tanks3d-simple/` | прямой browser runtime и ручной игровой контент | generator contract, agent runtime, memory |
| `projects/tanks3d-sandbox/` | генераторы арены, танков и волн, game runtime, renderer | agent runtime, memory, инструкции разработки |
| `development/tanks3d-sandbox/` | привязку к generator-варианту, задачу второй итерации, локальную memory | копию игры или модули её runtime |
| `sandbox/genetic-module/` | closure-based engine, файловую сессию, tests, mechanics probe | конкретную бизнес-архитектуру Tableer |

## Минимальный рабочий цикл

1. Агент начинает в `development/tableer/` и читает её `AGENTS.md`.
2. Он читает продуктовую задачу и меняет файлы только в явно привязанной цели
   `projects/tableer/`.
3. После одной сохранённой законченной правки он запускает `npm run scan` в
   development-песочнице.
4. Engine сравнивает только configured tracked paths с сохранённым baseline и
   записывает состояние только в `development/tableer/memory/`.
5. Если появился `pending.json`, агент даёт одно предметное заключение.
   Слабое единичное наблюдение завершается `discover/skip`, а не фиктивной
   инструкцией.
6. Продуктовая проверка подтверждает код отдельно от genetic цикла.

Git diff может быть дополнительным контекстом, но не является событием запуска.
Первый запуск `setup` фиксирует baseline существующей цели и не делает копии,
не удаляет и не переписывает её.

## Почему это нужна именно сейчас

Так проверяется нужная ранняя гипотеза без симуляции «всего будущего»: помогает
ли малый дешёвый наблюдатель следующей похожей реальной правке, не создавая
заметной дополнительной работы. Доказательством будут сопоставимые product
tasks, фактические observations/skip, время цикла и повторные ошибки — не число
файлов, модулей или записей памяти.

Генератор, mock-generator, дополнительный facade, MCP или «дирижёр» появляются
только когда есть повторение, источник истины и независимая проверка. Их нельзя
создавать как обязательные элементы стартовой площадки.
