import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import { createGeneticEventGate } from '../../src/campaigns/genetic-simulation/coordination/event-gate'
import { createGeneticSimulation } from '../../src/campaigns/genetic-simulation/resource/genetic-simulation'
import { createPatchEventCapture } from '../../src/campaigns/genetic-simulation/bindings/patch-event-capture'
import { createWorkspaceSampler } from '../../src/campaigns/genetic-simulation/bindings/workspace-sampler'
import type {
    tLunaInspectionAction,
    tTerraDiscoveryAction,
} from '../../src/campaigns/genetic-simulation/contracts/genetic-simulation-contracts'
import { createCandidateWorkspace } from './candidate-workspace'
import type {
    tSandboxCodeRequest,
    tSandboxCodeResponse,
    tSandboxInspectRequest,
    tSandboxInspectResponse,
    tSandboxModelCaller,
    tSandboxModelRequest,
} from './model-contract'
import { sandboxModelProtocol } from './model-contract'

type tSandboxConfig = {
    schema: 'genetic-sandbox/v0'
    id: string
    title: string
    seedDirectory: string
    trackedPaths: string[]
    writablePaths: string[]
    check: string
    checkKind: 'static-source'
    goals: {first: string, repeat: string, repair: string}
    discovery: {
        key: string
        summary: string
        watchedPaths: string[]
        instruction: string
    }
    limits: {
        maxModelCalls: number
        maxFilesPerResponse: number
        maxResponseBytes: number
        modelTimeoutMs: number
        checkTimeoutMs: number
    }
}

const modelPolicy = {
    context: 'request-files-only',
    tools: 'none',
    writes: 'controller-validated-only',
    candidateExecution: 'forbidden',
} as const

type tAppliedChange = Awaited<ReturnType<ReturnType<typeof createCandidateWorkspace>['control']['apply']>>[number]

export function createGeneticSandbox(deps: {
    projectRoot: string
    runId: string
    candidateRoot?: string
    laboratoryRoot?: string
    callModel?: tSandboxModelCaller
    now?: () => string
}) {
    if (!/^[a-z0-9-]{1,80}$/i.test(deps.runId)) throw new Error(`Invalid sandbox run id: ${deps.runId}`)
    const projectRoot = resolve(deps.projectRoot)
    const sandboxDirectory = resolve(projectRoot, 'sandbox/genetic-module')
    const candidateRunDirectory = resolve(deps.candidateRoot ?? resolve(projectRoot, '.candidates/genetic-sandbox'), deps.runId)
    const workspaceDirectory = resolve(candidateRunDirectory, 'workspace')
    const artifactDirectory = resolve(deps.laboratoryRoot ?? resolve(projectRoot, '.laboratory/genetic-sandbox'), deps.runId)
    const now = deps.now ?? function currentTime() { return new Date().toISOString() }
    const config = readConfig(resolve(sandboxDirectory, 'sandbox.json'))
    const artifacts = createArtifactStore({directory: artifactDirectory, now})
    const workspace = createCandidateWorkspace({
        workspaceDirectory,
        seedDirectory: resolveWithin(sandboxDirectory, config.seedDirectory),
        allowedPaths: config.writablePaths,
        maxFiles: config.limits.maxFilesPerResponse,
        maxBytes: config.limits.maxResponseBytes,
    })
    let idSequence = 0
    const simulation = createGeneticSimulation({
        createId: () => `${deps.runId}-${++idSequence}`,
        now,
    })
    const gate = createGeneticEventGate({simulation})
    const capture = createPatchEventCapture({
        sampler: createWorkspaceSampler({rootDirectory: workspaceDirectory}),
        gate,
    })
    const modelCalls: Array<{
        requestId: string
        provider: string
        model: string
        simulated: boolean
        usage: Record<string, number>
    }> = []
    const archivedRequests = new Set<string>()
    let preparedRequest: tSandboxCodeRequest | null = null

    async function prepare() {
        if (preparedRequest) return {status: 'awaiting-response' as const, request: preparedRequest, artifactDirectory, workspaceDirectory}
        await artifacts.prepare()
        await workspace.control.prepare()
        await capture.control.establishBaseline(config.trackedPaths)
        await artifacts.json('manifest.json', {
            schema: config.schema,
            scenarioId: config.id,
            title: config.title,
            runId: deps.runId,
            candidateDirectory: workspaceDirectory,
            modelMode: deps.callModel ? 'injected' : 'awaiting-external-adapter',
            limits: config.limits,
        })
        await artifacts.json('genetic/state-00-baseline.json', simulation.debug.snapshot())
        await artifacts.trace('sandbox-prepared', {runId: deps.runId, workspaceDirectory})
        preparedRequest = await buildCodeRequest('code-first', config.goals.first)
        await archiveRequest(preparedRequest)
        await writeResult({
            status: 'awaiting-response',
            verdict: null,
            nextRequestId: preparedRequest.requestId,
            candidateDirectory: workspaceDirectory,
            artifactDirectory,
            modelCalls: [],
        })
        await artifacts.text('report.md', awaitingReport(preparedRequest.requestId, workspaceDirectory, artifactDirectory))
        return {status: 'awaiting-response' as const, request: preparedRequest, artifactDirectory, workspaceDirectory}
    }

    async function run() {
        const initial = await prepare()
        if (!deps.callModel) return initial
        try {
            const firstResponse = await invokeCode(initial.request)
            const first = await applyCode(firstResponse, '01-first')
            const discovery = requireDiscovery(first.pendingAction)
            simulation.control.submitTerra(discovery.id, {
                kind: 'discover',
                observation: config.discovery,
            })
            await artifacts.trace('instruction-discovered', {actionId: discovery.id, key: config.discovery.key})
            await artifacts.json('genetic/state-01-discovery.json', simulation.debug.snapshot())

            const repeatRequest = await buildCodeRequest('code-repeat', config.goals.repeat)
            const repeatResponse = await invokeCode(repeatRequest)
            const repeat = await applyCode(repeatResponse, '02-repeat')
            const repeatInspectionAction = requireInspection(repeat.pendingAction)
            const repeatInspectRequest = buildInspectRequest('inspect-repeat', repeatInspectionAction, repeat.changes)
            const repeatInspection = await invokeInspection(repeatInspectRequest)
            resolveInspection(repeatInspectionAction, repeatInspection)
            await artifacts.json('genetic/state-02-repeat-review.json', simulation.debug.snapshot())

            let finalInspection = repeatInspection
            if (repeatInspection.verdict == 'issue') {
                const repairRequest = await buildCodeRequest('code-repair', config.goals.repair)
                const repairResponse = await invokeCode(repairRequest)
                const repair = await applyCode(repairResponse, '03-repair')
                const repairInspectionAction = requireInspection(repair.pendingAction)
                const repairInspectRequest = buildInspectRequest('inspect-repair', repairInspectionAction, repair.changes)
                finalInspection = await invokeInspection(repairInspectRequest)
                resolveInspection(repairInspectionAction, finalInspection)
                await artifacts.json('genetic/state-03-repair-review.json', simulation.debug.snapshot())
            }

            const check = await runCheck()
            const verdict = check.passed && finalInspection.verdict == 'clear'
                ? 'candidate-ready-for-review'
                : 'reject-candidate'
            const finalState = simulation.debug.snapshot()
            await artifacts.json('genetic/state-final.json', finalState)
            await artifacts.json('evaluation/check.json', check)
            const result = {
                status: 'completed',
                verdict,
                candidateDirectory: workspaceDirectory,
                artifactDirectory,
                modelCalls,
                pendingAction: finalState.pendingAction,
                instructionCount: finalState.instructions.length,
                inspectionCount: finalState.inspections.length,
                check,
            }
            await writeResult(result)
            await artifacts.text('report.md', completedReport(result))
            await artifacts.trace('sandbox-completed', {verdict, checkPassed: check.passed})
            return result
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            const result = {
                status: 'failed',
                verdict: 'reject-candidate',
                candidateDirectory: workspaceDirectory,
                artifactDirectory,
                modelCalls,
                error: message,
            }
            await writeResult(result)
            await artifacts.text('report.md', failedReport(result))
            await artifacts.trace('sandbox-failed', {error: message})
            throw error
        }
    }

    async function buildCodeRequest(suffix: string, goal: string): Promise<tSandboxCodeRequest> {
        const state = simulation.debug.snapshot()
        return {
            protocol: sandboxModelProtocol,
            requestId: `${deps.runId}:${suffix}`,
            kind: 'code',
            role: 'luna-builder',
            policy: modelPolicy,
            goal,
            files: await workspace.api.read(config.trackedPaths),
            instructions: state.instructions
                .filter(function active(instruction) { return instruction.status == 'active' })
                .map(function context(instruction) {
                    return {id: instruction.id, text: instruction.text, watchedPaths: instruction.watchedPaths}
                }),
            limits: {
                allowedPaths: config.writablePaths,
                maxFiles: config.limits.maxFilesPerResponse,
                maxBytes: config.limits.maxResponseBytes,
            },
            responseContract: {
                kind: 'code',
                files: [{
                    path: 'allowed path',
                    baseRevision: 'revision from request or null',
                    content: 'complete file content or null to delete',
                }],
                summary: 'short explanation',
            },
        }
    }

    function buildInspectRequest(
        suffix: string,
        action: tLunaInspectionAction,
        changes: tAppliedChange[],
    ): tSandboxInspectRequest {
        const instruction = {
            id: action.instruction.id,
            text: action.instruction.text,
            watchedPaths: action.instruction.watchedPaths,
        }
        return {
            protocol: sandboxModelProtocol,
            requestId: `${deps.runId}:${suffix}`,
            kind: 'inspect',
            role: 'luna-inspector',
            policy: modelPolicy,
            instruction,
            files: action.files.map(function enrich(file) {
                const change = changes.find(function samePath(item) { return item.path == file.path })
                if (!change) throw new Error(`Changed content is unavailable for ${file.path}`)
                return {
                    path: file.path,
                    beforeRevision: file.beforeRevision,
                    afterRevision: file.afterRevision,
                    beforeContent: change.before.content,
                    afterContent: change.after.content,
                }
            }),
            responseContract: {
                kind: 'inspect',
                verdict: 'clear or issue',
                summary: 'focused finding',
                proposedInstruction: 'refinement or null',
            },
        }
    }

    async function invokeCode(request: tSandboxCodeRequest) {
        const result = await invoke(request)
        return parseCodeResponse(request, result.raw)
    }

    async function invokeInspection(request: tSandboxInspectRequest) {
        const result = await invoke(request)
        return parseInspectResponse(request, result.raw)
    }

    async function invoke(request: tSandboxModelRequest) {
        const callModel = deps.callModel
        if (!callModel) throw new Error('No external model adapter is configured')
        if (modelCalls.length >= config.limits.maxModelCalls) throw new Error('Sandbox model-call budget exhausted')
        await archiveRequest(request)
        await artifacts.trace('model-requested', {requestId: request.requestId, kind: request.kind})
        const responseSequence = modelCalls.length + 1
        const abortController = new AbortController()
        const result = await withModelTimeout({
            call: () => callModel(request, {signal: abortController.signal}),
            abortController,
            timeoutMs: config.limits.modelTimeoutMs,
        })
        await artifacts.json(`responses/${sequenceName(responseSequence, request.requestId)}.json`, result)
        const usage = numericUsage(result.usage)
        modelCalls.push({
            requestId: request.requestId,
            provider: requireText(result.provider, 'model provider'),
            model: requireText(result.model, 'model name'),
            simulated: result.simulated === true,
            usage,
        })
        await artifacts.trace('model-responded', {
            requestId: request.requestId,
            provider: result.provider,
            model: result.model,
            simulated: result.simulated,
        })
        return result
    }

    async function applyCode(response: tSandboxCodeResponse, artifactName: string) {
        const changes = await workspace.control.apply(response.files)
        await artifacts.json(`patches/${artifactName}.json`, {requestId: response.requestId, summary: response.summary, changes})
        const paths = changes.map(function path(change) { return change.path })
        const patchEvent = await capture.control.capture({source: 'agent-patch-applied', paths})
        const duplicateSave = await capture.control.capture({source: 'file-saved', paths})
        const flush = gate.control.flush()
        await artifacts.trace('patch-applied', {
            requestId: response.requestId,
            paths,
            patchEvent: patchEvent.notification,
            duplicateSave: duplicateSave.notification,
            pendingAction: flush.pendingAction?.kind ?? null,
        })
        return {changes, pendingAction: flush.pendingAction}
    }

    function resolveInspection(action: tLunaInspectionAction, result: tSandboxInspectResponse) {
        simulation.control.submitLuna(action.id, {
            kind: 'inspect',
            verdict: result.verdict,
            summary: result.summary,
            proposedInstruction: result.proposedInstruction,
        })
        const review = simulation.debug.pendingAction()
        if (!review || review.kind != 'review-luna') throw new Error('Luna result did not produce a Terra review action')
        const refine = result.verdict == 'issue' && result.proposedInstruction != null
        simulation.control.submitTerra(review.id, {
            kind: 'review-luna',
            decision: refine ? 'refine' : 'keep',
            summary: refine
                ? 'The focused sandbox finding is accepted for the next bounded task.'
                : 'The focused sandbox check produced no accepted instruction change.',
            instruction: refine ? result.proposedInstruction : null,
        })
    }

    async function runCheck() {
        const checkPath = resolveWithin(sandboxDirectory, config.check)
        return new Promise<{
            kind: 'static-source'
            passed: boolean
            exitCode: number | null
            stdout: string
            stderr: string
        }>(function execute(resolveCheck) {
            execFile(process.execPath, [checkPath, workspaceDirectory], {
                cwd: sandboxDirectory,
                timeout: config.limits.checkTimeoutMs,
                maxBuffer: 64 * 1024,
                windowsHide: true,
                env: {
                    PATH: process.env.PATH ?? '',
                    SystemRoot: process.env.SystemRoot ?? '',
                    TEMP: process.env.TEMP ?? '',
                    TMP: process.env.TMP ?? '',
                },
            }, function complete(error, stdout, stderr) {
                const code = error && 'code' in error && typeof error.code == 'number' ? error.code : error ? 1 : 0
                resolveCheck({kind: config.checkKind, passed: error == null, exitCode: code, stdout, stderr})
            })
        })
    }

    async function archiveRequest(request: tSandboxModelRequest) {
        if (archivedRequests.has(request.requestId)) return
        archivedRequests.add(request.requestId)
        await artifacts.json(`requests/${sequenceName(archivedRequests.size, request.requestId)}.json`, request)
    }

    async function writeResult(result: unknown) {
        await artifacts.json('result.json', result)
    }

    return {
        control: {prepare, run},
        debug: {
            simulation: simulation.debug,
            workspaceDirectory: () => workspaceDirectory,
            artifactDirectory: () => artifactDirectory,
        },
    }
}

function requireDiscovery(action: unknown): tTerraDiscoveryAction {
    if (!action || typeof action != 'object' || !('kind' in action) || action.kind != 'discover') {
        throw new Error('First candidate patch must produce one Terra discovery action')
    }
    return action as tTerraDiscoveryAction
}

function requireInspection(action: unknown): tLunaInspectionAction {
    if (!action || typeof action != 'object' || !('kind' in action) || action.kind != 'inspect') {
        throw new Error('Repeated candidate patch must produce one Luna inspection action')
    }
    return action as tLunaInspectionAction
}

function parseCodeResponse(request: tSandboxCodeRequest, raw: unknown): tSandboxCodeResponse {
    const value = requireRecord(raw, 'code response')
    requireResponseHeader(request, value, 'code')
    if (!Array.isArray(value.files)) throw new Error('Code response requires files')
    const files = value.files.map(function replacement(input) {
        const item = requireRecord(input, 'file replacement')
        if (typeof item.path != 'string') throw new Error('File replacement path is required')
        if (item.baseRevision != null && typeof item.baseRevision != 'string') {
            throw new Error(`Invalid base revision for ${item.path}`)
        }
        if (item.content != null && typeof item.content != 'string') throw new Error(`Invalid content for ${item.path}`)
        return {path: item.path, baseRevision: item.baseRevision as string | null, content: item.content as string | null}
    })
    return {
        protocol: sandboxModelProtocol,
        requestId: request.requestId,
        kind: 'code',
        files,
        summary: requireText(value.summary, 'code response summary'),
    }
}

function parseInspectResponse(request: tSandboxInspectRequest, raw: unknown): tSandboxInspectResponse {
    const value = requireRecord(raw, 'inspection response')
    requireResponseHeader(request, value, 'inspect')
    if (value.verdict != 'clear' && value.verdict != 'issue') throw new Error('Inspection verdict must be clear or issue')
    if (value.proposedInstruction != null && typeof value.proposedInstruction != 'string') {
        throw new Error('Inspection proposedInstruction must be a string or null')
    }
    return {
        protocol: sandboxModelProtocol,
        requestId: request.requestId,
        kind: 'inspect',
        verdict: value.verdict as 'clear' | 'issue',
        summary: requireText(value.summary, 'inspection summary'),
        proposedInstruction: value.proposedInstruction == null
            ? null
            : requireText(value.proposedInstruction, 'proposed instruction'),
    }
}

function requireResponseHeader(request: tSandboxModelRequest, value: Record<string, unknown>, kind: 'code' | 'inspect') {
    if (value.protocol != sandboxModelProtocol) throw new Error(`Unsupported model response protocol: ${String(value.protocol)}`)
    if (value.requestId != request.requestId) throw new Error(`Model response action mismatch: ${String(value.requestId)}`)
    if (value.kind != kind) throw new Error(`Model response kind mismatch: ${String(value.kind)}`)
}

function readConfig(path: string) {
    const value = JSON.parse(readFileSync(path, 'utf8')) as tSandboxConfig
    if (value.schema != 'genetic-sandbox/v0') throw new Error(`Unsupported sandbox config: ${String(value.schema)}`)
    if (value.checkKind != 'static-source') throw new Error(`Unsupported sandbox check kind: ${String(value.checkKind)}`)
    if (!Array.isArray(value.trackedPaths) || !Array.isArray(value.writablePaths)) throw new Error('Sandbox paths are required')
    if (!Number.isInteger(value.limits.modelTimeoutMs) || value.limits.modelTimeoutMs <= 0) {
        throw new Error('Sandbox model timeout must be a positive integer')
    }
    return value
}

function createArtifactStore(deps: {directory: string, now: () => string}) {
    const directory = resolve(deps.directory)
    let traceSequence = 0

    async function prepare() {
        await mkdir(resolve(directory, '..'), {recursive: true})
        await mkdir(directory, {recursive: false})
    }

    async function json(path: string, value: unknown) {
        const target = resolveWithin(directory, path)
        await mkdir(resolve(target, '..'), {recursive: true})
        await writeFile(target, JSON.stringify(value, null, 2) + '\n', 'utf8')
    }

    async function text(path: string, value: string) {
        const target = resolveWithin(directory, path)
        await mkdir(resolve(target, '..'), {recursive: true})
        await writeFile(target, value.endsWith('\n') ? value : value + '\n', 'utf8')
    }

    async function trace(kind: string, data: Record<string, unknown>) {
        const target = resolveWithin(directory, 'trace.ndjson')
        const event = {sequence: ++traceSequence, at: deps.now(), kind, data}
        await appendFile(target, JSON.stringify(event) + '\n', 'utf8')
    }

    return {prepare, json, text, trace}
}

function resolveWithin(root: string, path: string) {
    const candidate = resolve(root, path)
    const local = relative(root, candidate)
    if (local == '' || local.startsWith('..') || isAbsolute(local)) throw new Error(`Sandbox path escapes root: ${path}`)
    return candidate
}

function sequenceName(sequence: number, requestId: string) {
    const suffix = requestId.split(':').at(-1)?.replace(/[^a-z0-9-]/gi, '-') ?? 'request'
    return `${String(sequence).padStart(2, '0')}-${suffix}`
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
    if (typeof value != 'object' || value == null || Array.isArray(value)) throw new Error(`${label} must be an object`)
    return value as Record<string, unknown>
}

function requireText(value: unknown, label: string) {
    if (typeof value != 'string' || !value.trim()) throw new Error(`${label} is required`)
    return value.trim()
}

function numericUsage(value: unknown) {
    if (typeof value != 'object' || value == null) return {}
    return Object.fromEntries(Object.entries(value).filter(function numeric(entry): entry is [string, number] {
        return typeof entry[1] == 'number' && Number.isFinite(entry[1])
    }))
}

async function withModelTimeout<tResult>(deps: {
    call: () => Promise<tResult>
    abortController: AbortController
    timeoutMs: number
}) {
    let timeout: ReturnType<typeof setTimeout> | null = null
    const expired = new Promise<never>(function expire(_resolve, reject) {
        timeout = setTimeout(function modelTimedOut() {
            deps.abortController.abort()
            reject(new Error(`Model call timed out after ${deps.timeoutMs} ms`))
        }, deps.timeoutMs)
    })
    try {
        return await Promise.race([deps.call(), expired])
    } finally {
        if (timeout != null) clearTimeout(timeout)
    }
}

function awaitingReport(requestId: string, workspaceDirectory: string, artifactDirectory: string) {
    return `# Genetic sandbox run\n\nStatus: awaiting-response\n\n- Request: ${requestId}\n- Candidate: ${workspaceDirectory}\n- Artifacts: ${artifactDirectory}\n- No model was called and no candidate file was changed.\n`
}

function completedReport(result: {
    verdict: string
    candidateDirectory: string
    modelCalls: Array<{provider: string, model: string, simulated: boolean}>
    instructionCount: number
    inspectionCount: number
    check: {passed: boolean}
}) {
    const simulated = result.modelCalls.some(function fixture(call) { return call.simulated })
    return `# Genetic sandbox run\n\nStatus: completed\n\n- Verdict: ${result.verdict}\n- Candidate: ${result.candidateDirectory}\n- Model calls: ${result.modelCalls.length}\n- Simulated model present: ${simulated}\n- Instructions: ${result.instructionCount}\n- Inspections: ${result.inspectionCount}\n- Check passed: ${result.check.passed}\n`
}

function failedReport(result: {error: string, candidateDirectory: string, modelCalls: unknown[]}) {
    return `# Genetic sandbox run\n\nStatus: failed\n\n- Candidate: ${result.candidateDirectory}\n- Model calls archived: ${result.modelCalls.length}\n- Error: ${result.error}\n- Nothing is promoted automatically.\n`
}

export type tGeneticSandbox = ReturnType<typeof createGeneticSandbox>
