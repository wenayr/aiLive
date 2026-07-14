import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGeneticEventGate } from '../coordination/event-gate'
import { createGeneticModule } from '../resource/genetic-module'
import { createPatchEventCapture } from './patch-event-capture'
import { createWorkspaceSampler } from './workspace-sampler'

function createFixture() {
    let id = 0
    let time = 0
    return createGeneticModule({
        createId: () => `capture-fixture-${++id}`,
        now: () => `2026-07-14T02:00:${String(time++).padStart(2, '0')}.000Z`,
    })
}

test('manual patch capture turns real saved edits and deletions into gate events', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'ai-live-patch-capture-'))
    try {
        const adapterPath = join(rootDirectory, 'adapter.ts')
        const normalizerPath = join(rootDirectory, 'normalizer.ts')
        await writeFile(adapterPath, "export const adapter = 'v1'\n")
        await writeFile(normalizerPath, "export const normalizer = 'v1'\n")

        const genetic = createFixture()
        const gate = createGeneticEventGate({genetic})
        const capture = createPatchEventCapture({
            sampler: createWorkspaceSampler({rootDirectory}),
            gate,
        })
        await capture.control.establishBaseline(['adapter.ts', 'normalizer.ts'])
        const initialNormalizer = genetic.debug.snapshot().files.find(function isNormalizer(file) {
            return file.path == 'normalizer.ts'
        })
        if (!initialNormalizer) throw new Error('Expected normalizer baseline revision')

        await writeFile(adapterPath, "export const adapter = 'v2'\n")
        await writeFile(normalizerPath, "export const normalizer = 'v2'\n")
        const patched = await capture.control.capture({
            source: 'agent-patch-applied',
            paths: ['adapter.ts', 'normalizer.ts'],
        })
        const savedDuplicate = await capture.control.capture({
            source: 'file-saved',
            paths: ['adapter.ts', 'normalizer.ts'],
        })
        assert.deepEqual(patched.notification.acceptedPaths, ['adapter.ts', 'normalizer.ts'])
        assert.deepEqual(savedDuplicate.notification.acceptedPaths, [])

        const discovery = gate.control.flush()
        assert.ok(discovery.pendingAction)
        if (!discovery.pendingAction || discovery.pendingAction.kind != 'discover') {
            throw new Error('Expected a Owner discovery action')
        }
        const changedNormalizer = discovery.pendingAction.batch.files.find(function normalizer(file) {
            return file.path == 'normalizer.ts'
        })
        if (!changedNormalizer?.afterRevision) throw new Error('Expected changed normalizer revision')
        genetic.control.submitOwner(discovery.pendingAction.id, {
            kind: 'discover',
            decision: 'record',
            observation: {
                key: 'normalizer-deletion',
                summary: 'The normalizer must be checked when it changes or disappears.',
                watchedPaths: ['normalizer.ts'],
                instruction: 'Inspect any normalizer change, including deletion.',
            },
        })

        await unlink(normalizerPath)
        const deleted = await capture.control.capture({
            source: 'agent-patch-applied',
            paths: ['adapter.ts', 'normalizer.ts'],
        })
        assert.equal(deleted.files.find(file => file.path == 'normalizer.ts')?.revision, null)
        assert.deepEqual(deleted.notification.acceptedPaths, ['normalizer.ts'])

        const reviewer = gate.control.flush()
        assert.equal(reviewer.pendingAction?.agent, 'reviewer')
        assert.deepEqual(reviewer.pendingAction?.kind == 'inspect' ? reviewer.pendingAction.files : [], [{
            path: 'normalizer.ts',
            beforeRevision: changedNormalizer.afterRevision,
            afterRevision: null,
        }])
    } finally {
        await rm(rootDirectory, {recursive: true, force: true})
    }
})
