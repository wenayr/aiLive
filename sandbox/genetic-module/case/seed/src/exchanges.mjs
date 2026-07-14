export function normalizeQuote(source, input) {
    const price = Number(input.price)
    if (!Number.isFinite(price)) throw new Error(`Invalid ${source} price`)
    return {
        source,
        symbol: String(input.symbol).trim().toUpperCase(),
        price,
    }
}

export const adapters = {
    binance(input) {
        return normalizeQuote('binance', input)
    },
}
