# Режим EXTRACT

```yaml
mode: EXTRACT
spec_version: experimental-kernel/v0
inputs: [approved candidate, AS-IS evidence, target contract]
allowed_reads: [candidate scope and required dependencies]
allowed_writes: [isolated candidate workspace]
required_outputs: [materialized candidate, tests, migration, rollback, evidence bundle]
stop_conditions: [contract passes, scope expansion needed, stable mutation required]
handoff_to: TRANSFER or REVIEW
```

Материализуй только выбранную границу. Сначала зафиксируй public contract, responsibilities, non-responsibilities и invariants.

По возможности отдели:

- core capability;
- доказанные usage profiles;
- project bindings;
- consumer-oriented facades;
- local tests, mocks и fixtures.

Если создаётся generator, объяви source of truth и ownership mode до первого generated artifact. Переноси существующие проверки, не переписывая их под удобный результат. Любое расширение scope останови и вынеси как новое решение.

Результат должен воспроизводиться и иметь обратимый путь к baseline.
