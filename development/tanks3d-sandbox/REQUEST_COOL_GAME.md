# Входящий запрос

> Сделай игру классной.

## Решение sandbox-ветки

Запрос не трактуется как разрешение построить всё подряд. У продукта уже есть
выбираемые карты и активная инструкция про границу generator contract/runtime.
Поэтому выбран один проверяемый шаг: каждая карта сообщает core pads через
`createArena`; runtime создаёт из них collectible energy cores; собранное ядро
даёт один turbo burst по `Shift`.

Новый generator не создаётся: cores — данные существующей арены. После правки
нужно проверить generator property и runtime collection/boost, затем позволить
genetic module провести focused inspect текущей инструкции.
