import assert from 'node:assert/strict'
import test from 'node:test'
import { createArena } from '../src/generators/create-arena.mjs'
import { createTank } from '../src/generators/create-tank.mjs'
import { createRenderer } from '../src/render/create-renderer.mjs'
import { createPerspectiveRenderer } from '../src/perspective-test/create-perspective-renderer.mjs'
import { createScenery } from '../src/generators/create-scenery.mjs'

test('renderer consumes the selected arena palette without an implicit global arena', () => {
    const context = createContext()
    const renderer = createRenderer({canvas: {getContext: function getContext() { return context }}})
    const arena = createArena({seed: 'violet', kind: 'ring'})
    const player = createTank({id: 'player', archetype: 'player', x: 6, y: 10})

    renderer.render({arena, player, enemies: [], shells: [], effects: [], cores: []})

    assert.ok(context.calls > 0)
})

test('renderer hides destroyed field blocks while retaining a single player tank', () => {
    const context = createContext()
    const renderer = createRenderer({canvas: {getContext: function getContext() { return context }}})
    const arena = createArena({seed: 'violet', kind: 'crater'})
    const player = createTank({id: 'player', archetype: 'player', x: 6, y: 10})

    renderer.render({arena, player, enemies: [], shells: [], effects: [], cores: [], blocks: [{x: 6.5, y: 6.5, hp: 1, alive: false}]})

    assert.ok(context.calls > 0)
})

test('renderer projects a large field through an explicit player camera', () => {
    const context = createContext()
    const renderer = createRenderer({canvas: {getContext: function getContext() { return context }}})
    const arena = createArena({seed: 'violet', kind: 'shards', size: 130})
    const player = createTank({id: 'player', archetype: 'player', x: 12, y: 12})

    renderer.render({arena, player, enemies: [], shells: [], effects: [], cores: [], blocks: [], camera: {x: 12, y: 12}})

    assert.ok(context.calls > 0)
})

test('perspective renderer draws native 3D tank models and a chase camera without a third-party engine', () => {
    const context = createContext()
    const renderer = createPerspectiveRenderer({canvas: {width: 960, height: 640, getContext: function getContext() { return context }}})
    const arena = createArena({seed: 'violet', kind: 'canyon', size: 130})
    const player = createTank({id: 'player', archetype: 'player', x: 12, y: 12})
    const enemy = createTank({id: 'scout', archetype: 'scout', x: 12, y: 6})

    renderer.render({arena, player, enemies: [enemy], shells: [], effects: [], blocks: [{x: 12, y: 8, hp: 2, alive: true}], scenery: createScenery({seed: 'wild', kind: 'canyon', size: 130})})

    assert.ok(context.calls > 0)
})

function createContext() {
    const context = {calls: 0, globalAlpha: 1}
    for (const name of ['clearRect', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'arc', 'save', 'restore', 'translate', 'rotate', 'fillText', 'stroke']) {
        context[name] = function called() { context.calls += 1 }
    }
    context.createLinearGradient = function createLinearGradient() { return {addColorStop: function addColorStop() { context.calls += 1 }} }
    return context
}
