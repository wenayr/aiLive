import assert from 'node:assert/strict'
import test from 'node:test'
import { createGeneticModule } from '../resource/genetic-module'
import { createGeneticEventGate } from './event-gate'

function createFixture() {
    let id = 0
    let time = 0
    return createGeneticModule({
        createId: () => `event-fixture-${++id}`,
        now: () => `2026-07-14T01:00:${String(time++).padStart(2, '0')}.000Z`,
    })
}

test('event gate coalesces duplicate saves and defers a newer revision while Reviewer is pending', () => {
    const genetic = createFixture()
    const gate = createGeneticEventGate({genetic})
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
    assert.equal(genetic.debug.pendingAction(), null)

    const discovery = gate.control.flush()
    assert.equal(discovery.status, 'scanned')
    assert.equal(discovery.pendingAction?.agent, 'owner')
    assert.equal(discovery.pendingAction?.kind, 'discover')
    if (!discovery.pendingAction || discovery.pendingAction.kind != 'discover') {
        throw new Error('Expected a Owner discovery action')
    }
    genetic.control.submitOwner(discovery.pendingAction.id, {
        kind: 'discover',
        decision: 'record',
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
    const reviewer = gate.control.flush()
    assert.equal(reviewer.status, 'scanned')
    assert.equal(reviewer.pendingAction?.agent, 'reviewer')
    assert.equal(reviewer.pendingAction?.kind, 'inspect')
    if (!reviewer.pendingAction || reviewer.pendingAction.kind != 'inspect') {
        throw new Error('Expected a Reviewer inspection action')
    }

    gate.control.notify({
        source: 'file-saved',
        files: [{path: 'src/adapter.ts', revision: 'v4'}],
    })
    const blocked = gate.control.flush()
    assert.equal(blocked.status, 'blocked')
    assert.equal(blocked.pendingAction?.id, reviewer.pendingAction.id)
    assert.deepEqual(gate.debug.queuedFiles(), [{path: 'src/adapter.ts', revision: 'v4'}])

    genetic.control.submitReviewer(reviewer.pendingAction.id, {
        kind: 'inspect',
        verdict: 'issue',
        summary: 'The normalizer revision was not changed with the adapter.',
        proposedInstruction: null,
    })
    const review = genetic.debug.pendingAction()
    assert.ok(review)
    assert.equal(review.kind, 'review-inspection')
    if (!review || review.kind != 'review-inspection') throw new Error('Expected Owner review')
    genetic.control.submitOwner(review.id, {
        kind: 'review-inspection',
        decision: 'keep',
        summary: 'The first focused check was useful.',
        instruction: null,
    })

    const deferred = gate.control.flush()
    assert.equal(deferred.status, 'scanned')
    assert.equal(deferred.pendingAction?.agent, 'reviewer')
    assert.deepEqual(deferred.pendingAction?.kind == 'inspect'
        ? deferred.pendingAction.files.map(file => file.path)
        : [], ['src/adapter.ts'])
})

test('Reviewer receives a watched file deletion as a focused before-to-null change', () => {
    const genetic = createFixture()
    const gate = createGeneticEventGate({genetic})
    gate.control.establishBaseline([
        {path: 'src/adapter.ts', revision: 'v1'},
        {path: 'src/normalizer.ts', revision: 'v1'},
    ])

    gate.control.notify({
        source: 'agent-patch-applied',
        files: [{path: 'src/adapter.ts', revision: 'v2'}],
    })
    const discovery = gate.control.flush()
    assert.ok(discovery.pendingAction)
    if (!discovery.pendingAction || discovery.pendingAction.kind != 'discover') {
        throw new Error('Expected a Owner discovery action')
    }
    genetic.control.submitOwner(discovery.pendingAction.id, {
        kind: 'discover',
        decision: 'record',
        observation: {
            key: 'adapter-family',
            summary: 'Adapter-family files must be reviewed as one unit.',
            watchedPaths: ['src/'],
            instruction: 'Inspect every adapter-family file change, including removal.',
        },
    })

    const removedByAgent = gate.control.notify({
        source: 'agent-patch-applied',
        files: [{path: 'src/normalizer.ts', revision: null}],
    })
    const removedOnDisk = gate.control.notify({
        source: 'file-saved',
        files: [{path: 'src/normalizer.ts', revision: null}],
    })
    assert.deepEqual(removedByAgent.acceptedPaths, ['src/normalizer.ts'])
    assert.deepEqual(removedOnDisk.suppressedPaths, ['src/normalizer.ts'])

    const reviewer = gate.control.flush()
    assert.equal(reviewer.pendingAction?.agent, 'reviewer')
    assert.equal(reviewer.pendingAction?.kind, 'inspect')
    if (!reviewer.pendingAction || reviewer.pendingAction.kind != 'inspect') {
        throw new Error('Expected a Reviewer inspection action')
    }
    assert.deepEqual(reviewer.pendingAction.files, [{
        path: 'src/normalizer.ts',
        beforeRevision: 'v1',
        afterRevision: null,
    }])

    genetic.control.submitReviewer(reviewer.pendingAction.id, {
        kind: 'inspect',
        verdict: 'issue',
        summary: 'The watched normalizer was removed by the patch.',
        proposedInstruction: 'Inspect every adapter-family file change, including removal and replacement.',
    })
    const review = genetic.debug.pendingAction()
    assert.ok(review)
    if (!review || review.kind != 'review-inspection') throw new Error('Expected a Owner review action')
    genetic.control.submitOwner(review.id, {
        kind: 'review-inspection',
        decision: 'refine',
        summary: 'Removal is a relevant adapter-family event.',
        instruction: 'Inspect every adapter-family file change, including removal and replacement.',
    })

    assert.equal(genetic.debug.snapshot().instructions[0].text,
        'Inspect every adapter-family file change, including removal and replacement.')
})
