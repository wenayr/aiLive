export function normalizeQuote(source, quote) {
    const symbol = String(quote.symbol ?? '').trim().toUpperCase()
    const price = Number(quote.price)
    if (!symbol) throw new Error(`Invalid ${source} symbol`)
    if (!Number.isFinite(price)) throw new Error(`Invalid ${source} price`)
    return {source, symbol, price}
}

export const adapters = {
    binance(quote) {
        return normalizeQuote('binance', quote)
    },
}
