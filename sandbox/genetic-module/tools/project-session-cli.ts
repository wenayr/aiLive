import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSandboxSession } from '../src/session/sandbox-session'

type tProjectDevelopmentConfig = {
    schema: 'project-development-sandbox/v1'
    targetDirectory: string
    memoryDirectory: string
    trackedPaths: string[]
}

export async function runProjectSessionCli(args = process.argv.slice(2)) {
    const configPath = requireConfigPath(args[0])
    const command = args[1] ?? 'status'
    const sandboxDirectory = dirname(configPath)
    const config = await readConfig(configPath)
    const session = createSandboxSession({
        rootDirectory: sandboxDirectory,
        mode: 'bound-project',
        projectDirectory: resolve(sandboxDirectory, config.targetDirectory),
        geneticDirectory: config.memoryDirectory,
        trackedPaths: config.trackedPaths,
    })
    const result = command == 'validate'
        ? {
            status: 'valid',
            targetDirectory: session.paths.project(),
            memoryDirectory: session.paths.genetic(),
            trackedPaths: config.trackedPaths,
        }
        : command == 'setup'
        ? await session.control.setup()
        : command == 'scan'
            ? await session.control.scan()
            : command == 'resolve'
                ? await session.control.resolvePending()
                : command == 'status'
                    ? await session.control.status()
                    : null
    if (!result) throw new Error(`Unknown development sandbox command: ${command}`)
    console.log(JSON.stringify(result, null, 2))
    return result
}

async function readConfig(path: string) {
    const raw = JSON.parse(await readFile(path, 'utf8')) as unknown
    if (typeof raw != 'object' || raw == null || Array.isArray(raw)) {
        throw new Error('sandbox.json must contain one config object')
    }
    const value = raw as Record<string, unknown>
    if (value.schema != 'project-development-sandbox/v1') {
        throw new Error(`Unsupported development sandbox config: ${String(value.schema)}`)
    }
    const targetDirectory = requireString(value.targetDirectory, 'targetDirectory')
    const memoryDirectory = requireLocalDirectory(value.memoryDirectory, 'memoryDirectory')
    if (!Array.isArray(value.trackedPaths) || value.trackedPaths.length == 0
        || value.trackedPaths.some(function invalid(item) { return typeof item != 'string' || !item.trim() })) {
        throw new Error('Development sandbox needs trackedPaths')
    }
    return {
        schema: 'project-development-sandbox/v1',
        targetDirectory,
        memoryDirectory,
        trackedPaths: value.trackedPaths as string[],
    } satisfies tProjectDevelopmentConfig
}

function requireConfigPath(value: string | undefined) {
    if (!value?.trim()) {
        throw new Error('Usage: tsx project-session-cli.ts <development-sandbox/sandbox.json> <validate|setup|scan|resolve|status>')
    }
    return resolve(value)
}

function requireString(value: unknown, label: string) {
    if (typeof value != 'string' || !value.trim()) throw new Error(`Development sandbox needs ${label}`)
    return value
}

function requireLocalDirectory(value: unknown, label: string) {
    const path = requireString(value, label).replaceAll('\\', '/')
    if (path.startsWith('/') || path.split('/').includes('..')) {
        throw new Error(`${label} must remain inside the development sandbox`)
    }
    return path
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
if (invokedPath == resolve(fileURLToPath(import.meta.url))) {
    runProjectSessionCli().catch(function report(error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
    })
}
