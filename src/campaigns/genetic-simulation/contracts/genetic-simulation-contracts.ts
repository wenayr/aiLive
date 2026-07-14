export const geneticSimulationProtocolVersion = 'genetic-simulation/v1' as const

export type tGeneticSimulationProtocolVersion = typeof geneticSimulationProtocolVersion

export type tGeneticAgent = 'terra' | 'luna'

export type tGeneticFileSnapshot = {
    path: string
    revision: string
}

export type tGeneticFileChange = {
    path: string
    beforeRevision: string | null
    afterRevision: string | null
}

export type tGeneticChangeBatch = {
    id: string
    observedAt: string
    files: tGeneticFileChange[]
}

export type tGeneticObservation = {
    id: string
    key: string
    summary: string
    watchedPaths: string[]
    sourceBatchId: string
    createdAt: string
}

export type tGeneticInstruction = {
    id: string
    observationId: string
    text: string
    watchedPaths: string[]
    status: 'active' | 'retired'
    approvedChecks: number
    lastCheckedAt: string | null
    createdAt: string
}

export type tLunaInspection = {
    id: string
    actionId: string
    batchId: string
    observationId: string
    instructionId: string
    verdict: 'clear' | 'issue'
    summary: string
    proposedInstruction: string | null
    createdAt: string
}

export type tTerraDiscoveryAction = {
    id: string
    agent: 'terra'
    kind: 'discover'
    batch: tGeneticChangeBatch
}

export type tLunaInspectionAction = {
    id: string
    agent: 'luna'
    kind: 'inspect'
    batchId: string
    files: tGeneticFileChange[]
    observation: tGeneticObservation
    instruction: tGeneticInstruction
}

export type tTerraReviewAction = {
    id: string
    agent: 'terra'
    kind: 'review-luna'
    observation: tGeneticObservation
    instruction: tGeneticInstruction
    inspection: tLunaInspection
}

export type tGeneticPendingAction =
    | tTerraDiscoveryAction
    | tLunaInspectionAction
    | tTerraReviewAction

export type tTerraDiscoveryResult = {
    kind: 'discover'
    observation: {
        key: string
        summary: string
        watchedPaths: string[]
        instruction: string
    }
}

export type tLunaInspectionResult = {
    kind: 'inspect'
    verdict: 'clear' | 'issue'
    summary: string
    proposedInstruction: string | null
}

export type tTerraReviewResult = {
    kind: 'review-luna'
    decision: 'keep' | 'refine' | 'retire'
    summary: string
    instruction: string | null
}

export type tGeneticEventKind =
    | 'baseline-established'
    | 'change-batch-recorded'
    | 'agent-action-requested'
    | 'observation-recorded'
    | 'luna-inspection-recorded'
    | 'instruction-reviewed'

export type tGeneticEvent = {
    sequence: number
    at: string
    kind: tGeneticEventKind
    data: Record<string, unknown>
}

export type tGeneticSimulationSnapshot = {
    protocolVersion: tGeneticSimulationProtocolVersion
    baselineEstablished: boolean
    files: tGeneticFileSnapshot[]
    batches: tGeneticChangeBatch[]
    observations: tGeneticObservation[]
    instructions: tGeneticInstruction[]
    inspections: tLunaInspection[]
    pendingAction: tGeneticPendingAction | null
    events: tGeneticEvent[]
}

export type tGeneticScanResult = {
    batch: tGeneticChangeBatch | null
    pendingAction: tGeneticPendingAction | null
}

export type tGeneticChangeEventSource = 'agent-patch-applied' | 'file-saved'

export type tGeneticChangeEventFile = {
    path: string
    revision: string | null
}

export type tGeneticChangeEvent = {
    source: tGeneticChangeEventSource
    files: tGeneticChangeEventFile[]
}

export type tGeneticEventGateNotification = {
    acceptedPaths: string[]
    suppressedPaths: string[]
    queuedFileCount: number
}

export type tGeneticEventGateFlush = {
    status: 'idle' | 'blocked' | 'scanned'
    queuedFileCount: number
    batch: tGeneticChangeBatch | null
    pendingAction: tGeneticPendingAction | null
}
