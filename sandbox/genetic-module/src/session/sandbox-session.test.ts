import assert from 'node:assert/strict'
import test from 'node:test'
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { tGeneticModuleSnapshot } from '../genetic/contracts/genetic-module-contracts'
import { createSandboxSession } from './sandbox-session'

type tFixture = ReturnType<typeof createFixture>

function createFixture(rootDirectory: string) {
    let id = 0
    let time = 0
    const projectPath = join(rootDirectory, 'project', 'src', 'exchanges.mjs')
    const geneticDirectory = join(rootDirectory, 'genetic')

    function createSession() {
        return createSandboxSession({
            rootDirectory,
            trackedPaths: ['src/exchanges.mjs'],
            createId: function createId() { return `fixture-${++id}` },
            now: function now() {
                return new Date(Date.UTC(2026, 6, 15, 0, 0, time++)).toISOString()
            },
        })
    }

    return {
        createSession,
        paths: {
            project: projectPath,
            genetic: geneticDirectory,
            pending: join(geneticDirectory, 'pending.json'),
            response: join(geneticDirectory, 'response.json'),
            state: join(geneticDirectory, 'state.json'),
            history: join(geneticDirectory, 'history'),
            lock: join(geneticDirectory, '.lock'),
        },
    }
}

async function prepareTemplate(rootDirectory: string) {
    const sourceDirectory = join(rootDirectory, 'template', 'project', 'src')
    await mkdir(sourceDirectory, {recursive: true})
    await writeFile(join(sourceDirectory, 'exchanges.mjs'), exchangeSource('binance'), 'utf8')
}

function exchangeSource(...exchanges: string[]) {
    const values = exchanges.map(function quote(exchange) { return `'${exchange}'` }).join(', ')
    return `export const exchanges = [${values}]\n`
}

async function writeResponse(fixture: tFixture, response: unknown) {
    await writeFile(fixture.paths.response, JSON.stringify(response, null, 2) + '\n', 'utf8')
}

async function readState(fixture: tFixture) {
    return JSON.parse(await readFile(fixture.paths.state, 'utf8')) as tGeneticModuleSnapshot
}

test('setup creates the disk sandbox once and refuses to overwrite it', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'genetic-sandbox-session-'))
    const fixture = createFixture(rootDirectory)
    try {
        await prepareTemplate(rootDirectory)
        const session = fixture.createSession()

        const initialized = await session.control.setup()

        assert.equal(initialized.status, 'ready')
        assert.equal(await readFile(fixture.paths.project, 'utf8'), exchangeSource('binance'))
        assert.equal((await readState(fixture)).baselineEstablished, true)
        await assert.rejects(session.control.setup(), /already initialized/)
        assert.equal(await readFile(fixture.paths.project, 'utf8'), exchangeSource('binance'))

        await writeFile(fixture.paths.project, exchangeSource('binance', 'temporary'), 'utf8')
        const discovery = await session.control.scan()
        assert.ok(discovery.pendingAction)
        await writeResponse(fixture, {
            actionId: discovery.pendingAction.id,
            result: {
                kind: 'discover',
                decision: 'skip',
                summary: 'This isolated temporary edit does not justify a reusable instruction.',
            },
        })
        const skipped = await session.control.resolvePending()
        assert.equal(skipped.status, 'ready')
        assert.equal(skipped.observationCount, 0)
        assert.equal(skipped.activeInstructions, 0)

        await writeFile(fixture.paths.lock, JSON.stringify({pid: 2147483647}) + '\n', 'utf8')
        assert.equal((await session.control.status()).status, 'ready')
        await assert.rejects(access(fixture.paths.lock))
    } finally {
        await rm(rootDirectory, {recursive: true, force: true})
    }
})

test('failed setup removes only the partial directories created by that attempt', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'genetic-sandbox-session-'))
    const fixture = createFixture(rootDirectory)
    try {
        await mkdir(join(rootDirectory, 'template', 'project', 'src'), {recursive: true})
        await writeFile(join(rootDirectory, 'template', 'project', 'src', 'other.mjs'), 'export {}\n', 'utf8')

        await assert.rejects(fixture.createSession().control.setup(), /missing tracked paths/)
        await assert.rejects(access(join(rootDirectory, 'project')))
        await assert.rejects(access(join(rootDirectory, 'genetic')))
    } finally {
        await rm(rootDirectory, {recursive: true, force: true})
    }
})

test('bound-project mode records state beside the agent without copying or deleting the target', async () => {
    const parentDirectory = await mkdtemp(join(tmpdir(), 'genetic-bound-session-'))
    const developmentDirectory = join(parentDirectory, 'development', 'tableer')
    const targetPath = join(parentDirectory, 'projects', 'tableer', 'src', 'table.mjs')
    const memoryDirectory = join(developmentDirectory, 'memory')
    try {
        await mkdir(developmentDirectory, {recursive: true})
        await mkdir(dirname(targetPath), {recursive: true})
        await writeFile(targetPath, 'export const table = []\n', 'utf8')
        const session = createSandboxSession({
            rootDirectory: developmentDirectory,
            mode: 'bound-project',
            projectDirectory: join(parentDirectory, 'projects', 'tableer'),
            geneticDirectory: 'memory',
            trackedPaths: ['src/table.mjs'],
        })

        const initialized = await session.control.setup()

        assert.equal(initialized.status, 'ready')
        assert.equal(await readFile(targetPath, 'utf8'), 'export const table = []\n')
        assert.ok(await readFile(join(memoryDirectory, 'state.json'), 'utf8'))
        await assert.rejects(access(join(parentDirectory, 'projects', 'tableer', 'template')))

        await writeFile(targetPath, 'export const table = [1]\n', 'utf8')
        const scanned = await session.control.scan()
        assert.equal(scanned.pendingAction?.kind, 'discover')
        assert.equal(await readFile(targetPath, 'utf8'), 'export const table = [1]\n')
    } finally {
        await rm(parentDirectory, {recursive: true, force: true})
    }
})

test('saved edits survive restarts and move through discovery, inspection, and review', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'genetic-sandbox-session-'))
    const fixture = createFixture(rootDirectory)
    try {
        await prepareTemplate(rootDirectory)
        const firstSession = fixture.createSession()
        await firstSession.control.setup()

        await writeFile(fixture.paths.project, exchangeSource('binance', 'bybit'), 'utf8')
        const discovery = await firstSession.control.scan()
        assert.equal(discovery.batchCount, 1)
        assert.equal(discovery.pendingAction?.agent, 'owner')
        assert.equal(discovery.pendingAction?.kind, 'discover')
        assert.ok(discovery.pendingAction)

        await writeResponse(fixture, {
            actionId: discovery.pendingAction.id,
            result: {
                kind: 'discover',
                decision: 'record',
                observation: {
                    key: 'exchange-registration',
                    summary: 'Every exchange belongs in the exported registry.',
                    watchedPaths: ['src/exchanges.mjs'],
                    instruction: 'When the exchange registry changes, verify every adapter is exported once.',
                },
            },
        })
        const discovered = await firstSession.control.resolvePending()
        assert.equal(discovered.status, 'ready')
        assert.equal(discovered.observationCount, 1)
        assert.equal(discovered.activeInstructions, 1)

        const restartedSession = fixture.createSession()
        const restored = await restartedSession.control.status()
        assert.equal(restored.batchCount, 1)
        assert.equal(restored.observationCount, 1)
        assert.equal(restored.activeInstructions, 1)
        assert.equal(restored.pendingAction, null)

        await writeFile(fixture.paths.project, exchangeSource('binance', 'bybit', 'okx'), 'utf8')
        const inspection = await restartedSession.control.scan()
        assert.equal(inspection.batchCount, 2)
        assert.equal(inspection.pendingAction?.agent, 'reviewer')
        assert.equal(inspection.pendingAction?.kind, 'inspect')
        assert.ok(inspection.pendingAction)

        await writeResponse(fixture, {
            actionId: inspection.pendingAction.id,
            result: {
                kind: 'inspect',
                verdict: 'uncertain',
                summary: 'An invalid enum must not cross the JSON boundary.',
                proposedInstruction: null,
            },
        })
        await assert.rejects(restartedSession.control.resolvePending(), /must be one of/)
        assert.equal((await readState(fixture)).pendingAction?.id, inspection.pendingAction.id)

        await writeResponse(fixture, {
            actionId: 'stale-action',
            result: {
                kind: 'inspect',
                verdict: 'clear',
                summary: 'This response must not be accepted.',
                proposedInstruction: null,
            },
        })
        await assert.rejects(restartedSession.control.resolvePending(), /Stale response/)
        const afterStaleResponse = await readState(fixture)
        assert.equal(afterStaleResponse.pendingAction?.id, inspection.pendingAction.id)
        assert.equal(afterStaleResponse.inspections.length, 0)

        await writeResponse(fixture, {
            actionId: inspection.pendingAction.id,
            result: {
                kind: 'inspect',
                verdict: 'issue',
                summary: 'The registry changed and needs the focused adapter-export check.',
                proposedInstruction: 'When the exchange registry changes, verify every adapter is exported exactly once.',
            },
        })
        const review = await restartedSession.control.resolvePending()
        assert.equal(review.inspectionCount, 1)
        assert.equal(review.pendingAction?.agent, 'owner')
        assert.equal(review.pendingAction?.kind, 'review-inspection')
        assert.ok(review.pendingAction)

        const reviewSession = fixture.createSession()
        const restoredReview = await reviewSession.control.status()
        assert.equal(restoredReview.pendingAction?.id, review.pendingAction.id)
        await writeResponse(fixture, {
            actionId: review.pendingAction.id,
            result: {
                kind: 'review-inspection',
                decision: 'refine',
                summary: 'The focused check remains useful and the wording is more precise.',
                instruction: 'When the exchange registry changes, verify every adapter is exported exactly once.',
            },
        })
        const complete = await reviewSession.control.resolvePending()
        assert.equal(complete.status, 'ready')
        assert.equal(complete.batchCount, 2)
        assert.equal(complete.observationCount, 1)
        assert.equal(complete.inspectionCount, 1)
        assert.equal(complete.pendingAction, null)

        const finalState = await readState(fixture)
        assert.equal(finalState.instructions[0].approvedChecks, 1)
        assert.equal(finalState.instructions[0].text,
            'When the exchange registry changes, verify every adapter is exported exactly once.')
        assert.equal(finalState.inspections[0].verdict, 'issue')
        assert.equal(finalState.events.length, 9)
        const history = await readdir(fixture.paths.history)
        assert.equal(history.length, 3)
        assert.ok(history.some(function discovery(path) { return path.endsWith('-owner-discover.json') }))
        assert.ok(history.some(function inspection(path) { return path.endsWith('-reviewer-inspect.json') }))
        assert.ok(history.some(function review(path) { return path.endsWith('-owner-review-inspection.json') }))
        await assert.rejects(access(fixture.paths.pending))
        await assert.rejects(access(fixture.paths.response))
    } finally {
        await rm(rootDirectory, {recursive: true, force: true})
    }
})
