import { Observe, Replay } from 'wenay-common2'
import type {
    tArtifactRef,
    tRunEvent,
    tRunEventKind,
    tRunLog,
    tRunRecord,
    tRunStatus,
    tTaskDefinition,
} from '../contracts/lab-contracts'
import { transitionRun } from '../transform/run-state'
import { createRunId } from '../utility/id'
import { copyJson } from '../utility/json'
import { isoNow } from '../utility/time'

type tRunState = {
    runs: Record<string, tRunRecord>
}

export function createRunStore(deps: {
    createId?: () => string
    now?: () => string
    maxLogLines?: number
}) {
    const createId = deps.createId ?? createRunId
    const now = deps.now ?? isoNow
    const maxLogLines = deps.maxLogLines ?? 400
    const store = Observe.createStore<tRunState>({runs: {}})
    const eventHistory = new Map<string, tRunEvent[]>()
    const [emitEvent, events] = Replay.replayListen<[tRunEvent]>({history: 2_000, current: 'last'})

    // === Read model ===

    function get(runId: string) {
        const run = store.state.runs[runId]
        return run ? copyJson(Observe.toRaw(run)) : null
    }

    function list() {
        return Object.values(store.state.runs)
            .map(function snapshotRun(run) { return copyJson(Observe.toRaw(run)) })
            .sort(function newestFirst(a, b) { return b.createdAt.localeCompare(a.createdAt) })
    }

    function trace(runId: string) {
        return copyJson(eventHistory.get(runId) ?? [])
    }

    // === Run resource operations ===

    function create(task: tTaskDefinition) {
        const run: tRunRecord = {
            id: createId(),
            task: copyJson(task),
            status: 'queued',
            createdAt: now(),
            startedAt: null,
            finishedAt: null,
            exitCode: null,
            signal: null,
            reason: null,
            eventCount: 0,
            logTail: [],
            artifacts: [],
        }
        store.state.runs[run.id] = run
        append(run.id, 'run-created', {taskId: task.id, taskVersion: task.version})
        return get(run.id)!
    }

    function append(runId: string, kind: tRunEventKind, data: Record<string, unknown>) {
        const current = store.state.runs[runId]
        if (!current) throw new Error(`Unknown run: ${runId}`)
        const rawCurrent = Observe.toRaw(current)

        const event: tRunEvent = {
            runId,
            sequence: rawCurrent.eventCount + 1,
            at: now(),
            kind,
            data: copyJson(data),
        }
        const history = eventHistory.get(runId) ?? []
        history.push(event)
        eventHistory.set(runId, history)
        store.state.runs[runId] = {...rawCurrent, eventCount: event.sequence}
        emitEvent(event)
        return copyJson(event)
    }

    function transition(
        runId: string,
        nextStatus: tRunStatus,
        kind: tRunEventKind,
        patch: Partial<Pick<tRunRecord, 'exitCode' | 'signal' | 'reason'>> = {},
    ) {
        const current = store.state.runs[runId]
        if (!current) throw new Error(`Unknown run: ${runId}`)
        const rawCurrent = Observe.toRaw(current)

        store.state.runs[runId] = transitionRun(rawCurrent, nextStatus, now(), patch)
        append(runId, kind, {status: nextStatus, ...patch})
        return get(runId)!
    }

    function appendLog(runId: string, log: tRunLog) {
        const current = store.state.runs[runId]
        if (!current) throw new Error(`Unknown run: ${runId}`)
        const rawCurrent = Observe.toRaw(current)

        const logTail = [...rawCurrent.logTail, copyJson(log)].slice(-maxLogLines)
        store.state.runs[runId] = {...rawCurrent, logTail}
        append(runId, 'log', log)
        return get(runId)!
    }

    function appendArtifact(runId: string, artifact: tArtifactRef) {
        const current = store.state.runs[runId]
        if (!current) throw new Error(`Unknown run: ${runId}`)
        const rawCurrent = Observe.toRaw(current)

        const artifacts = rawCurrent.artifacts.some(function sameArtifact(item) { return item.path == artifact.path })
            ? rawCurrent.artifacts
            : [...rawCurrent.artifacts, copyJson(artifact)]
        store.state.runs[runId] = {...rawCurrent, artifacts}
        append(runId, 'artifact', artifact)
        return get(runId)!
    }

    return {
        api: {
            get,
            list,
            trace,
            events,
        },
        control: {
            create,
            append,
            transition,
            appendLog,
            appendArtifact,
        },
    }
}

export type tRunStore = ReturnType<typeof createRunStore>
