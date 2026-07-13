# Режим SCAN

```yaml
mode: SCAN
spec_version: experimental-kernel/v0
inputs: [bounded project snapshot, objective of scan]
allowed_reads: [files inside scope, build/test metadata, history when relevant]
allowed_writes: [scan report and evidence directory only]
required_outputs: [AS-IS map, evidence links, contradictions, confidence, unknowns]
stop_conditions: [scope covered, evidence insufficient, requested mutation]
handoff_to: design or GENERATOR_HUNT
```

Сначала восстанови фактическую систему без применения целевой онтологии живых модулей.

Опиши:

1. наблюдаемые сущности, зависимости и public surfaces;
2. фактических потребителей и совместно изменяемые части;
3. tests, fixtures, runtime traces и пробелы проверки;
4. неявные решения и архитектурные напряжения;
5. расхождения между документацией и кодом;
6. границы уверенности и неизвестные зоны.

Для каждого архитектурного вывода укажи evidence. Не создавай patch, не ищи внешние пакеты и не выбирай целевую архитектуру. Возможный candidate можно отметить только как вопрос для следующего прохода.
