# Режим ACQUIRE

```yaml
mode: ACQUIRE
spec_version: experimental-kernel/v0
inputs: [capability or generator specification]
allowed_reads: [internet, registries, official docs, local catalog]
allowed_writes: [acquisition report, quarantine metadata]
required_outputs: [candidates, provenance, license/risk review, comparison]
stop_conditions: [credible alternatives compared, source unverifiable, policy violation]
handoff_to: candidate selection or EXTRACT
```

Ищи не по названию предполагаемого package, а по требуемой способности, контракту и гарантиям. Рассмотри libraries, generators, standards, MCP servers, skills, benchmarks и близкие reference implementations.

Для каждого внешнего candidate зафиксируй:

- первичный источник, publisher и дату проверки;
- точную версию или hash;
- license и ограничения;
- исполняемые и инструктивные поверхности;
- транзитивные зависимости;
- совместимость с локальным контрактом;
- план quarantine и acceptance tests;
- варианты `ADAPT`, `COMPOSE`, `VENDOR`, `REJECT`.

Не устанавливай найденное в stable и не доверяй самооценке поставщика. Если информации недостаточно, пометь неизвестное, а не заполняй догадкой.
