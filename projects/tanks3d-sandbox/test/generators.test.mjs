import assert from 'node:assert/strict'
import test from 'node:test'
import { createArena, listArenaKinds } from '../src/generators/create-arena.mjs'
import { createGame } from '../src/game/create-game.mjs'
import { createTank, listTankArchetypes } from '../src/generators/create-tank.mjs'
import { createWave } from '../src/generators/create-wave.mjs'

test('arena generator is deterministic for a saved seed', () => {
    assert.deepEqual(createArena({seed: 'violet', kind: 'islands'}), createArena({seed: 'violet', kind: 'islands'}))
    assert.deepEqual(listArenaKinds(), ['crossroads', 'ring', 'islands'])
    assert.notDeepEqual(createArena({seed: 'violet', kind: 'crossroads'}).walls, createArena({seed: 'violet', kind: 'ring'}).walls)
})

test('tank generator exposes only known archetypes with stable ids', () => {
    assert.deepEqual(listTankArchetypes(), ['player', 'scout', 'brute', 'artillery'])
    const scout = createTank({id: 'one', archetype: 'scout', x: 1, y: 2})
    assert.equal(scout.id, 'one')
    assert.ok(scout.model.barrelLength < createTank({id: 'two', archetype: 'artillery', x: 1, y: 2}).model.barrelLength)
    assert.throws(function invalidArchetype() {
        createTank({id: 'two', archetype: 'unknown', x: 1, y: 2})
    }, /Unknown tank archetype/)
})

test('wave generator derives a bounded enemy wave that grows from its round input', () => {
    const pads = [[1, 1], [2, 2], [3, 3], [4, 4]]
    const firstWave = createWave({round: 1, spawnPads: pads})
    const laterWave = createWave({round: 3, spawnPads: pads})

    assert.equal(firstWave.length, 2)
    assert.equal(laterWave.length, 4)
    assert.equal(laterWave[0].archetype, 'brute')
    assert.equal(laterWave.at(-1).archetype, 'brute')
})

test('game runtime asks the wave generator for the next round after a clear arena', () => {
    const game = createGame()
    game.api.snapshot().enemies.forEach(function destroy(enemy) { enemy.alive = false })

    game.runtime.update({delta: 0, now: 0, input: {}})

    assert.equal(game.api.status().round, 2)
    assert.equal(game.api.status().enemies, 3)
})

test('game runtime steers the player barrel toward the supplied world aim point', () => {
    const game = createGame({mapKind: 'ring'})
    game.runtime.update({delta: 0, now: 0, input: {aim: {x: 11, y: 10}}})

    assert.equal(game.api.snapshot().player.turret, 0)
    assert.equal(game.api.status().mapKind, 'ring')
})
