# Acceptance matrix

Пороги в этой матрице являются стартовыми гипотезами. После первого baseline их нужно заменить измеренными значениями.

| Область | Наблюдение | Baseline | Candidate gate | Evidence |
|---|---|---:|---:|---|
| Correctness | Обязательные project tests | зафиксировать | 100% прежних + новые | test report |
| Determinism | Совпадение state hash | зафиксировать | без ухудшения | replay trace |
| Contract | Локально проверяемые invariants | зафиксировать | все новые invariants имеют test | contract suite |
| Reproducibility | Candidate строится из сохранённого input | нет/да | да | clean build trace |
| Rollback | Возврат к baseline | зафиксировать | доказан | rollback trace |
| Context | Файлы/tokens для типовой задачи | измерить | заметное снижение без потери точности | agent trace |
| Locality | Число затронутых независимых слоёв | измерить | не выше baseline | diff + dependency map |
| Glue Ratio | binding / core | не применимо | измерен и объяснён | LOC/API map |
| Transfer | Контрастный consumer | нет | хотя бы один scenario или аргументированное исключение | consumer acceptance |
| Generator | Source of truth | нет | объявлен и единственен | candidate manifest |
| Generator | Ручные правки generated output | не применимо | запрещены или изолированы extension points | repository check |
| Maintenance | Стоимость изменения generator | измерить | не поглощает прогнозируемый выигрыш | timed experiment |
| External | Provenance/license/version | зафиксировать | полны | acquisition report |
| Security | Quarantine и dependency review | зафиксировать | пройдены для внешнего | audit report |
| Independence | Reviewer отличен от materializer | нет/да | да | review metadata |
| Learning | Ошибка стала regression или rejected hypothesis | нет | да для существенных находок | genome diff |

## Сравниваемые стратегии

Для каждого сильного candidate сравнивать минимум:

1. оставить текущий код;
2. улучшить обычный слой без generator;
3. использовать template или patch workflow;
4. создать generator;
5. адаптировать внешнюю реализацию;
6. скомпозировать несколько существующих способностей.

## Решение

Нельзя усреднять критический провал с хорошими удобствами. Нарушение correctness, security, source of truth или rollback блокирует `PROMOTE_STABLE`, даже если итоговый score выглядит высоким.
