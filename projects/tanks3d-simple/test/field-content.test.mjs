import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('simple field test keeps ten manual maps, one tank controls and destructible blocks in one file', async () => {
    const source = await readFile(new URL('../field-test.js', import.meta.url), 'utf8')

    for (const kind of ['crossroads', 'ring', 'islands', 'zigzag', 'orchard', 'turbine', 'canyon', 'delta', 'crater', 'shards']) {
        assert.match(source, new RegExp(`${kind}: map`))
    }
    assert.match(source, /if \(keys\.has\('a'\)\) player\.heading/)
    assert.match(source, /if \(keys\.has\('d'\)\) player\.heading/)
    assert.match(source, /player\.turret = Math\.atan2/)
    assert.match(source, /size: 130/)
    assert.match(source, /function damageTarget/)
    assert.match(source, /const enemies/)
    assert.match(source, /function screenAngle/)
})

test('simple perspective test builds a separate tidal landscape, tank silhouette and destructible combat', async () => {
    const source = await readFile(new URL('../perspective-test.js', import.meta.url), 'utf8')

    assert.match(source, /TIDAL VALE/)
    assert.match(source, /function seedNature/)
    assert.match(source, /function heightAt/)
    assert.match(source, /function underwater/)
    assert.match(source, /function project\(x, y, z, eye\)/)
    assert.match(source, /function drawTank\(facets, eye, unit\)/)
    assert.match(source, /function prism\(facets, eye/)
    assert.match(source, /function hurt\(target\)/)
    assert.match(source, /const hostiles = \[/)
    assert.match(source, /function drawFeatureModel/)
    assert.match(source, /const side =/)
})
