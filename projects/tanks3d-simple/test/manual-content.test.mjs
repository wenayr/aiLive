import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('simple game deliberately keeps its initial content in one runtime file', async () => {
    const source = await readFile(new URL('../game.js', import.meta.url), 'utf8')

    assert.match(source, /const arena/)
    assert.match(source, /const enemies/)
    assert.match(source, /manualReinforcementSquads/)
    assert.match(source, /corePads/)
    assert.match(source, /effects/)
    assert.match(source, /score/)
    assert.match(source, /function drawTank/)
    assert.match(source, /keys\.has\('w'\)/)
})
