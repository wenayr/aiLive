import assert from 'node:assert/strict'
import test from 'node:test'
import { arenaProtocolVersion, type tArenaCommand, type tArenaScenario } from '../contracts/arena-contracts'
import { validateArenaProtocolVersion } from './protocol'
import { createArenaScenario, scenarioHasConnectedSpawns, validateArenaScenario } from './scenario'
import { createArenaInitialState, createArenaSimulation, hashArenaState, stepArena } from './simulation'
import { replayArena } from './replay'

function fixtureScenario(): tArenaScenario {
    return {
        protocolVersion: arenaProtocolVersion,
        id: 'fixture-arena',
        seed: 'fixture',
        width: 7,
        height: 5,
        blocked: [],
        spawns: [
            {id: 'alpha-1', team: 'alpha', position: {x: 1, y: 1}, body: 'east', turret: 'east'},
            {id: 'bravo-1', team: 'bravo', position: {x: 5, y: 1}, body: 'west', turret: 'west'},
        ],
    }
}

function command(tick: number, sequence: number, actorId: string, kind: tArenaCommand['kind']): tArenaCommand {
    if (kind == 'turn-body') return {protocolVersion: arenaProtocolVersion, tick, sequence, actorId, kind, direction: 'south'}
    if (kind == 'turn-turret') return {protocolVersion: arenaProtocolVersion, tick, sequence, actorId, kind, direction: 'east'}
    return {protocolVersion: arenaProtocolVersion, tick, sequence, actorId, kind}
}

test('seeded scenario keeps every spawn connected', () => {
    const first = createArenaScenario({id: 'seeded', seed: '12345', width: 15, height: 11, obstacleRate: 0.22})
    const second = createArenaScenario({id: 'seeded', seed: '12345', width: 15, height: 11, obstacleRate: 0.22})

    assert.equal(validateArenaScenario(first), true)
    assert.equal(scenarioHasConnectedSpawns(first), true)
    assert.deepEqual(first, second)
})

test('command sequence, rather than arrival order, determines the tick result', () => {
    const scenario = fixtureScenario()
    const initial = createArenaInitialState(scenario)
    const commands = [
        command(0, 2, 'alpha-1', 'turn-body'),
        command(0, 1, 'alpha-1', 'move'),
    ]
    const result = stepArena(initial, scenario, commands)
    const alpha = result.state.tanks.find(function findAlpha(tank) { return tank.id == 'alpha-1' })!

    assert.deepEqual(alpha.position, {x: 2, y: 1})
    assert.equal(alpha.body, 'south')
})

test('blocked movement is rejected without moving the tank', () => {
    const scenario = {...fixtureScenario(), blocked: [{x: 2, y: 1}]}
    const result = stepArena(createArenaInitialState(scenario), scenario, [command(0, 1, 'alpha-1', 'move')])
    const alpha = result.state.tanks.find(function findAlpha(tank) { return tank.id == 'alpha-1' })!

    assert.deepEqual(alpha.position, {x: 1, y: 1})
    assert.deepEqual(result.events, [{
        tick: 0,
        sequence: 1,
        kind: 'command-rejected',
        data: {actorId: 'alpha-1', command: 'move', reason: 'movement-blocked'},
    }])
})

test('four deterministic hits destroy a tank and retain its terminal state', () => {
    const scenario = {...fixtureScenario(), spawns: [
        {id: 'alpha-1', team: 'alpha' as const, position: {x: 1, y: 1}, body: 'east' as const, turret: 'east' as const},
        {id: 'bravo-1', team: 'bravo' as const, position: {x: 3, y: 1}, body: 'west' as const, turret: 'west' as const},
    ]}
    const simulation = createArenaSimulation({scenario})

    for (let tick = 0; tick < 11; tick += 1) {
        const commands = tick % 3 == 0 ? [command(tick, 1, 'alpha-1', 'fire')] : []
        simulation.runtime.tick(commands)
    }
    const bravo = simulation.runtime.snapshot().tanks.find(function findBravo(tank) { return tank.id == 'bravo-1' })!

    assert.equal(bravo.hp, 0)
    assert.equal(bravo.alive, false)
    assert.equal(simulation.debug.events().some(function destroyed(event) { return event.kind == 'tank-destroyed' }), true)
})

test('live simulation and replay finish with the same hash', () => {
    const scenario = fixtureScenario()
    const trace: tArenaCommand[] = [
        command(0, 1, 'alpha-1', 'fire'),
        command(1, 1, 'bravo-1', 'move'),
        command(2, 1, 'alpha-1', 'move'),
        command(3, 1, 'alpha-1', 'fire'),
    ]
    const live = createArenaSimulation({scenario})
    for (let tick = 0; tick < 6; tick += 1) {
        live.runtime.tick(trace.filter(function scheduled(command) { return command.tick == tick }))
    }
    const replay = replayArena({scenario, commands: trace.slice().reverse(), ticks: 6})

    assert.equal(live.runtime.stateHash(), replay.stateHash)
    assert.equal(hashArenaState(live.runtime.snapshot()), replay.stateHash)
    assert.equal(live.debug.events().length, replay.events.length)
})

test('runtime facade excludes test-only injection', () => {
    const simulation = createArenaSimulation({scenario: fixtureScenario()})
    assert.equal('inject' in simulation.runtime, false)
    assert.equal('inject' in simulation.testing, true)
})

test('incompatible protocol is rejected as typed data', () => {
    const result = validateArenaProtocolVersion('arena/v0')
    assert.deepEqual(result, {
        ok: false,
        error: {
            code: 'ARENA_PROTOCOL_UNSUPPORTED',
            expected: 'arena/v1',
            received: 'arena/v0',
        },
    })
})
