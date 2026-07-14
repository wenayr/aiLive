# Evaluation — Terra/Luna TL-001 protocol gate — 2026-07-14

Решение: результат первого admitted run — `BLOCKED_LUNA_PROTOCOL`; гипотеза о
пользе genetic-check не проверена. Перед повтором request должен стать
самодостаточным и явно включать полный response contract.

## Snapshot и bindings

- repository snapshot: `11d7b996dbc8304567b64fa3415ba8308498ba67`;
- work order: `terra-luna-001-line-buffer@0.2.0`;
- admitted run: `tl001-20260714-03`;
- Terra: `gpt-5.6-terra`, reasoning `high`;
- Luna: `gpt-5.6-luna`, no-tools, no workspace mount;
- adapter runtime: Codex CLI `0.144.4`.

Попытки `-01` и `-02` были отброшены до admission: Windows CLI не дал
запись сначала в `read-only + add-dir`, затем в `workspace-write`. Их run roots
не создавались. Это инфраструктурные preflight attempts, а не pilot runs.

## Что реально произошло

Terra вошла в `lab-line-buffer-seed@0.1.0`, создала append-only execution
prefix, сняла hashes объявленных stable inputs и до Luna заморозила собственный
план из пяти behaviour dimensions. Candidate до вызова Luna не создавался.

Первый immutable request имел 13 176 bytes и SHA-256
`802f9939dcd79f9f7e7ad7dab97305c846bb8e003922ab541a8fe8d29f652abf`.
Adapter передал Luna только сериализованные bytes request из пустого temp cwd.
В trace не было tool-call events. Один physical attempt завершился за 22 903 ms:
11 973 input units, 246 output units.

Содержательно Luna вернула bounded checklist: шесть обязательных dimensions и
один optional case, не попросила новую authority и не предложила менять
implementation. Transport receipt, model identity, request/response hashes и
лимит bytes прошли проверку.

Но request содержал только краткие `response_constraints` и не содержал полный
`luna-genetic-check/v0` response schema либо явное требование вернуть ровно один
YAML object. Поэтому изолированная Luna закономерно вернула Markdown checklist.
Raw response не прошёл structural gate. Protocol запретил adapter-у исправлять
ответ или повторять вызов, и Terra корректно завершила run с
`BLOCKED_LUNA_PROTOCOL` до materialization.

## Что этот run подтвердил

- bounded module activation и frozen pre-Luna baseline технически работают;
- настоящий no-tools/no-workspace Luna call и adapter receipt воспроизводимы;
- event log и terminal-finally закрывают ранний stop без фиктивных future
  artifacts;
- fail-closed protocol действительно не позволяет превратить содержательно
  удобный, но schema-invalid ответ в успех;
- candidate, targeted tests, iteration 2 и causal вклад Luna не проверены.

Итоговая классификация: `run_verdict: BLOCKED`,
`claim_verdict: NOT_TESTED`, `contribution: none` в смысле отсутствия
schema-valid evidence, а не отрицательной оценки содержания ответа.

## Независимый operator audit

Candidate root остался пустым, `run.completed` является последним event.
Агрегированный manifest 148 tracked files до и после run совпал:
`80bc3745f7fe249c446b7094984ae725d8edcfe0cc01e956a6e5028d371e225b`.
После run `npm run verify` прошёл: 8 lab tests, 10 realtime tests, typecheck и
production build зелёные. Предупреждения Vite о direct `eval` в локальном
`wenay-common2` и размере chunk уже существовали и не относятся к pilot.

Attempt `-03` пришлось запустить с process-level `danger-full-access`, потому
что Windows workspace sandbox не дал требуемые writes. Поэтому write boundary
держалась protocol instruction и внешним tracked-tree audit, а не файловой
изоляцией. Это ограничение не следует скрывать.

Live evidence локально находится в
`.laboratory/genetic-supervision/terra-luna-001/tl001-20260714-03/` и по policy
не коммитится.

## Следующий preregistered шаг

1. Выпустить новую версию protocol/work order, в которой каждый request
   дословно включает общий response schema, allowed unions, mode limits и
   инструкцию «вернуть ровно один YAML object без Markdown fences».
2. Не переносить schema в скрытый adapter prompt: serialized request должен
   оставаться полным наблюдаемым входом Luna.
3. Новый run выполнять с новым id и Windows-safe sandbox layout: cwd внутри
   `.candidates/terra-luna-001/`, а log и verify roots передавать отдельными
   writable roots. Stable repository tree должен быть read-only для Terra.
4. Только после успешного двухитерационного integrity run запускать отдельный
   frozen Terra-only control; этот run не даёт causal comparison.
