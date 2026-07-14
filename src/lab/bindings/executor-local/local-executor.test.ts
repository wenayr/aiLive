import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import test from 'node:test'
import { createTaskRegistry } from '../../coordination/task-registry'
import { createRunStore } from '../../resource/run-store'
import { isTerminalRunStatus } from '../../transform/run-state'
import { createFileRunStore } from '../store-file/file-run-store'
import { createLocalExecutor } from './local-executor'

function isWithin(parent: string, candidate: string) {
    const value = relative(parent, candidate)
    return value == '' || (!value.startsWith('..') && !value.startsWith('/'))
}

async function waitForTerminal(store: ReturnType<typeof createRunStore>, runId: string) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
        const run = store.api.get(runId)
        if (run && isTerminalRunStatus(run.status)) return run
        await new Promise(function wait(resolveWait) { setTimeout(resolveWait, 25) })
    }
    throw new Error(`Run did not finish: ${runId}`)
}

test('local executor runs a registered task and persists its artifact', async () => {
    const projectRoot = process.cwd()
    const laboratoryRoot = resolve(projectRoot, '.laboratory')
    const testRoot = resolve(laboratoryRoot, 'test-runs', `executor-${Date.now()}`)
    assert.equal(isWithin(laboratoryRoot, testRoot), true)

    const registry = createTaskRegistry({tasksRoot: resolve(projectRoot, 'tasks')})
    registry.control.reload()
    const task = registry.api.get('seeded-probe')
    assert.ok(task)

    const runStore = createRunStore({})
    const fileStore = createFileRunStore({rootDirectory: testRoot})
    const executor = createLocalExecutor({runStore, fileStore})
    const off = runStore.api.events.on(function persistEvent(event) {
        const run = runStore.api.get(event.runId)
        if (!run) return
        fileStore.control.appendTrace(event)
        fileStore.control.writeRecord(run)
    })

    try {
        const started = executor.control.start(task)
        const finished = await waitForTerminal(runStore, started.id)
        const artifact = fileStore.api.listArtifacts(started.id).find(function findResult(item) {
            return item.path == 'result.json'
        })

        assert.equal(finished.status, 'passed')
        assert.equal(finished.exitCode, 0)
        assert.ok(artifact)
        assert.equal(existsSync(resolve(testRoot, 'runs', started.id, 'record.json')), true)
        assert.equal(existsSync(resolve(testRoot, 'runs', started.id, 'trace.ndjson')), true)
    } finally {
        off()
        executor.control.stopAll()
        if (isWithin(laboratoryRoot, testRoot)) rmSync(testRoot, {recursive: true, force: true})
    }
})
