import type {
    tSandboxCodeRequest,
    tSandboxInspectRequest,
    tSandboxModelCallResult,
    tSandboxModelRequest,
} from './model-contract'
import { sandboxModelProtocol } from './model-contract'

const bybitContent = `export function normalizeQuote(source, input) {
    const price = Number(input.price)
    if (!Number.isFinite(price)) throw new Error(\`Invalid \${source} price\`)
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
    bybit(input) {
        return normalizeQuote('bybit', input)
    },
}
`

const driftingOkxContent = `export function normalizeQuote(source, input) {
    const price = Number(input.price)
    if (!Number.isFinite(price)) throw new Error(\`Invalid \${source} price\`)
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
    bybit(input) {
        return normalizeQuote('bybit', input)
    },
    okx(input) {
        return {
            source: 'okx',
            symbol: String(input.symbol).trim(),
            price: Number(input.price),
        }
    },
}
`

const repairedOkxContent = `export function normalizeQuote(source, input) {
    const price = Number(input.price)
    if (!Number.isFinite(price)) throw new Error(\`Invalid \${source} price\`)
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
    bybit(input) {
        return normalizeQuote('bybit', input)
    },
    okx(input) {
        return normalizeQuote('okx', input)
    },
}
`

export function createFixtureModel() {
    async function call(request: tSandboxModelRequest): Promise<tSandboxModelCallResult> {
        return {
            provider: 'fixture',
            model: 'luna-simulated-v0',
            simulated: true,
            raw: responseFor(request),
            usage: {inputTokens: 0, outputTokens: 0, costUsd: 0},
        }
    }

    return {call}
}

function responseFor(request: tSandboxModelRequest) {
    if (request.kind == 'code') return codeResponse(request)
    return inspectResponse(request)
}

function codeResponse(request: tSandboxCodeRequest) {
    const file = request.files[0]
    if (!file) throw new Error(`Fixture request has no file: ${request.requestId}`)
    const content = request.requestId.endsWith(':code-first')
        ? bybitContent
        : request.requestId.endsWith(':code-repeat')
            ? driftingOkxContent
            : request.requestId.endsWith(':code-repair')
                ? repairedOkxContent
                : null
    if (content == null) throw new Error(`Unknown fixture code request: ${request.requestId}`)
    return {
        protocol: sandboxModelProtocol,
        requestId: request.requestId,
        kind: 'code',
        files: [{path: file.path, baseRevision: file.revision, content}],
        summary: `Fixture response for ${request.requestId}`,
    }
}

function inspectResponse(request: tSandboxInspectRequest) {
    const repair = request.requestId.endsWith(':inspect-repair')
    return {
        protocol: sandboxModelProtocol,
        requestId: request.requestId,
        kind: 'inspect',
        verdict: repair ? 'clear' : 'issue',
        summary: repair
            ? 'OKX now delegates to normalizeQuote.'
            : 'OKX rebuilds the canonical quote instead of delegating to normalizeQuote.',
        proposedInstruction: repair
            ? null
            : 'When an exchange adapter changes, require direct delegation to normalizeQuote and reject duplicated normalization.',
    }
}
