import assert from 'node:assert/strict'
import test from 'node:test'
import { createArena } from '../src/generators/create-arena.mjs'
import { createTank } from '../src/generators/create-tank.mjs'
import { createRenderer } from '../src/render/create-renderer.mjs'

test('renderer consumes the selected arena palette without an implicit global arena', () => {
    const context = createContext()
    const renderer = createRenderer({canvas: {getContext: function getContext() { return context }}})
    const arena = createArena({seed: 'violet', kind: 'ring'})
    const player = createTank({id: 'player', archetype: 'player', x: 6, y: 10})

    renderer.render({arena, player, enemies: [], shells: [], effects: [], cores: []})

    assert.ok(context.calls > 0)
})

function createContext() {
    const context = {calls: 0, globalAlpha: 1}
    for (const name of ['clearRect', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'arc', 'save', 'restore', 'translate', 'rotate', 'fillText']) {
        context[name] = function called() { context.calls += 1 }
    }
    return context
}
