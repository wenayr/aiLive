import type {
    tGeneticChangeEventFile,
    tGeneticChangeEventSource,
} from '../contracts/genetic-simulation-contracts'
import type { tGeneticEventGate } from '../coordination/event-gate'
import type { tWorkspaceSampler } from './workspace-sampler'

export function createPatchEventCapture(deps: {
    sampler: tWorkspaceSampler
    gate: tGeneticEventGate
}) {
    async function establishBaseline(paths: string[]) {
        const snapshots = await deps.sampler.runtime.sample(normalizePaths(paths))
        deps.gate.control.establishBaseline(snapshots)
    }

    async function capture(input: {source: tGeneticChangeEventSource, paths: string[]}) {
        const files = await sampleEventFiles(input.paths)
        const notification = deps.gate.control.notify({source: input.source, files})
        return {files, notification}
    }

    async function sampleEventFiles(paths: string[]): Promise<tGeneticChangeEventFile[]> {
        const normalizedPaths = normalizePaths(paths)
        const snapshots = await deps.sampler.runtime.sample(normalizedPaths)
        const revisions = new Map(snapshots.map(function entry(file) { return [file.path, file.revision] }))
        return normalizedPaths.map(function eventFile(path) {
            return {path, revision: revisions.get(path) ?? null}
        })
    }

    return {
        control: {establishBaseline, capture},
        debug: {sampleEventFiles},
    }
}

function normalizePaths(paths: string[]) {
    const seen = new Set<string>()
    const normalized = paths.map(function normalize(path) {
        const value = path.trim().replaceAll('\\', '/')
        if (!value) throw new Error('Patch event path is required')
        if (seen.has(value)) throw new Error(`Duplicate patch event path: ${value}`)
        seen.add(value)
        return value
    })
    if (normalized.length == 0) throw new Error('Patch event needs at least one path')
    return normalized
}

export type tPatchEventCapture = ReturnType<typeof createPatchEventCapture>
