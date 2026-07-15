# Tanks 3D V11: one-tank field test

Дата: 2026-07-15.

## Задача

Добавить в обе сравнительные игры отдельную `field-test.html`: небольшое поле
без противников, один танк, мышь для башни, `W/S` для движения, `A/D` для
поворота корпуса, `Space` для стрельбы и только разрушаемые блоки. Нужны десять
разных карт.

## Реализация

Simple держит десять карт как ручные списки блоков в
`projects/tanks3d-simple/field-test.js`.

Sandbox расширяет `createArena` десятью profile/palette парами. Новый
`createFieldTest` потребляет `arena.walls`, создаёт из них блоки с hp и передаёт
их renderer-у. Правила размещения карт не продублированы в field runtime.

## Проверки

- Simple: 2/2 tests.
- Sandbox: 12/12 tests, включая проверку десяти map kinds, безопасного start,
  body movement, mouse aim, разрушения блока и renderer-а с погибшим блоком.
- Browser-smoke: обе `field-test.html?map=crater` страницы показывают десять
  вариантов select, canvas, HUD `objects/destroyed` и guide; console errors и
  warnings отсутствуют.

## Генетическая песочница

Изменение `create-arena.mjs` вызвало одну reviewer inspection. Она подтвердила
активную инструкцию: правила карт и палитры живут в генераторе, а field runtime
только потребляет output. Verdict `clear`, pending action отсутствует.
