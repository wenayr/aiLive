export const sandboxModelProtocol = 'genetic-sandbox-model/v0' as const

export type tSandboxFileContext = {
    path: string
    revision: string | null
    content: string | null
}

export type tSandboxInstructionContext = {
    id: string
    text: string
    watchedPaths: string[]
}

export type tSandboxModelPolicy = {
    context: 'request-files-only'
    tools: 'none'
    writes: 'controller-validated-only'
    candidateExecution: 'forbidden'
}

export type tSandboxCodeRequest = {
    protocol: typeof sandboxModelProtocol
    requestId: string
    kind: 'code'
    role: 'luna-builder'
    policy: tSandboxModelPolicy
    goal: string
    files: tSandboxFileContext[]
    instructions: tSandboxInstructionContext[]
    limits: {
        allowedPaths: string[]
        maxFiles: number
        maxBytes: number
    }
    responseContract: {
        kind: 'code'
        files: Array<{
            path: 'allowed path'
            baseRevision: 'revision from request or null'
            content: 'complete file content or null to delete'
        }>
        summary: 'short explanation'
    }
}

export type tSandboxInspectRequest = {
    protocol: typeof sandboxModelProtocol
    requestId: string
    kind: 'inspect'
    role: 'luna-inspector'
    policy: tSandboxModelPolicy
    instruction: tSandboxInstructionContext
    files: Array<{
        path: string
        beforeRevision: string | null
        afterRevision: string | null
        beforeContent: string | null
        afterContent: string | null
    }>
    responseContract: {
        kind: 'inspect'
        verdict: 'clear or issue'
        summary: 'focused finding'
        proposedInstruction: 'refinement or null'
    }
}

export type tSandboxModelRequest = tSandboxCodeRequest | tSandboxInspectRequest

export type tSandboxFileReplacement = {
    path: string
    baseRevision: string | null
    content: string | null
}

export type tSandboxCodeResponse = {
    protocol: typeof sandboxModelProtocol
    requestId: string
    kind: 'code'
    files: tSandboxFileReplacement[]
    summary: string
}

export type tSandboxInspectResponse = {
    protocol: typeof sandboxModelProtocol
    requestId: string
    kind: 'inspect'
    verdict: 'clear' | 'issue'
    summary: string
    proposedInstruction: string | null
}

export type tSandboxModelCallResult = {
    provider: string
    model: string
    simulated: boolean
    raw: unknown
    usage?: {
        inputTokens?: number
        outputTokens?: number
        costUsd?: number
    }
}

export type tSandboxModelCaller = (
    request: tSandboxModelRequest,
    context: {signal: AbortSignal},
) => Promise<tSandboxModelCallResult>
