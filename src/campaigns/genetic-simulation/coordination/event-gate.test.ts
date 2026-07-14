import assert from 'node:assert/strict'
import test from 'node:test'
import { createGeneticSimulation } from '../resource/genetic-simulation'
import { createGeneticEventGate } from './event-gate'

function createFixture() {
    let id = 0
    let time = 0
    return createGeneticSimulation({
        createId: () => `event-fixture-${++id}`,
        now: () => `2026-07-14T01:00:${String(time++).padStart(2, '0')}.000Z`,
    })
}

test('event gate coalesces duplicate saves and defers a newer revision while Luna is pending', () => {
    const simulation = createFixture()
    const gate = createGeneticEventGate({simulation})
    gate.control.establishBaseline([
        {path: 'src/adapter.ts', revision: 'v1'},
        {path: 'src/normalizer.ts', revision: 'v1'},
    ])

    const agentPatch = gate.control.notify({
        source: 'agent-patch-applied',
        files: [{path: 'src/adapter.ts', revision: 'v2'}],
    })
    const savedDuplicate = gate.control.notify({
        source: 'file-saved',
        files: [{path: 'src/adapter.ts', revision: 'v2'}],
    })
    assert.deepEqual(agentPatch, {
        acceptedPaths: ['src/adapter.ts'],
        suppressedPaths: [],
        queuedFileCount: 1,
    })
    assert.deepEqual(savedDuplicate, {
        acceptedPaths: [],
        suppressedPaths: ['src/adapter.ts'],
        queuedFileCount: 1,
    })
    assert.equal(simulation.debug.pendingAction(), null)

    const discovery = gate.control.flush()
    assert.equal(discovery.status, 'scanned')
    assert.equal(discovery.pendingAction?.agent, 'terra')
    assert.equal(discovery.pendingAction?.kind, 'discover')
    if (!discovery.pendingAction || discovery.pendingAction.kind != 'discover') {
        throw new Error('Expected a Terra discovery action')
    }
    simulation.control.submitTerra(discovery.pendingAction.id, {
        kind: 'discover',
        observation: {
            key: 'adapter-normalizer',
            summary: 'An adapter revision may require a matching normalizer revision.',
            watchedPaths: ['src/adapter.ts'],
            instruction: 'When the adapter changes, inspect its normalizer.',
        },
    })

    gate.control.notify({
        source: 'agent-patch-applied',
        files: [{path: 'src/adapter.ts', revision: 'v3'}],
    })
    const luna = gate.control.flush()
    assert.equal(luna.status, 'scanned')
    assert.equal(luna.pendingAction?.agent, 'luna')
    assert.equal(luna.pendingAction?.kind, 'inspect')
    if (!luna.pendingAction || luna.pendingAction.kind != 'inspect') {
        throw new Error('Expected a Luna inspection action')
    }

    gate.control.notify({
        source: 'file-saved',
        files: [{path: 'src/adapter.ts', revision: 'v4'}],
    })
    const blocked = gate.control.flush()
    assert.equal(blocked.status, 'blocked')
    assert.equal(blocked.pendingAction?.id, luna.pendingAction.id)
    assert.deepEqual(gate.debug.queuedFiles(), [{path: 'src/adapter.ts', revision: 'v4'}])

    simulation.control.submitLuna(luna.pendingAction.id, {
        kind: 'inspect',
        verdict: 'issue',
        summary: 'The normalizer revision was not changed with the adapter.',
        proposedInstruction: null,
    })
    const review = simulation.debug.pendingAction()
    assert.ok(review)
    assert.equal(review.kind, 'review-luna')
    if (!review || review.kind != 'review-luna') throw new Error('Expected Terra review')
    simulation.control.submitTerra(review.id, {
        kind: 'review-luna',
        decision: 'keep',
        summary: 'The first focused check was useful.',
        instruction: null,
    })

    const deferred = gate.control.flush()
    assert.equal(deferred.status, 'scanned')
    assert.equal(deferred.pendingAction?.agent, 'luna')
    assert.deepEqual(deferred.pendingAction?.kind == 'inspect'
        ? deferred.pendingAction.files.map(file => file.path)
        : [], ['src/adapter.ts'])
})
