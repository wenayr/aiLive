# Development-песочница Tableer

Это рабочее место агента, наблюдающее за уже существующим продуктовым проектом
[`projects/tableer/`](../../projects/tableer/). Она не является дочерним
модулем Tableer и не делает его копию: `sandbox.json` явно связывает один
внешний target с одной локальной памятью.

```text
development/tableer/       агент, задача, локальная memory/
          │
          └── явно наблюдает ──> projects/tableer/   обычный продуктовый код
```

`memory/` создаётся локально командой `npm run setup` и игнорируется Git.
Первый запуск только фиксирует baseline Tableer; он не копирует, не удаляет и
не переписывает ни один файл цели.

Команды из этого каталога:

```powershell
npm run validate
npm run setup
npm run status
npm run scan
npm run resolve
```

Полное разделение уровней и дальнейшие критерии — в
[`doc/PROJECT_AND_DEVELOPMENT_SANDBOXES.md`](../../doc/PROJECT_AND_DEVELOPMENT_SANDBOXES.md).
