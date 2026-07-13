# Режим GENERATOR_HUNT

```yaml
mode: GENERATOR_HUNT
spec_version: experimental-kernel/v0
inputs: [accepted AS-IS report, bounded design pressure]
allowed_reads: [AS-IS evidence, relevant code/tests, generator decision standard]
allowed_writes: [candidate reports only]
required_outputs: [orthogonal options, NO_GENERATOR baseline, candidate scorecards]
stop_conditions: [options compared, missing source of truth, no verifiable family]
handoff_to: ACQUIRE or candidate selection
```

Рассмотри участок независимо по векторам: code, schemas/types/codecs, mocks/fixtures, tests, adapters/bindings, facades, configuration, scenarios, documentation, architecture scaffold, MCP projection и composition route.

Для каждого жизнеспособного candidate укажи:

- семейство выходов и variation dimensions;
- source of truth и ownership mode;
- проверку и oracle limits;
- ожидаемое генеративное плечо;
- implementation, integration и maintenance cost;
- fallback и rollback;
- неизвестные и необходимый эксперимент.

Всегда сравнивай с `NO_GENERATOR`, обычной библиотекой, template и одноразовым patch. Не реализуй generator в этом режиме.
