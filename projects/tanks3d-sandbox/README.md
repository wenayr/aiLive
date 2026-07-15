# Tanks 3D — sandbox product

Это не «агент внутри игры». Здесь находится только продукт: браузерная игра,
собранная из обычных модулей. Внешний agent-layer расположен в
[`development/tanks3d-sandbox/`](../../development/tanks3d-sandbox/).

Игра получает три повторяющихся ресурса из генераторов:

1. арена — seed → стены и spawn pads;
2. танки — archetype → согласованные характеристики и вид;
3. волна — round + pads → противники.

Открой `index.html` в браузере. Управление: `WASD`, мышь для башни, `Space`.
Собирай map-derived energy cores и используй `Shift` для turbo burst. Карта
выбирается в верхней панели.
