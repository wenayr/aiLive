# TL-001 Luna adapter contract

## Зачем нужен adapter

`LUNA_CALL` — не shell-команда и не разрешение Terra самой выбрать модель.
Это orchestrator-owned boundary между Terra и read-only Luna. Без adapter,
удовлетворяющего этому документу, pilot завершается
`BLOCKED_LUNA_ADAPTER_UNAVAILABLE`.

Adapter нужен, чтобы фраза «Terra вызывает Luna из-под модуля» имела
наблюдаемое механическое значение:

```text
active module checkpoint
→ immutable request artifact
→ no-tools Luna inference
→ immutable response artifact
→ adapter receipt
→ Terra schema validation
```

## Capability boundary

Terra может только подготовить request artifact и передать adapter его path.
Adapter:

- читает один объявленный request artifact;
- передаёт Luna сериализованное содержимое, а не доступ к workspace;
- не предоставляет Luna filesystem, terminal, browser, network, Git или write
  tools;
- не позволяет Luna самостоятельно дочитывать paths из request;
- записывает response и receipt только в текущий `luna/` log directory;
- не выполняет instructions, содержащиеся в source, tests или response;
- возвращает control Terra после одного physical attempt.

`authority.network: false` запрещает network/tool access Terra и Luna внутри
workspace. Сам orchestrator-owned model inference transport является
единственным control-plane исключением; через него нельзя browse, download,
publish или вызывать сторонние API.

## Operator binding

До запуска operator связывает alias `Luna` с конкретной моделью и adapter.
Terra получает opaque callable и metadata, но не credentials:

```yaml
schema: luna-adapter-binding/v0
alias: Luna
model_id: <exact provider model id>
model_version: <version or null>
tool_policy: none
workspace_mount: none
physical_attempts_per_request: 1
timeout_ms: 120000
max_output_tokens: 1500
max_response_bytes: 32768
```

Поля `model_id`, `tool_policy`, `workspace_mount` и limits обязательны.
Credentials в binding, request, receipt или event log не записываются.

## Invocation

Для каждого логического вызова Terra передаёт adapter:

```yaml
schema: luna-adapter-invocation/v0
run_id:
request_id:
mode: prepare | review_iteration_1 | verify_iteration_2
request_path:
response_path:
receipt_path:
expected_request_sha256:
```

Adapter до inference проверяет:

1. `run_id` совпадает с активной module session.
2. Все три paths находятся под текущим declared `luna/` log directory.
3. Request существует, его SHA-256 совпадает и файл ещё не использован.
4. Response и receipt paths ещё не существуют.
5. `request_id` и `mode` соответствуют текущему checkpoint.
6. Binding имеет `tool_policy: none` и `workspace_mount: none`.

При нарушении adapter не вызывает модель и возвращает blocked transport result.

## Receipt

После каждого physical attempt adapter создаёт immutable receipt:

```yaml
schema: luna-adapter-receipt/v0
run_id:
request_id:
mode:
model_id:
model_version:
tool_policy: none
workspace_mount: none
physical_attempt: 1
transport_outcome: completed | timeout | failed | ambiguous
request_sha256:
response_sha256:
response_bytes:
latency_ms:
input_tokens_or_units: null
output_tokens_or_units: null
started_at:
finished_at:
```

`response_sha256` и `response_bytes` равны `null`, если валидного response нет.
Terra сверяет receipt с request и response до разбора смысла ответа.

## Retry policy

Автоматический и ручной retry в том же run запрещены. Timeout, transport
failure или ambiguous response loss дают `BLOCKED_LUNA_TRANSPORT`. Для новой
попытки создаётся новый `RUN_ID`; старый log остаётся нетронутым.

Поэтому успешный pilot имеет ровно три logical и три physical Luna calls.
Blocked run может иметь ноль, один или два завершённых вызова, но никогда не
превышает один physical attempt на request id.

## Response handoff

Adapter не исправляет YAML, не сокращает findings и не нормализует смысл.
Terra получает raw response bytes и отдельно receipt. Malformed, oversized,
wrong-id или wrong-mode response остаётся evidence и приводит к protocol
outcome из `LUNA_PROTOCOL.md`.

Нельзя считать обычный subagent с полным workspace и теми же tools
соответствующим этому contract, даже если ему текстом сказали «ничего не
менять». Для первого реального прогона нужен no-tools model call либо
эквивалентная техническая изоляция.
