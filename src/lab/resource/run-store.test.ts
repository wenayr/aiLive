import assert from 'node:assert/strict'
import test from 'node:test'
import type { tTaskDefinition } from '../contracts/lab-contracts'
import { createRunStore } from './run-store'

const task: tTaskDefinition = {
    id: 'fixture',
    version: '0.1.0',
    title: 'Fixture',
    summary: 'Fixture task',
    kind: 'probe',
    capabilities: ['workspace-read'],
    timeoutMs: 1000,
    command: {program: 'node', args: ['scripts/run.mjs']},
    instruction: null,
}

test('run store emits serializable raw snapshots from its reactive resource', () => {
    let sequence = 0
    const store = createRunStore({
        createId: () => 'run-fixture',
        now: () => `2026-07-14T00:00:0${sequence++}.000Z`,
    })

    const run = store.control.create(task)
    store.control.transition(run.id, 'starting', 'run-starting')
    store.control.transition(run.id, 'running', 'run-running')
    store.control.appendLog(run.id, {stream: 'stdout', text: 'ready'})
    const snapshot = store.api.get(run.id)

    assert.ok(snapshot)
    assert.equal(JSON.stringify(snapshot).includes('"ready"'), true)
    assert.equal(snapshot.eventCount, 4)
    assert.equal(store.api.trace(run.id).map(event => event.sequence).join(','), '1,2,3,4')
})
