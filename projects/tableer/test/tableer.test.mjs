import assert from 'node:assert/strict'
import test from 'node:test'
import { createTableer } from '../src/facade/create-tableer.mjs'

test('Tableer loads rows and searches without leaking its internal state', () => {
    const input = [
        {id: 'mars', name: 'Mars', category: 'planet'},
        {id: 'moon', name: 'Moon', category: 'satellite'},
    ]
    const tableer = createTableer({initialRows: input})

    input[0].name = 'Changed outside'

    assert.deepEqual(tableer.api.search('mar'), [{id: 'mars', name: 'Mars', category: 'planet'}])
    assert.equal(tableer.api.search('').length, 2)
})

test('Tableer rejects duplicate stable identifiers at its resource boundary', () => {
    const tableer = createTableer()

    assert.throws(function loadDuplicates() {
        tableer.control.load([{id: 'same'}, {id: 'same'}])
    }, /Duplicate table row id/)
})
