import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import {
    appendFile,
    lstat,
    mkdir,
    open,
    readFile,
    readdir,
    realpath,
    rename,
    rm,
    unlink,
    writeFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, posix, relative, resolve } from 'node:path'
import type {
    tGeneticFileChange,
    tGeneticFileSnapshot,
    tGeneticPendingAction,
    tGeneticModuleSnapshot,
    tOwnerDiscoveryResult,
    tOwnerReviewResult,
    tReviewerInspectionResult,
} from '../genetic/contracts/genetic-module-contracts'
import { createGeneticModule } from '../genetic/resource/genetic-module'

type tFileContext = {
    path: string
    revision: string | null
    content: string | null
}

type tSandboxResponse = {
    actionId: string
    result: tOwnerDiscoveryResult | tOwnerReviewResult | tReviewerInspectionResult
}

export function createSandboxSession(deps: {
    rootDirectory: string
    mode?: 'owned-project' | 'bound-project'
    projectDirectory?: string
    geneticDirectory?: string
    templateDirectory?: string
    trackedPaths: string[]
    now?: () => string
    createId?: () => string
}) {
    const rootDirectory = resolve(deps.rootDirectory)
    const mode = deps.mode ?? 'owned-project'
    const projectDirectory = mode == 'bound-project'
        ? resolve(requireBoundProjectDirectory(deps.projectDirectory))
        : resolveWithin(rootDirectory, deps.projectDirectory ?? 'project')
    const geneticDirectory = resolveWithin(rootDirectory, deps.geneticDirectory ?? 'genetic')
    const templateDirectory = mode == 'owned-project'
        ? resolveWithin(rootDirectory, deps.templateDirectory ?? 'template/project')
        : null
    requireDisjointDirectories(templateDirectory
        ? [projectDirectory, geneticDirectory, templateDirectory]
        : [projectDirectory, geneticDirectory])
    const trackedPaths = normalizePaths(deps.trackedPaths)
    const now = deps.now ?? function currentTime() { return new Date().toISOString() }
    const createId = deps.createId ?? randomUUID
    const statePath = resolveWithin(geneticDirectory, 'state.json')
    const pendingPath = resolveWithin(geneticDirectory, 'pending.json')
    const responsePath = resolveWithin(geneticDirectory, 'response.json')
    const statusPath = resolveWithin(geneticDirectory, 'STATUS.md')
    const tracePath = resolveWithin(geneticDirectory, 'trace.ndjson')
    const contentDirectory = resolveWithin(geneticDirectory, 'content')
    const historyDirectory = resolveWithin(geneticDirectory, 'history')
    const lockPath = resolveWithin(geneticDirectory, '.lock')

    async function setup() {
        if (await exists(geneticDirectory)) {
            throw new Error('Sandbox is already initialized; inspect existing development state instead of overwriting it')
        }
        if (mode == 'owned-project' && await exists(projectDirectory)) {
            throw new Error('Sandbox is already initialized; inspect project/ and genetic/ instead of overwriting them')
        }
        if (mode == 'bound-project' && !await exists(projectDirectory)) {
            throw new Error(`Bound target project does not exist: ${projectDirectory}`)
        }
        let ownsSetup = false
        try {
            await mkdir(geneticDirectory, {recursive: false})
            ownsSetup = true
            return await withLock(async function initialize() {
                if (mode == 'owned-project') await copyDirectory(templateDirectory as string, projectDirectory)
                await mkdir(contentDirectory, {recursive: true})
                await mkdir(historyDirectory, {recursive: true})
                const contexts = await sampleTrackedFiles()
                requirePresentBaseline(contexts)
                await archiveContents(contexts)
                const genetic = createGenetic()
                genetic.control.establishBaseline(toSnapshots(contexts))
                const state = genetic.debug.snapshot()
                await persist(state)
                await traceSafely('session-setup', {trackedPaths})
                return describe(state)
            })
        } catch (error) {
            if (ownsSetup) {
                if (mode == 'owned-project') await rm(projectDirectory, {recursive: true, force: true})
                await rm(geneticDirectory, {recursive: true, force: true})
            }
            throw error
        }
    }

    async function scan() {
        requireInitialized()
        return withLock(async function scanWorkspace() {
            const genetic = createGenetic(await readState())
            const contexts = await sampleTrackedFiles()
            await archiveContents(contexts)
            const result = genetic.control.scan(toSnapshots(contexts))
            const state = genetic.debug.snapshot()
            await persist(state)
            await traceSafely('workspace-scanned', {
                batchId: result.batch?.id ?? null,
                changedPaths: result.batch?.files.map(function path(file) { return file.path }) ?? [],
                pendingKind: result.pendingAction?.kind ?? null,
            })
            return describe(state)
        })
    }

    async function resolvePending() {
        requireInitialized()
        return withLock(async function resolveResponse() {
            const state = await readState()
            const genetic = createGenetic(state)
            const pending = genetic.debug.pendingAction()
            if (!pending) throw new Error('The genetic module has no pending action')
            const response = await readResponse(pending)
            if (response.actionId != pending.id) {
                throw new Error(`Stale response for ${response.actionId}; pending action is ${pending.id}`)
            }
            if (pending.agent == 'reviewer') {
                genetic.control.submitReviewer(pending.id, response.result as tReviewerInspectionResult)
            } else {
                genetic.control.submitOwner(pending.id, response.result as tOwnerDiscoveryResult | tOwnerReviewResult)
            }
            const nextState = genetic.debug.snapshot()
            await archiveResponse(pending, response)
            await persist(nextState)
            await removeIfPresent(responsePath)
            await traceSafely('pending-resolved', {
                actionId: pending.id,
                agent: pending.agent,
                kind: pending.kind,
                nextPendingKind: nextState.pendingAction?.kind ?? null,
            })
            return describe(nextState)
        })
    }

    async function status() {
        requireInitialized()
        return withLock(async function refreshStatus() {
            requireInitialized()
            const state = await readState()
            await writePending(state)
            await writeFile(statusPath, renderStatus(state), 'utf8')
            return describe(state)
        })
    }

    async function persist(state: tGeneticModuleSnapshot) {
        await writeJsonAtomic(statePath, state)
        await writePending(state)
        await writeFile(statusPath, renderStatus(state), 'utf8')
    }

    async function writePending(state: tGeneticModuleSnapshot) {
        if (!state.pendingAction) {
            await removeIfPresent(pendingPath)
            return
        }
        await writeJsonAtomic(pendingPath, {
            action: state.pendingAction,
            files: await enrichFiles(state.pendingAction),
            responseTemplate: responseTemplate(state.pendingAction),
            alternativeResponseTemplates: alternativeResponseTemplates(state.pendingAction),
        })
    }

    async function enrichFiles(action: tGeneticPendingAction) {
        const changes = changesFor(action)
        return Promise.all(changes.map(async function enrich(change) {
            return {
                ...change,
                beforeContent: await readArchivedContent(change.path, change.beforeRevision),
                afterContent: await readArchivedContent(change.path, change.afterRevision),
            }
        }))
    }

    async function sampleTrackedFiles() {
        return Promise.all(trackedPaths.map(readContext))
    }

    async function readContext(path: string): Promise<tFileContext> {
        const target = resolveWithin(projectDirectory, path)
        try {
            await assertRealPathInside(projectDirectory, target)
            const info = await lstat(target)
            if (info.isSymbolicLink()) throw new Error(`Tracked path is a symbolic link: ${path}`)
            if (!info.isFile()) throw new Error(`Tracked path is not a file: ${path}`)
            const content = await readFile(target, 'utf8')
            return {path, revision: revision(content), content}
        } catch (error) {
            if (isMissing(error)) return {path, revision: null, content: null}
            throw error
        }
    }

    async function archiveContents(contexts: tFileContext[]) {
        await mkdir(contentDirectory, {recursive: true})
        for (const context of contexts) {
            if (context.revision == null || context.content == null) continue
            const target = contentPath(context.path, context.revision)
            if (await exists(target)) continue
            await writeJsonAtomic(target, context)
        }
    }

    async function readArchivedContent(path: string, fileRevision: string | null) {
        if (fileRevision == null) return null
        const context = await readJson<tFileContext>(contentPath(path, fileRevision))
        return context.content
    }

    function contentPath(path: string, fileRevision: string) {
        const key = createHash('sha256').update(`${path}\0${fileRevision}`).digest('hex')
        return resolveWithin(contentDirectory, `${key}.json`)
    }

    async function readState() {
        return readJson<tGeneticModuleSnapshot>(statePath)
    }

    async function readResponse(pending: tGeneticPendingAction) {
        const value = await readJson<unknown>(responsePath)
        return parseResponse(value, pending)
    }

    async function archiveResponse(pending: tGeneticPendingAction, response: tSandboxResponse) {
        await mkdir(historyDirectory, {recursive: true})
        const key = createHash('sha256').update(pending.id).digest('hex').slice(0, 16)
        const target = resolveWithin(historyDirectory,
            `${key}-${pending.agent}-${pending.kind}.json`)
        await writeJsonAtomic(target, response)
    }

    function createGenetic(initialState?: tGeneticModuleSnapshot) {
        return createGeneticModule({initialState, now, createId})
    }

    function requireInitialized() {
        if (!existsSyncState()) throw new Error('Run npm run setup before using the genetic sandbox')
    }

    function existsSyncState() {
        return existsSync(statePath)
    }

    async function withLock<tResult>(action: () => Promise<tResult>) {
        await mkdir(geneticDirectory, {recursive: true})
        const handle = await acquireLock()
        try {
            return await action()
        } finally {
            try {
                await handle.close()
            } finally {
                await removeIfPresent(lockPath)
            }
        }
    }

    async function acquireLock() {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                const handle = await open(lockPath, 'wx')
                try {
                    await handle.writeFile(JSON.stringify({pid: process.pid, createdAt: now()}) + '\n', 'utf8')
                    return handle
                } catch (error) {
                    await handle.close()
                    await removeIfPresent(lockPath)
                    throw error
                }
            } catch (error) {
                if (!isAlreadyExists(error)) throw error
                if (attempt == 0 && await removeStaleLock()) continue
                throw new Error('Another genetic sandbox command is already running')
            }
        }
        throw new Error('Unable to acquire the genetic sandbox lock')
    }

    async function removeStaleLock() {
        try {
            const lock = JSON.parse(await readFile(lockPath, 'utf8')) as {pid?: unknown}
            if (typeof lock.pid != 'number' || !Number.isInteger(lock.pid) || lock.pid < 1) return false
            if (isProcessAlive(lock.pid)) return false
            await removeIfPresent(lockPath)
            return true
        } catch (error) {
            if (isMissing(error)) return true
            return false
        }
    }

    async function trace(kind: string, data: Record<string, unknown>) {
        const event = {at: now(), kind, data}
        await appendFile(tracePath, JSON.stringify(event) + '\n', 'utf8')
    }

    async function traceSafely(kind: string, data: Record<string, unknown>) {
        try {
            await trace(kind, data)
        } catch {
            // state.json is canonical; a diagnostic trace must not reverse a committed action.
        }
    }

    return {
        control: {setup, scan, resolvePending, status},
        paths: {
            root: () => rootDirectory,
            project: () => projectDirectory,
            genetic: () => geneticDirectory,
        },
    }
}

function toSnapshots(contexts: tFileContext[]): tGeneticFileSnapshot[] {
    return contexts.flatMap(function present(context) {
        return context.revision == null ? [] : [{path: context.path, revision: context.revision}]
    })
}

function requirePresentBaseline(contexts: tFileContext[]) {
    const missing = contexts.filter(function missing(context) { return context.revision == null })
    if (missing.length > 0) throw new Error(`Target project is missing tracked paths: ${missing.map(file => file.path).join(', ')}`)
}

function changesFor(action: tGeneticPendingAction): tGeneticFileChange[] {
    if (action.kind == 'discover') return action.batch.files
    if (action.kind == 'inspect') return action.files
    return []
}

function responseTemplate(action: tGeneticPendingAction): tSandboxResponse {
    if (action.kind == 'discover') {
        return {
            actionId: action.id,
            result: {
                kind: 'discover',
                decision: 'record',
                observation: {
                    key: 'short-stable-key',
                    summary: 'What repeated rule or risk was observed.',
                    watchedPaths: action.batch.files.map(function path(file) { return file.path }),
                    instruction: 'Focused instruction for the next related change.',
                },
            },
        }
    }
    if (action.kind == 'inspect') {
        return {
            actionId: action.id,
            result: {
                kind: 'inspect',
                verdict: 'clear',
                summary: 'Focused finding for this instruction and change.',
                proposedInstruction: null,
            },
        }
    }
    return {
        actionId: action.id,
        result: {
            kind: 'review-inspection',
            decision: 'keep',
            summary: 'Why the instruction should be kept, refined, or retired.',
            instruction: null,
        },
    }
}

function alternativeResponseTemplates(action: tGeneticPendingAction): tSandboxResponse[] {
    if (action.kind != 'discover') return []
    return [{
        actionId: action.id,
        result: {
            kind: 'discover',
            decision: 'skip',
            summary: 'Why this change does not yet justify a reusable observation.',
        },
    }]
}

function parseResponse(value: unknown, pending: tGeneticPendingAction): tSandboxResponse {
    const response = requireObject(value, 'genetic/response.json')
    const actionId = requireString(response.actionId, 'response actionId')
    const result = requireObject(response.result, 'response result')
    if (pending.kind == 'discover') {
        requireChoice(result.kind, ['discover'], 'response result kind')
        const decision = requireChoice(result.decision, ['record', 'skip'], 'discovery decision')
        if (decision == 'skip') {
            return {
                actionId,
                result: {
                    kind: 'discover',
                    decision,
                    summary: requireString(result.summary, 'discovery skip summary'),
                },
            }
        }
        const observation = requireObject(result.observation, 'discovery observation')
        return {
            actionId,
            result: {
                kind: 'discover',
                decision,
                observation: {
                    key: requireString(observation.key, 'observation key'),
                    summary: requireString(observation.summary, 'observation summary'),
                    watchedPaths: requireStringArray(observation.watchedPaths, 'observation watchedPaths'),
                    instruction: requireString(observation.instruction, 'observation instruction'),
                },
            },
        }
    }
    if (pending.kind == 'inspect') {
        requireChoice(result.kind, ['inspect'], 'response result kind')
        return {
            actionId,
            result: {
                kind: 'inspect',
                verdict: requireChoice(result.verdict, ['clear', 'issue'], 'inspection verdict'),
                summary: requireString(result.summary, 'inspection summary'),
                proposedInstruction: requireNullableString(result.proposedInstruction,
                    'inspection proposedInstruction'),
            },
        }
    }
    requireChoice(result.kind, ['review-inspection'], 'response result kind')
    return {
        actionId,
        result: {
            kind: 'review-inspection',
            decision: requireChoice(result.decision, ['keep', 'refine', 'retire'], 'review decision'),
            summary: requireString(result.summary, 'review summary'),
            instruction: requireNullableString(result.instruction, 'review instruction'),
        },
    }
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
    if (typeof value != 'object' || value == null || Array.isArray(value)) {
        throw new Error(`${label} must be an object`)
    }
    return value as Record<string, unknown>
}

function requireString(value: unknown, label: string) {
    if (typeof value != 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string`)
    return value
}

function requireNullableString(value: unknown, label: string) {
    if (value == null) return null
    return requireString(value, label)
}

function requireStringArray(value: unknown, label: string) {
    if (!Array.isArray(value) || value.length == 0) throw new Error(`${label} must be a non-empty string array`)
    return value.map(function validate(item, index) { return requireString(item, `${label}[${index}]`) })
}

function requireChoice<const tChoice extends string>(value: unknown, choices: readonly tChoice[], label: string) {
    if (typeof value != 'string' || !choices.includes(value as tChoice)) {
        throw new Error(`${label} must be one of: ${choices.join(', ')}`)
    }
    return value as tChoice
}

function describe(state: tGeneticModuleSnapshot) {
    return {
        status: state.pendingAction ? 'action-required' : 'ready',
        batchCount: state.batches.length,
        observationCount: state.observations.length,
        activeInstructions: state.instructions.filter(function active(item) { return item.status == 'active' }).length,
        inspectionCount: state.inspections.length,
        pendingAction: state.pendingAction,
    }
}

function renderStatus(state: tGeneticModuleSnapshot) {
    const active = state.instructions.filter(function active(item) { return item.status == 'active' })
    const instructionLines = active.length == 0
        ? ['- none']
        : active.map(function instruction(item) {
            return `- ${item.text} (${item.watchedPaths.join(', ')}; approved ${item.approvedChecks})`
        })
    const pending = state.pendingAction
        ? `${state.pendingAction.agent} / ${state.pendingAction.kind} / ${state.pendingAction.id}`
        : 'none'
    return `# Genetic sandbox status\n\n` +
        `- Batches: ${state.batches.length}\n` +
        `- Observations: ${state.observations.length}\n` +
        `- Inspections: ${state.inspections.length}\n` +
        `- Pending: ${pending}\n\n` +
        `## Active instructions\n\n${instructionLines.join('\n')}\n\n` +
        `If an action is pending, read pending.json, choose a response template, save response.json, and run npm run resolve.\n`
}

async function copyDirectory(source: string, target: string) {
    await mkdir(target, {recursive: false})
    for (const entry of await readdir(source, {withFileTypes: true})) {
        const sourcePath = resolveWithin(source, entry.name)
        const targetPath = resolveWithin(target, entry.name)
        const info = await lstat(sourcePath)
        if (info.isSymbolicLink()) throw new Error(`Template contains a symbolic link: ${sourcePath}`)
        if (info.isDirectory()) {
            await copyDirectory(sourcePath, targetPath)
            continue
        }
        if (!info.isFile()) throw new Error(`Unsupported template entry: ${sourcePath}`)
        await writeFile(targetPath, await readFile(sourcePath))
    }
}

async function assertRealPathInside(root: string, target: string) {
    const realRoot = await realpath(root)
    const realParent = await realpath(dirname(target))
    const local = relative(realRoot, realParent)
    if (local.startsWith('..') || isAbsolute(local)) throw new Error(`Tracked path escapes project/: ${target}`)
}

async function writeJsonAtomic(path: string, value: unknown) {
    await mkdir(dirname(path), {recursive: true})
    const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', 'utf8')
    try {
        await rename(temporary, path)
    } catch (error) {
        await removeIfPresent(temporary)
        throw error
    }
}

async function readJson<tValue>(path: string) {
    return JSON.parse(await readFile(path, 'utf8')) as tValue
}

async function removeIfPresent(path: string) {
    try {
        await unlink(path)
    } catch (error) {
        if (!isMissing(error)) throw error
    }
}

function normalizePaths(paths: string[]) {
    if (paths.length == 0) throw new Error('Sandbox needs at least one tracked path')
    const seen = new Set<string>()
    return paths.map(function normalize(path) {
        const source = path.trim().replaceAll('\\', '/')
        const normalized = posix.normalize(source)
        if (!normalized || normalized == '.' || normalized.startsWith('/')
            || source.split('/').includes('..')) {
            throw new Error(`Tracked path must stay below project/: ${path}`)
        }
        const identity = process.platform == 'win32' ? normalized.toLowerCase() : normalized
        if (seen.has(identity)) throw new Error(`Duplicate tracked path: ${normalized}`)
        seen.add(identity)
        return normalized
    })
}

function requireDisjointDirectories(directories: string[]) {
    for (let index = 0; index < directories.length; index += 1) {
        for (let otherIndex = index + 1; otherIndex < directories.length; otherIndex += 1) {
            const local = relative(directories[index], directories[otherIndex])
            if (local == '' || (!local.startsWith('..') && !isAbsolute(local))) {
                throw new Error('project, genetic, and template directories must not overlap')
            }
            const reverse = relative(directories[otherIndex], directories[index])
            if (reverse == '' || (!reverse.startsWith('..') && !isAbsolute(reverse))) {
                throw new Error('project, genetic, and template directories must not overlap')
            }
        }
    }
}

function resolveWithin(root: string, path: string) {
    const candidate = resolve(root, path)
    const local = relative(root, candidate)
    if (local == '' || local.startsWith('..') || isAbsolute(local)) throw new Error(`Path escapes sandbox boundary: ${path}`)
    return candidate
}

function requireBoundProjectDirectory(path: string | undefined) {
    if (!path?.trim()) throw new Error('Bound-project mode needs projectDirectory')
    return path
}

function revision(content: string) {
    return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

async function exists(path: string) {
    try {
        await lstat(path)
        return true
    } catch (error) {
        if (isMissing(error)) return false
        throw error
    }
}

function isMissing(error: unknown) {
    return typeof error == 'object' && error != null && 'code' in error && error.code == 'ENOENT'
}

function isAlreadyExists(error: unknown) {
    return typeof error == 'object' && error != null && 'code' in error && error.code == 'EEXIST'
}

function isProcessAlive(pid: number) {
    try {
        process.kill(pid, 0)
        return true
    } catch (error) {
        return typeof error == 'object' && error != null && 'code' in error && error.code == 'EPERM'
    }
}

export type tSandboxSession = ReturnType<typeof createSandboxSession>
