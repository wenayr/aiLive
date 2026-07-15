# AI Live — продуктовая площадка и внешний genetic development layer

Первая реальная площадка — [`projects/tableer/`](./projects/tableer/): небольшой
обычный продукт с классическими модулями. Агент и genetic module находятся не
в нём, а во внешней [`development/tableer/`](./development/tableer/) песочнице.
Она явно привязана к одному продукту, хранит свою локальную память и наблюдает
сохранённые изменения до Git commit.

[`sandbox/genetic-module/`](./sandbox/genetic-module/) остаётся
переиспользуемым engine и механическим probe. Его старые локальные `project/`
и `genetic/` не являются Tableer и не определяют устройство новой площадки.

## Быстрая проверка

Из корня репозитория:

```powershell
npm ci
npm run verify
npm run status
```

Живая локальная сессия Tableer создаётся `npm run setup`. Она создаёт только
`development/tableer/memory/`, фиксируя baseline существующего Tableer; целевой
проект не копируется, не удаляется и не переписывается.

Карта уровней — в
[PROJECT_AND_DEVELOPMENT_SANDBOXES.md](./doc/PROJECT_AND_DEVELOPMENT_SANDBOXES.md).
Полный замысел genetic engine сохранён в
[DESIGN_INTENT.md](./sandbox/genetic-module/DESIGN_INTENT.md).
