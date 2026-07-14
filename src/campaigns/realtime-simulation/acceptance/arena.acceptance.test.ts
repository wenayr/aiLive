import assert from 'node:assert/strict'
import test from 'node:test'
import { runHeadlessBaseline } from './headless-baseline'

test('headless two-bot arena is repeatable and replayable', () => {
    const first = runHeadlessBaseline()
    const second = runHeadlessBaseline()

    assert.equal(first.commandCount > 0, true)
    assert.equal(first.eventCounts['tank-damaged']! > 0, true)
    assert.equal(first.liveStateHash, second.liveStateHash)
    assert.equal(first.liveStateHash, first.replayStateHash)
    assert.equal(first.replayMatchesLive, true)
})
