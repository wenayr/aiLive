# Development-песочница Tanks 3D

Эта песочница наблюдает generator-вариант игры, но не вложена в него.

```text
development/tanks3d-sandbox/    агент, задача и local memory/
          │
          └── наблюдает ──> projects/tanks3d-sandbox/    игра и её модули
```

Первый `npm run setup` сохраняет baseline существующего игрового продукта. Он не
копирует и не изменяет target. Вторая итерация меняет wave generator и game
runtime, после чего внешний runtime создаёт ровно одно `discover` действие.
