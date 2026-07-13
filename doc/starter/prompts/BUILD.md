# Режим BUILD

```yaml
mode: BUILD
spec_version: experimental-kernel/v0
inputs: [project objective, constraints, acceptance criteria]
allowed_reads: [project files, approved documentation, required external references]
allowed_writes: [declared project scope]
required_outputs: [working vertical slice, tests, project.yaml, architecture notes]
stop_conditions: [acceptance passes, blocked by missing authority, unsafe ambiguity]
handoff_to: SCAN
```

Создай сложный, полезный vertical slice обычным инженерным способом. Соблюдай стандарт чистых границ и фасадов, но не выделяй packages, generators или MCP только ради будущей гипотезы.

Зафиксируй:

- фактические цели и non-goals;
- entrypoints и consumers;
- acceptance tests;
- внешние зависимости и версии;
- решения, которые пришлось принять;
- места, где повторяющаяся ручная работа уже заметна.

Baseline должен быть работоспособным до генетического анализа. Не объявляй код модулем только из-за структуры каталогов.
