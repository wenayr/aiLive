import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorkspaceSampler } from '../bindings/workspace-sampler'
import { createGeneticModule } from './genetic-module'

function createFixture() {
    let id = 0
    let time = 0
    return createGeneticModule({
        createId: () => `fixture-${++id}`,
        now: () => `2026-07-14T00:00:${String(time++).padStart(2, '0')}.000Z`,
    })
}

test('controlled Owner and Reviewer cycle stores an instruction from saved file changes', () => {
    const genetic = createFixture()
    genetic.control.establishBaseline([
        {path: 'src/exchanges/binance.ts', revision: 'v1'},
        {path: 'src/exchanges/normalizer.ts', revision: 'v1'},
        {path: 'src/ui/header.ts', revision: 'v1'},
    ])

    const discovery = genetic.control.scan([
        {path: 'src/exchanges/binance.ts', revision: 'v2'},
        {path: 'src/exchanges/normalizer.ts', revision: 'v2'},
        {path: 'src/ui/header.ts', revision: 'v1'},
    ])
    assert.ok(discovery.pendingAction)
    assert.equal(discovery.pendingAction.agent, 'owner')
    assert.equal(discovery.pendingAction.kind, 'discover')
    if (discovery.pendingAction.kind != 'discover') throw new Error('Expected Owner discovery')
    assert.deepEqual(discovery.pendingAction.batch.files.map(file => file.path), [
        'src/exchanges/binance.ts',
        'src/exchanges/normalizer.ts',
    ])
    assert.throws(function cannotScanAhead() {
        genetic.control.scan([
            {path: 'src/exchanges/binance.ts', revision: 'v2'},
            {path: 'src/exchanges/normalizer.ts', revision: 'v2'},
            {path: 'src/ui/header.ts', revision: 'v1'},
        ])
    }, /Resolve the pending agent action/)

    genetic.control.submitOwner(discovery.pendingAction.id, {
        kind: 'discover',
        decision: 'record',
        observation: {
            key: 'exchange-adapter-normalization',
            summary: 'Exchange adapters and their normalizer change together.',
            watchedPaths: ['src/exchanges/'],
            instruction: 'When an exchange adapter changes, inspect the matching normalization path.',
        },
    })
    const afterDiscovery = genetic.debug.snapshot()
    assert.equal(afterDiscovery.observations.length, 1)
    assert.equal(afterDiscovery.instructions[0].approvedChecks, 0)
    assert.equal(afterDiscovery.pendingAction, null)

    const inspection = genetic.control.scan([
        {path: 'src/exchanges/binance.ts', revision: 'v3'},
        {path: 'src/exchanges/normalizer.ts', revision: 'v2'},
        {path: 'src/ui/header.ts', revision: 'v2'},
    ])
    assert.ok(inspection.pendingAction)
    assert.equal(inspection.pendingAction.agent, 'reviewer')
    assert.equal(inspection.pendingAction.kind, 'inspect')
    if (inspection.pendingAction.kind != 'inspect') throw new Error('Expected Reviewer inspection')
    assert.deepEqual(inspection.pendingAction.files.map(file => file.path), ['src/exchanges/binance.ts'])
    assert.equal(inspection.pendingAction.instruction.text,
        'When an exchange adapter changes, inspect the matching normalization path.')

    genetic.control.submitReviewer(inspection.pendingAction.id, {
        kind: 'inspect',
        verdict: 'issue',
        summary: 'The adapter changed without a matching normalizer revision.',
        proposedInstruction: 'When an exchange adapter changes, inspect the matching normalization path and its fixture.',
    })
    const review = genetic.debug.pendingAction()
    assert.ok(review)
    assert.equal(review.agent, 'owner')
    assert.equal(review.kind, 'review-inspection')
    if (review.kind != 'review-inspection') throw new Error('Expected Owner review')

    genetic.control.submitOwner(review.id, {
        kind: 'review-inspection',
        decision: 'refine',
        summary: 'The focused Reviewer finding is relevant to the observed adapter family.',
        instruction: 'When an exchange adapter changes, inspect the matching normalization path and its fixture.',
    })
    const complete = genetic.debug.snapshot()
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
        'reviewer-inspection-recorded',
        'agent-action-requested',
        'instruction-reviewed',
    ])
})

test('Owner can skip a weak discovery without polluting instruction memory', () => {
    const genetic = createFixture()
    genetic.control.establishBaseline([{path: 'src/adapter.ts', revision: 'v1'}])
    const discovery = genetic.control.scan([{path: 'src/adapter.ts', revision: 'v2'}])
    const action = discovery.pendingAction
    assert.ok(action)

    assert.throws(function rejectDeadInstruction() {
        genetic.control.submitOwner(action.id, {
            kind: 'discover',
            decision: 'record',
            observation: {
                key: 'typo-path',
                summary: 'This path is not part of the observed change.',
                watchedPaths: ['src/adaptor.ts'],
                instruction: 'This instruction would never be selected.',
            },
        })
    }, /must match the discovery change batch/)

    genetic.control.submitOwner(action.id, {
        kind: 'discover',
        decision: 'skip',
        summary: 'One edit does not yet support a reusable rule.',
    })

    const state = genetic.debug.snapshot()
    assert.equal(state.pendingAction, null)
    assert.equal(state.observations.length, 0)
    assert.equal(state.instructions.length, 0)
    assert.equal(state.events.at(-1)?.kind, 'discovery-skipped')
})

test('clear inspection confirms an instruction without an extra Owner action', () => {
    const genetic = createFixture()
    genetic.control.establishBaseline([{path: 'src/adapter.ts', revision: 'v1'}])
    const discovery = genetic.control.scan([{path: 'src/adapter.ts', revision: 'v2'}])
    assert.ok(discovery.pendingAction)
    genetic.control.submitOwner(discovery.pendingAction.id, {
        kind: 'discover',
        decision: 'record',
        observation: {
            key: 'adapter-contract',
            summary: 'Adapters share a stable contract.',
            watchedPaths: ['src/adapter.ts'],
            instruction: 'Verify the adapter continues to use the shared contract.',
        },
    })
    const inspection = genetic.control.scan([{path: 'src/adapter.ts', revision: 'v3'}])
    assert.ok(inspection.pendingAction)
    assert.equal(inspection.pendingAction.kind, 'inspect')

    genetic.control.submitReviewer(inspection.pendingAction.id, {
        kind: 'inspect',
        verdict: 'clear',
        summary: 'The shared contract is preserved.',
        proposedInstruction: null,
    })

    const state = genetic.debug.snapshot()
    assert.equal(state.pendingAction, null)
    assert.equal(state.instructions[0].approvedChecks, 1)
    assert.equal(state.inspections[0].verdict, 'clear')
    assert.equal(state.events.at(-1)?.kind, 'reviewer-inspection-recorded')
})

test('workspace sampler detects saved file revisions without Git metadata', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'ai-live-genetic-module-'))
    try {
        const filePath = join(rootDirectory, 'adapter.ts')
        await writeFile(filePath, "export const adapter = 'v1'\n")
        const sampler = createWorkspaceSampler({rootDirectory})
        const genetic = createFixture()
        genetic.control.establishBaseline(await sampler.runtime.sample(['adapter.ts']))

        await writeFile(filePath, "export const adapter = 'v2'\n")
        const result = genetic.control.scan(await sampler.runtime.sample(['adapter.ts']))

        assert.ok(result.batch)
        assert.equal(result.batch.files.length, 1)
        assert.equal(result.batch.files[0].path, 'adapter.ts')
        assert.notEqual(result.batch.files[0].beforeRevision, result.batch.files[0].afterRevision)
        assert.equal(result.pendingAction?.agent, 'owner')
    } finally {
        await rm(rootDirectory, {recursive: true, force: true})
    }
})

test('persisted state is copied and structurally validated before reuse', () => {
    const first = createFixture()
    first.control.establishBaseline([{path: 'src/adapter.ts', revision: 'v1'}])
    const snapshot = first.debug.snapshot()
    const restored = createGeneticModule({initialState: snapshot})

    snapshot.files[0].revision = 'mutated-outside-resource'
    assert.equal(restored.debug.snapshot().files[0].revision, 'v1')
    assert.throws(function corruptDecisionState() {
        createGeneticModule({
            initialState: {
                ...restored.debug.snapshot(),
                events: [{sequence: 7, at: 'now', kind: 'baseline-established', data: {}}],
            },
        })
    }, /event sequence is invalid/)
})
