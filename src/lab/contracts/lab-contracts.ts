export type tTaskKind = 'probe' | 'build' | 'review'

export type tTaskCapability =
    | 'workspace-read'
    | 'artifact-write'
    | 'process-local'

export type tTaskCommand = {
    program: 'node'
    args: string[]
}

export type tTaskDefinition = {
    id: string
    version: string
    title: string
    summary: string
    kind: tTaskKind
    capabilities: tTaskCapability[]
    timeoutMs: number
    command: tTaskCommand
    instruction: string | null
}

export type tRegisteredTask = {
    definition: tTaskDefinition
    directory: string
}

export type tRunStatus =
    | 'queued'
    | 'starting'
    | 'running'
    | 'passed'
    | 'failed'
    | 'canceled'
    | 'timed_out'

export type tRunLog = {
    stream: 'stdout' | 'stderr' | 'system'
    text: string
}

export type tArtifactRef = {
    path: string
    mediaType: string
    bytes: number
}

export type tRunEventKind =
    | 'run-created'
    | 'run-starting'
    | 'run-running'
    | 'run-cancel-requested'
    | 'run-timeout-requested'
    | 'run-passed'
    | 'run-failed'
    | 'run-canceled'
    | 'run-timed-out'
    | 'log'
    | 'artifact'

export type tRunEvent = {
    runId: string
    sequence: number
    at: string
    kind: tRunEventKind
    data: Record<string, unknown>
}

export type tRunRecord = {
    id: string
    task: tTaskDefinition
    status: tRunStatus
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
    exitCode: number | null
    signal: string | null
    reason: string | null
    eventCount: number
    logTail: tRunLog[]
    artifacts: tArtifactRef[]
}

export type tLabHealth = {
    service: 'starting' | 'live' | 'stopping'
    executor: 'local-guarded'
    sandbox: 'none'
    activeRuns: number
}

export type tLabSnapshot = {
    generatedAt: string
    health: tLabHealth
    tasks: tTaskDefinition[]
    runs: tRunRecord[]
}

export type tLabLiveUpdate = {
    event: tRunEvent
    run: tRunRecord
}
