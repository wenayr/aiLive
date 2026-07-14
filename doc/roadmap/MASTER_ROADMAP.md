# Master roadmap лаборатории — 100 рабочих пунктов

Статус: active.
Горизонт: от текущего `L1_TRANSPORT_PROFILE` до первого обоснованного решения
по agent ecology и следующего слоя лаборатории.

Это не обещание сделать всё подряд и не бэклог «фич». Это очередь проверяемых
работ. Пункт можно начать, только когда выполнены его зависимости; завершить —
только по его критерию готовности и с ссылкой на evidence/checkpoint.

## Как пользоваться очередью

- `NOW` — единственный активный implementation packet. Сейчас это **22 / P1**.
- `NEXT` — можно брать сразу после текущего packet и его checkpoint.
- `GATED` — работа разумна, но ждёт явно названные пункты.
- `LATER_DECISION` — не реализация: сперва отдельное решение с authority,
  риском и acceptance.
- `DONE_BASELINE` — уже есть как baseline, но при изменении границы требует
  повторной проверки.

После каждого завершённого packet: обновить evidence, каталог/decision при
изменении правила и [checkpoint](../checkpoints/README.md). Если пункт меняет
предпосылки следующих — обновить этот roadmap, а не обходить зависимость устно.

## Ворота этапов

| Ворота | Открываются, когда | Разрешают |
| --- | --- | --- |
| G0 | 1–10 выполнены | систематические изменения baseline |
| G1 | 11–20 выполнены | закрытие L1 transport profile |
| G2 | 21–35 выполнены | L1 operational closure и E0 |
| G3 | 36–55 выполнены | evidence-driven experiments и read-only ecology |
| G4 | 56–75 выполнены | изолированный builder pilot |
| G5 | 76–95 выполнены | решение PROFILE / candidate / reject |
| G6 | 96–100 прошли отдельные decisions | только выбранный L2 route |

## A. Управление проектом и честность состояния (1–10)

| ID | Работа и критерий «готово» | Зависит от | Статус |
| --- | --- | --- | --- |
| 1 | Зафиксировать этот 100-пунктовый roadmap. Готово: есть нумерация, ворота и ссылка из навигации. | — | DONE_BASELINE |
| 2 | Привязать каждый активный objective каталога к одному или нескольким ID roadmap. Готово: нет orphan objective. | 1 | NEXT |
| 3 | Ввести правило «один NOW packet». Готово: `CURRENT.md` называет только одну реализуемую ставку. | 1 | NEXT |
| 4 | Проставить зависимости у всех пунктов, где нельзя безопасно угадывать порядок. Готово: каждый `GATED` имеет явный predecessor. | 1 | NEXT |
| 5 | Ввести состояния `planned/in-progress/blocked/verified/archived` для карточек работ. Готово: status не смешивается с уверенностью evidence. | 1 | NEXT |
| 6 | Связать решение, evidence и checkpoint обратными ссылками. Готово: значимое решение открывает свои основания. | 1 | NEXT |
| 7 | Создать реестр открытых неизвестностей с owner-oracle. Готово: у каждой неизвестности есть способ закрыть или честный `blocked`. | 1 | NEXT |
| 8 | Ввести правило устаревания фактов. Готово: evidence с зависимостью от версии/сервиса имеет дату и condition recheck. | 6 | GATED |
| 9 | Провести первый обзор очереди без изменения кода. Готово: приоритеты P0/P1 и non-goals подтверждены checkpoint. | 2–7 | GATED |
| 10 | Описать protocol остановки работы. Готово: любой packet может закончиться `REJECT`, `KEEP_LOCAL` или `BLOCKED` с evidence. | 5–7 | GATED |

## B. L0: наблюдаемый local runner как надёжный baseline (11–20)

| ID | Работа и критерий «готово» | Зависит от | Статус |
| --- | --- | --- | --- |
| 11 | Повторить чистую базовую verify-проверку L0. Готово: команда, версии и результат сохранены trace. | 1 | NEXT |
| 12 | Проверить schema validation всех `task.json`. Готово: invalid manifest не попадает в registry и имеет test. | 11 | GATED |
| 13 | Проверить allow-list boundary runner-а. Готово: UI не может передать command/cwd/env вне manifest. | 11 | GATED |
| 14 | Покрыть terminal transitions: passed/failed/canceled/timed_out. Готово: каждая имеет deterministic test и record. | 11 | GATED |
| 15 | Проверить монотонность run event sequence и запрет terminal → non-terminal. Готово: regression oracle. | 14 | GATED |
| 16 | Зафиксировать лимиты live log и поведение при переполнении. Готово: policy и test, а не неявная память процесса. | 14 | GATED |
| 17 | Проверить file evidence binding: record, trace и artifacts согласованы после terminal state. Готово: fixture oracle. | 14–15 | GATED |
| 18 | Описать и проверить recovery при restart local service. Готово: нет фиктивного terminal success для оборванного child process. | 17 | GATED |
| 19 | Провести operator walkthrough L0. Готово: в UI видны запуск, live state, итог и ссылка на artifact без raw terminal. | 11–18 | GATED |
| 20 | Выпустить L0 baseline checkpoint. Готово: подтверждённое и ограничения runner-а собраны отдельно от L1. | 12–19 | GATED |

## C. L1 transport profile: закрыть опасные неизвестности (21–35)

| ID | Работа и критерий «готово» | Зависит от | Статус |
| --- | --- | --- | --- |
| 21 | Обновить inventory всех L1 RPC/replay границ перед изменением. Готово: owner, delivery class, retry/recovery и oracle перечислены. | 1 | DONE_BASELINE |
| 22 | Реализовать P1 response-loss oracle. Готово: после server-side apply потерян ответ, ручной retry с тем же idempotency key даёт ровно один effect. | 21 | VERIFIED |
| 23 | Зафиксировать P1 trace/evaluation и обновить transport status. Готово: нет утверждения non-retry без результата oracle. | 22 | VERIFIED |
| 24 | Добавить versioned session epoch в Arena contract. Готово: epoch создаётся сервером и попадает в snapshot/update. | 23 | NOW |
| 25 | Реализовать P2 reset state в browser mirror. Готово: смена epoch очищает старый mirror и показывает `service-reset`. | 24 | GATED |
| 26 | Проверить P2 на real Socket.IO restart. Готово: restart не маскируется под replay tail; fresh keyframe обязателен. | 24–25 | GATED |
| 27 | Описать разрешённые действия UI в `recovering`, `stale` и `service-reset`. Готово: runtime command policy явна. | 25 | GATED |
| 28 | Реализовать P3 read-only transport diagnostics в Arena UI. Готово: connection, recovery, sequence, desync и reset видимы. | 25–27 | GATED |
| 29 | Провести P3 browser-controller visual smoke. Готово: воспроизводимо показаны recovering → live, stale и reset. | 28 | GATED |
| 30 | Проверить disposal при закрытии всех consumers после P2/P3 изменений. Готово: нет оставшегося physical socket/subscription. | 24–29 | GATED |
| 31 | Проверить limits и invalid-packet hooks после новых contracts. Готово: старые guardrails не обойдены epoch/reset путём. | 24–30 | GATED |
| 32 | Обновить transport inventory и decision по фактической, а не желаемой семантике. Готово: все boundaries имеют owner и oracle. | 23, 26, 29–31 | GATED |
| 33 | Провести L1 headless replay regression после transport changes. Готово: canonical hash не изменился без отдельного domain decision. | 22–32 | GATED |
| 34 | Выполнить полный `npm run verify` и real-socket suite. Готово: результаты приложены к evidence. | 22–33 | GATED |
| 35 | Создать G2 transport closure checkpoint. Готово: P1–P3 имеют verified result либо честное `blocked`; extraction всё ещё не подразумевается. | 23–34 | GATED |

## D. L1 simulation и операторская наблюдаемость (36–45)

| ID | Работа и критерий «готово» | Зависит от | Статус |
| --- | --- | --- | --- |
| 36 | Версионировать канонический Arena scenario contract. Готово: scenario identity, command trace и hash имеют совместимый формат. | G2 | GATED |
| 37 | Явно зафиксировать queue/canonical tick invariants. Готово: отдельные tests отличают intent arrival от scheduled command. | 36 | GATED |
| 38 | Создать минимальный corpus replay-сценариев: normal, duplicate intent, disconnect, stale, reset. Готово: каждый сценарий запускается headless. | 36–37 | GATED |
| 39 | Проверить детерминизм bot policy на фиксированных seeds. Готово: один seed не скрывает расхождение. | 38 | GATED |
| 40 | Сделать domain failure наблюдаемым в debug facade без runtime backdoor. Готово: UI не получает управляющие debug operations. | 37–39 | GATED |
| 41 | Разделить runtime и debug presentation Arena. Готово: диагностическая информация read-only и не дублирует authoritative state. | 40 | GATED |
| 42 | Зафиксировать compatibility policy для scenario/contract versions. Готово: incompatible client получает typed outcome. | 36–41 | GATED |
| 43 | Добавить fixture для повреждённого replay/event order. Готово: desync детектируется, а не даёт тихо неверный экран. | 38–42 | GATED |
| 44 | Провести operator walkthrough L1. Готово: оператор может объяснить источник каждого transport status по UI и trace. | 38–43 | GATED |
| 45 | Создать L1 operational checkpoint. Готово: simulation/core/transport результаты и remaining risks разведены. | 38–44 | GATED |

## E. Evidence, catalog и воспроизводимость экспериментов (46–55)

| ID | Работа и критерий «готово» | Зависит от | Статус |
| --- | --- | --- | --- |
| 46 | Утвердить минимальный trace template. Готово: command, environment, inputs, output, verdict и artifact paths обязательны. | G2 | GATED |
| 47 | Утвердить evaluation template для независимого review. Готово: observation, inference, limitation и decision разделены. | 46 | GATED |
| 48 | Добавить reproducibility metadata: Node/package lock/source revision. Готово: trace можно повторить без угадывания среды. | 46 | GATED |
| 49 | Ввести policy для failed experiments. Готово: отрицательный результат индексируется, а не исчезает из истории. | 46–47 | GATED |
| 50 | Привязать catalog snapshot к checkpoint. Готово: objective status можно восстановить на дату снимка. | 46–49 | GATED |
| 51 | Создать index rejected hypotheses/candidates. Готово: следующий agent видит, что уже проверялось и почему отвергнуто. | 49 | GATED |
| 52 | Добавить source-of-truth marker для evidence, derived summary и proposal. Готово: summary не выдают за raw факт. | 46–51 | GATED |
| 53 | Проверить ссылки между decisions, evidence, catalog и checkpoint. Готово: нет битых/односторонних указателей у активных решений. | 50–52 | GATED |
| 54 | Провести воспроизводимый «repeat one old trace» audit. Готово: результат совпал либо drift описан отдельным evidence. | 48–53 | GATED |
| 55 | Создать G3 evidence hygiene checkpoint. Готово: архивируемые и актуальные факты разнесены. | 46–54 | GATED |

## F. Agent ecology: read-only и evidence-first foundation (56–75)

| ID | Работа и критерий «готово» | Зависит от | Статус |
| --- | --- | --- | --- |
| 56 | Закрыть E0 admission. Готово: G2 и G3 подтверждены, нет открытого P1–P3, authority boundary неизменна. | 35, 55 | GATED |
| 57 | Специфицировать `work-order.yaml` schema. Готово: scope, authority, budget, oracles, stop condition и decisions обязательны. | 56 | GATED |
| 58 | Реализовать deterministic S0 validator work order. Готово: invalid/missing authority не допускается в queue. | 57 | GATED |
| 59 | Специфицировать attempt envelope schema. Готово: claim, inputs, evidence, cost, status и stop reason машиночитаемы. | 57 | GATED |
| 60 | Реализовать S0 validator attempt envelope. Готово: отчёт без evidence/status не становится результатом. | 59 | GATED |
| 61 | Создать read-only context-pack builder по declared paths. Готово: scope не расширяется скрыто. | 57–60 | GATED |
| 62 | Создать S1 scout prompt/role matrix: inventory, invariant, counterexample, test design, locality. Готово: роли различаются вопросом и output schema. | 61 | GATED |
| 63 | Реализовать deduplication claims по evidence, а не по совпадению текста. Готово: consensus не считается доказательством. | 59–62 | GATED |
| 64 | Реализовать budget/stop ledger. Готово: попытка не может потратить больше разрешённого work order. | 57–60 | GATED |
| 65 | Выполнить E1 pilot: десять bounded read-only scout attempts на documentation/architecture inventory. Готово: нет candidate/stable write. | 61–64 | GATED |
| 66 | Провести S0 verification E1 artifacts. Готово: confirmed/unknown/contradicted не смешаны. | 65 | GATED |
| 67 | Создать human-readable evidence table и disagreement view. Готово: человек видит источник каждого конфликта. | 63–66 | GATED |
| 68 | Провести human triage E1. Готово: выбран `NO_CHANGE`, следующий experiment или `BLOCKED`. | 67 | GATED |
| 69 | Создать E1 checkpoint и cost review. Готово: польза/дублирование/расходы измерены, а не угаданы. | 64–68 | GATED |
| 70 | Спроектировать panel read model для work orders и attempts. Готово: UI projection не получает authority to execute. | 69 | GATED |
| 71 | Отобразить queue, authority, spend, stop reason и evidence links в web panel. Готово: нет raw prompt/terminal surface. | 70 | GATED |
| 72 | Проверить panel на stale/reconnect/reset вместе с transport policy. Готово: UI не врёт о status agent run. | 71 | GATED |
| 73 | Выполнить operator walkthrough E1/E2. Готово: работа читается без доступа к внутреннему агентному чату. | 69–72 | GATED |
| 74 | Зафиксировать критерий admission для candidate builder. Готово: низкорисковая задача, deterministic oracle и rollback обязательны. | 68–73 | GATED |
| 75 | Создать G4 ecology foundation checkpoint. Готово: read-only ecology получила доказанную, ограниченную полезность либо честный reject. | 65–74 | GATED |

## G. Candidate lane, adjudication и module lifecycle (76–95)

| ID | Работа и критерий «готово» | Зависит от | Статус |
| --- | --- | --- | --- |
| 76 | Определить candidate workspace manifest и path guard. Готово: materialization вне `.candidates/<work-id>/` отклоняется автоматически. | G4 | GATED |
| 77 | Реализовать diff boundary check против stable writes. Готово: S0 блокирует нарушение до review. | 76 | GATED |
| 78 | Реализовать candidate artifact hash и baseline comparison. Готово: проверяемо, что именно предложено. | 76–77 | GATED |
| 79 | Специфицировать rollback protocol. Готово: candidate можно удалить без воздействия на stable/evidence. | 76–78 | GATED |
| 80 | Выбрать первый low-risk builder pilot. Готово: это fixture/validator/adapter, не transport rewrite и не внешняя зависимость. | 74, 76–79 | GATED |
| 81 | Выполнить не более двух S2 builder attempts для pilot. Готово: каждый имеет bounded diff и machine-readable result. | 80 | GATED |
| 82 | Прогнать declared deterministic oracles на candidate. Готово: `UNVERIFIED` остаётся явным, если семантику нельзя проверить. | 81 | GATED |
| 83 | Подготовить compact adjudication bundle. Готово: objective, alternatives, diff stats, tests, costs, unknowns и rollback доступны без полного repo dump. | 81–82 | GATED |
| 84 | Специфицировать S3 adjudication report. Готово: допустимы только declared decisions и отдельно facts/inferences. | 83 | GATED |
| 85 | Провести E4 adjudication pilot. Готово: результат может быть `KEEP_LOCAL`, `PROFILE`, `REJECT` или `ARCHIVE`, но не silent promotion. | 83–84 | GATED |
| 86 | Провести независимый review candidate/adjudication результата. Готово: reviewer не является тем же materializer. | 85 | GATED |
| 87 | Зафиксировать result и rollback/reject evidence. Готово: rejected path доступен будущему retrieval. | 85–86 | GATED |
| 88 | Описать capability taxonomy: local behaviour, project profile, candidate module, promoted module. Готово: слова не используются взаимозаменяемо. | 85–87 | GATED |
| 89 | Определить contrast-transfer protocol. Готово: второй usage profile независим от Arena terminology и имеет oracle. | 88 | GATED |
| 90 | Провести transfer experiment только при реальном втором consumer. Готово: candidate сравнен с KEEP_LOCAL по стоимости и качеству. | 89 | GATED |
| 91 | Проверить source of truth, ownership и public facade candidate. Готово: resource/core не импортирует consumer UI/domain contracts. | 90 | GATED |
| 92 | Принять lifecycle decision: `KEEP_LOCAL`, `PROFILE`, `PROMOTE_CANDIDATE` или `REJECT`. Готово: decision ссылается на transfer и independent review. | 90–91 | GATED |
| 93 | При `PROMOTE_CANDIDATE` подготовить отдельный migration/rollback plan. Готово: promotion не происходит в том же проходе. | 92 | GATED |
| 94 | Обновить capability catalog и lineage. Готово: статус/дата/evidence/expiry видны из одного места. | 87–93 | GATED |
| 95 | Создать G5 lifecycle checkpoint. Готово: вывод о module boundary отделён от желания «вынести библиотеку». | 88–94 | GATED |

## H. Внешние границы и следующий маршрут (96–100)

| ID | Работа и критерий «готово» | Зависит от | Статус |
| --- | --- | --- | --- |
| 96 | Подготовить SSH/publication decision, не реализацию. Готово: destination, credentials, approval, rollback, audit и evidence определены человеком. | G5 | LATER_DECISION |
| 97 | Подготовить Docker/executor decision, не реализацию. Готово: доказана задача, которой L0 policy runner-а недостаточно. | G5 | LATER_DECISION |
| 98 | Подготовить threat model для любой remote/auth boundary. Готово: assets, attacker, permissions, logs и revoke path определены до кода. | 96 или 97 | LATER_DECISION |
| 99 | Выбрать ровно один L2 route: remote executor, второй consumer, новый experiment или intentional pause. Готово: выбор опирается на G5 evidence, бюджет и human authority. | 95–98 | LATER_DECISION |
| 100 | Создать L2 admission checkpoint. Готово: следующая сотня задач формируется из выбранного route, а не добавляется к старой очереди. | 99 | LATER_DECISION |

## Текущий порядок работы

План не требует сначала закрыть все `NEXT` пункты из A/B. Они образуют
управленческий и baseline backlog. Единственный риск, который уже имеет
конкретный design и способен исказить дальнейшую лабораторию, — **24 / P2**.
Поэтому порядок ближайших действий такой:

1. 24 — session epoch в contract;
2. 25–27 — reset semantics и command policy;
3. 28–35 — browser truthfulness, regression и G2 checkpoint;
4. затем — последовательно упорядоченные A/B/E пункты по правилу одного `NOW`.

Каждый следующий ход может быть остановлен evidence. Медленный темп здесь
намеренный: лаборатория ценит исключённую ошибочную ветку выше количества
созданных файлов.
