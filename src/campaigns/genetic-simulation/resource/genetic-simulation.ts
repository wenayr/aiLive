import { randomUUID } from 'node:crypto'
import type {
    tGeneticChangeBatch,
    tGeneticEventKind,
    tGeneticFileChange,
    tGeneticFileSnapshot,
    tGeneticInstruction,
    tGeneticObservation,
    tGeneticPendingAction,
    tGeneticScanResult,
    tGeneticSimulationSnapshot,
    tLunaInspection,
    tLunaInspectionResult,
    tTerraDiscoveryResult,
    tTerraReviewResult,
} from '../contracts/genetic-simulation-contracts'
import { geneticSimulationProtocolVersion } from '../contracts/genetic-simulation-contracts'
import { copyJson } from '../../../lab/utility/json'
import { isoNow } from '../../../lab/utility/time'

type tGeneticSimulationState = tGeneticSimulationSnapshot

export function createGeneticSimulation(deps: {
    createId?: () => string
    now?: () => string
} = {}) {
    const createId = deps.createId ?? randomUUID
    const now = deps.now ?? isoNow
    const state: tGeneticSimulationState = {
        protocolVersion: geneticSimulationProtocolVersion,
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
        if (state.baselineEstablished) throw new Error('Genetic simulation baseline already exists')
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
                agent: 'luna',
                kind: 'inspect',
                batchId: batch.id,
                files: selectRelevantFiles(batch.files, selected.instruction.watchedPaths),
                observation: copyJson(selected.observation),
                instruction: copyJson(selected.instruction),
            }
            : {
                id: createId(),
                agent: 'terra',
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

    function submitTerra(actionId: string, result: tTerraDiscoveryResult | tTerraReviewResult) {
        const action = requirePendingTerra(actionId)
        if (action.kind == 'discover') {
            if (result.kind != 'discover') throw new Error('Terra discovery action requires a discovery result')
            recordDiscovery(action, result)
            state.pendingAction = null
            return snapshot()
        }
        if (result.kind != 'review-luna') throw new Error('Terra review action requires a review result')
        reviewInstruction(action, result)
        state.pendingAction = null
        return snapshot()
    }

    function submitLuna(actionId: string, result: tLunaInspectionResult) {
        const action = requirePendingLuna(actionId)
        if (result.kind != 'inspect') throw new Error('Luna inspection action requires an inspection result')
        const instruction = getInstruction(action.instruction.id)
        if (!instruction || instruction.status != 'active') throw new Error(`Active instruction not found: ${action.instruction.id}`)

        const inspection: tLunaInspection = {
            id: createId(),
            actionId: action.id,
            batchId: action.batchId,
            observationId: action.observation.id,
            instructionId: instruction.id,
            verdict: result.verdict,
            summary: requireText(result.summary, 'Luna inspection summary'),
            proposedInstruction: result.proposedInstruction == null
                ? null
                : requireText(result.proposedInstruction, 'Luna proposed instruction'),
            createdAt: now(),
        }
        state.inspections.push(inspection)
        instruction.lastCheckedAt = inspection.createdAt
        record('luna-inspection-recorded', {
            actionId: action.id,
            inspectionId: inspection.id,
            instructionId: instruction.id,
            verdict: inspection.verdict,
        })

        state.pendingAction = {
            id: createId(),
            agent: 'terra',
            kind: 'review-luna',
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
        action: Extract<tGeneticPendingAction, {agent: 'terra', kind: 'discover'}>,
        result: tTerraDiscoveryResult,
    ) {
        const definition = result.observation
        const key = requireText(definition.key, 'Observation key')
        if (state.observations.some(function hasKey(item) { return item.key == key })) {
            throw new Error(`Observation key already exists: ${key}`)
        }
        const watchedPaths = normalizeWatchedPaths(definition.watchedPaths)
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
        action: Extract<tGeneticPendingAction, {agent: 'terra', kind: 'review-luna'}>,
        result: tTerraReviewResult,
    ) {
        const instruction = getInstruction(action.instruction.id)
        if (!instruction || instruction.status != 'active') throw new Error(`Active instruction not found: ${action.instruction.id}`)
        const summary = requireText(result.summary, 'Terra review summary')
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

    function requirePendingTerra(actionId: string) {
        const action = state.pendingAction
        if (!action || action.id != actionId || action.agent != 'terra') {
            throw new Error(`Pending Terra action not found: ${actionId}`)
        }
        return action
    }

    function requirePendingLuna(actionId: string) {
        const action = state.pendingAction
        if (!action || action.id != actionId || action.agent != 'luna' || action.kind != 'inspect') {
            throw new Error(`Pending Luna inspection not found: ${actionId}`)
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
        control: {establishBaseline, scan, submitTerra, submitLuna},
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
        throw new Error(`${label} must stay below the simulated workspace: ${value}`)
    }
    return normalized
}

function requireText(value: string, label: string) {
    const normalized = value.trim()
    if (!normalized) throw new Error(`${label} is required`)
    return normalized
}

export type tGeneticSimulation = ReturnType<typeof createGeneticSimulation>
