# Evidence

Здесь хранятся результаты реальных экспериментов, а не объяснения идеи.

- `traces/` — воспроизводимые команды, agent traces, build/replay outputs;
- `evaluations/` — независимые reviews и сравнения baseline/candidate;
- артефакты конкретной кампании следует группировать по дате и идентификатору candidate.

Каждый evidence bundle должен ссылаться на snapshot/commit, scope, версию спецификации и автора materialization/review.

## Актуальные evaluations

- [`evaluations/2026-07-14-terra-luna-001-protocol-gate.md`](evaluations/2026-07-14-terra-luna-001-protocol-gate.md) — первый admitted Terra/Luna run и обнаруженный self-contained request gate.
