import assert from 'node:assert/strict'
import test from 'node:test'
import { arenaProtocolVersion, type tArenaScenario } from '../contracts/arena-contracts'
import { createArenaCoordinator } from './arena-coordinator'

function scenario(): tArenaScenario {
    return {
        protocolVersion: arenaProtocolVersion,
        id: 'coordinator-fixture',
        seed: 'coordinator-fixture',
        width: 7,
        height: 5,
        blocked: [],
        spawns: [
            {id: 'alpha-1', team: 'alpha', position: {x: 1, y: 1}, body: 'east', turret: 'east'},
            {id: 'bravo-1', team: 'bravo', position: {x: 5, y: 1}, body: 'west', turret: 'west'},
        ],
    }
}

test('authoritative coordinator owns queued commands and publishes canonical updates', () => {
    const coordinator = createArenaCoordinator({scenario: scenario(), bots: []})
    const updates: string[] = []
    const off = coordinator.debug.updates.on(function record(update) { updates.push(update.stateHash) })
    const accepted = coordinator.runtime.submitIntent({
        protocolVersion: arenaProtocolVersion,
        clientCommandId: 'alpha-fire-1',
        actorId: 'alpha-1',
        kind: 'fire',
    })
    const repeated = coordinator.runtime.submitIntent({
        protocolVersion: arenaProtocolVersion,
        clientCommandId: 'alpha-fire-1',
        actorId: 'alpha-1',
        kind: 'fire',
    })
    const firstUpdate = coordinator.testing.advance()
    const update = coordinator.testing.advance()
    off()

    assert.equal(firstUpdate.events.length, 0)
    assert.equal(update.events[0].kind, 'projectile-fired')
    assert.equal(updates[1], update.stateHash)
    assert.equal(coordinator.debug.metrics().pendingCommands, 0)
    assert.equal('advance' in coordinator.runtime, false)
    assert.deepEqual(repeated, accepted)
})

test('authoritative coordinator rejects malformed and incompatible intent before queueing', () => {
    const coordinator = createArenaCoordinator({scenario: scenario(), bots: []})
    const malformed = coordinator.runtime.submitIntent({clientCommandId: 'bad', actorId: 'alpha-1', kind: 'fire'})
    const incompatible = coordinator.runtime.submitIntent({
        protocolVersion: 'arena/v0', clientCommandId: 'old', actorId: 'alpha-1', kind: 'fire',
    })

    assert.deepEqual(malformed, {accepted: false, clientCommandId: 'bad', code: 'ARENA_COMMAND_INVALID'})
    assert.deepEqual(incompatible, {accepted: false, clientCommandId: 'old', code: 'ARENA_PROTOCOL_UNSUPPORTED'})
    assert.equal(coordinator.testing.queuedCommands().length, 0)
})
