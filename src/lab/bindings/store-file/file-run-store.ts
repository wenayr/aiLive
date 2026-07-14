import {
    appendFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    statSync,
    writeFileSync,
} from 'node:fs'
import { extname, isAbsolute, relative, resolve } from 'node:path'
import type { tArtifactRef, tRunEvent, tRunRecord } from '../../contracts/lab-contracts'

function isWithin(parent: string, candidate: string) {
    const value = relative(parent, candidate)
    return value == '' || (!value.startsWith('..') && !isAbsolute(value))
}

function contentType(path: string) {
    const extension = extname(path).toLowerCase()
    if (extension == '.json') return 'application/json'
    if (extension == '.md') return 'text/markdown'
    if (extension == '.txt' || extension == '.log') return 'text/plain'
    return 'application/octet-stream'
}

export function createFileRunStore(deps: {rootDirectory: string}) {
    const rootDirectory = resolve(deps.rootDirectory)
    const runsDirectory = resolve(rootDirectory, 'runs')

    function ensureDirectory(path: string) {
        if (!isWithin(rootDirectory, path)) throw new Error(`Laboratory path escapes root: ${path}`)
        mkdirSync(path, {recursive: true})
        return path
    }

    function runDirectory(runId: string) {
        if (!/^[a-z0-9-]{1,80}$/i.test(runId)) throw new Error(`Invalid run id: ${runId}`)
        return resolve(runsDirectory, runId)
    }

    function artifactDirectory(runId: string) {
        return resolve(runDirectory(runId), 'artifacts')
    }

    function ensureRun(runId: string) {
        ensureDirectory(artifactDirectory(runId))
        return runDirectory(runId)
    }

    function writeRecord(run: tRunRecord) {
        const directory = ensureRun(run.id)
        writeFileSync(resolve(directory, 'record.json'), JSON.stringify(run, null, 2) + '\n', 'utf8')
    }

    function appendTrace(event: tRunEvent) {
        const directory = ensureRun(event.runId)
        appendFileSync(resolve(directory, 'trace.ndjson'), JSON.stringify(event) + '\n', 'utf8')
    }

    function listArtifacts(runId: string) {
        const root = artifactDirectory(runId)
        if (!existsSync(root)) return [] as tArtifactRef[]
        const artifacts: tArtifactRef[] = []

        function visit(directory: string, depth: number) {
            if (depth > 4) return
            for (const entry of readdirSync(directory, {withFileTypes: true})) {
                const path = resolve(directory, entry.name)
                if (!isWithin(root, path) || lstatSync(path).isSymbolicLink()) continue
                if (entry.isDirectory()) {
                    visit(path, depth + 1)
                    continue
                }
                if (!entry.isFile()) continue
                artifacts.push({
                    path: relative(root, path).replaceAll('\\', '/'),
                    mediaType: contentType(path),
                    bytes: statSync(path).size,
                })
            }
        }

        visit(root, 0)
        return artifacts.sort(function byPath(a, b) { return a.path.localeCompare(b.path) })
    }

    return {
        api: {
            artifactDirectory,
            listArtifacts,
        },
        control: {
            ensureRun,
            writeRecord,
            appendTrace,
        },
    }
}

export type tFileRunStore = ReturnType<typeof createFileRunStore>
