import { randomUUID } from 'node:crypto'
import type {
    tGeneticChangeBatch,
    tGeneticEvent,
    tGeneticEventKind,
    tGeneticFileChange,
    tGeneticFileSnapshot,
    tGeneticInstruction,
    tGeneticObservation,
    tGeneticPendingAction,
    tGeneticScanResult,
    tGeneticModuleSnapshot,
    tReviewerInspection,
    tReviewerInspectionResult,
    tOwnerDiscoveryResult,
    tOwnerReviewResult,
} from '../contracts/genetic-module-contracts'
import { geneticModuleProtocolVersion } from '../contracts/genetic-module-contracts'
import { copyJson } from '../utility/json'
import { isoNow } from '../utility/time'

type tGeneticModuleState = tGeneticModuleSnapshot

export function createGeneticModule(deps: {
    createId?: () => string
    now?: () => string
    initialState?: unknown
} = {}) {
    const createId = deps.createId ?? randomUUID
    const now = deps.now ?? isoNow
    const state: tGeneticModuleState = deps.initialState
        ? restoreState(deps.initialState)
        : {
            protocolVersion: geneticModuleProtocolVersion,
            baselineEstablished: false,
            files: [],
            batches: [],
            observations: [],
            instructions: [],
            inspections: [],
            pendingAction: null,
            events: [],
        }

    function snapshot() {
        return copyJson(state)
    }

    function pendingAction() {
        return state.pendingAction ? copyJson(state.pendingAction) : null
    }

    function establishBaseline(files: tGeneticFileSnapshot[]) {
        if (state.baselineEstablished) throw new Error('Genetic module baseline already exists')
        state.files = normalizeFiles(files)
        state.baselineEstablished = true
        record('baseline-established', {fileCount: state.files.length})
        return snapshot()
    }

    function scan(files: tGeneticFileSnapshot[]): tGeneticScanResult {
        if (!state.baselineEstablished) throw new Error('Establish a file baseline before scanning')
        if (state.pendingAction) throw new Error('Resolve the pending agent action before the next scan')

        const nextFiles = normalizeFiles(files)
        const changes = findChanges(state.files, nextFiles)
        state.files = nextFiles
        if (changes.length == 0) return {batch: null, pendingAction: null}

        const batch: tGeneticChangeBatch = {
            id: createId(),
            observedAt: now(),
            files: changes,
        }
        state.batches.push(batch)
        record('change-batch-recorded', {batchId: batch.id, fileCount: batch.files.length})

        const selected = selectInstruction(batch)
        state.pendingAction = selected
            ? {
                id: createId(),
                agent: 'reviewer',
                kind: 'inspect',
                batchId: batch.id,
                files: selectRelevantFiles(batch.files, selected.instruction.watchedPaths),
                observation: copyJson(selected.observation),
                instruction: copyJson(selected.instruction),
            }
            : {
                id: createId(),
                agent: 'owner',
                kind: 'discover',
                batch: copyJson(batch),
            }
        record('agent-action-requested', {
            actionId: state.pendingAction.id,
            agent: state.pendingAction.agent,
            kind: state.pendingAction.kind,
        })
        return {batch: copyJson(batch), pendingAction: pendingAction()}
    }

    function submitOwner(actionId: string, result: tOwnerDiscoveryResult | tOwnerReviewResult) {
        const action = requirePendingOwner(actionId)
        if (action.kind == 'discover') {
            if (result.kind != 'discover') throw new Error('Owner discovery action requires a discovery result')
            if (result.decision == 'skip') {
                record('discovery-skipped', {
                    actionId: action.id,
                    batchId: action.batch.id,
                    summary: requireText(result.summary, 'Discovery skip summary'),
                })
            } else {
                recordDiscovery(action, result)
            }
            state.pendingAction = null
            return snapshot()
        }
        if (result.kind != 'review-inspection') throw new Error('Owner review action requires a review result')
        reviewInstruction(action, result)
        state.pendingAction = null
        return snapshot()
    }

    function submitReviewer(actionId: string, result: tReviewerInspectionResult) {
        const action = requirePendingReviewer(actionId)
        if (result.kind != 'inspect') throw new Error('Reviewer inspection action requires an inspection result')
        if (result.verdict == 'clear' && result.proposedInstruction != null) {
            throw new Error('A clear inspection cannot propose a replacement instruction')
        }
        const instruction = getInstruction(action.instruction.id)
        if (!instruction || instruction.status != 'active') throw new Error(`Active instruction not found: ${action.instruction.id}`)

        const inspection: tReviewerInspection = {
            id: createId(),
            actionId: action.id,
            batchId: action.batchId,
            observationId: action.observation.id,
            instructionId: instruction.id,
            verdict: result.verdict,
            summary: requireText(result.summary, 'Reviewer inspection summary'),
            proposedInstruction: result.proposedInstruction == null
                ? null
                : requireText(result.proposedInstruction, 'Reviewer proposed instruction'),
            createdAt: now(),
        }
        state.inspections.push(inspection)
        instruction.lastCheckedAt = inspection.createdAt
        record('reviewer-inspection-recorded', {
            actionId: action.id,
            inspectionId: inspection.id,
            instructionId: instruction.id,
            verdict: inspection.verdict,
        })

        if (inspection.verdict == 'clear') {
            instruction.approvedChecks += 1
            state.pendingAction = null
            return snapshot()
        }

        state.pendingAction = {
            id: createId(),
            agent: 'owner',
            kind: 'review-inspection',
            observation: copyJson(action.observation),
            instruction: copyJson(instruction),
            inspection: copyJson(inspection),
        }
        record('agent-action-requested', {
            actionId: state.pendingAction.id,
            agent: state.pendingAction.agent,
            kind: state.pendingAction.kind,
        })
        return snapshot()
    }

    function recordDiscovery(
        action: Extract<tGeneticPendingAction, {agent: 'owner', kind: 'discover'}>,
        result: Extract<tOwnerDiscoveryResult, {decision: 'record'}>,
    ) {
        const definition = result.observation
        const key = requireText(definition.key, 'Observation key')
        if (state.observations.some(function hasKey(item) { return item.key == key })) {
            throw new Error(`Observation key already exists: ${key}`)
        }
        const watchedPaths = normalizeWatchedPaths(definition.watchedPaths)
        if (selectRelevantFiles(action.batch.files, watchedPaths).length == 0) {
            throw new Error('Observation watched paths must match the discovery change batch')
        }
        const observation: tGeneticObservation = {
            id: createId(),
            key,
            summary: requireText(definition.summary, 'Observation summary'),
            watchedPaths,
            sourceBatchId: action.batch.id,
            createdAt: now(),
        }
        const instruction: tGeneticInstruction = {
            id: createId(),
            observationId: observation.id,
            text: requireText(definition.instruction, 'Observation instruction'),
            watchedPaths: copyJson(watchedPaths),
            status: 'active',
            approvedChecks: 0,
            lastCheckedAt: null,
            createdAt: observation.createdAt,
        }
        state.observations.push(observation)
        state.instructions.push(instruction)
        record('observation-recorded', {
            actionId: action.id,
            observationId: observation.id,
            instructionId: instruction.id,
            batchId: action.batch.id,
        })
    }

    function reviewInstruction(
        action: Extract<tGeneticPendingAction, {agent: 'owner', kind: 'review-inspection'}>,
        result: tOwnerReviewResult,
    ) {
        const instruction = getInstruction(action.instruction.id)
        if (!instruction || instruction.status != 'active') throw new Error(`Active instruction not found: ${action.instruction.id}`)
        const summary = requireText(result.summary, 'Owner review summary')
        if (result.decision == 'refine') {
            instruction.text = requireText(result.instruction ?? '', 'Refined instruction')
            instruction.approvedChecks += 1
        }
        if (result.decision == 'keep') instruction.approvedChecks += 1
        if (result.decision == 'retire') instruction.status = 'retired'
        record('instruction-reviewed', {
            actionId: action.id,
            instructionId: instruction.id,
            inspectionId: action.inspection.id,
            decision: result.decision,
            summary,
        })
    }

    function requirePendingOwner(actionId: string) {
        const action = state.pendingAction
        if (!action || action.id != actionId || action.agent != 'owner') {
            throw new Error(`Pending Owner action not found: ${actionId}`)
        }
        return action
    }

    function requirePendingReviewer(actionId: string) {
        const action = state.pendingAction
        if (!action || action.id != actionId || action.agent != 'reviewer' || action.kind != 'inspect') {
            throw new Error(`Pending Reviewer inspection not found: ${actionId}`)
        }
        return action
    }

    function getInstruction(instructionId: string) {
        return state.instructions.find(function hasId(instruction) { return instruction.id == instructionId }) ?? null
    }

    function selectInstruction(batch: tGeneticChangeBatch) {
        const candidates = state.instructions
            .filter(function active(instruction) { return instruction.status == 'active' })
            .map(function score(instruction) {
                const observation = state.observations.find(function belongsTo(item) {
                    return item.id == instruction.observationId
                })
                return {
                    instruction,
                    observation,
                    relevantFiles: selectRelevantFiles(batch.files, instruction.watchedPaths),
                }
            })
            .filter(function relevant(candidate): candidate is {
                instruction: tGeneticInstruction
                observation: tGeneticObservation
                relevantFiles: tGeneticFileChange[]
            } {
                return candidate.observation != null && candidate.relevantFiles.length > 0
            })
            .sort(function mostSpecificFirst(a, b) {
                return b.relevantFiles.length - a.relevantFiles.length
                    || a.instruction.createdAt.localeCompare(b.instruction.createdAt)
            })
        return candidates[0] ?? null
    }

    function record(kind: tGeneticEventKind, data: Record<string, unknown>) {
        state.events.push({
            sequence: state.events.length + 1,
            at: now(),
            kind,
            data: copyJson(data),
        })
    }

    return {
        control: {establishBaseline, scan, submitOwner, submitReviewer},
        debug: {snapshot, pendingAction},
    }
}

function normalizeFiles(files: tGeneticFileSnapshot[]) {
    const paths = new Set<string>()
    return files
        .map(function normalize(file) {
            const path = normalizePath(file.path, 'File path')
            if (paths.has(path)) throw new Error(`Duplicate file snapshot: ${path}`)
            paths.add(path)
            return {path, revision: requireText(file.revision, `File revision for ${path}`)}
        })
        .sort(function byPath(a, b) { return a.path.localeCompare(b.path) })
}

function findChanges(before: tGeneticFileSnapshot[], after: tGeneticFileSnapshot[]) {
    const beforeByPath = new Map(before.map(function entry(file) { return [file.path, file.revision] }))
    const afterByPath = new Map(after.map(function entry(file) { return [file.path, file.revision] }))
    const paths = new Set([...beforeByPath.keys(), ...afterByPath.keys()])
    return [...paths]
        .sort()
        .flatMap(function changeFor(path): tGeneticFileChange[] {
            const beforeRevision = beforeByPath.get(path) ?? null
            const afterRevision = afterByPath.get(path) ?? null
            if (beforeRevision == afterRevision) return []
            return [{path, beforeRevision, afterRevision}]
        })
}

function selectRelevantFiles(files: tGeneticFileChange[], watchedPaths: string[]) {
    return files.filter(function matchesWatch(file) {
        return watchedPaths.some(function matches(path) { return matchesPath(path, file.path) })
    })
}

function normalizeWatchedPaths(paths: string[]) {
    if (paths.length == 0) throw new Error('Observation needs at least one watched path')
    const seen = new Set<string>()
    return paths.map(function normalize(path) {
        const normalized = normalizePath(path, 'Watched path')
        if (seen.has(normalized)) throw new Error(`Duplicate watched path: ${normalized}`)
        seen.add(normalized)
        return normalized
    })
}

function matchesPath(watchedPath: string, changedPath: string) {
    return watchedPath.endsWith('/')
        ? changedPath.startsWith(watchedPath)
        : changedPath == watchedPath
}

function normalizePath(value: string, label: string) {
    const normalized = requireText(value, label).replaceAll('\\', '/')
    if (normalized.startsWith('/') || normalized.split('/').includes('..')) {
        throw new Error(`${label} must stay below the workspace: ${value}`)
    }
    return normalized
}

function requireText(value: string, label: string) {
    const normalized = value.trim()
    if (!normalized) throw new Error(`${label} is required`)
    return normalized
}

export type tGeneticModule = ReturnType<typeof createGeneticModule>

function restoreState(snapshot: unknown): tGeneticModuleSnapshot {
    const state = requireStoredObject(snapshot, 'Persisted genetic state')
    if (state.protocolVersion != geneticModuleProtocolVersion) {
        throw new Error(`Unsupported genetic state: ${String(state.protocolVersion)}`)
    }
    if (state.baselineEstablished != true) throw new Error('Persisted genetic state needs a baseline')
    const events = requireStoredArray(state.events, 'events').map(parseStoredEvent)
    events.forEach(function validateSequence(event, index) {
        if (event.sequence != index + 1) throw new Error('Persisted genetic event sequence is invalid')
    })
    return {
        protocolVersion: geneticModuleProtocolVersion,
        baselineEstablished: true,
        files: requireStoredArray(state.files, 'files').map(parseStoredFile),
        batches: requireStoredArray(state.batches, 'batches').map(parseStoredBatch),
        observations: requireStoredArray(state.observations, 'observations').map(parseStoredObservation),
        instructions: requireStoredArray(state.instructions, 'instructions').map(parseStoredInstruction),
        inspections: requireStoredArray(state.inspections, 'inspections').map(parseStoredInspection),
        pendingAction: parseStoredPending(state.pendingAction),
        events,
    }
}

function parseStoredFile(value: unknown): tGeneticFileSnapshot {
    const file = requireStoredObject(value, 'file snapshot')
    return {
        path: requireStoredPath(file.path, 'file path'),
        revision: requireStoredText(file.revision, 'file revision'),
    }
}

function parseStoredChange(value: unknown): tGeneticFileChange {
    const file = requireStoredObject(value, 'file change')
    return {
        path: requireStoredPath(file.path, 'change path'),
        beforeRevision: requireStoredNullableText(file.beforeRevision, 'before revision'),
        afterRevision: requireStoredNullableText(file.afterRevision, 'after revision'),
    }
}

function parseStoredBatch(value: unknown): tGeneticChangeBatch {
    const batch = requireStoredObject(value, 'change batch')
    return {
        id: requireStoredText(batch.id, 'batch id'),
        observedAt: requireStoredText(batch.observedAt, 'batch observedAt'),
        files: requireStoredArray(batch.files, 'batch files').map(parseStoredChange),
    }
}

function parseStoredObservation(value: unknown): tGeneticObservation {
    const observation = requireStoredObject(value, 'observation')
    return {
        id: requireStoredText(observation.id, 'observation id'),
        key: requireStoredText(observation.key, 'observation key'),
        summary: requireStoredText(observation.summary, 'observation summary'),
        watchedPaths: requireStoredArray(observation.watchedPaths, 'observation watchedPaths')
            .map(function path(item) { return requireStoredPath(item, 'observation watched path') }),
        sourceBatchId: requireStoredText(observation.sourceBatchId, 'observation sourceBatchId'),
        createdAt: requireStoredText(observation.createdAt, 'observation createdAt'),
    }
}

function parseStoredInstruction(value: unknown): tGeneticInstruction {
    const instruction = requireStoredObject(value, 'instruction')
    const approvedChecks = instruction.approvedChecks
    if (!Number.isInteger(approvedChecks) || Number(approvedChecks) < 0) {
        throw new Error('instruction approvedChecks must be a non-negative integer')
    }
    return {
        id: requireStoredText(instruction.id, 'instruction id'),
        observationId: requireStoredText(instruction.observationId, 'instruction observationId'),
        text: requireStoredText(instruction.text, 'instruction text'),
        watchedPaths: requireStoredArray(instruction.watchedPaths, 'instruction watchedPaths')
            .map(function path(item) { return requireStoredPath(item, 'instruction watched path') }),
        status: requireStoredChoice(instruction.status, ['active', 'retired'], 'instruction status'),
        approvedChecks: approvedChecks as number,
        lastCheckedAt: requireStoredNullableText(instruction.lastCheckedAt, 'instruction lastCheckedAt'),
        createdAt: requireStoredText(instruction.createdAt, 'instruction createdAt'),
    }
}

function parseStoredInspection(value: unknown): tReviewerInspection {
    const inspection = requireStoredObject(value, 'inspection')
    return {
        id: requireStoredText(inspection.id, 'inspection id'),
        actionId: requireStoredText(inspection.actionId, 'inspection actionId'),
        batchId: requireStoredText(inspection.batchId, 'inspection batchId'),
        observationId: requireStoredText(inspection.observationId, 'inspection observationId'),
        instructionId: requireStoredText(inspection.instructionId, 'inspection instructionId'),
        verdict: requireStoredChoice(inspection.verdict, ['clear', 'issue'], 'inspection verdict'),
        summary: requireStoredText(inspection.summary, 'inspection summary'),
        proposedInstruction: requireStoredNullableText(inspection.proposedInstruction,
            'inspection proposedInstruction'),
        createdAt: requireStoredText(inspection.createdAt, 'inspection createdAt'),
    }
}

function parseStoredPending(value: unknown): tGeneticPendingAction | null {
    if (value == null) return null
    const action = requireStoredObject(value, 'pending action')
    const id = requireStoredText(action.id, 'pending action id')
    const kind = requireStoredChoice(action.kind, ['discover', 'inspect', 'review-inspection'],
        'pending action kind')
    if (kind == 'discover') {
        if (action.agent != 'owner') throw new Error('Discovery action must belong to owner')
        return {id, agent: 'owner', kind, batch: parseStoredBatch(action.batch)}
    }
    if (kind == 'inspect') {
        if (action.agent != 'reviewer') throw new Error('Inspection action must belong to reviewer')
        return {
            id,
            agent: 'reviewer',
            kind,
            batchId: requireStoredText(action.batchId, 'inspection action batchId'),
            files: requireStoredArray(action.files, 'inspection action files').map(parseStoredChange),
            observation: parseStoredObservation(action.observation),
            instruction: parseStoredInstruction(action.instruction),
        }
    }
    if (action.agent != 'owner') throw new Error('Review action must belong to owner')
    return {
        id,
        agent: 'owner',
        kind,
        observation: parseStoredObservation(action.observation),
        instruction: parseStoredInstruction(action.instruction),
        inspection: parseStoredInspection(action.inspection),
    }
}

function parseStoredEvent(value: unknown): tGeneticEvent {
    const event = requireStoredObject(value, 'genetic event')
    if (!Number.isInteger(event.sequence) || Number(event.sequence) < 1) {
        throw new Error('genetic event sequence must be a positive integer')
    }
    return {
        sequence: event.sequence as number,
        at: requireStoredText(event.at, 'genetic event time'),
        kind: requireStoredChoice(event.kind, [
            'baseline-established',
            'change-batch-recorded',
            'agent-action-requested',
            'observation-recorded',
            'discovery-skipped',
            'reviewer-inspection-recorded',
            'instruction-reviewed',
        ], 'genetic event kind'),
        data: copyJson(requireStoredObject(event.data, 'genetic event data')),
    }
}

function requireStoredObject(value: unknown, label: string): Record<string, unknown> {
    if (typeof value != 'object' || value == null || Array.isArray(value)) {
        throw new Error(`${label} must be an object`)
    }
    return value as Record<string, unknown>
}

function requireStoredArray(value: unknown, label: string) {
    if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
    return value
}

function requireStoredText(value: unknown, label: string) {
    if (typeof value != 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`)
    return value
}

function requireStoredNullableText(value: unknown, label: string) {
    if (value == null) return null
    return requireStoredText(value, label)
}

function requireStoredPath(value: unknown, label: string) {
    const path = requireStoredText(value, label)
    if (normalizePath(path, label) != path) throw new Error(`${label} must be normalized`)
    return path
}

function requireStoredChoice<const tChoice extends string>(
    value: unknown,
    choices: readonly tChoice[],
    label: string,
) {
    if (typeof value != 'string' || !choices.includes(value as tChoice)) {
        throw new Error(`${label} must be one of: ${choices.join(', ')}`)
    }
    return value as tChoice
}
