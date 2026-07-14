import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSandboxSession } from '../src/session/sandbox-session'

type tSandboxConfig = {
    schema: 'genetic-codex-sandbox/v1'
    projectDirectory: string
    geneticDirectory: string
    templateDirectory: string
    trackedPaths: string[]
}

export async function runSessionCli(args = process.argv.slice(2)) {
    const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const config = await readConfig(resolve(rootDirectory, 'sandbox.json'))
    const session = createSandboxSession({
        rootDirectory,
        projectDirectory: config.projectDirectory,
        geneticDirectory: config.geneticDirectory,
        templateDirectory: config.templateDirectory,
        trackedPaths: config.trackedPaths,
    })
    const command = args[0] ?? 'status'
    const result = command == 'setup'
        ? await session.control.setup()
        : command == 'scan'
            ? await session.control.scan()
            : command == 'resolve'
                ? await session.control.resolvePending()
                : command == 'status'
                    ? await session.control.status()
                    : null
    if (!result) throw new Error(`Unknown sandbox command: ${command}`)
    console.log(JSON.stringify(result, null, 2))
    return result
}

async function readConfig(path: string) {
    const raw = JSON.parse(await readFile(path, 'utf8')) as unknown
    if (typeof raw != 'object' || raw == null || Array.isArray(raw)) {
        throw new Error('sandbox.json must contain one config object')
    }
    const value = raw as Record<string, unknown>
    if (value.schema != 'genetic-codex-sandbox/v1') {
        throw new Error(`Unsupported sandbox config: ${String(value.schema)}`)
    }
    const projectDirectory = requireString(value.projectDirectory, 'projectDirectory')
    const geneticDirectory = requireString(value.geneticDirectory, 'geneticDirectory')
    const templateDirectory = requireString(value.templateDirectory, 'templateDirectory')
    if (!Array.isArray(value.trackedPaths) || value.trackedPaths.length == 0
        || value.trackedPaths.some(function invalid(item) { return typeof item != 'string' || !item.trim() })) {
        throw new Error('Sandbox config needs trackedPaths')
    }
    return {
        schema: 'genetic-codex-sandbox/v1',
        projectDirectory,
        geneticDirectory,
        templateDirectory,
        trackedPaths: value.trackedPaths as string[],
    } satisfies tSandboxConfig
}

function requireString(value: unknown, label: string) {
    if (typeof value != 'string' || !value.trim()) throw new Error(`Sandbox config needs ${label}`)
    return value
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
if (invokedPath == resolve(fileURLToPath(import.meta.url))) {
    runSessionCli().catch(function report(error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
    })
}
