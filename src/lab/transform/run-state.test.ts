import assert from 'node:assert/strict'
import test from 'node:test'
import type { tRunRecord } from '../contracts/lab-contracts'
import { canTransitionRun, isTerminalRunStatus, transitionRun } from './run-state'

function createRun(): tRunRecord {
    return {
        id: 'run-1',
        task: {
            id: 'seeded-probe',
            version: '0.1.0',
            title: 'Seeded probe',
            summary: 'fixture',
            kind: 'probe',
            capabilities: ['workspace-read'],
            timeoutMs: 1000,
            command: {program: 'node', args: ['fixture.mjs']},
            instruction: null,
        },
        status: 'queued',
        createdAt: '2026-07-14T00:00:00.000Z',
        startedAt: null,
        finishedAt: null,
        exitCode: null,
        signal: null,
        reason: null,
        eventCount: 0,
        logTail: [],
        artifacts: [],
    }
}

test('run state machine allows one normal lifecycle', () => {
    const queued = createRun()
    const starting = transitionRun(queued, 'starting', '2026-07-14T00:00:01.000Z')
    const running = transitionRun(starting, 'running', '2026-07-14T00:00:02.000Z')
    const passed = transitionRun(running, 'passed', '2026-07-14T00:00:03.000Z', {exitCode: 0})

    assert.equal(starting.startedAt, null)
    assert.equal(running.startedAt, '2026-07-14T00:00:02.000Z')
    assert.equal(passed.finishedAt, '2026-07-14T00:00:03.000Z')
    assert.equal(passed.exitCode, 0)
    assert.equal(isTerminalRunStatus(passed.status), true)
})

test('terminal runs cannot be reopened', () => {
    const passed = transitionRun(
        transitionRun(
            transitionRun(createRun(), 'starting', '2026-07-14T00:00:01.000Z'),
            'running',
            '2026-07-14T00:00:02.000Z',
        ),
        'passed',
        '2026-07-14T00:00:03.000Z',
    )

    assert.equal(canTransitionRun('passed', 'running'), false)
    assert.throws(() => transitionRun(passed, 'running', '2026-07-14T00:00:04.000Z'))
})
