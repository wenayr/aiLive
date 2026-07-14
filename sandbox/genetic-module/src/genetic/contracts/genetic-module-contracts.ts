export const geneticModuleProtocolVersion = 'genetic-module/v1' as const

export type tGeneticModuleProtocolVersion = typeof geneticModuleProtocolVersion

export type tGeneticAgent = 'owner' | 'reviewer'

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

export type tReviewerInspection = {
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

export type tOwnerDiscoveryAction = {
    id: string
    agent: 'owner'
    kind: 'discover'
    batch: tGeneticChangeBatch
}

export type tReviewerInspectionAction = {
    id: string
    agent: 'reviewer'
    kind: 'inspect'
    batchId: string
    files: tGeneticFileChange[]
    observation: tGeneticObservation
    instruction: tGeneticInstruction
}

export type tOwnerReviewAction = {
    id: string
    agent: 'owner'
    kind: 'review-inspection'
    observation: tGeneticObservation
    instruction: tGeneticInstruction
    inspection: tReviewerInspection
}

export type tGeneticPendingAction =
    | tOwnerDiscoveryAction
    | tReviewerInspectionAction
    | tOwnerReviewAction

export type tOwnerDiscoveryResult = {
    kind: 'discover'
    decision: 'record'
    observation: {
        key: string
        summary: string
        watchedPaths: string[]
        instruction: string
    }
} | {
    kind: 'discover'
    decision: 'skip'
    summary: string
}

export type tReviewerInspectionResult = {
    kind: 'inspect'
    verdict: 'clear' | 'issue'
    summary: string
    proposedInstruction: string | null
}

export type tOwnerReviewResult = {
    kind: 'review-inspection'
    decision: 'keep' | 'refine' | 'retire'
    summary: string
    instruction: string | null
}

export type tGeneticEventKind =
    | 'baseline-established'
    | 'change-batch-recorded'
    | 'agent-action-requested'
    | 'observation-recorded'
    | 'discovery-skipped'
    | 'reviewer-inspection-recorded'
    | 'instruction-reviewed'

export type tGeneticEvent = {
    sequence: number
    at: string
    kind: tGeneticEventKind
    data: Record<string, unknown>
}

export type tGeneticModuleSnapshot = {
    protocolVersion: tGeneticModuleProtocolVersion
    baselineEstablished: boolean
    files: tGeneticFileSnapshot[]
    batches: tGeneticChangeBatch[]
    observations: tGeneticObservation[]
    instructions: tGeneticInstruction[]
    inspections: tReviewerInspection[]
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
