# V12 large field

Field test получает `130×130` мир, player-following camera, три archetype-а
врагов с hp и блоки с hp. `createArena` остаётся источником map rules;
field runtime превращает его walls в разрушаемые объекты. Renderer получает
явный camera и переводит world direction ствола в isometric screen direction.
