import assert from 'node:assert/strict'
import test from 'node:test'
import { createArena, listArenaKinds } from '../src/generators/create-arena.mjs'
import { createGame } from '../src/game/create-game.mjs'
import { createTank, listTankArchetypes } from '../src/generators/create-tank.mjs'
import { createWave } from '../src/generators/create-wave.mjs'
import { createFieldTest } from '../src/field-test/create-field-test.mjs'
import { createCoastalWorld } from '../src/generators/create-coastal-world.mjs'

test('arena generator is deterministic for a saved seed', () => {
    assert.deepEqual(createArena({seed: 'violet', kind: 'islands'}), createArena({seed: 'violet', kind: 'islands'}))
    assert.deepEqual(listArenaKinds(), ['crossroads', 'ring', 'islands', 'zigzag', 'orchard', 'turbine', 'canyon', 'delta', 'crater', 'shards'])
    assert.notDeepEqual(createArena({seed: 'violet', kind: 'crossroads'}).walls, createArena({seed: 'violet', kind: 'ring'}).walls)
})

test('coastal world generator creates repeatable sea, vegetation and varied ground', () => {
    const first = createCoastalWorld({seed: 'tideline', size: 130})
    const second = createCoastalWorld({seed: 'tideline', size: 130})

    assert.deepEqual(first.features, second.features)
    assert.equal(first.heightAt(12, 12), second.heightAt(12, 12))
    assert.ok(first.flora.length > 100)
    assert.ok(first.cover.length > 10)
    assert.equal(first.isSea(40, 5), true)
    assert.equal(first.isSea(40, 90), false)
    assert.notEqual(first.heightAt(12, 12), first.heightAt(25, 25))
})

test('ten generated map kinds have distinct palettes and never place a block on the field tank', () => {
    const kinds = listArenaKinds()
    const arenas = kinds.map(function arena(kind) { return createArena({seed: 'field-test', kind}) })

    assert.equal(kinds.length, 10)
    assert.equal(new Set(arenas.map(function color(arena) { return arena.palette.background })).size, 10)
    assert.ok(arenas.every(function clearStart(arena) {
        return !arena.walls.some(function playerStart(wall) { return wall[0] == 6 && wall[1] == 10 })
    }))
})

test('arena generator exposes safe core pads as part of the selected map contract', () => {
    const arena = createArena({seed: 'violet', kind: 'islands'})

    assert.equal(arena.corePads.length, 3)
    assert.ok(arena.corePads.every(function clear(pad) {
        return !arena.walls.some(function sameWall(wall) { return wall[0] == pad[0] && wall[1] == pad[1] })
    }))
    assert.notDeepEqual(createArena({seed: 'violet', kind: 'crossroads'}).palette, createArena({seed: 'violet', kind: 'ring'}).palette)
})

test('tank generator exposes only known archetypes with stable ids', () => {
    assert.deepEqual(listTankArchetypes(), ['player', 'scout', 'brute', 'artillery'])
    const scout = createTank({id: 'one', archetype: 'scout', x: 1, y: 2})
    assert.equal(scout.id, 'one')
    assert.equal(scout.bounty, 100)
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

test('game collects an arena core and converts it into one released turbo burst', () => {
    const game = createGame({mapKind: 'crossroads'})
    const core = game.api.snapshot().cores[0]
    const player = game.api.snapshot().player
    player.x = core.x
    player.y = core.y

    game.runtime.update({delta: 0, now: 100, input: {boost: false}})
    assert.equal(game.api.status().cores, 1)
    assert.equal(game.api.status().boostCharges, 1)

    game.runtime.update({delta: 0, now: 200, input: {boost: true}})
    assert.equal(game.api.status().boostCharges, 0)
    assert.ok(game.api.snapshot().boostUntil > 200)
})

test('game turns a defeated enemy into score and a visible combat effect', () => {
    const game = createGame()
    const snapshot = game.api.snapshot()
    const enemy = snapshot.enemies[0]
    enemy.x = snapshot.player.x
    enemy.y = snapshot.player.y - .35

    game.runtime.update({delta: .05, now: 1000, input: {fire: true}})

    assert.equal(enemy.alive, false)
    assert.equal(game.api.status().score, enemy.bounty)
    assert.equal(game.api.snapshot().effects.length, 1)
})

test('field test uses body movement, mouse aim and destructible generated blocks', () => {
    const field = createFieldTest({mapKind: 'turbine'})
    const snapshot = field.api.snapshot()
    const player = snapshot.player
    const block = snapshot.blocks[0]
    const initialY = player.y

    snapshot.blocks.forEach(function clear(candidate) { candidate.alive = false })
    field.runtime.update({delta: .1, now: 100, input: {forward: true, aim: {x: player.x + 4, y: player.y}}})
    assert.ok(player.y < initialY)
    assert.equal(player.turret, 0)
    assert.equal(snapshot.arena.size, 130)
    assert.equal(snapshot.enemies.length, 3)

    block.x = player.x
    block.y = player.y - .35
    block.hp = 1
    block.alive = true
    const destroyedBeforeShot = field.api.status().destroyed
    field.runtime.update({delta: .05, now: 1000, input: {fire: true, aim: {x: player.x, y: player.y - 4}}})
    assert.equal(block.alive, false)
    assert.equal(field.api.status().destroyed, destroyedBeforeShot + 1)
})
