import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorkspaceSampler } from '../bindings/workspace-sampler'
import { createGeneticSimulation } from './genetic-simulation'

function createFixture() {
    let id = 0
    let time = 0
    return createGeneticSimulation({
        createId: () => `fixture-${++id}`,
        now: () => `2026-07-14T00:00:${String(time++).padStart(2, '0')}.000Z`,
    })
}

test('controlled Terra and Luna simulation stores an instruction from saved file changes', () => {
    const simulation = createFixture()
    simulation.control.establishBaseline([
        {path: 'src/exchanges/binance.ts', revision: 'v1'},
        {path: 'src/exchanges/normalizer.ts', revision: 'v1'},
        {path: 'src/ui/header.ts', revision: 'v1'},
    ])

    const discovery = simulation.control.scan([
        {path: 'src/exchanges/binance.ts', revision: 'v2'},
        {path: 'src/exchanges/normalizer.ts', revision: 'v2'},
        {path: 'src/ui/header.ts', revision: 'v1'},
    ])
    assert.ok(discovery.pendingAction)
    assert.equal(discovery.pendingAction.agent, 'terra')
    assert.equal(discovery.pendingAction.kind, 'discover')
    if (discovery.pendingAction.kind != 'discover') throw new Error('Expected Terra discovery')
    assert.deepEqual(discovery.pendingAction.batch.files.map(file => file.path), [
        'src/exchanges/binance.ts',
        'src/exchanges/normalizer.ts',
    ])
    assert.throws(function cannotScanAhead() {
        simulation.control.scan([
            {path: 'src/exchanges/binance.ts', revision: 'v2'},
            {path: 'src/exchanges/normalizer.ts', revision: 'v2'},
            {path: 'src/ui/header.ts', revision: 'v1'},
        ])
    }, /Resolve the pending agent action/)

    simulation.control.submitTerra(discovery.pendingAction.id, {
        kind: 'discover',
        observation: {
            key: 'exchange-adapter-normalization',
            summary: 'Exchange adapters and their normalizer change together.',
            watchedPaths: ['src/exchanges/'],
            instruction: 'When an exchange adapter changes, inspect the matching normalization path.',
        },
    })
    const afterDiscovery = simulation.debug.snapshot()
    assert.equal(afterDiscovery.observations.length, 1)
    assert.equal(afterDiscovery.instructions[0].approvedChecks, 0)
    assert.equal(afterDiscovery.pendingAction, null)

    const inspection = simulation.control.scan([
        {path: 'src/exchanges/binance.ts', revision: 'v3'},
        {path: 'src/exchanges/normalizer.ts', revision: 'v2'},
        {path: 'src/ui/header.ts', revision: 'v2'},
    ])
    assert.ok(inspection.pendingAction)
    assert.equal(inspection.pendingAction.agent, 'luna')
    assert.equal(inspection.pendingAction.kind, 'inspect')
    if (inspection.pendingAction.kind != 'inspect') throw new Error('Expected Luna inspection')
    assert.deepEqual(inspection.pendingAction.files.map(file => file.path), ['src/exchanges/binance.ts'])
    assert.equal(inspection.pendingAction.instruction.text,
        'When an exchange adapter changes, inspect the matching normalization path.')

    simulation.control.submitLuna(inspection.pendingAction.id, {
        kind: 'inspect',
        verdict: 'issue',
        summary: 'The adapter changed without a matching normalizer revision.',
        proposedInstruction: 'When an exchange adapter changes, inspect the matching normalization path and its fixture.',
    })
    const review = simulation.debug.pendingAction()
    assert.ok(review)
    assert.equal(review.agent, 'terra')
    assert.equal(review.kind, 'review-luna')
    if (review.kind != 'review-luna') throw new Error('Expected Terra review')

    simulation.control.submitTerra(review.id, {
        kind: 'review-luna',
        decision: 'refine',
        summary: 'The focused Luna finding is relevant to the observed adapter family.',
        instruction: 'When an exchange adapter changes, inspect the matching normalization path and its fixture.',
    })
    const complete = simulation.debug.snapshot()
    assert.equal(complete.instructions[0].approvedChecks, 1)
    assert.equal(complete.instructions[0].text,
        'When an exchange adapter changes, inspect the matching normalization path and its fixture.')
    assert.equal(complete.inspections[0].verdict, 'issue')
    assert.equal(complete.pendingAction, null)
    assert.deepEqual(complete.events.map(event => event.kind), [
        'baseline-established',
        'change-batch-recorded',
        'agent-action-requested',
        'observation-recorded',
        'change-batch-recorded',
        'agent-action-requested',
        'luna-inspection-recorded',
        'agent-action-requested',
        'instruction-reviewed',
    ])
})

test('workspace sampler detects saved file revisions without Git metadata', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'ai-live-genetic-simulation-'))
    try {
        const filePath = join(rootDirectory, 'adapter.ts')
        await writeFile(filePath, "export const adapter = 'v1'\n")
        const sampler = createWorkspaceSampler({rootDirectory})
        const simulation = createFixture()
        simulation.control.establishBaseline(await sampler.runtime.sample(['adapter.ts']))

        await writeFile(filePath, "export const adapter = 'v2'\n")
        const result = simulation.control.scan(await sampler.runtime.sample(['adapter.ts']))

        assert.ok(result.batch)
        assert.equal(result.batch.files.length, 1)
        assert.equal(result.batch.files[0].path, 'adapter.ts')
        assert.notEqual(result.batch.files[0].beforeRevision, result.batch.files[0].afterRevision)
        assert.equal(result.pendingAction?.agent, 'terra')
    } finally {
        await rm(rootDirectory, {recursive: true, force: true})
    }
})
