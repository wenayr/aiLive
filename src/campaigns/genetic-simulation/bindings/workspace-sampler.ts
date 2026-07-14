import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import type { tGeneticFileSnapshot } from '../contracts/genetic-simulation-contracts'

export function createWorkspaceSampler(deps: {rootDirectory: string}) {
    const rootDirectory = resolve(deps.rootDirectory)

    async function sample(paths: string[]) {
        const snapshots = await Promise.all(paths.map(readSnapshot))
        return snapshots
            .filter(function present(snapshot): snapshot is tGeneticFileSnapshot { return snapshot != null })
            .sort(function byPath(a, b) { return a.path.localeCompare(b.path) })
    }

    async function readSnapshot(path: string): Promise<tGeneticFileSnapshot | null> {
        const filePath = resolveWorkspacePath(path)
        try {
            const content = await readFile(filePath)
            return {
                path: normalizePath(path),
                revision: `sha256:${createHash('sha256').update(content).digest('hex')}`,
            }
        } catch (error) {
            if (isMissing(error)) return null
            throw error
        }
    }

    function resolveWorkspacePath(path: string) {
        const filePath = resolve(rootDirectory, path)
        const insideWorkspace = relative(rootDirectory, filePath)
        if (insideWorkspace == '' || insideWorkspace.startsWith('..') || isAbsolute(insideWorkspace)) {
            throw new Error(`Sample path must stay below the workspace: ${path}`)
        }
        return filePath
    }

    return {runtime: {sample}}
}

function normalizePath(path: string) {
    const normalized = path.trim().replaceAll('\\', '/')
    if (!normalized) throw new Error('Sample path is required')
    return normalized
}

function isMissing(error: unknown) {
    return typeof error == 'object'
        && error != null
        && 'code' in error
        && error.code == 'ENOENT'
}
