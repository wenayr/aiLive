import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import type { tRegisteredTask, tTaskDefinition, tTaskKind } from '../contracts/lab-contracts'
import { copyJson } from '../utility/json'

const taskIdPattern = /^[a-z0-9][a-z0-9-]{0,62}$/
const taskKinds = new Set<tTaskKind>(['probe', 'build', 'review'])
const supportedCapabilities = new Set(['workspace-read', 'artifact-write', 'process-local'])

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value == 'object' && value != null && !Array.isArray(value)
}

function isWithin(parent: string, candidate: string) {
    const value = relative(parent, candidate)
    return value == '' || (!value.startsWith('..') && !isAbsolute(value))
}

function requireString(value: unknown, name: string) {
    if (typeof value != 'string' || !value.trim()) throw new Error(`Task manifest requires ${name}`)
    return value
}

function validateManifest(value: unknown, directory: string): tTaskDefinition {
    if (!isRecord(value)) throw new Error('Task manifest must be an object')

    const id = requireString(value.id, 'id')
    if (!taskIdPattern.test(id)) throw new Error(`Invalid task id: ${id}`)

    const kind = requireString(value.kind, 'kind') as tTaskKind
    if (!taskKinds.has(kind)) throw new Error(`Invalid task kind: ${kind}`)

    const command = value.command
    if (!isRecord(command) || command.program != 'node' || !Array.isArray(command.args)) {
        throw new Error(`Task ${id} must declare a Node command`)
    }
    if (!command.args.length || command.args.some(function invalidArg(arg) { return typeof arg != 'string' || arg.includes('\0') })) {
        throw new Error(`Task ${id} has invalid command args`)
    }
    const entry = command.args[0]
    if (typeof entry != 'string' || entry.startsWith('-') || !isWithin(directory, resolve(directory, entry))) {
        throw new Error(`Task ${id} entry script must stay inside its task directory`)
    }

    const capabilityValues = value.capabilities
    if (!Array.isArray(capabilityValues) || capabilityValues.some(function unsupported(capability) {
        return typeof capability != 'string' || !supportedCapabilities.has(capability)
    })) {
        throw new Error(`Task ${id} has unsupported capabilities`)
    }

    const timeoutMs = value.timeoutMs
    if (typeof timeoutMs != 'number' || !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 300_000) {
        throw new Error(`Task ${id} timeoutMs must be between 100 and 300000`)
    }

    const instruction = value.instruction == null ? null : requireString(value.instruction, 'instruction')
    if (instruction != null && !isWithin(directory, resolve(directory, instruction))) {
        throw new Error(`Task ${id} instruction must stay inside its task directory`)
    }

    return {
        id,
        version: requireString(value.version, 'version'),
        title: requireString(value.title, 'title'),
        summary: requireString(value.summary, 'summary'),
        kind,
        capabilities: capabilityValues as tTaskDefinition['capabilities'],
        timeoutMs,
        command: {
            program: 'node',
            args: command.args.slice() as string[],
        },
        instruction,
    }
}

export function createTaskRegistry(deps: {tasksRoot: string}) {
    const tasksRoot = resolve(deps.tasksRoot)
    let tasks = new Map<string, tRegisteredTask>()

    function reload() {
        if (!existsSync(tasksRoot)) throw new Error(`Tasks directory does not exist: ${tasksRoot}`)
        const next = new Map<string, tRegisteredTask>()

        for (const entry of readdirSync(tasksRoot, {withFileTypes: true})) {
            if (!entry.isDirectory()) continue
            const directory = resolve(tasksRoot, entry.name)
            if (!isWithin(tasksRoot, directory)) throw new Error(`Task directory escapes root: ${entry.name}`)

            const manifestPath = resolve(directory, 'task.json')
            if (!existsSync(manifestPath)) continue
            const manifest = validateManifest(JSON.parse(readFileSync(manifestPath, 'utf8')), directory)
            if (next.has(manifest.id)) throw new Error(`Duplicate task id: ${manifest.id}`)
            next.set(manifest.id, {definition: manifest, directory})
        }

        tasks = next
        return list()
    }

    function list() {
        return Array.from(tasks.values())
            .map(function taskDefinition(task) { return copyJson(task.definition) })
            .sort(function byId(a, b) { return a.id.localeCompare(b.id) })
    }

    function get(id: string) {
        const task = tasks.get(id)
        return task ? {definition: copyJson(task.definition), directory: task.directory} : null
    }

    return {
        api: {list, get},
        control: {reload},
    }
}

export type tTaskRegistry = ReturnType<typeof createTaskRegistry>
