import type { tRunRecord, tRunStatus } from '../contracts/lab-contracts'

const terminalStatuses = new Set<tRunStatus>([
    'passed',
    'failed',
    'canceled',
    'timed_out',
])

const legalTransitions: Record<tRunStatus, readonly tRunStatus[]> = {
    queued: ['starting'],
    starting: ['running', 'failed', 'canceled', 'timed_out'],
    running: ['passed', 'failed', 'canceled', 'timed_out'],
    passed: [],
    failed: [],
    canceled: [],
    timed_out: [],
}

export function isTerminalRunStatus(status: tRunStatus) {
    return terminalStatuses.has(status)
}

export function canTransitionRun(from: tRunStatus, to: tRunStatus) {
    return legalTransitions[from].includes(to)
}

export function transitionRun(
    run: tRunRecord,
    nextStatus: tRunStatus,
    at: string,
    patch: Partial<Pick<tRunRecord, 'exitCode' | 'signal' | 'reason'>> = {},
) {
    if (!canTransitionRun(run.status, nextStatus)) {
        throw new Error(`Illegal run transition: ${run.status} -> ${nextStatus}`)
    }

    return {
        ...run,
        ...patch,
        status: nextStatus,
        startedAt: nextStatus == 'running' ? at : run.startedAt,
        finishedAt: isTerminalRunStatus(nextStatus) ? at : run.finishedAt,
    }
}
