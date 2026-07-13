# Режим REVIEW

```yaml
mode: REVIEW
spec_version: experimental-kernel/v0
inputs: [baseline, candidate, evidence bundle, acceptance matrix]
allowed_reads: [baseline and candidate artifacts, tests, traces, decisions]
allowed_writes: [review report and evaluation evidence]
required_outputs: [independent findings, decision, unknowns, next experiment]
stop_conditions: [evidence evaluated, critical evidence missing, reviewer not independent]
handoff_to: promotion authority or redesign
```

Не продолжай замысел автора candidate; пытайся его опровергнуть.

Проверь:

- сохранение baseline behavior и regression suite;
- новые invariants и отрицательные сценарии;
- source of truth и воспроизводимость;
- Glue Ratio, Context Reduction и maintenance tax;
- project-specific assumptions внутри core;
- security, license и supply-chain evidence;
- реальность rollback;
- различие между измерением и заявлением.

Выбери одно решение: `KEEP_LOCAL`, `PROMOTE_CANDIDATE`, `PROMOTE_STABLE`, `PROFILE`, `INLINE`, `FUSE`, `ARCHIVE` или `REJECT`.

Низкая уверенность не превращай в средний балл: перечисли недостающее evidence и минимальный следующий эксперимент.
