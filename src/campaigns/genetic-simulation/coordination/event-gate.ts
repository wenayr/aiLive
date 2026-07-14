import type {
    tGeneticChangeEvent,
    tGeneticChangeEventFile,
    tGeneticEventGateFlush,
    tGeneticEventGateNotification,
    tGeneticFileSnapshot,
} from '../contracts/genetic-simulation-contracts'
import type { tGeneticSimulation } from '../resource/genetic-simulation'

export function createGeneticEventGate(deps: {simulation: tGeneticSimulation}) {
    const knownRevisions = new Map<string, string>()
    const queuedRevisions = new Map<string, string | null>()
    let baselineEstablished = false

    function establishBaseline(files: tGeneticFileSnapshot[]) {
        if (baselineEstablished) throw new Error('Genetic event gate baseline already exists')
        const normalized = normalizeFiles(files)
        deps.simulation.control.establishBaseline(normalized)
        for (const file of normalized) knownRevisions.set(file.path, file.revision)
        baselineEstablished = true
    }

    function notify(event: tGeneticChangeEvent): tGeneticEventGateNotification {
        requireBaseline()
        const acceptedPaths: string[] = []
        const suppressedPaths: string[] = []
        for (const file of normalizeEventFiles(event.files)) {
            const currentRevision = queuedRevisions.has(file.path)
                ? queuedRevisions.get(file.path)!
                : knownRevisions.get(file.path)
            if (file.revision == currentRevision) {
                suppressedPaths.push(file.path)
                continue
            }
            queuedRevisions.set(file.path, file.revision)
            acceptedPaths.push(file.path)
        }
        return {acceptedPaths, suppressedPaths, queuedFileCount: queuedRevisions.size}
    }

    function flush(): tGeneticEventGateFlush {
        requireBaseline()
        const pendingAction = deps.simulation.debug.pendingAction()
        if (pendingAction) {
            return {status: 'blocked', queuedFileCount: queuedRevisions.size, batch: null, pendingAction}
        }
        if (queuedRevisions.size == 0) {
            return {status: 'idle', queuedFileCount: 0, batch: null, pendingAction: null}
        }

        const nextFiles = new Map(knownRevisions)
        for (const [path, revision] of queuedRevisions) {
            if (revision == null) nextFiles.delete(path)
            else nextFiles.set(path, revision)
        }
        const result = deps.simulation.control.scan(toFiles(nextFiles))
        knownRevisions.clear()
        for (const [path, revision] of nextFiles) knownRevisions.set(path, revision)
        queuedRevisions.clear()
        return {
            status: 'scanned',
            queuedFileCount: 0,
            batch: result.batch,
            pendingAction: result.pendingAction,
        }
    }

    function queuedFiles() {
        return toEventFiles(queuedRevisions)
    }

    function requireBaseline() {
        if (!baselineEstablished) throw new Error('Establish a file baseline before sending change events')
    }

    return {
        control: {establishBaseline, notify, flush},
        debug: {queuedFiles},
    }
}

function normalizeFiles(files: tGeneticFileSnapshot[]) {
    const paths = new Set<string>()
    return files
        .map(function normalize(file) {
            const path = file.path.trim().replaceAll('\\', '/')
            const revision = file.revision.trim()
            if (!path || !revision) throw new Error('Event file path and revision are required')
            if (paths.has(path)) throw new Error(`Duplicate event file: ${path}`)
            paths.add(path)
            return {path, revision}
        })
        .sort(function byPath(a, b) { return a.path.localeCompare(b.path) })
}

function normalizeEventFiles(files: tGeneticChangeEventFile[]) {
    const paths = new Set<string>()
    return files
        .map(function normalize(file) {
            const path = file.path.trim().replaceAll('\\', '/')
            const revision = file.revision == null ? null : file.revision.trim()
            if (!path || revision == '') throw new Error('Event file path and revision are required')
            if (paths.has(path)) throw new Error(`Duplicate event file: ${path}`)
            paths.add(path)
            return {path, revision}
        })
        .sort(function byPath(a, b) { return a.path.localeCompare(b.path) })
}

function toFiles(revisions: Map<string, string>) {
    return [...revisions]
        .map(function toSnapshot([path, revision]) { return {path, revision} })
        .sort(function byPath(a, b) { return a.path.localeCompare(b.path) })
}

function toEventFiles(revisions: Map<string, string | null>) {
    return [...revisions]
        .map(function toSnapshot([path, revision]) { return {path, revision} })
        .sort(function byPath(a, b) { return a.path.localeCompare(b.path) })
}

export type tGeneticEventGate = ReturnType<typeof createGeneticEventGate>
