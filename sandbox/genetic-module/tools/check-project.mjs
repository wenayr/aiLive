import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const milestone = process.argv[2] ?? 'baseline'
if (!['baseline', 'bybit', 'okx'].includes(milestone)) {
    throw new Error('Check milestone must be baseline, bybit, or okx')
}
const moduleUrl = pathToFileURL(resolve(root, 'project/src/exchanges.mjs'))
moduleUrl.searchParams.set('check', String(Date.now()))
const { adapters, normalizeQuote } = await import(moduleUrl.href)

assert.deepEqual(normalizeQuote('probe', {symbol: ' btcusdt ', price: '10'}), {
    source: 'probe', symbol: 'BTCUSDT', price: 10,
})
assert.throws(() => normalizeQuote('probe', {symbol: 'BTCUSDT', price: 'bad'}), /Invalid probe price/)
assert.deepEqual(adapters.binance({symbol: ' btcusdt ', price: '10'}), {
    source: 'binance', symbol: 'BTCUSDT', price: 10,
})

if (milestone == 'bybit' || milestone == 'okx') {
    assert.deepEqual(adapters.bybit({symbol: ' ethusdt ', price: '20'}), {
        source: 'bybit', symbol: 'ETHUSDT', price: 20,
    })
}
if (milestone == 'okx') {
    assert.deepEqual(adapters.okx({symbol: ' solusdt ', price: '30'}), {
        source: 'okx', symbol: 'SOLUSDT', price: 30,
    })
}

console.log(`project contract passed for ${milestone}`)
