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

test('simple perspective test keeps an independent 3D camera, models and destructible combat', async () => {
    const source = await readFile(new URL('../perspective-test.js', import.meta.url), 'utf8')

    assert.match(source, /landscape 3D/)
    assert.match(source, /function project\(x, y, z, camera\)/)
    assert.match(source, /function model\(polygons, camera, subject\)/)
    assert.match(source, /function box\(polygons, camera/)
    assert.match(source, /function damage\(target\)/)
    assert.match(source, /const enemies = \[tank\('scout'/)
    assert.match(source, /function heightAt\(x, y\)/)
    assert.match(source, /function cylinder\(polygons, camera/)
    assert.match(source, /function arc\(polygons, camera/)
})
