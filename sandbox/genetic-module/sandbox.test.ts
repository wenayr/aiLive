import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCandidateWorkspace } from './candidate-workspace'
import { createGeneticSandbox } from './controller'
import { createFixtureModel } from './fixture-model'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const seedDirectory = resolve(projectRoot, 'sandbox/genetic-module/case/seed')

test('prepare creates a candidate and honest awaiting-response artifacts without calling a model', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'ai-live-genetic-sandbox-prepare-'))
    try {
        const sandbox = createGeneticSandbox({
            projectRoot,
            runId: 'prepare-test',
            candidateRoot: resolve(temporaryRoot, 'candidates'),
            laboratoryRoot: resolve(temporaryRoot, 'laboratory'),
            now: () => '2026-07-14T03:00:00.000Z',
        })
        const result = await sandbox.control.prepare()
        const stableSeed = await readFile(resolve(seedDirectory, 'src/exchanges.mjs'), 'utf8')
        const candidate = await readFile(resolve(result.workspaceDirectory, 'src/exchanges.mjs'), 'utf8')
        const savedResult = JSON.parse(await readFile(resolve(result.artifactDirectory, 'result.json'), 'utf8'))

        assert.equal(result.status, 'awaiting-response')
        assert.equal(result.request.kind, 'code')
        assert.equal(result.request.policy.tools, 'none')
        assert.equal(result.request.files[0].content, stableSeed)
        assert.equal(candidate, stableSeed)
        assert.equal(savedResult.status, 'awaiting-response')
    } finally {
        await rm(temporaryRoot, {recursive: true, force: true})
    }
})

test('raw model response is archived before invalid metadata rejects the run', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'ai-live-genetic-sandbox-invalid-response-'))
    try {
        const artifactDirectory = resolve(temporaryRoot, 'laboratory/invalid-response-test')
        const sandbox = createGeneticSandbox({
            projectRoot,
            runId: 'invalid-response-test',
            candidateRoot: resolve(temporaryRoot, 'candidates'),
            laboratoryRoot: resolve(temporaryRoot, 'laboratory'),
            callModel: async function invalidEnvelope() {
                return {
                    provider: '',
                    model: 'invalid-envelope',
                    simulated: true,
                    raw: {malformed: true},
                }
            },
            now: () => '2026-07-14T03:00:00.000Z',
        })

        await assert.rejects(sandbox.control.run(), /model provider/)
        const response = JSON.parse(await readFile(
            resolve(artifactDirectory, 'responses/01-code-first.json'),
            'utf8',
        ))
        assert.equal(response.raw.malformed, true)
    } finally {
        await rm(temporaryRoot, {recursive: true, force: true})
    }
})

test('fixture smoke controls repeated model patches and leaves a complete genetic trace', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'ai-live-genetic-sandbox-smoke-'))
    try {
        const stableBefore = await readFile(resolve(seedDirectory, 'src/exchanges.mjs'), 'utf8')
        const fixtureModel = createFixtureModel()
        const sandbox = createGeneticSandbox({
            projectRoot,
            runId: 'smoke-test',
            candidateRoot: resolve(temporaryRoot, 'candidates'),
            laboratoryRoot: resolve(temporaryRoot, 'laboratory'),
            callModel: fixtureModel.call,
            now: () => '2026-07-14T03:00:00.000Z',
        })
        const result = await sandbox.control.run()
        if (result.status != 'completed') throw new Error(`Unexpected sandbox status: ${result.status}`)
        const finalSource = await readFile(resolve(result.candidateDirectory, 'src/exchanges.mjs'), 'utf8')
        const stableAfter = await readFile(resolve(seedDirectory, 'src/exchanges.mjs'), 'utf8')
        const finalState = JSON.parse(await readFile(resolve(result.artifactDirectory, 'genetic/state-final.json'), 'utf8'))
        const inspectionRequest = JSON.parse(await readFile(
            resolve(result.artifactDirectory, 'requests/03-inspect-repeat.json'),
            'utf8',
        ))

        assert.equal(result.verdict, 'candidate-ready-for-review')
        assert.equal(result.modelCalls.length, 5)
        assert.equal(result.modelCalls.every(call => call.simulated), true)
        assert.equal(result.check.kind, 'static-source')
        assert.equal(result.check.passed, true)
        assert.equal(finalState.pendingAction, null)
        assert.equal(finalState.instructions.length, 1)
        assert.equal(finalState.inspections.length, 2)
        assert.equal(inspectionRequest.files[0].beforeContent.includes('bybit'), true)
        assert.equal(inspectionRequest.files[0].afterContent.includes("source: 'okx'"), true)
        assert.equal(finalSource.includes("return normalizeQuote('okx', input)"), true)
        assert.equal(stableAfter, stableBefore)
    } finally {
        await rm(temporaryRoot, {recursive: true, force: true})
    }
})

test('candidate workspace rejects out-of-scope and stale writes before mutation', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'ai-live-genetic-sandbox-reject-'))
    try {
        const workspace = createCandidateWorkspace({
            workspaceDirectory: resolve(temporaryRoot, 'workspace'),
            seedDirectory,
            allowedPaths: ['src/exchanges.mjs'],
            maxFiles: 1,
            maxBytes: 8192,
        })
        await workspace.control.prepare()
        const before = (await workspace.api.read(['src/exchanges.mjs']))[0]

        await assert.rejects(workspace.control.apply([{
            path: 'src/escape.mjs',
            baseRevision: null,
            content: 'export const escaped = true\n',
        }]), /outside the allowlist/)
        await assert.rejects(workspace.control.apply([{
            path: 'src/exchanges.mjs',
            baseRevision: 'sha256:stale',
            content: 'export const stale = true\n',
        }]), /Stale base revision/)

        const after = (await workspace.api.read(['src/exchanges.mjs']))[0]
        assert.deepEqual(after, before)
    } finally {
        await rm(temporaryRoot, {recursive: true, force: true})
    }
})
